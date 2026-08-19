/* =====================================================
   HANDPATH ENGINE — DECK
   Baralho de 52 cartas: criação, embaralhamento, compra,
   e helpers de exibição (label, naipe, cor). Sem UI, sem
   dependência de bot — puro estado de jogo.
   ===================================================== */

(function(){
  "use strict";

  var HandpathEngine = window.HandpathEngine = window.HandpathEngine || {};

  var SUITS = ['s', 'h', 'd', 'c'];
  var RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  var RANK_LABELS = { 2:'2', 3:'3', 4:'4', 5:'5', 6:'6', 7:'7', 8:'8', 9:'9', 10:'T', 11:'J', 12:'Q', 13:'K', 14:'A' };
  var SUIT_SYMBOLS = { s:'♠', h:'♥', d:'♦', c:'♣' };
  var SUIT_COLORS = { s:'black', h:'red', d:'red', c:'black' };

  function createDeck(){
    var deck = [];
    for(var i=0;i<SUITS.length;i++){
      for(var j=0;j<RANKS.length;j++){
        deck.push({ rank: RANKS[j], suit: SUITS[i] });
      }
    }
    return deck;
  }

  function shuffle(deck){
    for(var i=deck.length-1;i>0;i--){
      var j = Math.floor(Math.random() * (i+1));
      var tmp = deck[i];
      deck[i] = deck[j];
      deck[j] = tmp;
    }
    return deck;
  }

  function draw(deck, n){
    return deck.splice(0, n);
  }

  function rankLabel(rank){ return RANK_LABELS[rank] || String(rank); }
  function suitSymbol(suit){ return SUIT_SYMBOLS[suit] || suit; }
  function suitColor(suit){ return SUIT_COLORS[suit] || 'black'; }
  function cardLabel(card){ return rankLabel(card.rank) + suitSymbol(card.suit); }

  HandpathEngine.SUITS = SUITS;
  HandpathEngine.RANKS = RANKS;
  HandpathEngine.createDeck = createDeck;
  HandpathEngine.shuffle = shuffle;
  HandpathEngine.draw = draw;
  HandpathEngine.rankLabel = rankLabel;
  HandpathEngine.suitSymbol = suitSymbol;
  HandpathEngine.suitColor = suitColor;
  HandpathEngine.cardLabel = cardLabel;

})();
