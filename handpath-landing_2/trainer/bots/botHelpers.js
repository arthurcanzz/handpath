/* =====================================================
   HANDPATH BOTS — HELPERS COMPARTILHADOS
   Funções puras usadas por paramBot.js (o motor de decisão
   único, ver trainer/bots/README.md) e por qualquer bot
   futuro que precise ler o estado da mesa. Sem estado
   próprio, sem decisão — só leitura/estimativa.
   ===================================================== */

(function(){
  "use strict";

  var HandpathBots = window.HandpathBots = window.HandpathBots || {};
  var BotHelpers = HandpathBots.helpers = HandpathBots.helpers || {};

  function findAction(actions, type){
    for(var i=0;i<actions.length;i++){
      if(actions[i].type === type) return actions[i];
    }
    return null;
  }

  function clampNum(value, min, max){
    return Math.max(min, Math.min(max, value));
  }

  function rawPreflopScore(holeCards){
    var r1 = holeCards[0].rank, r2 = holeCards[1].rank;
    var high = Math.max(r1, r2), low = Math.min(r1, r2);
    var suited = holeCards[0].suit === holeCards[1].suit;
    var pair = r1 === r2;

    var score = (high - 2) / 12 * 0.5;
    if(pair) score += 0.35 + (high / 14) * 0.15;
    if(suited) score += 0.08;
    var gap = high - low;
    if(!pair && gap <= 4) score += (5 - gap) * 0.02;

    return Math.min(score, 1);
  }

  // O score cru NÃO é uniforme em [0,1]: quase só par alto chega perto do
  // topo (AA = 1.00, mas AKs = 0.66). Só que os presets expressam
  // openingRangeByPosition como FRAÇÃO DE MÃOS ("abre 16% em UTG") e o
  // motor comparava esse número direto com o score cru — na prática um TAG
  // em UTG exigia 0.84+, ou seja ~QQ+, e abria 0.2% das mãos em vez de
  // 16%. Era uma das causas reais da "mesa parada" que
  // handpath-fase2-agressividade.md quer resolver.
  //
  // A tabela abaixo (montada uma vez, no load) ordena o score das 1326
  // mãos iniciais possíveis, e preflopStrength passa a devolver o
  // PERCENTIL da mão — então openSlice significa de fato "as X% melhores".
  var SORTED_PREFLOP_SCORES = (function(){
    var scores = [];
    var deck = HandpathEngine.createDeck();
    for(var i=0;i<deck.length;i++){
      for(var j=i+1;j<deck.length;j++){
        scores.push(rawPreflopScore([deck[i], deck[j]]));
      }
    }
    return scores.sort(function(a, b){ return a - b; });
  })();

  function preflopStrength(holeCards){
    var score = rawPreflopScore(holeCards);
    var lo = 0, hi = SORTED_PREFLOP_SCORES.length;
    while(lo < hi){
      var mid = (lo + hi) >> 1;
      if(SORTED_PREFLOP_SCORES[mid] < score) lo = mid + 1;
      else hi = mid;
    }
    return lo / SORTED_PREFLOP_SCORES.length;
  }

  function estimateStrength(state, seatIndex){
    var player = state.players[seatIndex];
    if(state.board.length === 0) return preflopStrength(player.holeCards);
    var evalResult = HandpathEngine.evaluateBest(player.holeCards.concat(state.board));
    return evalResult.category / 8;
  }

  // NÃO existe mais um sizedBet(action, fraction) aqui de propósito. Ele
  // interpolava entre action.min e action.max — e action.max é o stack
  // inteiro do jogador, então qualquer fraction moderada virava over-bet
  // ou all-in. Foi a causa raiz do bug de "todo raise vira all-in" (item 1
  // de handpath-fase2-agressividade.md). Sizing agora é sempre calculado
  // em valor absoluto (múltiplo de BB / fração de pote) e só depois
  // encaixado no [min, max] legal — ver paramBot.js.

  // 'early' | 'middle' | 'late' | 'button' | 'sb' | 'bb'. Heads-up cai só
  // em sb/bb (o mesmo caso especial real do poker já tratado em table.js).
  // O button tem bucket próprio (não fica junto do CO em 'late') porque
  // abrir de BTN é a posição mais lucrativa da mesa e merece range bem
  // mais largo — item 4 de handpath-fase2-agressividade.md.
  function positionBucket(state, seatIndex){
    var players = state.players;
    var n = players.length;

    var dealtInCount = 0;
    for(var i=0;i<n;i++) if(!players[i].sittingOut) dealtInCount++;

    if(dealtInCount <= 2){
      return seatIndex === state.dealerIndex ? 'sb' : 'bb';
    }
    if(seatIndex === state.sbIndex) return 'sb';
    if(seatIndex === state.bbIndex) return 'bb';

    var distanceFromBB = 0;
    var cursor = state.bbIndex;
    for(var step=0; step<n; step++){
      cursor = (cursor + 1) % n;
      if(players[cursor].sittingOut) continue;
      distanceFromBB++;
      if(cursor === seatIndex) break;
    }

    var nonBlindSeats = dealtInCount - 2;
    // O seat mais distante da BB é o button (age por último pós-flop).
    if(distanceFromBB >= nonBlindSeats) return 'button';

    var pct = nonBlindSeats > 0 ? distanceFromBB / nonBlindSeats : 1;
    if(pct <= 0.34) return 'early';
    if(pct <= 0.67) return 'middle';
    return 'late';
  }

  // Seat do último bet/raise/all-in numa street (null se ninguém apostou
  // nela) — usado pra saber quem foi o agressor pré-flop e ajustar a
  // frequência de continuation bet pós-flop (Caso 2,
  // handpath-ajustes-fase1-fase2.md).
  function lastAggressorSeat(state, street){
    var seat = null;
    for(var i=0;i<state.log.length;i++){
      var entry = state.log[i];
      if(entry.street !== street) continue;
      if(entry.type === 'bet' || entry.type === 'raise' || entry.type === 'allin') seat = entry.seat;
    }
    return seat;
  }

  // Quantos jogadores só pagaram a BB no pré-flop (limp) — zero se já
  // houve raise, porque aí não é mais um pote limpado. Usado pro raise de
  // isolamento (item 3 de handpath-fase2-agressividade.md): sem isso
  // ninguém pune quem limpa, todo mundo só completa junto.
  function countPreflopLimpers(state){
    if(state.board.length > 0) return 0;
    if(state.currentBet > state.bigBlind) return 0;

    var n = 0;
    for(var i=0;i<state.log.length;i++){
      var entry = state.log[i];
      if(entry.street !== 'preflop') continue;
      if(entry.type === 'call') n++;
    }
    return n;
  }

  // Pré-flop com um raise E pelo menos um call depois dele — o spot
  // clássico de squeeze (item 6). Calls anteriores ao raise não contam:
  // o que caracteriza o squeeze é alguém já ter pago o aumento.
  function hasRaiseAndCallerPreflop(state){
    if(state.board.length > 0) return false;

    var sawRaise = false;
    var callersAfterRaise = 0;
    for(var i=0;i<state.log.length;i++){
      var entry = state.log[i];
      if(entry.street !== 'preflop') continue;
      if(entry.type === 'bet' || entry.type === 'raise' || entry.type === 'allin'){
        sawRaise = true;
        callersAfterRaise = 0;
      } else if(entry.type === 'call' && sawRaise){
        callersAfterRaise++;
      }
    }
    return sawRaise && callersAfterRaise > 0;
  }

  // min(meu stack, maior stack adversário ainda na mão) / bigBlind — usado
  // pra decidir quando um bot entra no modo binário push/fold.
  function effectiveStackInBB(state, seatIndex){
    var myStack = state.players[seatIndex].stack;
    var maxOpponent = 0;
    for(var i=0;i<state.players.length;i++){
      if(i === seatIndex) continue;
      var p = state.players[i];
      if(!p.folded && !p.sittingOut && p.stack > maxOpponent) maxOpponent = p.stack;
    }
    var effective = Math.min(myStack, maxOpponent);
    return state.bigBlind > 0 ? effective / state.bigBlind : 0;
  }

  BotHelpers.findAction = findAction;
  BotHelpers.clampNum = clampNum;
  BotHelpers.preflopStrength = preflopStrength;
  BotHelpers.estimateStrength = estimateStrength;
  BotHelpers.positionBucket = positionBucket;
  BotHelpers.lastAggressorSeat = lastAggressorSeat;
  BotHelpers.countPreflopLimpers = countPreflopLimpers;
  BotHelpers.hasRaiseAndCallerPreflop = hasRaiseAndCallerPreflop;
  BotHelpers.effectiveStackInBB = effectiveStackInBB;

})();
