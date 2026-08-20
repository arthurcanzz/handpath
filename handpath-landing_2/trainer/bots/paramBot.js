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

  /* ---------------- sizing ----------------
     BUG CORRIGIDO (item 1 de handpath-fase2-agressividade.md): o sizing
     antigo era BH.sizedBet(betAction, fraction), que interpola entre
     betAction.min e betAction.max — e betAction.max é o stack INTEIRO do
     bot. Com fraction ~0.5 (o valor padrão pra aggressionMultiplier 1.0)
     todo raise saía na metade do caminho até o all-in; Maniac (1.6) ia a
     0.8. Ou seja: praticamente todo raise virava over-bet gigante ou
     all-in, em todo arquétipo — sizing errado, não personalidade.

     Agora o alvo é sempre ABSOLUTO (múltiplo de BB no pré-flop, fração do
     pote no pós-flop) e só depois é encaixado no [min, max] legal. All-in
     deixa de ser um sizing alcançável por acidente: só sai no modo
     push/fold (shoveOrFold) ou pela jogada rara de arquétipo bem solto
     (params.rareShoveFrequency).
  */

  var OPEN_RAISE_BB = { lo: 2, hi: 3.5 };          // abertura pré-flop
  var THREE_BET_MULTIPLE = { lo: 2.5, hi: 3.5 };   // 3-bet: x a aposta atual
  var SQUEEZE_MULTIPLE = { lo: 4, hi: 5.5 };       // squeeze: maior que 3-bet
  var CBET_POT_FRACTION = { lo: 0.5, hi: 0.75 };   // pós-flop: fração do pote

  // O alvo sai de uma conta contínua (2.82 BB, 64% do pote…), então cai em
  // número quebrado tipo 282 ou 2837. Aqui ele é encaixado num múltiplo do
  // small blind — a menor ficha em jogo —, que é como toda aposta de uma
  // mesa real se parece. Isso mexe SÓ no tamanho, no máximo meio small
  // blind pra cada lado: nenhuma frequência de decisão (abrir, 3-bet,
  // squeeze, c-bet, blefe) passa por aqui, então a agressividade calibrada
  // em handpath-fase2-agressividade.md fica intacta.
  function raiseToTotal(state, betAction, targetTotal){
    // Alvo estourou o máximo? Então é jam, e o valor legal exato manda —
    // arredondar pra baixo deixaria um resto de fichas pra trás.
    if(targetTotal >= betAction.max){
      return { type: betAction.type, amount: betAction.max };
    }

    var step = state.smallBlind > 0 ? state.smallBlind : 1;
    var amount = Math.round(targetTotal / step) * step;

    // O arredondamento pode ter saído da faixa legal. Puxa pro múltiplo
    // válido vizinho; se a faixa for estreita demais pra caber um, a borda
    // legal (min/max exato) prevalece — ação inválida não é opção.
    if(amount > betAction.max) amount -= step;
    if(amount < betAction.min) amount += step;

    return { type: betAction.type, amount: BH.clampNum(amount, betAction.min, betAction.max) };
  }

  // Sorteia dentro de [lo, hi] com um leve viés pela agressividade do
  // arquétipo. Item 5: tamanho fixo (sempre 2.5BB, sempre 66% do pote) é
  // padrão detectável — mesmo motivo que levou a esconder o arquétipo na
  // mesa. Aqui a variação é do TAMANHO, não da decisão.
  function variedMultiple(range, params){
    var t = Math.random();
    var skew = BH.clampNum((params.aggressionMultiplier - 1) * 0.25, -0.25, 0.35);
    t = BH.clampNum(t + skew, 0, 1);
    return range.lo + (range.hi - range.lo) * t;
  }

  function preflopRaise(state, params, betAction, allinAction, kind, limperCount){
    // All-in não é o sizing padrão de ninguém — só aparece fora do
    // push/fold como jogada rara e específica de arquétipo bem solto.
    if(allinAction && params.rareShoveFrequency && Math.random() < params.rareShoveFrequency){
      return { type: 'allin' };
    }

    var target;
    if(kind === 'squeeze'){
      target = state.currentBet * variedMultiple(SQUEEZE_MULTIPLE, params);
    } else if(kind === '3bet'){
      target = state.currentBet * variedMultiple(THREE_BET_MULTIPLE, params);
    } else {
      // Abertura. Cada limpador na mesa adiciona ~1BB ao tamanho — padrão
      // real de raise de isolamento (item 3): abrir 2.5BB por cima de 3
      // limpadores dá pot odds boas demais pra todos eles pagarem.
      target = state.bigBlind * variedMultiple(OPEN_RAISE_BB, params);
      target += state.bigBlind * (limperCount || 0);
    }
    return raiseToTotal(state, betAction, target);
  }

  function postflopBet(state, params, betAction){
    var fraction = variedMultiple(CBET_POT_FRACTION, params);
    var target = state.currentBet === 0
      ? state.pot * fraction
      : state.currentBet + (state.pot + state.currentBet) * fraction;
    return raiseToTotal(state, betAction, target);
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
    var allinAction = BH.findAction(actions, 'allin');

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

    var limpers = BH.countPreflopLimpers(state);

    if(checkAction){
      // BB sem raise (walk) — ficar é de graça.
      // Isolar limpador (item 3): com limpador na mesa, o BB agressivo
      // sobe pra punir a passividade em vez de só dar check de volta.
      // Antes ninguém punia limp — todo mundo só completava junto.
      var isolateFromBB = betAction && limpers > 0
        && adjustedStrength >= callThreshold
        && Math.random() < params.isolateFrequency;
      if(isolateFromBB){
        return preflopRaise(state, params, betAction, allinAction, 'open', limpers);
      }
      if(adjustedStrength >= callThreshold && betAction && Math.random() < params.threeBetFrequency){
        return preflopRaise(state, params, betAction, allinAction, 'open', limpers);
      }
      return { type: 'check' };
    }

    // Squeeze (item 6): já tem raise E alguém pagou antes da minha vez.
    // Não exige mão premium de propósito — a força do squeeze é justamente
    // pegar o raiser e o caller sem mão feita.
    if(facingRaise && betAction && BH.hasRaiseAndCallerPreflop(state)
       && Math.random() < params.squeezeFrequency){
      return preflopRaise(state, params, betAction, allinAction, 'squeeze', 0);
    }

    // 3-bet especulativo (item 2): arquétipo solto re-raisa às vezes SEM
    // mão feita — é o que cria o "re-raisou com o quê?". Fica antes do
    // corte de fold justamente porque a mão aqui é fraca demais pra pagar.
    if(facingRaise && betAction && adjustedStrength < callThreshold
       && Math.random() < params.speculative3betFrequency){
      return preflopRaise(state, params, betAction, allinAction, '3bet', 0);
    }

    // Isolar limpador (item 3): limp sinaliza mão fraca, então dá pra
    // atacar com range MAIS LARGO que o de abertura normal. Por isso fica
    // antes do corte de fold — senão a mão nem chegaria aqui. O
    // alargamento é uma fatia do range que sobrou (não uma multiplicação
    // do limiar, que alargaria demais justamente quem é mais tight: um
    // Nit com callThreshold 0.80 passaria a isolar com o top 40%).
    var isolateThreshold = Math.max(0, callThreshold - (1 - callThreshold) * 0.35);
    if(betAction && !facingRaise && limpers > 0
       && adjustedStrength >= isolateThreshold
       && Math.random() < params.isolateFrequency){
      return preflopRaise(state, params, betAction, allinAction, 'open', limpers);
    }

    if(adjustedStrength < callThreshold){
      return foldAction ? { type: 'fold' } : { type: 'check' };
    }

    // Estar dentro do range de abertura significa ABRIR (raise), não
    // limpar. Antes havia um gate de força extra + um raiseChance fixo de
    // ~0.35 aqui, o que fazia TODOS os presets limparem ~65% das mãos que
    // decidiam jogar — mesa cheia de limp e quase sem raise (early abria
    // 2% das mãos com openingRangeByPosition dizendo 16%). Limpar virou o
    // que sempre deveria ter sido: leak de arquétipo passivo
    // (openRaiseFrequency baixo), não comportamento padrão de todo mundo.
    if(betAction && !facingRaise && Math.random() < params.openRaiseFrequency){
      return preflopRaise(state, params, betAction, allinAction, 'open', limpers);
    }

    // Contra um raise, subir de novo (3-bet por valor) exige mão bem acima
    // do necessário só pra pagar — o 3-bet sem mão é o caminho
    // especulativo lá em cima, com frequência própria.
    var strongEnoughTo3bet = adjustedStrength > callThreshold + (1 - callThreshold) * 0.5;
    if(facingRaise && betAction && strongEnoughTo3bet && Math.random() < params.threeBetFrequency){
      return preflopRaise(state, params, betAction, allinAction, '3bet', limpers);
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
      if(betAction && Math.random() < cbetFrequency) return postflopBet(state, params, betAction);

      var wantsToBluff = adjustedStrength < effectiveFoldThreshold && Math.random() < params.bluffFrequency;
      var wantsValueBet = adjustedStrength >= params.raiseThreshold;
      if((wantsToBluff || wantsValueBet) && betAction){
        return postflopBet(state, params, betAction);
      }
      return { type: 'check' };
    }

    if(adjustedStrength < effectiveFoldThreshold){
      if(foldAction) return { type: 'fold' };
      return callAction ? { type: 'call' } : { type: 'check' };
    }

    var raiseChance = 0.3 + params.aggressionMultiplier * 0.25;
    if(betAction && adjustedStrength >= params.raiseThreshold && Math.random() < raiseChance){
      return postflopBet(state, params, betAction);
    }

    return callAction ? { type: 'call' } : { type: 'check' };
  }

  function decide(state, seatIndex, params){
    var actions = HandpathEngine.legalActions(state);
    if(actions.length === 0) return { type: 'check' };

    var position = BH.positionBucket(state, seatIndex);
    var strength = BH.estimateStrength(state, seatIndex);

    // Button ganha um empurrão maior que 'late' (CO): é a posição que age
    // por último em toda street pós-flop — item 4.
    var posAdjust = 0;
    if(position === 'button') posAdjust = params.positionAdjust * 1.3;
    else if(position === 'late') posAdjust = params.positionAdjust;
    else if(position === 'early') posAdjust = -params.positionAdjust;
    var adjustedStrength = BH.clampNum(strength + posAdjust, 0, 1);

    var stackBB = BH.effectiveStackInBB(state, seatIndex);
    if(stackBB <= params.shoveStackThreshold){
      return shoveOrFold(params, adjustedStrength, stackBB, actions);
    }

    // PRÉ-FLOP usa a força CRUA: a posição já está expressa em
    // openingRangeByPosition. Aplicar posAdjust por cima contava posição
    // duas vezes e achatava o range inicial — um TAG com early: 0.16 abria
    // 0.9% das mãos em UTG, e 69% no button, nada a ver com o que o preset
    // declara. Pós-flop não existe tabela por posição, então lá o empurrão
    // continua sendo a forma de representar a vantagem de agir por último.
    var isPreflop = state.board.length === 0;
    return isPreflop
      ? decidePreflop(state, seatIndex, params, position, strength, actions)
      : decidePostflop(state, seatIndex, params, adjustedStrength, actions);
  }

  var presets = {
    nit: {
      name: 'Nit',
      description: 'Só joga mãos muito fortes e quase nunca blefa — quando aposta, geralmente é por valor.',
      openingRangeByPosition: { early: 0.08, middle: 0.12, late: 0.20, button: 0.28, sb: 0.15, bb: 0.25 },
      vsRaiseCallFraction: 0.5, threeBetFrequency: 0.02,
      foldThreshold: 0.6, raiseThreshold: 0.8, bluffFrequency: 0.01,
      aggressionMultiplier: 0.7, aggressionVariance: 0.05, callDownTendency: 0.05,
      shoveStackThreshold: 8, positionAdjust: 0.10,
      isolateFrequency: 0.15, openRaiseFrequency: 0.85, speculative3betFrequency: 0, squeezeFrequency: 0.01,
      rareShoveFrequency: 0
    },
    tag: {
      name: 'TAG',
      description: 'Joga sólido e ajusta pela posição — mistura blefe ocasional com fundamento.',
      openingRangeByPosition: { early: 0.16, middle: 0.26, late: 0.40, button: 0.55, sb: 0.30, bb: 0.45 },
      vsRaiseCallFraction: 0.6, threeBetFrequency: 0.08,
      foldThreshold: 0.5, raiseThreshold: 0.7, bluffFrequency: 0.06,
      aggressionMultiplier: 1.0, aggressionVariance: 0.10, callDownTendency: 0.10,
      shoveStackThreshold: 14, positionAdjust: 0.15,
      isolateFrequency: 0.45, openRaiseFrequency: 0.92, speculative3betFrequency: 0.03, squeezeFrequency: 0.07,
      rareShoveFrequency: 0
    },
    lag: {
      name: 'LAG',
      description: 'Entra em muitas mãos e aplica pressão constante — blefa com frequência.',
      openingRangeByPosition: { early: 0.32, middle: 0.44, late: 0.60, button: 0.75, sb: 0.50, bb: 0.65 },
      vsRaiseCallFraction: 0.75, threeBetFrequency: 0.18,
      foldThreshold: 0.4, raiseThreshold: 0.6, bluffFrequency: 0.16,
      aggressionMultiplier: 1.3, aggressionVariance: 0.20, callDownTendency: 0.12,
      shoveStackThreshold: 16, positionAdjust: 0.18,
      isolateFrequency: 0.60, openRaiseFrequency: 0.9, speculative3betFrequency: 0.10, squeezeFrequency: 0.16,
      rareShoveFrequency: 0.01
    },
    maniac: {
      name: 'Maniac',
      description: 'Aposta e sobe demais, com pouca disciplina — pressão constante, às vezes sem mão nenhuma.',
      openingRangeByPosition: { early: 0.55, middle: 0.65, late: 0.80, button: 0.92, sb: 0.70, bb: 0.85 },
      vsRaiseCallFraction: 0.9, threeBetFrequency: 0.30,
      foldThreshold: 0.25, raiseThreshold: 0.45, bluffFrequency: 0.28,
      aggressionMultiplier: 1.6, aggressionVariance: 0.30, callDownTendency: 0.15,
      shoveStackThreshold: 20, positionAdjust: 0.10,
      isolateFrequency: 0.70, openRaiseFrequency: 0.95, speculative3betFrequency: 0.22, squeezeFrequency: 0.28,
      rareShoveFrequency: 0.05
    },
    callingStation: {
      name: 'Calling Station',
      description: 'Quase nunca folda e paga demais — raramente blefa ou aposta por valor.',
      openingRangeByPosition: { early: 0.25, middle: 0.30, late: 0.35, button: 0.45, sb: 0.30, bb: 0.40 },
      vsRaiseCallFraction: 0.85, threeBetFrequency: 0.02,
      foldThreshold: 0.12, raiseThreshold: 0.85, bluffFrequency: 0.01,
      aggressionMultiplier: 0.5, aggressionVariance: 0.05, callDownTendency: 0.30,
      shoveStackThreshold: 6, positionAdjust: 0.02,
      isolateFrequency: 0.03, openRaiseFrequency: 0.25, speculative3betFrequency: 0.01, squeezeFrequency: 0.01,
      rareShoveFrequency: 0
    },
    shortStackShover: {
      name: 'Short-Stack Shover',
      description: 'Joga com stack curto de propósito — vira all-in ou fold rápido, sem meio-termo.',
      openingRangeByPosition: { early: 0.20, middle: 0.25, late: 0.35, button: 0.45, sb: 0.30, bb: 0.40 },
      vsRaiseCallFraction: 0.4, threeBetFrequency: 0.05,
      foldThreshold: 0.5, raiseThreshold: 0.7, bluffFrequency: 0.03,
      aggressionMultiplier: 1.0, aggressionVariance: 0.05, callDownTendency: 0.08,
      shoveStackThreshold: 25, positionAdjust: 0.12,
      isolateFrequency: 0.25, openRaiseFrequency: 0.8, speculative3betFrequency: 0.04, squeezeFrequency: 0.05,
      rareShoveFrequency: 0.02
    },
    beginner: {
      name: 'Iniciante',
      description: 'Joga um range fixo por posição, sem blefe — o mais previsível da mesa.',
      // Zero em todas as jogadas "fancy" (isolamento raro, sem 3-bet
      // especulativo, sem squeeze) de propósito: o Iniciante é o preset
      // que ensina o padrão básico, tem que continuar sendo o mais legível
      // da mesa mesmo depois deste documento.
      openingRangeByPosition: { early: 0.15, middle: 0.22, late: 0.30, button: 0.38, sb: 0.25, bb: 0.35 },
      vsRaiseCallFraction: 0.5, threeBetFrequency: 0,
      foldThreshold: 0.5, raiseThreshold: 0.75, bluffFrequency: 0,
      aggressionMultiplier: 0.8, aggressionVariance: 0.04, callDownTendency: 0.10,
      shoveStackThreshold: 10, positionAdjust: 0.10,
      isolateFrequency: 0.05, openRaiseFrequency: 0.55, speculative3betFrequency: 0, squeezeFrequency: 0,
      rareShoveFrequency: 0
    },
    intermediate: {
      name: 'Intermediário',
      description: 'Mistura moderada de blefe e agressividade — nem tão travado, nem tão solto.',
      openingRangeByPosition: { early: 0.19, middle: 0.29, late: 0.42, button: 0.55, sb: 0.32, bb: 0.42 },
      vsRaiseCallFraction: 0.6, threeBetFrequency: 0.06,
      foldThreshold: 0.45, raiseThreshold: 0.68, bluffFrequency: 0.08,
      aggressionMultiplier: 1.0, aggressionVariance: 0.15, callDownTendency: 0.12,
      shoveStackThreshold: 14, positionAdjust: 0.14,
      isolateFrequency: 0.30, openRaiseFrequency: 0.85, speculative3betFrequency: 0.04, squeezeFrequency: 0.05,
      rareShoveFrequency: 0
    }
  };

  HandpathBots.paramBot = { decide: decide };
  HandpathBots.presets = presets;

})();
