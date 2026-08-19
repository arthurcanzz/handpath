/* =====================================================
   HANDPATH TRAINER — UI DA MESA 6-MAX
   Liga trainer/engine (regras do jogo) + trainer/bots
   (decisão dos oponentes) a uma mesa 6-max jogável no
   navegador. Sem framework, arquivo próprio — mesma
   convenção da landing page (ver CLAUDE.md).
   ===================================================== */

(function(){
  "use strict";

  var SEAT_COUNT = 6;
  var HERO_SEAT = 0;
  var BOT_DELAY_MIN_MS = 2000;
  var BOT_DELAY_MAX_MS = 6000;
  var TURN_SECONDS = 30;
  var TIMER_CIRCUMFERENCE = 2 * Math.PI * 16;

  var LEVEL_ROSTERS = {
    beginner: ['beginner', 'beginner', 'beginner', 'callingStation', 'callingStation'],
    intermediate: ['intermediate', 'intermediate', 'callingStation', 'nit', 'tag'],
    advanced: ['tag', 'lag', 'nit', 'maniac', 'shortStackShover']
  };

  // Nomes neutros pros bots — o arquétipo real (Nit, TAG, Calling Station...)
  // fica só como dado interno, revelado no quiz pós-mesa (ver session.js),
  // nunca durante o jogo (Fase 2, ver handpath-game-upgrade-prompt.md).
  var BOT_NAME_POOL = ['Alex', 'Sam', 'Chris', 'Nico', 'Jordan', 'Casey', 'Riley', 'Morgan', 'Taylor', 'Robin', 'Drew', 'Quinn'];

  var ACTION_LABELS = { fold: 'fold', check: 'check', call: 'call', bet: 'bet', raise: 'raise', allin: 'all-in' };
  var STREET_LABELS = { preflop: 'Pre-flop', flop: 'Flop', turn: 'Turn', river: 'River', showdown: 'Showdown' };

  var currentLevel = null;
  var botPresetNames = [];
  var playerNames = [];
  var persistentStacks = [];
  var dealerIndex = 0;
  var currentSmallBlind = 0;
  var currentBigBlind = 0;
  var currentBuyIn = 0;
  var state = null;
  var seatEls = [];
  var lastBoardLength = 0;

  var timerInterval = null;
  var timerRemaining = TURN_SECONDS;
  var botActTimeout = null;

  /* ---------------- helpers genéricos ---------------- */

  function findAction(actions, type){
    for(var i=0;i<actions.length;i++){
      if(actions[i].type === type) return actions[i];
    }
    return null;
  }

  function initials(name){
    var parts = name.split(/\s+/).filter(Boolean);
    if(parts.length === 0) return '?';
    if(parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  function hasGsap(){ return typeof gsap !== 'undefined'; }
  function prefersReducedMotion(){
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function canAnimate(){ return hasGsap() && !prefersReducedMotion(); }

  /* ---------------- lobby / sessão ---------------- */

  function buildPlayerNames(presetNames){
    var pool = BOT_NAME_POOL.slice();
    var names = ['Você'];
    presetNames.forEach(function(){
      var idx = Math.floor(Math.random() * pool.length);
      names.push(pool.splice(idx, 1)[0]);
    });
    return names;
  }

  function startSession(level, tableConfig){
    currentLevel = level;
    botPresetNames = LEVEL_ROSTERS[level];
    playerNames = buildPlayerNames(botPresetNames);
    currentSmallBlind = tableConfig.smallBlind;
    currentBigBlind = tableConfig.bigBlind;
    currentBuyIn = tableConfig.buyIn;

    persistentStacks = [];
    for(var i=0;i<SEAT_COUNT;i++) persistentStacks.push(currentBuyIn);
    dealerIndex = 0;

    buildSeatElements();
    document.getElementById('buyinScreen').hidden = true;
    document.getElementById('tableScreen').hidden = false;

    startNewHand();
  }

  function countAliveSeats(){
    var n = 0;
    for(var i=0;i<SEAT_COUNT;i++) if(persistentStacks[i] > 0) n++;
    return n;
  }

  function isGameOver(){
    return persistentStacks[HERO_SEAT] <= 0 || countAliveSeats() <= 1;
  }

  function rotateDealer(){
    var next = dealerIndex;
    for(var step=0; step<SEAT_COUNT; step++){
      next = (next + 1) % SEAT_COUNT;
      if(persistentStacks[next] > 0){ dealerIndex = next; return; }
    }
  }

  /* ---------------- seats (DOM) ---------------- */

  function buildSeatElements(){
    var oval = document.getElementById('tableOval');
    seatEls.forEach(function(seat){ if(seat.root.parentNode) seat.root.parentNode.removeChild(seat.root); });
    seatEls = [];

    for(var i=0;i<SEAT_COUNT;i++){
      seatEls.push(buildSeatElement(i));
      oval.appendChild(seatEls[i].root);
    }
  }

  function buildSeatElement(seatIndex){
    var root = document.createElement('div');
    root.className = 'hp-seat';
    root.setAttribute('data-slot', String(seatIndex));

    var avatar = document.createElement('div');
    avatar.className = 'hp-seat-avatar';
    avatar.style.background = 'var(--avatar-' + (seatIndex + 1) + ')';

    var dealerBtn = document.createElement('div');
    dealerBtn.className = 'hp-seat-dealer-btn';
    dealerBtn.textContent = 'D';
    dealerBtn.hidden = true;
    avatar.appendChild(dealerBtn);

    var panel = document.createElement('div');
    panel.className = 'hp-seat-panel';
    var name = document.createElement('div');
    name.className = 'hp-seat-name';
    var stack = document.createElement('div');
    stack.className = 'hp-seat-stack';
    panel.appendChild(name);
    panel.appendChild(stack);

    var cards = document.createElement('div');
    cards.className = 'hp-seat-cards';

    var bet = document.createElement('div');
    bet.className = 'hp-seat-bet';
    bet.hidden = true;

    root.appendChild(avatar);
    root.appendChild(panel);
    root.appendChild(cards);
    root.appendChild(bet);

    return { root: root, avatar: avatar, name: name, stack: stack, cards: cards, bet: bet, dealerBtn: dealerBtn };
  }

  /* ---------------- render ---------------- */

  function buildCardEl(card, faceDown){
    var el = document.createElement('div');
    if(faceDown){
      el.className = 'hp-card hp-card--back';
      return el;
    }
    el.className = 'hp-card' + (HandpathEngine.suitColor(card.suit) === 'red' ? ' hp-card--red' : '');
    el.textContent = HandpathEngine.cardLabel(card);
    return el;
  }

  function renderCards(container, cards, faceDown){
    container.innerHTML = '';
    cards.forEach(function(card){ container.appendChild(buildCardEl(card, faceDown)); });
  }

  function renderSeats(){
    for(var i=0;i<SEAT_COUNT;i++){
      var p = state.players[i];
      var el = seatEls[i];

      el.root.hidden = p.sittingOut;
      if(p.sittingOut) continue;

      el.root.classList.toggle('hp-seat--folded', p.folded);
      el.root.classList.toggle('hp-seat--acting', !state.isOver && state.actingIndex === i);

      el.name.textContent = p.name;
      el.stack.textContent = p.stack;

      var revealAtShowdown = state.isOver && state.winReason === 'showdown' && !p.folded;
      var faceDown = i !== HERO_SEAT && !revealAtShowdown;
      renderCards(el.cards, p.holeCards, faceDown);

      if(p.committed > 0){
        el.bet.hidden = false;
        el.bet.textContent = p.committed;
      } else {
        el.bet.hidden = true;
      }

      el.dealerBtn.hidden = (i !== state.dealerIndex);
    }
  }

  function setAvatarInitials(){
    for(var i=0;i<SEAT_COUNT;i++){
      var p = state.players[i];
      if(p.sittingOut) continue;
      var el = seatEls[i];
      // recria o texto do avatar preservando o dealerBtn (filho já anexado)
      var textNode = el.avatar.childNodes[0];
      if(textNode && textNode.nodeType === 3){
        textNode.textContent = initials(p.name);
      } else {
        el.avatar.insertBefore(document.createTextNode(initials(p.name)), el.avatar.firstChild);
      }
    }
  }

  function renderBoard(){
    document.getElementById('potAmount').textContent = state.pot;
    var boardEl = document.getElementById('boardCards');
    renderCards(boardEl, state.board, false);

    if(canAnimate() && state.board.length > lastBoardLength){
      var newCards = Array.prototype.slice.call(boardEl.children, lastBoardLength);
      gsap.from(newCards, { opacity: 0, y: -10, duration: 0.35, stagger: 0.08, ease: 'power2.out' });
    }
    lastBoardLength = state.board.length;
  }

  function buildResultMessage(){
    if(state.winReason === 'fold'){
      return state.players[state.winnerIndex].name + ' venceu — todos os outros desistiram.';
    }
    var parts = state.potResults.pots.map(function(pot){
      var names = pot.winners.map(function(seat){ return state.players[seat].name; }).join(' e ');
      return names + ' ganhou ' + pot.amount + ' (' + pot.evalName + ')';
    });
    return parts.join(' · ');
  }

  function renderStatus(){
    var text = document.getElementById('statusText');
    var timerBox = document.getElementById('turnTimer');

    if(state.isOver){
      text.textContent = buildResultMessage();
      if(isGameOver()) text.textContent += ' — fim de jogo, saia da mesa pra sacar suas fichas.';
      timerBox.hidden = true;
      return;
    }

    var actor = state.players[state.actingIndex];
    text.textContent = state.actingIndex === HERO_SEAT ? 'Sua vez' : actor.name + ' está pensando…';
  }

  function renderNextHandBar(){
    var bar = document.getElementById('nextHandBar');
    // Fim de jogo (herói zerou ou só ele sobrou) não reseta fichas de graça
    // — isso seria dinheiro infinito agora que o bankroll é persistido de
    // verdade. Nesse caso o único caminho é "Sair da mesa", que faz o
    // cash-out real do que sobrou (ver btnLeaveTable em session.js).
    bar.hidden = !state.isOver || isGameOver();
  }

  function textSpan(className, text){
    var span = document.createElement('span');
    span.className = className;
    span.textContent = text;
    return span;
  }
  function pillSpan(pillType, text){
    var span = document.createElement('span');
    span.className = 'hp-log-pill hp-log-pill--' + pillType;
    span.textContent = text;
    return span;
  }

  function buildLogItem(entry){
    var li = document.createElement('li');
    li.className = 'hp-log-item';

    if(entry.type === 'postBlind'){
      li.appendChild(textSpan('hp-log-actor', state.players[entry.seat].name));
      li.appendChild(pillSpan('call', entry.blind === 'sb' ? 'SB' : 'BB'));
      li.appendChild(textSpan('hp-log-amount', String(entry.amount)));
      return li;
    }
    if(entry.type === 'potAwarded'){
      var names = entry.seats.map(function(s){ return state.players[s].name; }).join(' e ');
      li.appendChild(textSpan('hp-log-actor', names));
      li.appendChild(pillSpan('result', entry.evalName));
      li.appendChild(textSpan('hp-log-amount', '+' + entry.amount));
      return li;
    }
    if(entry.type === 'uncontestedWin'){
      li.appendChild(textSpan('hp-log-actor', state.players[entry.seat].name));
      li.appendChild(pillSpan('result', 'venceu'));
      li.appendChild(textSpan('hp-log-amount', '+' + entry.amount));
      return li;
    }

    li.appendChild(textSpan('hp-log-actor', state.players[entry.seat].name));
    li.appendChild(pillSpan(entry.type, ACTION_LABELS[entry.type] || entry.type));
    if(entry.amount != null) li.appendChild(textSpan('hp-log-amount', String(entry.amount)));
    return li;
  }

  function renderLog(){
    var list = document.getElementById('logList');
    list.innerHTML = '';
    var lastStreet = null;

    state.log.forEach(function(entry){
      if(entry.street !== lastStreet){
        var divider = document.createElement('li');
        divider.className = 'hp-log-street-divider';
        divider.textContent = STREET_LABELS[entry.street] || entry.street;
        list.appendChild(divider);
        lastStreet = entry.street;
      }
      list.appendChild(buildLogItem(entry));
    });
  }

  function renderActions(){
    var actions = (!state.isOver && state.actingIndex === HERO_SEAT) ? HandpathEngine.legalActions(state) : [];

    var foldAction = findAction(actions, 'fold');
    var checkAction = findAction(actions, 'check');
    var callAction = findAction(actions, 'call');
    var betAction = findAction(actions, 'bet') || findAction(actions, 'raise');
    var allinAction = findAction(actions, 'allin');

    var btnFold = document.getElementById('btnFold');
    var btnCheckCall = document.getElementById('btnCheckCall');
    var btnBetRaise = document.getElementById('btnBetRaise');
    var btnAllin = document.getElementById('btnAllin');
    var slider = document.getElementById('raiseSlider');
    var output = document.getElementById('raiseAmount');

    btnFold.disabled = !foldAction;

    if(checkAction){
      btnCheckCall.textContent = 'Check';
      btnCheckCall.disabled = false;
    } else if(callAction){
      btnCheckCall.textContent = 'Call ' + callAction.amount;
      btnCheckCall.disabled = false;
    } else {
      btnCheckCall.textContent = 'Check';
      btnCheckCall.disabled = true;
    }

    if(betAction){
      slider.min = betAction.min;
      slider.max = betAction.max;
      slider.step = Math.max(1, Math.round(state.bigBlind / 2));
      slider.value = betAction.min;
      output.textContent = slider.value;
      slider.disabled = false;
      btnBetRaise.disabled = false;
      btnBetRaise.textContent = state.currentBet === 0 ? 'Apostar' : 'Raise';
    } else {
      slider.value = 0;
      output.textContent = '0';
      slider.disabled = true;
      btnBetRaise.disabled = true;
    }

    btnAllin.disabled = !allinAction;
  }

  function render(){
    for(var i=0;i<SEAT_COUNT;i++) persistentStacks[i] = state.players[i].stack;

    // Só dá pra sair da mesa (cash-out) entre mãos — no meio de uma mão as
    // fichas comprometidas no pote ainda não têm dono definido.
    document.getElementById('btnLeaveTable').disabled = !state.isOver;

    renderSeats();
    setAvatarInitials();
    renderBoard();
    renderLog();
    renderStatus();
    renderNextHandBar();
    renderActions();
  }

  /* ---------------- animações (GSAP, opcional) ---------------- */

  function animateNewHandStart(){
    if(!canAnimate()) return;
    gsap.fromTo('#deckStack', { scale: 0.8 }, { scale: 1, duration: 0.3, ease: 'back.out(2)' });

    var cardEls = [];
    seatEls.forEach(function(seat){
      if(!seat.root.hidden) cardEls = cardEls.concat(Array.prototype.slice.call(seat.cards.children));
    });
    if(cardEls.length){
      gsap.from(cardEls, { opacity: 0, y: -8, duration: 0.3, stagger: 0.04, delay: 0.15, ease: 'power2.out' });
    }
  }

  function flyChipToPot(seatIndex, amount){
    if(!canAnimate()) return;
    var seatEl = seatEls[seatIndex] && seatEls[seatIndex].root;
    var tableEl = document.getElementById('tableOval');
    var potEl = document.querySelector('.hp-board-area');
    if(!seatEl || !tableEl || !potEl) return;

    var seatRect = seatEl.getBoundingClientRect();
    var tableRect = tableEl.getBoundingClientRect();
    var potRect = potEl.getBoundingClientRect();

    var startX = seatRect.left - tableRect.left + seatRect.width / 2;
    var startY = seatRect.top - tableRect.top + seatRect.height / 2;
    var destX = potRect.left - tableRect.left + potRect.width / 2;
    var destY = potRect.top - tableRect.top + potRect.height / 2;

    var chip = document.createElement('div');
    chip.className = 'hp-chip-fly';
    chip.textContent = '$' + amount;
    chip.style.left = startX + 'px';
    chip.style.top = startY + 'px';
    tableEl.appendChild(chip);

    gsap.fromTo(chip, { opacity: 0, scale: 0.6 }, {
      opacity: 1, scale: 1, duration: 0.12,
      onComplete: function(){
        gsap.to(chip, {
          left: destX, top: destY, opacity: 0, duration: 0.45, ease: 'power1.in',
          onComplete: function(){ if(chip.parentNode) chip.parentNode.removeChild(chip); }
        });
      }
    });
  }

  /* ---------------- turno: timer do herói / delay do bot ---------------- */

  function stopTurnTimer(){
    if(timerInterval){ clearInterval(timerInterval); timerInterval = null; }
    document.getElementById('turnTimer').hidden = true;
  }

  function updateTimerDisplay(){
    var fill = document.getElementById('timerFillCircle');
    var pct = Math.max(0, timerRemaining / TURN_SECONDS);
    fill.style.strokeDasharray = String(TIMER_CIRCUMFERENCE);
    fill.style.strokeDashoffset = String(TIMER_CIRCUMFERENCE * (1 - pct));
    fill.classList.toggle('hp-timer-fill--urgent', timerRemaining <= 10);
    document.getElementById('timerNum').textContent = Math.max(0, timerRemaining);
  }

  function startTurnTimer(){
    stopTurnTimer();
    timerRemaining = TURN_SECONDS;
    document.getElementById('turnTimer').hidden = false;
    updateTimerDisplay();

    timerInterval = setInterval(function(){
      timerRemaining--;
      updateTimerDisplay();
      if(timerRemaining <= 0){
        stopTurnTimer();
        autoActOnTimeout();
      }
    }, 1000);
  }

  function autoActOnTimeout(){
    var actions = HandpathEngine.legalActions(state);
    var check = findAction(actions, 'check');
    state.log.push({ street: state.street, type: 'timeout', seat: HERO_SEAT });
    applyHeroAction(check ? { type: 'check' } : { type: 'fold' });
  }

  function afterActionApplied(prevLogLength){
    var newEntries = state.log.slice(prevLogLength);
    if(newEntries.length > 0){
      var first = newEntries[0];
      if(first.type === 'call' || first.type === 'bet' || first.type === 'raise' || first.type === 'allin'){
        flyChipToPot(first.seat, first.amount);
      }
    }
    render();
  }

  function applyHeroAction(action){
    stopTurnTimer();
    var prevLogLength = state.log.length;
    try{
      HandpathEngine.applyAction(state, HERO_SEAT, action);
    } catch(err){
      document.getElementById('statusText').textContent = err.message;
      if(!state.isOver) startTurnTimer();
      return;
    }
    afterActionApplied(prevLogLength);
    maybeAdvanceTurn();
  }

  function maybeAdvanceTurn(){
    if(state.isOver) return;

    if(state.actingIndex === HERO_SEAT){
      startTurnTimer();
      return;
    }

    var seat = state.actingIndex;
    var presetName = botPresetNames[seat - 1];
    var delay = BOT_DELAY_MIN_MS + Math.random() * (BOT_DELAY_MAX_MS - BOT_DELAY_MIN_MS);

    botActTimeout = setTimeout(function(){
      botActTimeout = null;
      var action = HandpathBots.paramBot.decide(state, seat, HandpathBots.presets[presetName]);
      var prevLogLength = state.log.length;
      HandpathEngine.applyAction(state, seat, action);
      afterActionApplied(prevLogLength);
      maybeAdvanceTurn();
    }, delay);
  }

  function setRaiseSizing(potFraction){
    var actions = HandpathEngine.legalActions(state);
    var betAction = findAction(actions, 'bet') || findAction(actions, 'raise');
    if(!betAction) return;

    var target = state.currentBet + Math.round(state.pot * potFraction);
    target = Math.max(betAction.min, Math.min(target, betAction.max));

    document.getElementById('raiseSlider').value = target;
    document.getElementById('raiseAmount').textContent = target;
  }

  /* ---------------- ciclo de mão ---------------- */

  function startNewHand(){
    stopTurnTimer();
    if(botActTimeout){ clearTimeout(botActTimeout); botActTimeout = null; }
    lastBoardLength = 0;

    var configPlayers = [];
    for(var i=0;i<SEAT_COUNT;i++){
      configPlayers.push({ id: 'seat' + i, name: playerNames[i], isBot: i !== HERO_SEAT, stack: persistentStacks[i] });
    }

    state = HandpathEngine.createHandState({
      players: configPlayers,
      dealerIndex: dealerIndex,
      smallBlind: currentSmallBlind,
      bigBlind: currentBigBlind
    });

    render();
    animateNewHandStart();
    maybeAdvanceTurn();
  }

  /* ---------------- wiring ---------------- */

  document.getElementById('btnFold').addEventListener('click', function(){
    applyHeroAction({ type: 'fold' });
  });

  document.getElementById('btnCheckCall').addEventListener('click', function(){
    var actions = HandpathEngine.legalActions(state);
    var action = findAction(actions, 'check') || findAction(actions, 'call');
    if(action) applyHeroAction({ type: action.type });
  });

  document.getElementById('btnBetRaise').addEventListener('click', function(){
    var actions = HandpathEngine.legalActions(state);
    var betAction = findAction(actions, 'bet') || findAction(actions, 'raise');
    if(!betAction) return;
    applyHeroAction({ type: betAction.type, amount: Number(document.getElementById('raiseSlider').value) });
  });

  document.getElementById('btnAllin').addEventListener('click', function(){
    applyHeroAction({ type: 'allin' });
  });

  document.getElementById('raiseSlider').addEventListener('input', function(){
    document.getElementById('raiseAmount').textContent = this.value;
  });

  document.getElementById('btnHalfPot').addEventListener('click', function(){ setRaiseSizing(0.5); });
  document.getElementById('btnPot').addEventListener('click', function(){ setRaiseSizing(1); });

  document.getElementById('btnNextHand').addEventListener('click', function(){
    rotateDealer();
    startNewHand();
  });

  /* ---------------- API pública pra session.js (auth/bankroll/buy-in) ---------------- */

  window.HandpathTable = {
    start: function(level, tableConfig){ startSession(level, tableConfig); },
    getHeroChips: function(){ return persistentStacks[HERO_SEAT]; },
    isHandInProgress: function(){ return !!state && !state.isOver; },
    exitTable: function(){
      stopTurnTimer();
      if(botActTimeout){ clearTimeout(botActTimeout); botActTimeout = null; }
      document.getElementById('tableScreen').hidden = true;
    },
    getRosterForQuiz: function(){
      var roster = [];
      for(var i=0; i<botPresetNames.length; i++){
        var key = botPresetNames[i];
        var preset = HandpathBots.presets[key];
        roster.push({
          displayName: playerNames[i + 1],
          archetypeKey: key,
          archetypeName: preset.name,
          description: preset.description
        });
      }
      return roster;
    }
  };

})();
