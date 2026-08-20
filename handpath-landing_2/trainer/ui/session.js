/* =====================================================
   HANDPATH TRAINER — CONTA, BANKROLL E BUY-IN
   Orquestra as telas de auth (login/signup/Google), escolha
   de mesa/nível e o widget de saldo, por cima da API pública
   que trainer/ui/script.js expõe em window.HandpathTable,
   chamando o Supabase (window.HandpathDB, ver trainer/
   supabase/) pra tudo que é saldo/sessão. script.js nunca
   fala com o Supabase diretamente — só sabe jogar a mão a
   partir de um tableConfig já resolvido.

   Fluxo (handpath-ajustes-fase1-fase2.md): Login → Escolher
   mesa (stake + buy-in) → Escolher nível (derivado da stake,
   não é mais uma escolha livre) → Mesa → Sair (cash-out) →
   quiz opcional → volta pra Escolher mesa.
   ===================================================== */

(function(){
  "use strict";

  var db = window.HandpathDB;

  // Cada stake já define o nível dos bots — não é mais uma escolha livre
  // (Baixa e Média intencionalmente compartilham Intermediário: a
  // diferença entre elas é o comprometimento financeiro, não a
  // dificuldade do bot — confirmado com o Arthur).
  var STAKE_LEVEL_MAP = { micro: 'beginner', baixa: 'intermediate', media: 'intermediate', alta: 'advanced' };
  var LEVEL_INFO = {
    beginner: { name: 'Iniciante', desc: 'Bots previsíveis, ranges fixas por posição, sem blefe.' },
    intermediate: { name: 'Intermediário', desc: 'Ranges mais soltas, alguma variação de agressividade e blefe.' },
    advanced: { name: 'Avançado', desc: 'Mesa "population": TAG, LAG, Nit, Maniac, Calling Station e Short-Stack Shover.' }
  };

  var currentBankroll = 0;
  var selectedStake = null;
  var selectedBuyIn = 0;
  var stakesCache = null;
  var activeDbSessionId = null;

  /* ---------------- helpers ---------------- */

  function show(id){ document.getElementById(id).hidden = false; }
  function hide(id){ document.getElementById(id).hidden = true; }

  function setStatus(elId, text, isError){
    var el = document.getElementById(elId);
    el.textContent = text || '';
    el.classList.toggle('hp-auth-status--error', !!isError);
  }

  function friendlyError(err){
    return (err && err.message) ? err.message : 'Algo deu errado, tenta de novo.';
  }

  function updateBankrollWidget(){
    document.getElementById('bankrollWidgetAmount').textContent = currentBankroll;
  }

  /* ---------------- auth: e-mail+senha e Google ---------------- */

  function currentEmail(){ return document.getElementById('authEmail').value.trim(); }
  function currentPassword(){ return document.getElementById('authPassword').value; }

  function signIn(){
    setStatus('authStatus', 'Entrando…');
    db.auth.signInWithPassword({ email: currentEmail(), password: currentPassword() })
      .then(function(res){
        if(res.error) setStatus('authStatus', friendlyError(res.error), true);
        // sucesso: onAuthStateChange cuida da troca de tela
      });
  }

  function signUp(){
    var email = currentEmail();
    var password = currentPassword();
    if(!email || password.length < 6){
      setStatus('authStatus', 'Preencha e-mail e uma senha com pelo menos 6 caracteres.', true);
      return;
    }
    setStatus('authStatus', 'Criando conta…');
    db.auth.signUp({ email: email, password: password })
      .then(function(res){
        if(res.error){ setStatus('authStatus', friendlyError(res.error), true); return; }
        if(res.data && res.data.session) return; // confirmação de e-mail desligada — já entrou
        setStatus('authStatus', 'Conta criada! Confira seu e-mail pra confirmar antes de entrar.');
      });
  }

  function signInWithGoogle(){
    setStatus('authStatus', 'Redirecionando pro Google…');
    db.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } })
      .then(function(res){
        // sucesso redireciona a página inteira pro Google — só chega aqui em caso de erro local
        if(res.error) setStatus('authStatus', friendlyError(res.error), true);
      });
  }

  document.getElementById('authForm').addEventListener('submit', function(ev){
    ev.preventDefault();
    signIn();
  });

  document.getElementById('btnSignUp').addEventListener('click', signUp);
  document.getElementById('btnGoogleSignIn').addEventListener('click', signInWithGoogle);
  document.getElementById('btnSignOut').addEventListener('click', function(){ db.auth.signOut(); });

  /* ---------------- pós-login ---------------- */

  function enterApp(){
    hide('authScreen');

    // reclaim é recuperação de dado (sessão órfã por aba fechada), roda
    // sempre — refill de fichas grátis NÃO é mais automático (vira botão
    // manual no widget de saldo, ver wiring mais abaixo).
    db.rpc('reclaim_abandoned_session')
      .then(function(reclaimRes){
        if(reclaimRes.data && reclaimRes.data.reclaimed){
          setStatus('refillStatus', 'Recuperamos ' + reclaimRes.data.amount + ' fichas de uma mesa que ficou aberta.');
        }
        return db.from('profiles').select('bankroll, plan').single();
      })
      .then(function(profileRes){
        if(profileRes.error){ console.error(profileRes.error); return; }
        currentBankroll = profileRes.data.bankroll;
        loadStakeScreen();
      });
  }

  function exitApp(){
    currentBankroll = 0;
    activeDbSessionId = null;
    hide('bankrollWidget');
    hide('bankrollPanel');
    hide('lobbyScreen');
    hide('buyinScreen');
    hide('tableScreen');
    hide('quizScreen');
    hide('reportScreen');
    hide('replayScreen');
    show('authScreen');
    setStatus('authStatus', '');
  }

  db.auth.onAuthStateChange(function(event, session){
    // Só reage a transição de fato (login/logout) — TOKEN_REFRESHED e
    // USER_UPDATED também passam por aqui e não devem re-mostrar o lobby
    // por cima da mesa se o jogador estiver no meio de uma partida.
    if(event === 'SIGNED_OUT'){ exitApp(); return; }
    if(event === 'SIGNED_IN' || event === 'INITIAL_SESSION'){
      if(session && session.user) enterApp(); else exitApp();
    }
  });

  /* ---------------- widget de saldo (resgate manual de refill) ---------------- */

  document.getElementById('btnBankrollToggle').addEventListener('click', function(){
    var panel = document.getElementById('bankrollPanel');
    panel.hidden = !panel.hidden;
  });

  document.getElementById('btnClaimRefill').addEventListener('click', function(){
    var btn = document.getElementById('btnClaimRefill');
    btn.disabled = true;
    setStatus('refillStatus', 'Resgatando…');

    db.rpc('claim_refill').then(function(res){
      btn.disabled = false;
      if(res.error){ setStatus('refillStatus', friendlyError(res.error), true); return; }

      if(res.data && res.data.claimed){
        currentBankroll = res.data.bankroll;
        updateBankrollWidget();
        setStatus('refillStatus', '+' + res.data.amount + ' fichas creditadas!');
        if(selectedStake) renderStakeOptions(stakesCache); // reavalia se alguma stake ficou acessível
      } else {
        setStatus('refillStatus', 'Ainda não disponível — tenta de novo mais tarde.');
      }
    });
  });

  /* ---------------- tela 1: escolher mesa (stake + buy-in) ---------------- */

  function loadStakeScreen(){
    hide('lobbyScreen');
    hide('tableScreen');
    show('buyinScreen');
    show('bankrollWidget');
    updateBankrollWidget();
    setStatus('buyinStatus', '');
    hide('buyinAmountBlock');
    selectedStake = null;

    if(stakesCache){ renderStakeOptions(stakesCache); return; }

    db.from('stakes').select('*').order('big_blind').then(function(res){
      if(res.error){ setStatus('buyinStatus', friendlyError(res.error), true); return; }
      stakesCache = res.data;
      renderStakeOptions(stakesCache);
    });
  }

  function renderStakeOptions(stakes){
    var container = document.getElementById('stakeOptions');
    container.innerHTML = '';

    stakes.forEach(function(stake){
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'hp-level-btn';
      btn.setAttribute('data-stake-id', stake.id);

      var name = document.createElement('span');
      name.className = 'hp-level-name';
      name.textContent = stake.name + ' — blinds ' + stake.small_blind + '/' + stake.big_blind;

      var desc = document.createElement('span');
      desc.className = 'hp-level-desc';
      var levelName = LEVEL_INFO[STAKE_LEVEL_MAP[stake.id]].name;
      desc.textContent = 'Buy-in de ' + stake.min_buyin + ' a ' + stake.max_buyin + ' fichas · bots ' + levelName;

      btn.appendChild(name);
      btn.appendChild(desc);

      if(currentBankroll < stake.min_buyin){
        btn.disabled = true;
        desc.textContent += ' — saldo insuficiente';
      } else {
        btn.addEventListener('click', function(){ selectStake(stake); });
      }

      container.appendChild(btn);
    });
  }

  function selectStake(stake){
    selectedStake = stake;
    Array.prototype.forEach.call(document.querySelectorAll('#stakeOptions .hp-level-btn'), function(btn){
      btn.classList.toggle('hp-level-btn--selected', btn.getAttribute('data-stake-id') === stake.id);
    });

    var slider = document.getElementById('buyinSlider');
    var maxBuyin = Math.min(stake.max_buyin, currentBankroll);
    slider.min = stake.min_buyin;
    slider.max = maxBuyin;
    slider.step = stake.small_blind;
    slider.value = stake.min_buyin;
    document.getElementById('buyinAmountOut').textContent = slider.value;
    show('buyinAmountBlock');
  }

  document.getElementById('buyinSlider').addEventListener('input', function(){
    document.getElementById('buyinAmountOut').textContent = this.value;
  });

  document.getElementById('btnContinueToLevel').addEventListener('click', function(){
    if(!selectedStake) return;
    selectedBuyIn = Number(document.getElementById('buyinSlider').value);
    hide('buyinScreen');
    loadLevelScreen();
  });

  /* ---------------- tela 2: escolher nível (derivado da stake) ---------------- */

  function loadLevelScreen(){
    show('lobbyScreen');
    show('bankrollWidget');
    setStatus('sitDownStatus', '');

    var levelKey = STAKE_LEVEL_MAP[selectedStake.id];
    var info = LEVEL_INFO[levelKey];

    var container = document.getElementById('levelOptions');
    container.innerHTML = '';

    var card = document.createElement('div');
    card.className = 'hp-level-btn hp-level-btn--selected';

    var name = document.createElement('span');
    name.className = 'hp-level-name';
    name.textContent = info.name;

    var desc = document.createElement('span');
    desc.className = 'hp-level-desc';
    desc.textContent = info.desc;

    card.appendChild(name);
    card.appendChild(desc);
    container.appendChild(card);
  }

  document.getElementById('btnBackToStake').addEventListener('click', function(){
    hide('lobbyScreen');
    loadStakeScreen();
  });

  document.getElementById('btnSitDown').addEventListener('click', function(){
    if(!selectedStake) return;
    var levelKey = STAKE_LEVEL_MAP[selectedStake.id];
    var btn = document.getElementById('btnSitDown');

    setStatus('sitDownStatus', 'Sentando na mesa…');
    btn.disabled = true;

    db.rpc('buy_in', { p_stake_id: selectedStake.id, p_amount: selectedBuyIn }).then(function(res){
      btn.disabled = false;
      if(res.error){ setStatus('sitDownStatus', friendlyError(res.error), true); return; }

      activeDbSessionId = res.data;
      currentBankroll -= selectedBuyIn;

      hide('lobbyScreen');
      hide('bankrollWidget');
      hide('bankrollPanel');
      window.HandpathTable.start(levelKey, {
        smallBlind: selectedStake.small_blind,
        bigBlind: selectedStake.big_blind,
        buyIn: selectedBuyIn,
        minBuyIn: selectedStake.min_buyin,
        maxBuyIn: selectedStake.max_buyin
      });
    });
  });

  /* ---------------- sair da mesa: cash-out real ---------------- */

  document.getElementById('btnLeaveTable').addEventListener('click', function(){
    if(window.HandpathTable.isHandInProgress() || !activeDbSessionId) return;

    var roster = window.HandpathTable.getRosterForQuiz();
    var heroChips = window.HandpathTable.getHeroChips();
    var sessionId = activeDbSessionId;
    var btn = document.getElementById('btnLeaveTable');
    btn.disabled = true;

    // Histórico e meta vêm da memória ANTES de fechar a mesa — o relatório
    // e o replay (Fase 5) são construídos a partir daí, não do banco.
    var history = window.HandpathTable.getHandHistory();
    var meta = window.HandpathTable.getSessionMeta();

    db.rpc('cash_out', { p_session_id: sessionId, p_final_chips: heroChips }).then(function(res){
      window.HandpathTable.exitTable();
      activeDbSessionId = null;

      if(res.error){
        console.error(res.error);
      } else {
        currentBankroll = res.data;
      }

      saveSessionSummary(sessionId, history, meta);
      showQuiz(roster, history, meta);
    });
  });

  // Persistência híbrida (Fase 5): as mãos completas ficam só em memória,
  // mas um resumo agregado por sessão vai pro banco — é a base histórica
  // que rating/ELO e detecção de vazamento vão consumir depois. Falhar aqui
  // NÃO pode quebrar o fluxo: o relatório é montado da memória de qualquer
  // jeito, então só registra no console.
  function saveSessionSummary(sessionId, history, meta){
    if(!sessionId || !history || !history.length) return;

    var summary;
    try{
      summary = window.HandpathReport.buildSessionSummary(history, meta);
    } catch(err){
      console.error('Falha ao montar o resumo da sessão:', err);
      return;
    }
    if(!summary) return;

    db.rpc('save_session_summary', { p_session_id: sessionId, p_summary: summary })
      .then(function(res){
        if(res.error) console.error('Resumo da sessão não foi salvo:', res.error);
      });
  }

  /* ---------------- quiz pós-mesa: "quem era quem?" ---------------- */

  function showQuiz(roster, history, meta){
    var container = document.getElementById('quizRoster');
    container.innerHTML = '';

    var options = roster.map(function(bot){ return { key: bot.archetypeKey, name: bot.archetypeName }; });
    var rows = roster.map(function(bot){ return buildQuizRow(bot, options); });
    rows.forEach(function(row){ container.appendChild(row.root); });

    var btnSkip = document.getElementById('btnSkipQuiz');
    var btnReveal = document.getElementById('btnRevealQuiz');
    var btnDone = document.getElementById('btnQuizDone');

    btnSkip.hidden = false;
    btnReveal.hidden = false;
    btnDone.hidden = true;

    // O quiz vem ANTES do relatório de propósito: o relatório mostra
    // showdowns e frequências que entregariam as respostas do quiz.
    function goToReport(){
      hide('quizScreen');
      window.HandpathReport.open(history, meta, function(){ loadStakeScreen(); });
    }

    btnReveal.onclick = function(){ revealQuiz(rows); };
    btnSkip.onclick = goToReport;
    btnDone.onclick = goToReport;

    show('quizScreen');
  }

  function buildQuizRow(bot, options){
    var row = document.createElement('div');
    row.className = 'hp-quiz-row';

    var name = document.createElement('div');
    name.className = 'hp-quiz-name';
    name.textContent = bot.displayName;

    var select = document.createElement('select');
    select.className = 'hp-quiz-select';
    var placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Qual era o estilo dele?';
    select.appendChild(placeholder);
    options.forEach(function(opt){
      var o = document.createElement('option');
      o.value = opt.key;
      o.textContent = opt.name;
      select.appendChild(o);
    });

    var result = document.createElement('div');
    result.className = 'hp-quiz-result';
    result.hidden = true;

    row.appendChild(name);
    row.appendChild(select);
    row.appendChild(result);

    return { root: row, select: select, result: result, bot: bot };
  }

  function revealQuiz(rows){
    rows.forEach(function(row){
      row.select.disabled = true;
      var guessed = row.select.value;
      var correct = guessed === row.bot.archetypeKey;
      var prefix = !guessed ? '' : (correct ? 'Acertou! ' : 'Era ');
      row.result.textContent = prefix + row.bot.archetypeName + ' — ' + row.bot.description;
      row.result.classList.toggle('hp-quiz-result--correct', correct);
      row.result.hidden = false;
    });

    document.getElementById('btnRevealQuiz').hidden = true;
    document.getElementById('btnSkipQuiz').hidden = true;
    document.getElementById('btnQuizDone').hidden = false;
  }

})();
