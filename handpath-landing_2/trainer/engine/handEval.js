/* =====================================================
   HANDPATH ENGINE — AVALIAÇÃO DE MÃOS
   Recebe 5 a 7 cartas (hole cards + board) e determina a
   melhor combinação de 5, sua categoria (0 High Card a 8
   Straight Flush) e os desempates. Nomes de mão ficam em
   INGLÊS de propósito (ver CLAUDE.md — glossário de poker
   não se traduz).
   ===================================================== */

(function(){
  "use strict";

  var HandpathEngine = window.HandpathEngine = window.HandpathEngine || {};

  var CATEGORY_NAMES = [
    'High Card', 'Pair', 'Two Pair', 'Three of a Kind', 'Straight',
    'Flush', 'Full House', 'Four of a Kind', 'Straight Flush'
  ];

  function combinations(arr, k){
    var results = [];
    function helper(start, combo){
      if(combo.length === k){
        results.push(combo.slice());
        return;
      }
      for(var i=start;i<arr.length;i++){
        combo.push(arr[i]);
        helper(i+1, combo);
        combo.pop();
      }
    }
    helper(0, []);
    return results;
  }

  function categoryName(category, straightHigh){
    if(category === 8 && straightHigh === 14) return 'Royal Flush';
    return CATEGORY_NAMES[category];
  }

  function evaluate5(cards){
    var ranks = cards.map(function(c){ return c.rank; }).sort(function(a,b){ return b-a; });
    var suits = cards.map(function(c){ return c.suit; });

    var isFlush = suits.every(function(s){ return s === suits[0]; });

    var uniqueRanks = ranks.filter(function(r, i){ return ranks.indexOf(r) === i; });
    var isStraight = false;
    var straightHigh = 0;
    if(uniqueRanks.length === 5){
      if(uniqueRanks[0] - uniqueRanks[4] === 4){
        isStraight = true;
        straightHigh = uniqueRanks[0];
      } else if(uniqueRanks[0] === 14 && uniqueRanks[1] === 5 && uniqueRanks[2] === 4 && uniqueRanks[3] === 3 && uniqueRanks[4] === 2){
        isStraight = true; // wheel: A-2-3-4-5, o Ás conta como 1
        straightHigh = 5;
      }
    }

    var counts = {};
    ranks.forEach(function(r){ counts[r] = (counts[r] || 0) + 1; });
    var groups = Object.keys(counts).map(function(r){ return { rank: Number(r), count: counts[r] }; });
    groups.sort(function(a,b){
      if(b.count !== a.count) return b.count - a.count;
      return b.rank - a.rank;
    });

    var category, tiebreakers;

    if(isStraight && isFlush){
      category = 8;
      tiebreakers = [straightHigh];
    } else if(groups[0].count === 4){
      category = 7;
      tiebreakers = [groups[0].rank, groups[1].rank];
    } else if(groups[0].count === 3 && groups[1].count === 2){
      category = 6;
      tiebreakers = [groups[0].rank, groups[1].rank];
    } else if(isFlush){
      category = 5;
      tiebreakers = ranks.slice();
    } else if(isStraight){
      category = 4;
      tiebreakers = [straightHigh];
    } else if(groups[0].count === 3){
      category = 3;
      tiebreakers = [groups[0].rank].concat(groups.slice(1).map(function(g){ return g.rank; }));
    } else if(groups[0].count === 2 && groups[1].count === 2){
      category = 2;
      var pairRanks = [groups[0].rank, groups[1].rank].sort(function(a,b){ return b-a; });
      tiebreakers = pairRanks.concat([groups[2].rank]);
    } else if(groups[0].count === 2){
      category = 1;
      tiebreakers = [groups[0].rank].concat(groups.slice(1).map(function(g){ return g.rank; }));
    } else {
      category = 0;
      tiebreakers = ranks.slice();
    }

    return {
      category: category,
      name: categoryName(category, straightHigh),
      tiebreakers: tiebreakers
    };
  }

  function compareEvals(a, b){
    if(a.category !== b.category) return a.category > b.category ? 1 : -1;
    for(var i=0;i<a.tiebreakers.length;i++){
      var ta = a.tiebreakers[i] || 0;
      var tb = b.tiebreakers[i] || 0;
      if(ta !== tb) return ta > tb ? 1 : -1;
    }
    return 0;
  }

  function evaluateBest(cards){
    if(cards.length <= 5) return evaluate5(cards);

    var best = null;
    combinations(cards, 5).forEach(function(combo){
      var result = evaluate5(combo);
      if(!best || compareEvals(result, best) > 0) best = result;
    });
    return best;
  }

  HandpathEngine.evaluate5 = evaluate5;
  HandpathEngine.evaluateBest = evaluateBest;
  HandpathEngine.compareEvals = compareEvals;
  HandpathEngine.combinations = combinations;

})();
