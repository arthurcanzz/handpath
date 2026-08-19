/* =====================================================
   HANDPATH ENGINE — MESA (NLHE N-MAX, COM SIDE POTS)
   Máquina de estados de UMA mão de No-Limit Hold'em pra
   2 a N jogadores: blinds, ordem de ação (heads-up é o
   caso especial real do poker — button/SB age primeiro
   preflop; com 3+, SB/BB postam e UTG age primeiro),
   apostas, all-in com side pots, e showdown. Sem UI, sem
   bot — só regras do jogo.

   Ver trainer/engine/README.md pra como os pots são
   calculados (buildSidePots) e trainer/README.md pro
   contexto do produto.
   ===================================================== */

(function(){
  "use strict";

  var HandpathEngine = window.HandpathEngine = window.HandpathEngine || {};

  function isDealtIn(p){ return !p.sittingOut; }
  function isActionable(p){ return !p.folded && !p.allIn && !p.sittingOut; }

  function countDealtIn(players){
    var n = 0;
    for(var i=0;i<players.length;i++) if(isDealtIn(players[i])) n++;
    return n;
  }

  function countActionable(state){
    var n = 0;
    for(var i=0;i<state.players.length;i++) if(isActionable(state.players[i])) n++;
    return n;
  }

  function countNonFolded(state){
    var n = 0;
    for(var i=0;i<state.players.length;i++){
      var p = state.players[i];
      if(!p.folded && !p.sittingOut) n++;
    }
    return n;
  }

  // Anda pela mesa a partir de fromIndex e retorna o primeiro seat que
  // satisfaz predicate (nunca inclui o próprio fromIndex). null se nenhum.
  function nextSeat(state, fromIndex, predicate){
    var n = state.players.length;
    for(var step=1; step<=n; step++){
      var i = (fromIndex + step) % n;
      if(predicate(state.players[i])) return i;
    }
    return null;
  }

  // Entradas de log são estruturadas (type/seat/amount/...), não frases
  // prontas — a UI decide como apresentar (texto completo, pílula
  // concisa, ícone etc.), o motor só registra o fato.
  function log(state, entry){
    entry.street = state.street;
    state.log.push(entry);
  }

  function commit(state, index, amount){
    var player = state.players[index];
    var actual = Math.min(amount, player.stack);
    player.stack -= actual;
    player.committed += actual;
    player.totalCommitted += actual;
    state.pot += actual;
    if(player.stack === 0) player.allIn = true;
  }

  function dealBoard(state, n){
    state.board = state.board.concat(HandpathEngine.draw(state.deck, n));
  }

  function dealRemainingBoard(state){
    if(state.board.length === 0) dealBoard(state, 3);
    if(state.board.length === 3) dealBoard(state, 1);
    if(state.board.length === 4) dealBoard(state, 1);
  }

  // Reparte state.pot em pot principal + side pots a partir de quanto cada
  // jogador investiu no total da mão (totalCommitted). Cada camada é
  // elegível só pra quem não foldou e cobriu aquele nível — quem foldou
  // ainda "paga" pra dentro da camada (dinheiro morto) mas nunca ganha.
  // Devolver aposta não pareada sai de graça: é a camada de cima com um
  // único elegível. Ver trainer/engine/README.md pro desenho completo.
  function buildSidePots(state){
    var players = state.players;

    var tiersSeen = {};
    var tiers = [];
    for(var i=0;i<players.length;i++){
      var p = players[i];
      if(!p.folded && !p.sittingOut && p.totalCommitted > 0 && !tiersSeen[p.totalCommitted]){
        tiersSeen[p.totalCommitted] = true;
        tiers.push(p.totalCommitted);
      }
    }
    tiers.sort(function(a,b){ return a - b; });

    var pots = [];
    var floor = 0;

    for(var t=0;t<tiers.length;t++){
      var tier = tiers[t];
      var layerAmount = 0;
      var eligibleSeats = [];

      for(var j=0;j<players.length;j++){
        var pl = players[j];
        var contributionInLayer = Math.max(0, Math.min(pl.totalCommitted, tier) - floor);
        layerAmount += contributionInLayer;

        if(!pl.folded && !pl.sittingOut && pl.totalCommitted >= tier){
          eligibleSeats.push(j);
        }
      }

      if(layerAmount > 0){
        pots.push({ amount: layerAmount, eligibleSeats: eligibleSeats });
      }
      floor = tier;
    }

    return pots;
  }

  function finishHand(state, winnerIndex, reason, potResults){
    state.isOver = true;
    state.street = 'showdown';
    state.winReason = reason;
    state.winnerIndex = winnerIndex;
    state.potResults = potResults || null;
  }

  function finishHandUncontested(state, winnerIndex){
    state.players[winnerIndex].stack += state.pot;
    log(state, { type: 'uncontestedWin', seat: winnerIndex, amount: state.pot });
    finishHand(state, winnerIndex, 'fold', null);
  }

  function resolveShowdown(state){
    var evalsBySeat = {};
    for(var i=0;i<state.players.length;i++){
      var p = state.players[i];
      if(!p.folded && !p.sittingOut){
        evalsBySeat[i] = HandpathEngine.evaluateBest(p.holeCards.concat(state.board));
      }
    }

    var pots = buildSidePots(state);
    var potSummaries = [];

    for(var k=0;k<pots.length;k++){
      var pot = pots[k];
      var best = null;
      var winners = [];

      for(var s=0;s<pot.eligibleSeats.length;s++){
        var seat = pot.eligibleSeats[s];
        var cmp = best === null ? 1 : HandpathEngine.compareEvals(evalsBySeat[seat], best);
        if(cmp > 0){ best = evalsBySeat[seat]; winners = [seat]; }
        else if(cmp === 0){ winners.push(seat); }
      }

      var share = Math.floor(pot.amount / winners.length);
      var remainder = pot.amount - share * winners.length;
      for(var w=0; w<winners.length; w++){
        state.players[winners[w]].stack += share + (w < remainder ? 1 : 0);
      }

      potSummaries.push({
        amount: pot.amount,
        eligibleSeats: pot.eligibleSeats,
        winners: winners,
        evalName: best.name
      });

      log(state, { type: 'potAwarded', seats: winners, amount: pot.amount, evalName: best.name });
    }

    finishHand(state, null, 'showdown', { evalsBySeat: evalsBySeat, pots: potSummaries });
  }

  function goToNextStreet(state){
    if(state.street === 'river' || countActionable(state) <= 1){
      dealRemainingBoard(state);
      resolveShowdown(state);
      return;
    }

    state.players.forEach(function(p){ p.committed = 0; p.actedThisRound = false; });
    state.currentBet = 0;
    state.minRaise = state.bigBlind;

    if(state.street === 'preflop'){
      state.street = 'flop';
      dealBoard(state, 3);
    } else if(state.street === 'flop'){
      state.street = 'turn';
      dealBoard(state, 1);
    } else if(state.street === 'turn'){
      state.street = 'river';
      dealBoard(state, 1);
    }

    state.actingIndex = nextSeat(state, state.dealerIndex, isActionable);
  }

  function advanceTurnOrStreet(state, raisedThisAction){
    if(state.isOver) return;

    var actorIndex = state.actingIndex;
    state.players[actorIndex].actedThisRound = true;

    if(raisedThisAction){
      for(var i=0;i<state.players.length;i++){
        if(i !== actorIndex && isActionable(state.players[i])){
          state.players[i].actedThisRound = false;
        }
      }
    }

    // Precisa vir depois do reset de actedThisRound (não muda o resultado)
    // mas ANTES de qualquer nextSeat(...): um raise que deixa o próprio
    // raiser all-in pode zerar os jogadores ainda "isActionable" (todo
    // mundo mais all-in ou folded) — nesse caso não há mais ninguém pra
    // agir, e forçar nextSeat aqui devolveria null (bug real encontrado
    // pelo smoke test: actingIndex virava null e legalActions quebrava).
    if(countActionable(state) <= 1){
      goToNextStreet(state);
      return;
    }

    if(raisedThisAction){
      state.actingIndex = nextSeat(state, actorIndex, isActionable);
      return;
    }

    var allSettled = true;
    for(var j=0;j<state.players.length;j++){
      var p = state.players[j];
      if(isActionable(p) && (p.committed !== state.currentBet || !p.actedThisRound)){
        allSettled = false;
        break;
      }
    }

    if(allSettled){
      goToNextStreet(state);
    } else {
      state.actingIndex = nextSeat(state, actorIndex, isActionable);
    }
  }

  function legalActions(state){
    if(state.isOver) return [];
    var player = state.players[state.actingIndex];
    var toCall = state.currentBet - player.committed;
    var actions = [];

    if(toCall <= 0){
      actions.push({ type: 'check' });
    } else {
      actions.push({ type: 'fold' });
      actions.push({ type: 'call', amount: Math.min(toCall, player.stack) });
    }

    var maxTotal = player.committed + player.stack;
    var minTotal = Math.max(state.currentBet + state.minRaise, state.bigBlind);

    if(player.stack > toCall && maxTotal > state.currentBet && minTotal <= maxTotal){
      actions.push({ type: state.currentBet === 0 ? 'bet' : 'raise', min: minTotal, max: maxTotal });
    }
    if(player.stack > 0){
      actions.push({ type: 'allin', amount: maxTotal });
    }

    return actions;
  }

  function applyAction(state, index, action){
    if(state.isOver) throw new Error('A mão já terminou.');
    if(index !== state.actingIndex) throw new Error('Não é a vez desse jogador.');

    var player = state.players[index];
    var toCall = state.currentBet - player.committed;
    var betBefore = state.currentBet;

    if(action.type === 'fold'){
      player.folded = true;
      log(state, { type: 'fold', seat: index });

      if(countNonFolded(state) === 1){
        var winnerIndex = -1;
        for(var w=0; w<state.players.length; w++){
          var wp = state.players[w];
          if(!wp.folded && !wp.sittingOut){ winnerIndex = w; break; }
        }
        finishHandUncontested(state, winnerIndex);
        return state;
      }

      advanceTurnOrStreet(state, false);
      return state;
    }

    if(action.type === 'check'){
      if(toCall > 0) throw new Error('Não é possível dar check com aposta pendente.');
      log(state, { type: 'check', seat: index });

    } else if(action.type === 'call'){
      var callAmount = Math.min(toCall, player.stack);
      commit(state, index, callAmount);
      log(state, { type: 'call', seat: index, amount: callAmount });

    } else if(action.type === 'raise' || action.type === 'bet' || action.type === 'allin'){
      var maxTotal = player.committed + player.stack;
      var targetTotal = action.type === 'allin' ? maxTotal : action.amount;
      var minTotal = Math.max(state.currentBet + state.minRaise, state.bigBlind);

      if(targetTotal > maxTotal) targetTotal = maxTotal;
      if(targetTotal < minTotal && targetTotal < maxTotal){
        throw new Error('Aposta abaixo do mínimo permitido.');
      }

      commit(state, index, targetTotal - player.committed);

      if(player.committed > state.currentBet){
        state.minRaise = Math.max(state.minRaise, player.committed - state.currentBet);
        state.currentBet = player.committed;
      }
      log(state, { type: action.type, seat: index, amount: player.committed });

    } else {
      throw new Error('Ação desconhecida: ' + action.type);
    }

    advanceTurnOrStreet(state, state.currentBet > betBefore);
    return state;
  }

  function assignBlindsAndFirstActor(state){
    if(countDealtIn(state.players) === 2){
      // heads-up: exceção real do poker — o button é o SB e age primeiro preflop.
      state.sbIndex = state.dealerIndex;
      state.bbIndex = nextSeat(state, state.dealerIndex, isDealtIn);
      state.actingIndex = state.sbIndex;
    } else {
      state.sbIndex = nextSeat(state, state.dealerIndex, isDealtIn);
      state.bbIndex = nextSeat(state, state.sbIndex, isDealtIn);
      state.actingIndex = nextSeat(state, state.bbIndex, isDealtIn);
    }
  }

  function createHandState(config){
    // config: { players: [{id,name,isBot,stack}], dealerIndex, smallBlind, bigBlind }
    // Pré-condição: config.dealerIndex aponta pra um seat com stack > 0
    // (a UI é responsável por rotacionar o dealer só entre seats vivos).
    var deck = HandpathEngine.shuffle(HandpathEngine.createDeck());

    var players = config.players.map(function(p){
      return {
        id: p.id,
        name: p.name,
        isBot: !!p.isBot,
        stack: p.stack,
        holeCards: [],
        folded: false,
        allIn: false,
        sittingOut: p.stack <= 0,
        committed: 0,
        totalCommitted: 0,
        actedThisRound: false
      };
    });

    var state = {
      players: players,
      board: [],
      deck: deck,
      pot: 0,
      street: 'preflop',
      dealerIndex: config.dealerIndex,
      sbIndex: null,
      bbIndex: null,
      actingIndex: null,
      currentBet: 0,
      minRaise: config.bigBlind,
      smallBlind: config.smallBlind,
      bigBlind: config.bigBlind,
      isOver: false,
      winnerIndex: null,
      winReason: null,
      potResults: null,
      log: []
    };

    for(var i=0;i<players.length;i++){
      if(!players[i].sittingOut){
        players[i].holeCards = HandpathEngine.draw(state.deck, 2);
      }
    }

    assignBlindsAndFirstActor(state);

    commit(state, state.sbIndex, state.smallBlind);
    commit(state, state.bbIndex, state.bigBlind);
    state.currentBet = Math.max(state.players[state.sbIndex].committed, state.players[state.bbIndex].committed);

    log(state, { type: 'postBlind', seat: state.sbIndex, blind: 'sb', amount: state.players[state.sbIndex].committed });
    log(state, { type: 'postBlind', seat: state.bbIndex, blind: 'bb', amount: state.players[state.bbIndex].committed });

    return state;
  }

  HandpathEngine.createHandState = createHandState;
  HandpathEngine.applyAction = applyAction;
  HandpathEngine.legalActions = legalActions;
  HandpathEngine.nextSeat = nextSeat;
  HandpathEngine.isActionable = isActionable;
  HandpathEngine.isDealtIn = isDealtIn;
  HandpathEngine.buildSidePots = buildSidePots;

})();
