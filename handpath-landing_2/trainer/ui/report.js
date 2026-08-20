/* =====================================================
   HANDPATH TRAINER — RELATÓRIO PÓS-MESA + REPLAY (Fase 5)
   Consome o histórico de mãos que trainer/ui/script.js grava
   em memória durante a sessão (window.HandpathTable
   .getHandHistory()) e monta: estatísticas da sessão e um
   replay mão a mão.

   Relatório e replay compartilham a MESMA base de dados de
   propósito (decisão travada, ver trainer/supabase/README.md)
   — não são duas features separadas.

   Tudo aqui é regra e estatística, SEM chamada de IA — decisão
   travada em handpath-game-upgrade-prompt.md pra não criar
   custo variável por sessão de jogo.
   ===================================================== */

(function(){
  "use strict";

  var HandpathReport = window.HandpathReport = window.HandpathReport || {};

  var STREET_BOARD_COUNT = { preflop: 0, flop: 3, turn: 4, river: 5, showdown: 5 };
  var STREET_LABELS = { preflop: 'Pre-flop', flop: 'Flop', turn: 'Turn', river: 'River', showdown: 'Showdown' };
  var ACTION_LABELS = { fold: 'fold', check: 'check', call: 'call', bet: 'bet', raise: 'raise', allin: 'all-in' };

  // Só as maiores derrotas em showdown passam pela análise de equity: cada
  // uma enumera centenas de runouts de board, e rodar isso em 200 mãos
  // travaria a tela. O relatório DIZ quantas analisou — cap silencioso
  // pareceria "não houve mão de azar" quando na verdade nem olhamos.
  var UNLUCKY_ANALYSIS_LIMIT = 12;
  var PREFLOP_EQUITY_SAMPLES = 2000;

  /* =====================================================
     RECONSTRUÇÃO A PARTIR DO LOG
     ===================================================== */

  // ⚠️ O campo `amount` do log tem semântica MISTA (ver
  // ../engine/README.md): `call` grava o INCREMENTO pago, enquanto
  // `postBlind`/`bet`/`raise`/`allin` gravam o TOTAL comprometido na street.
  // Somar tudo dá pote errado — por isso os dois casos são tratados
  // separadamente aqui. É a única função que sabe disso; replay e stats
  // passam os dois por ela.
  function applyLogEntry(entry, committed, totalCommitted, folded){
    if(entry.type === 'fold'){ folded[entry.seat] = true; return; }
    if(entry.type === 'check' || entry.type === 'timeout') return;
    if(entry.type === 'potAwarded' || entry.type === 'uncontestedWin') return;
    if(entry.amount == null) return;

    if(entry.type === 'call'){
      committed[entry.seat] += entry.amount;
      totalCommitted[entry.seat] += entry.amount;
      return;
    }

    var delta = entry.amount - committed[entry.seat];
    if(delta < 0) delta = 0;
    committed[entry.seat] = entry.amount;
    totalCommitted[entry.seat] += delta;
  }

  function emptySeatArray(n, value){
    var arr = [];
    for(var i=0;i<n;i++) arr.push(value);
    return arr;
  }

  function sum(arr){
    var t = 0;
    for(var i=0;i<arr.length;i++) t += arr[i];
    return t;
  }

  // Percorre o log até stepIndex (inclusive) e devolve o estado visível
  // naquele ponto. stepIndex -1 = antes de qualquer ação.
  function replayStateAt(record, stepIndex){
    var n = record.players.length;
    var committed = emptySeatArray(n, 0);
    var totalCommitted = emptySeatArray(n, 0);
    var folded = emptySeatArray(n, false);
    var street = 'preflop';
    var lastEntry = null;

    for(var s=0; s<=stepIndex && s<record.log.length; s++){
      var entry = record.log[s];
      if(entry.street !== street){
        // street nova: o comprometido da anterior já foi pro pote
        for(var j=0;j<n;j++) committed[j] = 0;
        street = entry.street;
      }
      applyLogEntry(entry, committed, totalCommitted, folded);
      lastEntry = entry;
    }

    // Quantas cartas do board estão visíveis. `potAwarded` é caso especial:
    // ele é gravado com a street em que a APOSTA terminou (pode ser o flop,
    // se todo mundo foi all-in ali), mas o showdown já correu o board todo.
    var boardCount;
    if(lastEntry && lastEntry.type === 'potAwarded'){
      boardCount = record.board.length;
    } else {
      var byStreet = STREET_BOARD_COUNT[street];
      boardCount = byStreet == null ? 0 : byStreet;
    }
    boardCount = Math.min(boardCount, record.board.length);

    return {
      street: street,
      committed: committed,
      totalCommitted: totalCommitted,
      folded: folded,
      pot: sum(totalCommitted),
      board: record.board.slice(0, boardCount),
      lastEntry: lastEntry
    };
  }

  /* =====================================================
     EQUITY (pras mãos de azar)
     Num simulador as cartas dos oponentes são CONHECIDAS, então
     isso não é estimativa de range como um jogador real teria
     que fazer — é a equity exata daquele spot.
     ===================================================== */

  function sameCard(a, b){ return a.rank === b.rank && a.suit === b.suit; }

  function remainingDeck(usedCards){
    var deck = HandpathEngine.createDeck();
    return deck.filter(function(card){
      for(var i=0;i<usedCards.length;i++) if(sameCard(card, usedCards[i])) return false;
      return true;
    });
  }

  // Fatia do pote que o herói leva neste board exato: 0 se alguém o supera,
  // 1 se ganha sozinho, 1/n em caso de empate n-way.
  function showdownShare(heroCards, oppCardsList, board){
    var heroEval = HandpathEngine.evaluateBest(heroCards.concat(board));
    var tied = 1;

    for(var i=0;i<oppCardsList.length;i++){
      var oppEval = HandpathEngine.evaluateBest(oppCardsList[i].concat(board));
      var cmp = HandpathEngine.compareEvals(heroEval, oppEval);
      if(cmp < 0) return 0;
      if(cmp === 0) tied++;
    }
    return 1 / tied;
  }

  function sampleRunouts(deck, count, samples){
    var runouts = [];
    for(var s=0;s<samples;s++){
      var pool = deck.slice();
      var pick = [];
      for(var c=0;c<count;c++){
        var idx = Math.floor(Math.random() * pool.length);
        pick.push(pool.splice(idx, 1)[0]);
      }
      runouts.push(pick);
    }
    return runouts;
  }

  function equityAt(heroCards, oppCardsList, visibleBoard){
    var used = heroCards.concat(visibleBoard);
    for(var i=0;i<oppCardsList.length;i++) used = used.concat(oppCardsList[i]);

    var cardsToCome = 5 - visibleBoard.length;
    if(cardsToCome <= 0){
      return { equity: showdownShare(heroCards, oppCardsList, visibleBoard), exact: true };
    }

    var deck = remainingDeck(used);

    // Turn (44 runouts) e flop (C(45,2) = 990) são enumeráveis exatos.
    // Pré-flop seria C(48,5) ≈ 1,7 milhão — ali vira amostragem.
    var runouts, exact;
    if(cardsToCome <= 2){
      runouts = HandpathEngine.combinations(deck, cardsToCome);
      exact = true;
    } else {
      runouts = sampleRunouts(deck, cardsToCome, PREFLOP_EQUITY_SAMPLES);
      exact = false;
    }

    var total = 0;
    for(var r=0;r<runouts.length;r++){
      total += showdownShare(heroCards, oppCardsList, visibleBoard.concat(runouts[r]));
    }
    return { equity: total / runouts.length, exact: exact };
  }

  /* =====================================================
     ANÁLISE DE AZAR (EV+ com resultado ruim)
     ===================================================== */

  // Acha a última vez que o herói PAGOU uma aposta na mão, junto do pote
  // que existia naquele instante — é a decisão clássica de "eu deveria ter
  // pago aquilo?".
  function lastHeroCall(record, heroSeat){
    var n = record.players.length;
    var committed = emptySeatArray(n, 0);
    var totalCommitted = emptySeatArray(n, 0);
    var folded = emptySeatArray(n, false);
    var street = 'preflop';
    var found = null;

    for(var s=0;s<record.log.length;s++){
      var entry = record.log[s];
      if(entry.street !== street){
        for(var j=0;j<n;j++) committed[j] = 0;
        street = entry.street;
      }
      if(entry.seat === heroSeat && entry.type === 'call' && entry.amount > 0){
        found = { street: street, amount: entry.amount, potBefore: sum(totalCommitted) };
      }
      applyLogEntry(entry, committed, totalCommitted, folded);
    }
    return found;
  }

  function analyzeUnluckyHand(record, heroSeat){
    if(record.winReason !== 'showdown' || !record.potResults) return null;
    if(record.heroNet >= 0) return null;

    var decision = lastHeroCall(record, heroSeat);
    if(!decision) return null;

    var heroPlayer = record.players[heroSeat];
    if(!heroPlayer || !heroPlayer.holeCards || heroPlayer.holeCards.length < 2) return null;

    // Adversários que chegaram ao showdown (os que temos cartas de verdade).
    var oppCards = [];
    for(var seat in record.potResults.evalsBySeat){
      var idx = Number(seat);
      if(idx === heroSeat) continue;
      var p = record.players[idx];
      if(p && p.holeCards && p.holeCards.length === 2) oppCards.push(p.holeCards);
    }
    if(oppCards.length === 0) return null;

    var visibleCount = STREET_BOARD_COUNT[decision.street];
    if(visibleCount == null) visibleCount = 0;
    var visibleBoard = record.board.slice(0, Math.min(visibleCount, record.board.length));

    var result = equityAt(heroPlayer.holeCards, oppCards, visibleBoard);
    var required = decision.amount / (decision.potBefore + decision.amount);

    return {
      index: record.index,
      street: decision.street,
      amount: decision.amount,
      potBefore: decision.potBefore,
      required: required,
      equity: result.equity,
      exact: result.exact,
      correct: result.equity > required,
      heroNet: record.heroNet
    };
  }

  /* =====================================================
     ESTATÍSTICAS DA SESSÃO
     ===================================================== */

  function buildStats(history, meta){
    var hero = meta.heroSeat;
    var stats = {
      hands: history.length,
      net: 0,
      handsWon: 0,
      biggestWin: null,
      biggestLoss: null,
      actions: { fold:0, check:0, call:0, bet:0, raise:0, allin:0, timeout:0 },
      vpipHands: 0,
      pfrHands: 0,
      showdowns: 0,
      kickerHands: [],
      unlucky: [],
      unluckyAnalyzed: 0,
      unluckySkipped: 0,
      bigBlind: meta.bigBlind,
      buyIn: meta.buyIn
    };

    history.forEach(function(record){
      stats.net += record.heroNet;
      if(record.heroNet > 0) stats.handsWon++;
      if(!stats.biggestWin || record.heroNet > stats.biggestWin.heroNet) stats.biggestWin = record;
      if(!stats.biggestLoss || record.heroNet < stats.biggestLoss.heroNet) stats.biggestLoss = record;

      var voluntary = false;
      var raisedPreflop = false;

      record.log.forEach(function(entry){
        if(entry.seat !== hero) return;
        if(stats.actions[entry.type] != null) stats.actions[entry.type]++;
        if(entry.street !== 'preflop') return;
        // Blind postada não é ação voluntária — por isso postBlind fica de
        // fora tanto da contagem quanto do VPIP.
        if(entry.type === 'call' || entry.type === 'bet' || entry.type === 'raise' || entry.type === 'allin'){
          voluntary = true;
        }
        if(entry.type === 'bet' || entry.type === 'raise' || entry.type === 'allin'){
          raisedPreflop = true;
        }
      });

      if(voluntary) stats.vpipHands++;
      if(raisedPreflop) stats.pfrHands++;

      if(record.winReason === 'showdown' && record.potResults){
        var heroReachedShowdown = record.potResults.evalsBySeat &&
          record.potResults.evalsBySeat[hero] != null;
        if(heroReachedShowdown) stats.showdowns++;

        record.potResults.pots.forEach(function(pot){
          if(pot.eligibleSeats.indexOf(hero) === -1) return;
          var kicker = HandpathEngine.potKicker(pot, record.potResults.evalsBySeat);
          if(!kicker) return;
          stats.kickerHands.push({
            index: record.index,
            won: pot.winners.indexOf(hero) !== -1,
            winnerRank: kicker.winnerRank,
            loserRank: kicker.loserRank,
            evalName: pot.evalName
          });
        });
      }
    });

    // Análise de azar só nas maiores derrotas em showdown (custo de equity).
    var losingShowdowns = history.filter(function(record){
      return record.winReason === 'showdown' && record.heroNet < 0;
    }).sort(function(a, b){ return a.heroNet - b.heroNet; });

    var toAnalyze = losingShowdowns.slice(0, UNLUCKY_ANALYSIS_LIMIT);
    stats.unluckyAnalyzed = toAnalyze.length;
    stats.unluckySkipped = losingShowdowns.length - toAnalyze.length;

    toAnalyze.forEach(function(record){
      var analysis = analyzeUnluckyHand(record, hero);
      if(analysis && analysis.correct) stats.unlucky.push(analysis);
    });

    stats.bb100 = stats.hands > 0 && meta.bigBlind > 0
      ? (stats.net / meta.bigBlind) / stats.hands * 100
      : 0;

    return stats;
  }

  /* =====================================================
     RENDER — helpers de DOM
     ===================================================== */

  function el(tag, className, text){
    var node = document.createElement(tag);
    if(className) node.className = className;
    if(text != null) node.textContent = text;
    return node;
  }

  function fmt(n){
    return Math.round(n).toLocaleString('pt-BR');
  }

  function signed(n){
    return (n > 0 ? '+' : '') + fmt(n);
  }

  function pct(n){
    return (n * 100).toFixed(1) + '%';
  }

  function buildCardEl(card){
    var node = el('div', 'hp-card' + (HandpathEngine.suitColor(card.suit) === 'red' ? ' hp-card--red' : ''));
    node.textContent = HandpathEngine.cardLabel(card);
    return node;
  }

  function buildCardRow(cards, extraClass){
    var row = el('div', 'hp-cards' + (extraClass ? ' ' + extraClass : ''));
    cards.forEach(function(card){ row.appendChild(buildCardEl(card)); });
    return row;
  }

  function statTile(label, value, tone){
    var tile = el('div', 'hp-stat-tile' + (tone ? ' hp-stat-tile--' + tone : ''));
    tile.appendChild(el('div', 'hp-stat-value', value));
    tile.appendChild(el('div', 'hp-stat-label', label));
    return tile;
  }

  /* =====================================================
     RENDER — relatório
     ===================================================== */

  var currentHistory = [];
  var currentMeta = null;
  var currentStats = null;
  var onDoneCallback = null;

  function renderSummary(container, stats){
    var grid = el('div', 'hp-stat-grid');
    var tone = stats.net > 0 ? 'good' : (stats.net < 0 ? 'bad' : null);

    grid.appendChild(statTile('Resultado da sessão', signed(stats.net), tone));
    grid.appendChild(statTile('BB/100', (stats.bb100 >= 0 ? '+' : '') + stats.bb100.toFixed(1), tone));
    grid.appendChild(statTile('Mãos jogadas', String(stats.hands)));
    grid.appendChild(statTile('Mãos ganhas',
      stats.hands ? stats.handsWon + ' (' + pct(stats.handsWon / stats.hands) + ')' : '0'));
    container.appendChild(grid);

    var note = el('p', 'hp-report-note',
      'BB/100 é a métrica padrão de poker: quantas big blinds você ganha (ou perde) a cada 100 mãos. ' +
      'Com ' + stats.hands + ' mão(s), é só uma leitura da sessão — não uma medida confiável do seu nível.');
    container.appendChild(note);
  }

  function renderFrequencies(container, stats){
    container.appendChild(el('h3', 'hp-report-h3', 'Como você jogou'));

    var grid = el('div', 'hp-stat-grid');
    grid.appendChild(statTile('VPIP',
      stats.hands ? pct(stats.vpipHands / stats.hands) : '—'));
    grid.appendChild(statTile('PFR',
      stats.hands ? pct(stats.pfrHands / stats.hands) : '—'));
    grid.appendChild(statTile('Showdowns', String(stats.showdowns)));
    container.appendChild(grid);

    container.appendChild(el('p', 'hp-report-note',
      'VPIP = com que frequência você colocou fichas voluntariamente no pote pré-flop (blind postada não conta). ' +
      'PFR = com que frequência você subiu pré-flop.'));

    var list = el('div', 'hp-freq-list');
    ['fold','check','call','bet','raise','allin'].forEach(function(type){
      var row = el('div', 'hp-freq-row');
      row.appendChild(el('span', 'hp-freq-name', ACTION_LABELS[type]));
      row.appendChild(el('span', 'hp-freq-count', String(stats.actions[type])));
      list.appendChild(row);
    });
    container.appendChild(list);

    if(stats.actions.timeout > 0){
      container.appendChild(el('p', 'hp-report-note hp-report-note--warn',
        'Em ' + stats.actions.timeout + ' decisão(ões) o tempo acabou e a jogada foi automática (check ou fold).'));
    }
  }

  function renderBigPots(container, stats){
    container.appendChild(el('h3', 'hp-report-h3', 'Maiores potes'));
    var wrap = el('div', 'hp-report-rows');

    [
      { record: stats.biggestWin, label: 'Maior pote ganho', positive: true },
      { record: stats.biggestLoss, label: 'Maior pote perdido', positive: false }
    ].forEach(function(item){
      if(!item.record) return;
      if(item.positive && item.record.heroNet <= 0) return;
      if(!item.positive && item.record.heroNet >= 0) return;

      var row = el('div', 'hp-report-row');
      row.appendChild(el('span', 'hp-report-row-label', item.label));
      row.appendChild(el('span', 'hp-report-row-value' + (item.positive ? ' hp-good' : ' hp-bad'),
        signed(item.record.heroNet)));
      row.appendChild(replayButton(item.record.index, 'Mão ' + item.record.index));
      wrap.appendChild(row);
    });

    if(!wrap.children.length){
      wrap.appendChild(el('p', 'hp-report-note', 'Nenhum pote decidido ainda nesta sessão.'));
    }
    container.appendChild(wrap);
  }

  function renderKickers(container, stats){
    container.appendChild(el('h3', 'hp-report-h3', 'Quando o kicker decidiu'));

    if(!stats.kickerHands.length){
      container.appendChild(el('p', 'hp-report-note',
        'Nenhuma mão sua foi decidida pelo kicker nesta sessão.'));
      return;
    }

    container.appendChild(el('p', 'hp-report-note',
      'Mãos em que você e o adversário tinham a mesma combinação, e quem venceu foi a carta de desempate. ' +
      'É o tipo de derrota que parece injusta quando não se entende o kicker.'));

    var wrap = el('div', 'hp-report-rows');
    stats.kickerHands.forEach(function(k){
      var row = el('div', 'hp-report-row');
      row.appendChild(el('span', 'hp-report-row-label',
        k.evalName + ' — kicker ' + HandpathEngine.rankLabel(k.won ? k.winnerRank : k.loserRank) +
        ' contra ' + HandpathEngine.rankLabel(k.won ? k.loserRank : k.winnerRank)));
      row.appendChild(el('span', 'hp-report-row-value' + (k.won ? ' hp-good' : ' hp-bad'),
        k.won ? 'você venceu' : 'você perdeu'));
      row.appendChild(replayButton(k.index, 'Mão ' + k.index));
      wrap.appendChild(row);
    });
    container.appendChild(wrap);
  }

  function renderUnlucky(container, stats){
    container.appendChild(el('h3', 'hp-report-h3', 'Azar, não erro'));

    if(!stats.unluckyAnalyzed){
      container.appendChild(el('p', 'hp-report-note',
        'Você não perdeu nenhum showdown nesta sessão — nada pra analisar aqui.'));
      return;
    }

    if(!stats.unlucky.length){
      container.appendChild(el('p', 'hp-report-note',
        'Analisamos suas ' + stats.unluckyAnalyzed + ' maiores derrotas em showdown e, em todas, ' +
        'o preço que você pagou era maior que a sua chance real de ganhar. Não foi azar.'));
      return;
    }

    container.appendChild(el('p', 'hp-report-note',
      'Nestas mãos você perdeu, mas a decisão estava certa: sua chance real de ganhar era maior que o preço ' +
      'que o pote pedia. Perder aqui é variância, não erro — repetir essa decisão dá lucro no longo prazo.'));

    var wrap = el('div', 'hp-report-rows');
    stats.unlucky.forEach(function(u){
      var row = el('div', 'hp-report-row hp-report-row--stack');
      row.appendChild(el('span', 'hp-report-row-label',
        'No ' + (STREET_LABELS[u.street] || u.street) + ', você pagou ' + fmt(u.amount) +
        ' num pote de ' + fmt(u.potBefore) + '.'));
      row.appendChild(el('span', 'hp-report-row-detail',
        'Precisava de ' + pct(u.required) + ' de equity e tinha ' + pct(u.equity) +
        (u.exact ? '' : ' (estimado por amostragem)') + '.'));
      row.appendChild(replayButton(u.index, 'Mão ' + u.index));
      wrap.appendChild(row);
    });
    container.appendChild(wrap);

    if(stats.unluckySkipped > 0){
      container.appendChild(el('p', 'hp-report-note',
        'Analisamos as ' + stats.unluckyAnalyzed + ' maiores derrotas em showdown; outras ' +
        stats.unluckySkipped + ' não entraram nesta análise.'));
    }
  }

  function renderHandList(container){
    container.appendChild(el('h3', 'hp-report-h3', 'Todas as mãos'));
    container.appendChild(el('p', 'hp-report-note',
      'Clique em qualquer mão pra rever ação por ação, com as cartas de todo mundo.'));

    var list = el('div', 'hp-hand-list');
    currentHistory.forEach(function(record){
      var btn = el('button', 'hp-hand-chip' +
        (record.heroNet > 0 ? ' hp-hand-chip--win' : (record.heroNet < 0 ? ' hp-hand-chip--loss' : '')));
      btn.type = 'button';
      btn.appendChild(el('span', 'hp-hand-chip-index', '#' + record.index));
      btn.appendChild(el('span', 'hp-hand-chip-net', signed(record.heroNet)));
      btn.addEventListener('click', function(){ openReplay(record.index); });
      list.appendChild(btn);
    });
    container.appendChild(list);
  }

  function replayButton(handIndex, label){
    var btn = el('button', 'hp-btn hp-btn--ghost hp-replay-link', label);
    btn.type = 'button';
    btn.addEventListener('click', function(){ openReplay(handIndex); });
    return btn;
  }

  function renderReport(){
    var body = document.getElementById('reportBody');
    body.innerHTML = '';

    if(!currentHistory.length){
      body.appendChild(el('p', 'hp-report-note',
        'Você saiu antes de completar uma mão — não há nada pra relatar desta vez.'));
      return;
    }

    renderSummary(body, currentStats);
    renderBigPots(body, currentStats);
    renderFrequencies(body, currentStats);
    renderKickers(body, currentStats);
    renderUnlucky(body, currentStats);
    renderHandList(body);
  }

  /* =====================================================
     RENDER — replay
     ===================================================== */

  var replayRecord = null;
  var replayStep = -1;

  function openReplay(handIndex){
    replayRecord = null;
    for(var i=0;i<currentHistory.length;i++){
      if(currentHistory[i].index === handIndex){ replayRecord = currentHistory[i]; break; }
    }
    if(!replayRecord) return;

    replayStep = -1;
    document.getElementById('replayScreen').hidden = false;
    document.getElementById('reportScreen').hidden = true;
    renderReplay();
  }

  function closeReplay(){
    document.getElementById('replayScreen').hidden = true;
    document.getElementById('reportScreen').hidden = false;
  }

  function describeEntry(entry, record){
    if(!entry) return 'Início da mão — blinds postadas.';
    var name = entry.seat != null && record.players[entry.seat]
      ? record.players[entry.seat].name
      : '';

    if(entry.type === 'postBlind'){
      return name + ' postou ' + (entry.blind === 'sb' ? 'small blind' : 'big blind') + ' (' + fmt(entry.amount) + ')';
    }
    if(entry.type === 'potAwarded'){
      var winners = entry.seats.map(function(s){ return record.players[s].name; }).join(' e ');
      return winners + ' ganhou ' + fmt(entry.amount) + ' com ' + entry.evalName;
    }
    if(entry.type === 'uncontestedWin'){
      return name + ' levou ' + fmt(entry.amount) + ' — todos os outros desistiram';
    }
    if(entry.type === 'timeout'){
      return name + ' deixou o tempo acabar';
    }
    if(entry.amount != null){
      return name + ' — ' + (ACTION_LABELS[entry.type] || entry.type) + ' ' + fmt(entry.amount);
    }
    return name + ' — ' + (ACTION_LABELS[entry.type] || entry.type);
  }

  function renderReplay(){
    var record = replayRecord;
    var view = replayStateAt(record, replayStep);

    document.getElementById('replayTitle').textContent =
      'Mão ' + record.index + ' de ' + currentHistory.length;

    var streetEl = document.getElementById('replayStreet');
    streetEl.textContent = STREET_LABELS[view.street] || view.street;

    document.getElementById('replayPot').textContent = fmt(view.pot);

    var boardWrap = document.getElementById('replayBoard');
    boardWrap.innerHTML = '';
    if(view.board.length){
      boardWrap.appendChild(buildCardRow(view.board, 'hp-cards--board'));
    } else {
      boardWrap.appendChild(el('span', 'hp-report-note', 'Board ainda não aberto (pre-flop).'));
    }

    var actionEl = document.getElementById('replayAction');
    actionEl.textContent = describeEntry(view.lastEntry, record);

    var seatsWrap = document.getElementById('replaySeats');
    seatsWrap.innerHTML = '';
    record.players.forEach(function(player){
      if(player.sittingOut) return;

      var seatEl = el('div', 'hp-replay-seat' + (view.folded[player.seat] ? ' hp-replay-seat--folded' : ''));

      var head = el('div', 'hp-replay-seat-head');
      var nameText = player.seat === currentMeta.heroSeat ? player.name + ' (você)' : player.name;
      head.appendChild(el('span', 'hp-replay-seat-name', nameText));
      var presets = window.HandpathBots && window.HandpathBots.presets;
      if(player.archetypeKey && presets && presets[player.archetypeKey]){
        head.appendChild(el('span', 'hp-replay-seat-archetype', presets[player.archetypeKey].name));
      }
      seatEl.appendChild(head);

      // Replay é pós-mesa e pós-quiz: mostrar as cartas de todo mundo é o
      // ponto da feature, não vazamento de informação.
      if(player.holeCards && player.holeCards.length){
        seatEl.appendChild(buildCardRow(player.holeCards));
      }

      var info = el('div', 'hp-replay-seat-info');
      info.appendChild(el('span', 'hp-replay-seat-stack', fmt(player.startingStack) + ' → ' + fmt(player.endingStack)));
      if(view.committed[player.seat] > 0){
        info.appendChild(el('span', 'hp-replay-seat-bet', fmt(view.committed[player.seat])));
      }
      seatEl.appendChild(info);

      seatsWrap.appendChild(seatEl);
    });

    document.getElementById('replayProgress').textContent =
      Math.max(0, replayStep + 1) + ' / ' + record.log.length;
    document.getElementById('btnReplayPrev').disabled = replayStep < 0;
    document.getElementById('btnReplayNext').disabled = replayStep >= record.log.length - 1;
  }

  /* =====================================================
     API PÚBLICA + WIRING
     ===================================================== */

  HandpathReport.open = function(history, meta, onDone){
    currentHistory = history || [];
    currentMeta = meta;
    onDoneCallback = onDone;
    currentStats = currentHistory.length ? buildStats(currentHistory, meta) : null;

    document.getElementById('replayScreen').hidden = true;
    document.getElementById('reportScreen').hidden = false;
    renderReport();
  };

  // Resumo agregado que vai pro Supabase (persistência híbrida — as mãos
  // completas ficam só em memória). É pequeno de propósito: é a base
  // histórica que rating/ELO e detecção de vazamento vão consumir depois.
  HandpathReport.buildSessionSummary = function(history, meta){
    if(!history || !history.length) return null;
    var stats = buildStats(history, meta);
    return {
      hands: stats.hands,
      net: stats.net,
      bb100: Number(stats.bb100.toFixed(2)),
      hands_won: stats.handsWon,
      showdowns: stats.showdowns,
      vpip: stats.hands ? Number((stats.vpipHands / stats.hands).toFixed(4)) : 0,
      pfr: stats.hands ? Number((stats.pfrHands / stats.hands).toFixed(4)) : 0,
      actions: stats.actions,
      kicker_hands: stats.kickerHands.length,
      unlucky_hands: stats.unlucky.length,
      level: meta.level,
      big_blind: meta.bigBlind,
      buy_in: meta.buyIn
    };
  };

  // O wiring só roda se o DOM da mesa existir. Isso deixa o módulo
  // carregável em Node (a simulação de validação exercita a matemática
  // — replay, stats, equity — sem navegador, como o resto do projeto).
  if(typeof document !== 'undefined' && document.getElementById('btnReplayPrev')){
    document.getElementById('btnReplayPrev').addEventListener('click', function(){
      if(replayStep >= 0){ replayStep--; renderReplay(); }
    });
    document.getElementById('btnReplayNext').addEventListener('click', function(){
      if(replayRecord && replayStep < replayRecord.log.length - 1){ replayStep++; renderReplay(); }
    });
    document.getElementById('btnReplayBack').addEventListener('click', closeReplay);
    document.getElementById('btnReportDone').addEventListener('click', function(){
      document.getElementById('reportScreen').hidden = true;
      if(onDoneCallback) onDoneCallback();
    });
  }

  // Expostos pro teste em Node (ver a simulação citada em ../ui/README.md).
  HandpathReport._internals = {
    replayStateAt: replayStateAt,
    applyLogEntry: applyLogEntry,
    buildStats: buildStats,
    equityAt: equityAt,
    analyzeUnluckyHand: analyzeUnluckyHand,
    lastHeroCall: lastHeroCall
  };

})();
