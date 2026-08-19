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

  function preflopStrength(holeCards){
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

  function estimateStrength(state, seatIndex){
    var player = state.players[seatIndex];
    if(state.board.length === 0) return preflopStrength(player.holeCards);
    var evalResult = HandpathEngine.evaluateBest(player.holeCards.concat(state.board));
    return evalResult.category / 8;
  }

  function sizedBet(actionSpec, fraction){
    var amount = Math.round(actionSpec.min + (actionSpec.max - actionSpec.min) * fraction);
    amount = Math.max(actionSpec.min, Math.min(amount, actionSpec.max));
    return { type: actionSpec.type, amount: amount };
  }

  // 'early' | 'middle' | 'late' | 'sb' | 'bb'. Heads-up cai só em sb/bb
  // (o mesmo caso especial real do poker já tratado em table.js).
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
  BotHelpers.sizedBet = sizedBet;
  BotHelpers.positionBucket = positionBucket;
  BotHelpers.lastAggressorSeat = lastAggressorSeat;
  BotHelpers.effectiveStackInBB = effectiveStackInBB;

})();
