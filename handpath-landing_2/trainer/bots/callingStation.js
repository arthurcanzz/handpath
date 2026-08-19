/* =====================================================
   HANDPATH BOTS — CALLING STATION
   Mantém a API pública (HandpathBots.callingStation.decide)
   usada pela UI, mas agora roda por baixo no motor único
   paramBot.js com o preset 'callingStation' — ver
   trainer/bots/paramBot.js e trainer/bots/README.md.
   ===================================================== */

(function(){
  "use strict";

  var HandpathBots = window.HandpathBots = window.HandpathBots || {};

  function decide(state, seatIndex){
    return HandpathBots.paramBot.decide(state, seatIndex, HandpathBots.presets.callingStation);
  }

  HandpathBots.callingStation = { decide: decide };

})();
