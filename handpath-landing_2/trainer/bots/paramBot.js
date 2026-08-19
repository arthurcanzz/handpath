/* =====================================================
   HANDPATH BOTS — MOTOR PARAMETRIZADO
   Um único motor de decisão por limiares (decide) que
   cobre todos os arquétipos (Nit/TAG/LAG/Calling Station/
   Maniac/Short-Stack Shover/Iniciante/Intermediário) como
   presets de parâmetro — não uma arquitetura por tier. Ver
   trainer/bots/README.md pro raciocínio completo.

   Único branch de código genuinamente diferente: push/fold
   de stack curto (shoveOrFold) — vira binário (all-in ou
   fold) quando o stack efetivo cai a params.shoveStackThreshold
   ou menos, ignorando o sizing contínuo normal.
   ===================================================== */

(function(){
  "use strict";

  var HandpathBots = window.HandpathBots = window.HandpathBots || {};
  var BH = HandpathBots.helpers;

  function sizedRaise(betAction, params){
    var jitter = params.aggressionVariance ? (Math.random() * 2 - 1) * params.aggressionVariance : 0;
    var fraction = BH.clampNum(0.5 * params.aggressionMultiplier + jitter, 0.15, 1);
    return BH.sizedBet(betAction, fraction);
  }

  function shoveOrFold(params, adjustedStrength, stackBB, actions){
    var foldAction = BH.findAction(actions, 'fold');
    var checkAction = BH.findAction(actions, 'check');
    var callAction = BH.findAction(actions, 'call');
    var allinAction = BH.findAction(actions, 'allin');

    var floor = BH.clampNum(0.35 + stackBB * 0.02, 0.15, 0.75);

    if(adjustedStrength >= floor && allinAction) return { type: 'allin' };
    if(checkAction) return { type: 'check' };
    if(foldAction) return { type: 'fold' };
    return callAction ? { type: 'call' } : { type: 'check' };
  }

  function decidePreflop(state, seatIndex, params, position, adjustedStrength, actions){
    var checkAction = BH.findAction(actions, 'check');
    var foldAction = BH.findAction(actions, 'fold');
    var callAction = BH.findAction(actions, 'call');
    var betAction = BH.findAction(actions, 'bet') || BH.findAction(actions, 'raise');

    var openSlice = params.openingRangeByPosition[position];
    if(openSlice == null) openSlice = 0.2;
    var openThreshold = 1 - openSlice;

    var facingRaise = state.currentBet > state.bigBlind;
    var callThreshold = facingRaise
      ? openThreshold + (1 - openThreshold) * (1 - params.vsRaiseCallFraction)
      : openThreshold;

    // Pot odds: call barato em relação ao pote já formado (por já ter
    // limpado/apostado antes) reduz quanto de força é exigido pra pagar.
    // Antes disso o bot ignorava completamente o que já tinha investido e
    // foldava fácil demais pra raises pequenos (Caso 1, handpath-ajustes-
    // fase1-fase2.md) — só pode reduzir o threshold, nunca aumentar.
    if(facingRaise && callAction && callAction.amount > 0){
      var potOdds = callAction.amount / (state.pot + callAction.amount);
      var potOddsThreshold = potOdds + (1 - potOdds) * (1 - params.vsRaiseCallFraction);
      callThreshold = Math.min(callThreshold, potOddsThreshold);
    }

    if(checkAction){
      // BB sem raise (walk) — ficar é de graça; só sobe às vezes com mão boa.
      if(adjustedStrength >= callThreshold && betAction && Math.random() < params.threeBetFrequency){
        return sizedRaise(betAction, params);
      }
      return { type: 'check' };
    }

    if(adjustedStrength < callThreshold){
      return foldAction ? { type: 'fold' } : { type: 'check' };
    }

    var raiseChance = facingRaise ? params.threeBetFrequency : (0.15 + params.aggressionMultiplier * 0.2);
    var strongEnoughToRaise = adjustedStrength > callThreshold + (1 - callThreshold) * 0.5;
    if(betAction && strongEnoughToRaise && Math.random() < raiseChance){
      return sizedRaise(betAction, params);
    }

    return callAction ? { type: 'call' } : { type: 'check' };
  }

  var STREET_PROGRESS = { flop: 0, turn: 0.5, river: 1 };

  function decidePostflop(state, seatIndex, params, adjustedStrength, actions){
    var checkAction = BH.findAction(actions, 'check');
    var foldAction = BH.findAction(actions, 'fold');
    var callAction = BH.findAction(actions, 'call');
    var betAction = BH.findAction(actions, 'bet') || BH.findAction(actions, 'raise');

    var progress = STREET_PROGRESS[state.street] != null ? STREET_PROGRESS[state.street] : 0;
    var effectiveFoldThreshold = Math.max(0, params.foldThreshold - params.callDownTendency * progress);

    // Continuation bet: quem foi o agressor pré-flop tende a seguir
    // apostando no flop com boa parte do range, força da mão à parte —
    // sem isso, dois bots que trocaram um 3-bet grande pré-flop ficavam
    // em zero agressão pós-flop, check-check até o river (Caso 2,
    // handpath-ajustes-fase1-fase2.md). Escalado por aggressionMultiplier
    // pra manter arquétipo mais solto visivelmente mais dinâmico.
    var wasPreflopAggressor = state.street === 'flop' && BH.lastAggressorSeat(state, 'preflop') === seatIndex;
    var cbetFrequency = wasPreflopAggressor
      ? BH.clampNum(0.45 + params.aggressionMultiplier * 0.2, 0.3, 0.85)
      : 0;

    if(checkAction){
      if(betAction && Math.random() < cbetFrequency) return sizedRaise(betAction, params);

      var wantsToBluff = adjustedStrength < effectiveFoldThreshold && Math.random() < params.bluffFrequency;
      var wantsValueBet = adjustedStrength >= params.raiseThreshold;
      if((wantsToBluff || wantsValueBet) && betAction){
        return sizedRaise(betAction, params);
      }
      return { type: 'check' };
    }

    if(adjustedStrength < effectiveFoldThreshold){
      if(foldAction) return { type: 'fold' };
      return callAction ? { type: 'call' } : { type: 'check' };
    }

    var raiseChance = 0.3 + params.aggressionMultiplier * 0.25;
    if(betAction && adjustedStrength >= params.raiseThreshold && Math.random() < raiseChance){
      return sizedRaise(betAction, params);
    }

    return callAction ? { type: 'call' } : { type: 'check' };
  }

  function decide(state, seatIndex, params){
    var actions = HandpathEngine.legalActions(state);
    if(actions.length === 0) return { type: 'check' };

    var position = BH.positionBucket(state, seatIndex);
    var strength = BH.estimateStrength(state, seatIndex);

    var posAdjust = 0;
    if(position === 'late') posAdjust = params.positionAdjust;
    else if(position === 'early') posAdjust = -params.positionAdjust;
    var adjustedStrength = BH.clampNum(strength + posAdjust, 0, 1);

    var stackBB = BH.effectiveStackInBB(state, seatIndex);
    if(stackBB <= params.shoveStackThreshold){
      return shoveOrFold(params, adjustedStrength, stackBB, actions);
    }

    var isPreflop = state.board.length === 0;
    return isPreflop
      ? decidePreflop(state, seatIndex, params, position, adjustedStrength, actions)
      : decidePostflop(state, seatIndex, params, adjustedStrength, actions);
  }

  var presets = {
    nit: {
      name: 'Nit',
      description: 'Só joga mãos muito fortes e quase nunca blefa — quando aposta, geralmente é por valor.',
      openingRangeByPosition: { early: 0.08, middle: 0.12, late: 0.20, sb: 0.15, bb: 0.25 },
      vsRaiseCallFraction: 0.5, threeBetFrequency: 0.02,
      foldThreshold: 0.6, raiseThreshold: 0.8, bluffFrequency: 0.01,
      aggressionMultiplier: 0.7, aggressionVariance: 0.05, callDownTendency: 0.05,
      shoveStackThreshold: 8, positionAdjust: 0.10
    },
    tag: {
      name: 'TAG',
      description: 'Joga sólido e ajusta pela posição — mistura blefe ocasional com fundamento.',
      openingRangeByPosition: { early: 0.18, middle: 0.28, late: 0.42, sb: 0.30, bb: 0.45 },
      vsRaiseCallFraction: 0.6, threeBetFrequency: 0.08,
      foldThreshold: 0.5, raiseThreshold: 0.7, bluffFrequency: 0.06,
      aggressionMultiplier: 1.0, aggressionVariance: 0.10, callDownTendency: 0.10,
      shoveStackThreshold: 14, positionAdjust: 0.15
    },
    lag: {
      name: 'LAG',
      description: 'Entra em muitas mãos e aplica pressão constante — blefa com frequência.',
      openingRangeByPosition: { early: 0.35, middle: 0.45, late: 0.60, sb: 0.50, bb: 0.65 },
      vsRaiseCallFraction: 0.75, threeBetFrequency: 0.18,
      foldThreshold: 0.4, raiseThreshold: 0.6, bluffFrequency: 0.16,
      aggressionMultiplier: 1.3, aggressionVariance: 0.20, callDownTendency: 0.12,
      shoveStackThreshold: 16, positionAdjust: 0.18
    },
    maniac: {
      name: 'Maniac',
      description: 'Aposta e sobe demais, com pouca disciplina — pressão constante, às vezes sem mão nenhuma.',
      openingRangeByPosition: { early: 0.55, middle: 0.65, late: 0.80, sb: 0.70, bb: 0.85 },
      vsRaiseCallFraction: 0.9, threeBetFrequency: 0.30,
      foldThreshold: 0.25, raiseThreshold: 0.45, bluffFrequency: 0.28,
      aggressionMultiplier: 1.6, aggressionVariance: 0.30, callDownTendency: 0.15,
      shoveStackThreshold: 20, positionAdjust: 0.10
    },
    callingStation: {
      name: 'Calling Station',
      description: 'Quase nunca folda e paga demais — raramente blefa ou aposta por valor.',
      openingRangeByPosition: { early: 0.25, middle: 0.30, late: 0.35, sb: 0.30, bb: 0.40 },
      vsRaiseCallFraction: 0.85, threeBetFrequency: 0.02,
      foldThreshold: 0.12, raiseThreshold: 0.85, bluffFrequency: 0.01,
      aggressionMultiplier: 0.5, aggressionVariance: 0.05, callDownTendency: 0.30,
      shoveStackThreshold: 6, positionAdjust: 0.02
    },
    shortStackShover: {
      name: 'Short-Stack Shover',
      description: 'Joga com stack curto de propósito — vira all-in ou fold rápido, sem meio-termo.',
      openingRangeByPosition: { early: 0.20, middle: 0.25, late: 0.35, sb: 0.30, bb: 0.40 },
      vsRaiseCallFraction: 0.4, threeBetFrequency: 0.05,
      foldThreshold: 0.5, raiseThreshold: 0.7, bluffFrequency: 0.03,
      aggressionMultiplier: 1.0, aggressionVariance: 0.05, callDownTendency: 0.08,
      shoveStackThreshold: 25, positionAdjust: 0.12
    },
    beginner: {
      name: 'Iniciante',
      description: 'Joga um range fixo por posição, sem blefe — o mais previsível da mesa.',
      openingRangeByPosition: { early: 0.15, middle: 0.22, late: 0.30, sb: 0.25, bb: 0.35 },
      vsRaiseCallFraction: 0.5, threeBetFrequency: 0,
      foldThreshold: 0.5, raiseThreshold: 0.75, bluffFrequency: 0,
      aggressionMultiplier: 0.8, aggressionVariance: 0.04, callDownTendency: 0.10,
      shoveStackThreshold: 10, positionAdjust: 0.10
    },
    intermediate: {
      name: 'Intermediário',
      description: 'Mistura moderada de blefe e agressividade — nem tão travado, nem tão solto.',
      openingRangeByPosition: { early: 0.20, middle: 0.30, late: 0.42, sb: 0.32, bb: 0.42 },
      vsRaiseCallFraction: 0.6, threeBetFrequency: 0.06,
      foldThreshold: 0.45, raiseThreshold: 0.68, bluffFrequency: 0.08,
      aggressionMultiplier: 1.0, aggressionVariance: 0.15, callDownTendency: 0.12,
      shoveStackThreshold: 14, positionAdjust: 0.14
    }
  };

  HandpathBots.paramBot = { decide: decide };
  HandpathBots.presets = presets;

})();
