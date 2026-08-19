(function(){
  "use strict";

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /* =====================================================
     FLAGS — SVG inline (emoji de bandeira não renderiza
     como imagem no Windows, então usamos SVG de verdade)
     ===================================================== */
  var FLAGS = {
    pt: '<svg viewBox="0 0 24 16" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="16" fill="#009739"/><polygon points="12,2 22,8 12,14 2,8" fill="#FEDD00"/><circle cx="12" cy="8" r="4" fill="#012169"/></svg>',
    en: '<svg viewBox="0 0 24 16" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="16" fill="#B22234"/><rect y="1.23" width="24" height="1.23" fill="#fff"/><rect y="3.69" width="24" height="1.23" fill="#fff"/><rect y="6.15" width="24" height="1.23" fill="#fff"/><rect y="8.61" width="24" height="1.23" fill="#fff"/><rect y="11.08" width="24" height="1.23" fill="#fff"/><rect y="13.54" width="24" height="1.23" fill="#fff"/><rect width="10" height="8.6" fill="#3C3B6E"/></svg>',
    es: '<svg viewBox="0 0 24 16" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="16" fill="#AA151B"/><rect y="4" width="24" height="8" fill="#F1BF00"/></svg>'
  };
  var LANG_CODE_LABEL = { pt:'PT', en:'EN', es:'ES' };

  /* =====================================================
     I18N ENGINE
     ===================================================== */
  var currentLang = 'en';
  var plansAnnual = false;
  var selectedPlan = null;

  function t(key){
    var dict = (window.HANDPATH_I18N && window.HANDPATH_I18N[currentLang]) || {};
    if(dict[key] !== undefined) return dict[key];
    var fb = (window.HANDPATH_I18N && window.HANDPATH_I18N.en) || {};
    return fb[key] !== undefined ? fb[key] : key;
  }

  function detectDefaultLang(){
    try{
      var saved = localStorage.getItem('handpath_lang');
      if(saved && window.HANDPATH_SUPPORTED_LANGS && HANDPATH_SUPPORTED_LANGS.indexOf(saved) !== -1) return saved;
    } catch(e){}
    var nav = ((navigator.language || navigator.userLanguage || 'en') + '').toLowerCase();
    if(nav.indexOf('pt') === 0) return 'pt';
    if(nav.indexOf('es') === 0) return 'es';
    return 'en';
  }

  function applyLanguage(lang){
    if(!window.HANDPATH_I18N || !HANDPATH_I18N[lang]) lang = 'en';
    currentLang = lang;

    document.querySelectorAll('[data-i18n]').forEach(function(el){
      el.innerHTML = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el){
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });

    document.documentElement.setAttribute('lang', lang === 'pt' ? 'pt-BR' : lang);
    var metaDesc = document.getElementById('metaDescription');
    if(metaDesc) metaDesc.setAttribute('content', t('meta_description'));

    try{ localStorage.setItem('handpath_lang', lang); } catch(e){}

    updateLangSwitcherUI();
    refreshDynamicPlanPrices();
    refreshQuizLanguage();
  }

  /* =====================================================
     LANGUAGE SWITCHER UI
     ===================================================== */
  function buildLangSwitcher(){
    var switchEl = document.getElementById('langSwitch');
    var btn = document.getElementById('langCurrentBtn');
    var menu = document.getElementById('langMenu');
    if(!switchEl || !window.HANDPATH_SUPPORTED_LANGS) return;

    menu.innerHTML = '';
    HANDPATH_SUPPORTED_LANGS.forEach(function(lang){
      var opt = document.createElement('button');
      opt.type = 'button';
      opt.className = 'lang-option';
      opt.setAttribute('data-lang', lang);
      opt.innerHTML = '<span class="flag-icon">'+FLAGS[lang]+'</span><span>'+HANDPATH_I18N[lang]['lang_name_'+lang]+'</span>';
      opt.addEventListener('click', function(e){
        e.stopPropagation();
        applyLanguage(lang);
        switchEl.classList.remove('open');
      });
      menu.appendChild(opt);
    });

    btn.addEventListener('click', function(e){
      e.stopPropagation();
      switchEl.classList.toggle('open');
    });
    document.addEventListener('click', function(){ switchEl.classList.remove('open'); });
  }

  function updateLangSwitcherUI(){
    var flagEl = document.getElementById('langCurrentFlag');
    var labelEl = document.getElementById('langCurrentLabel');
    if(flagEl) flagEl.innerHTML = FLAGS[currentLang];
    if(labelEl) labelEl.textContent = LANG_CODE_LABEL[currentLang];
    document.querySelectorAll('.lang-option').forEach(function(opt){
      opt.classList.toggle('active', opt.getAttribute('data-lang') === currentLang);
    });
  }

  /* =====================================================
     FORMULÁRIOS DE WAITLIST
     ===================================================== */
  function submitEmail(email){
    // TODO: integrar com serviço real de e-mail/waitlist.
    return Promise.resolve({ ok:true });
  }

  function initForms(){
    document.querySelectorAll('.waitlist-form').forEach(function(form){
      var input = form.querySelector('input[type="email"]');
      var button = form.querySelector('button');
      var msg = form.nextElementSibling;
      if(!msg || !msg.classList || !msg.classList.contains('form-msg')){ msg = null; }

      input.addEventListener('input', function(){ input.classList.remove('has-error'); });

      form.addEventListener('submit', function(e){
        e.preventDefault();
        var value = (input.value || '').trim();

        if(!EMAIL_RE.test(value)){
          input.classList.add('has-error');
          if(msg){ msg.textContent = t('msg_invalid_email'); msg.className = 'form-msg error'; }
          input.focus();
          return;
        }

        button.disabled = true;
        button.removeAttribute('data-i18n');
        button.textContent = t('btn_sending');
        if(msg){ msg.textContent = ''; msg.className = 'form-msg'; }

        submitEmail(value).then(function(res){
          if(res && res.ok){
            button.textContent = t('btn_done');
            if(msg){ msg.textContent = t('msg_success'); msg.className = 'form-msg success'; }
            input.value = '';
            input.disabled = true;
          } else {
            button.disabled = false;
            if(msg){ msg.textContent = t('msg_error'); msg.className = 'form-msg error'; }
          }
        });
      });
    });
  }

  /* =====================================================
     FAQ
     ===================================================== */
  function initFaq(){
    document.querySelectorAll('.faq-item').forEach(function(item){
      item.querySelector('.faq-q').addEventListener('click', function(){
        item.classList.toggle('open');
      });
    });
  }

  /* =====================================================
     NAV CTA
     ===================================================== */
  function initNavCta(){
    var navCta = document.getElementById('navCta');
    var heroInput = document.querySelector('#heroForm input[type="email"]');
    if(!navCta || !heroInput) return;
    navCta.addEventListener('click', function(){
      heroInput.scrollIntoView({behavior:'smooth', block:'center'});
      setTimeout(function(){ heroInput.focus(); }, 450);
    });
  }

  /* =====================================================
     CARTAS
     ===================================================== */
  var SUITS = {
    hearts:{symbol:'♥', color:'red'}, diamonds:{symbol:'♦', color:'red'},
    clubs:{symbol:'♣', color:'black'}, spades:{symbol:'♠', color:'black'}
  };
  function buildCard(rank, suitKey, size){
    var suit = SUITS[suitKey];
    var el = document.createElement('div');
    el.className = 'card' + (size==='sm' ? ' sm' : '') + ' suit-' + suit.color;
    el.innerHTML =
      '<div class="card-corner top"><span class="rank">'+rank+'</span><span class="suit">'+suit.symbol+'</span></div>' +
      '<div class="card-pip">'+suit.symbol+'</div>' +
      '<div class="card-corner bottom"><span class="rank">'+rank+'</span><span class="suit">'+suit.symbol+'</span></div>';
    return el;
  }

  /* =====================================================
     QUIZ — banco de perguntas (chaves, texto vem do i18n)
     ===================================================== */
  var QUIZ = [
    { qKey:'quiz_q1', scene:null, options:[
      {key:'quiz_q1_opt1', pts:0},{key:'quiz_q1_opt2', pts:1},{key:'quiz_q1_opt3', pts:2},{key:'quiz_q1_opt4', pts:3}
    ]},
    { qKey:'quiz_q2', scene:[['K','hearts'],['K','clubs'],['K','diamonds'],['9','spades'],['9','hearts']], options:[
      {key:'quiz_q2_opt1', pts:0},{key:'quiz_q2_opt2', pts:3},{key:'quiz_q2_opt3', pts:1},{key:'quiz_q2_opt4', pts:0}
    ]},
    { qKey:'quiz_q3', scene:[['A','clubs'],['7','diamonds']], options:[
      {key:'quiz_q3_opt1', pts:0},{key:'quiz_q3_opt2', pts:1},{key:'quiz_q3_opt3', pts:3},{key:'quiz_q3_opt4', pts:1}
    ]},
    { qKey:'quiz_q4', scene:null, options:[
      {key:'quiz_q4_opt1', pts:0},{key:'quiz_q4_opt2', pts:3},{key:'quiz_q4_opt3', pts:1},{key:'quiz_q4_opt4', pts:0}
    ]},
    { qKey:'quiz_q5', scene:null, options:[
      {key:'quiz_q5_opt1', pts:0},{key:'quiz_q5_opt2', pts:3},{key:'quiz_q5_opt3', pts:1},{key:'quiz_q5_opt4', pts:1}
    ]},
    { qKey:'quiz_q6', scene:[['7','diamonds'],['7','clubs'],['2','spades']], options:[
      {key:'quiz_q6_opt1', pts:1},{key:'quiz_q6_opt2', pts:3},{key:'quiz_q6_opt3', pts:1},{key:'quiz_q6_opt4', pts:0}
    ]},
    { qKey:'quiz_q7', scene:null, options:[
      {key:'quiz_q7_opt1', pts:0},{key:'quiz_q7_opt2', pts:1},{key:'quiz_q7_opt3', pts:2},{key:'quiz_q7_opt4', pts:3}
    ]},
    { qKey:'quiz_q8', scene:null, options:[
      {key:'quiz_q8_opt1', pts:1},{key:'quiz_q8_opt2', pts:3},{key:'quiz_q8_opt3', pts:0},{key:'quiz_q8_opt4', pts:1}
    ]}
  ];

  var MAX_SCORE = QUIZ.reduce(function(sum,q){
    return sum + Math.max.apply(null, q.options.map(function(o){return o.pts;}));
  }, 0);

  var quizState = { index:0, score:0, started:false };
  var quizDom = {};

  function cacheQuizDom(){
    quizDom.introEl = document.getElementById('quizIntro');
    quizDom.playingEl = document.getElementById('quizPlaying');
    quizDom.progressEl = document.getElementById('quizProgress');
    quizDom.bodyEl = document.getElementById('quizBody');
    quizDom.qnumEl = document.getElementById('quizQnum');
    quizDom.questionEl = document.getElementById('quizQuestion');
    quizDom.sceneEl = document.getElementById('quizScene');
    quizDom.optionsEl = document.getElementById('quizOptions');
    quizDom.loadingEl = document.getElementById('quizLoading');
    quizDom.loadingTxt = document.getElementById('quizLoadingText');
    quizDom.resultEl = document.getElementById('quizResult');
    quizDom.startBtn = document.getElementById('quizStartBtn');
    quizDom.retryBtn = document.getElementById('quizRetryBtn');
    quizDom.goPlanBtn = document.getElementById('quizGoPlanBtn');
  }

  function buildQuizProgressDots(){
    QUIZ.forEach(function(){
      var dot = document.createElement('div');
      dot.className = 'dot';
      dot.innerHTML = '<i></i>';
      quizDom.progressEl.appendChild(dot);
    });
  }

  function updateQuizProgress(){
    var dots = quizDom.progressEl.querySelectorAll('.dot');
    dots.forEach(function(dot, i){
      dot.classList.remove('done','current');
      if(i < quizState.index) dot.classList.add('done');
      else if(i === quizState.index) dot.classList.add('current');
    });
  }

  function renderQuizQuestion(animateIn){
    var item = QUIZ[quizState.index];
    quizDom.qnumEl.textContent = t('quiz_qnum_template')
      .replace('{n}', quizState.index+1).replace('{total}', QUIZ.length);
    quizDom.questionEl.textContent = t(item.qKey);
    quizDom.sceneEl.innerHTML = '';
    if(item.scene){
      item.scene.forEach(function(c){ quizDom.sceneEl.appendChild(buildCard(c[0], c[1], 'sm')); });
    }
    quizDom.optionsEl.innerHTML = '';
    item.options.forEach(function(opt){
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quiz-option';
      btn.textContent = t(opt.key);
      btn.addEventListener('click', function(){ selectQuizAnswer(opt.pts, btn); });
      quizDom.optionsEl.appendChild(btn);
    });
    updateQuizProgress();
    if(animateIn && hasGsap()){
      gsap.fromTo(quizDom.bodyEl, {opacity:0, x:24}, {opacity:1, x:0, duration:.4, ease:'power2.out'});
    }
  }

  function selectQuizAnswer(pts, btn){
    Array.prototype.forEach.call(quizDom.optionsEl.children, function(b){ b.disabled = true; });
    btn.classList.add('picked');
    quizState.score += pts;
    setTimeout(function(){
      quizState.index++;
      if(quizState.index >= QUIZ.length){
        finishQuiz();
      } else if(hasGsap()){
        gsap.to(quizDom.bodyEl, {opacity:0, x:-24, duration:.3, ease:'power2.in', onComplete:function(){
          renderQuizQuestion(true);
        }});
      } else {
        renderQuizQuestion(false);
      }
    }, 380);
  }

  function finishQuiz(){
    quizDom.playingEl.style.display = 'none';
    quizDom.loadingEl.classList.add('active');
    var dotCount = 0;
    var timer = setInterval(function(){
      dotCount = (dotCount+1) % 4;
      quizDom.loadingTxt.textContent = t('quiz_loading_text') + '.'.repeat(dotCount || 1);
    }, 250);
    setTimeout(function(){
      clearInterval(timer);
      quizDom.loadingEl.classList.remove('active');
      quizDom.resultEl.classList.add('active');
      renderResultTexts(true);
    }, 1300);
  }

  function levelKeyFromScore(score){
    var pct = score / MAX_SCORE;
    if(pct <= 0.35) return 'level_beginner';
    if(pct <= 0.7) return 'level_intermediate';
    return 'level_advanced';
  }
  function planFromScore(score){
    var pct = score / MAX_SCORE;
    if(pct <= 0.25) return {id:'free', name:'Free', whyKey:'plan_why_free'};
    if(pct <= 0.55) return {id:'starter', name:'Starter', whyKey:'plan_why_starter'};
    if(pct <= 0.85) return {id:'pro', name:'Pro', whyKey:'plan_why_pro'};
    return {id:'elite', name:'Elite', whyKey:'plan_why_elite'};
  }

  function renderResultTexts(animate){
    var levelKey = levelKeyFromScore(quizState.score);
    var plan = planFromScore(quizState.score);
    document.getElementById('resultLevel').textContent = t(levelKey);
    document.getElementById('resultPlanName').textContent = plan.name;
    document.getElementById('resultPlanWhy').textContent = t(plan.whyKey);
    quizDom.resultEl.setAttribute('data-plan', plan.id);

    var pct = Math.round((quizState.score / MAX_SCORE) * 100);
    var fill = document.getElementById('resultMeterFill');
    if(animate && hasGsap()){
      gsap.fromTo(fill, {width:'0%'}, {width:pct+'%', duration:1, ease:'power2.out', delay:.15});
      gsap.fromTo(quizDom.resultEl.children, {opacity:0, y:14}, {opacity:1, y:0, duration:.5, stagger:.08, delay:.1});
    } else if(fill){
      fill.style.width = pct + '%';
    }
  }

  function refreshQuizLanguage(){
    if(!quizDom.playingEl) return;
    if(quizDom.playingEl.style.display !== 'none' && quizState.started && quizState.index < QUIZ.length){
      renderQuizQuestion(false);
    }
    if(quizDom.resultEl && quizDom.resultEl.classList.contains('active')){
      renderResultTexts(false);
    }
  }

  function initQuiz(){
    cacheQuizDom();
    if(!quizDom.introEl) return;
    buildQuizProgressDots();

    quizDom.startBtn.addEventListener('click', function(){
      quizDom.introEl.style.display = 'none';
      quizDom.playingEl.style.display = 'block';
      quizState = {index:0, score:0, started:true};
      renderQuizQuestion(false);
    });

    quizDom.retryBtn.addEventListener('click', function(){
      quizDom.resultEl.classList.remove('active');
      quizState = {index:0, score:0, started:true};
      quizDom.playingEl.style.display = 'block';
      renderQuizQuestion(false);
    });

    quizDom.goPlanBtn.addEventListener('click', function(){
      var planId = quizDom.resultEl.getAttribute('data-plan');
      selectPlanById(planId);
      var target = document.getElementById('planos');
      if(target){ target.scrollIntoView({behavior:'smooth', block:'start'}); }
    });
  }

  /* =====================================================
     PLANOS
     ===================================================== */
  var PLAN_NAMES = {free:'Free', starter:'Starter', pro:'Pro', elite:'Elite'};

  function setPlanPrices(isAnnual, animate){
    var toggle = document.getElementById('plansToggle');
    if(toggle) toggle.classList.toggle('annual', isAnnual);
    var suffixText = isAnnual ? t('price_suffix_annual') : t('price_suffix_monthly');
    document.querySelectorAll('.pc-price').forEach(function(el){
      var target = parseFloat(el.getAttribute(isAnnual ? 'data-annual' : 'data-monthly'));
      var suffixSpan = el.querySelector('span');
      if(animate && hasGsap()){
        var current = parseFloat((el.textContent.match(/[\d.]+/)||[0])[0]) || 0;
        var proxy = {val:current};
        gsap.to(proxy, {
          val:target, duration:.5, ease:'power2.out',
          onUpdate:function(){ el.childNodes[0].nodeValue = 'US$ ' + Math.round(proxy.val); },
          onComplete:function(){ if(suffixSpan) suffixSpan.textContent = suffixText; }
        });
      } else {
        el.childNodes[0].nodeValue = 'US$ ' + target;
        if(suffixSpan) suffixSpan.textContent = suffixText;
      }
    });
  }

  function refreshDynamicPlanPrices(){ setPlanPrices(plansAnnual, false); }

  function initPlans(){
    var sw = document.getElementById('plansSwitch');
    if(!sw) return;
    sw.addEventListener('click', function(){
      plansAnnual = !plansAnnual;
      setPlanPrices(plansAnnual, true);
    });
    document.querySelectorAll('.plan-card .pc-cta').forEach(function(btn){
      btn.addEventListener('click', function(){
        var card = btn.closest('.plan-card');
        selectPlanById(card.getAttribute('data-plan'));
        var input = document.querySelector('#foundersForm input[type="email"]');
        if(input){
          input.scrollIntoView({behavior:'smooth', block:'center'});
          setTimeout(function(){ input.focus(); }, 400);
        }
      });
    });
  }

  function selectPlanById(planId){
    selectedPlan = planId;
    document.querySelectorAll('.plan-card').forEach(function(card){ card.classList.remove('highlight-pulse'); });
    var card = document.querySelector('.plan-card[data-plan="'+planId+'"]');
    if(card){
      card.classList.add('highlight-pulse');
      if(hasGsap()){ gsap.fromTo(card, {scale:1}, {scale:1.02, duration:.25, yoyo:true, repeat:1, ease:'power1.inOut'}); }
      setTimeout(function(){ card.classList.remove('highlight-pulse'); }, 2600);
    }
    var note = document.getElementById('selectedPlanNote');
    if(note && PLAN_NAMES[planId]){
      note.textContent = t('selected_plan_template').replace('{plan}', PLAN_NAMES[planId]);
    }
  }

  /* =====================================================
     HERO FLOATERS
     ===================================================== */
  function initHeroFloaters(){
    var wrap = document.getElementById('heroFloaters');
    if(!wrap) return;
    var suits = ['♠','♥','♦','♣'];
    var positions = [
      {top:'12%', left:'8%'}, {top:'70%', left:'12%'}, {top:'20%', left:'85%'},
      {top:'65%', left:'88%'}, {top:'40%', left:'4%'}, {top:'45%', left:'93%'}
    ];
    positions.forEach(function(pos, i){
      var span = document.createElement('span');
      span.textContent = suits[i % suits.length];
      span.style.top = pos.top;
      span.style.left = pos.left;
      span.style.animationDelay = (i * 0.6) + 's';
      span.style.animationDuration = (7 + i) + 's';
      wrap.appendChild(span);
    });
  }

  /* =====================================================
     MAGNETIC BUTTONS
     ===================================================== */
  function initMagnetic(){
    if(!hasGsap()) return;
    document.querySelectorAll('.magnetic').forEach(function(el){
      var xTo = gsap.quickTo(el, 'x', {duration:.35, ease:'power3.out'});
      var yTo = gsap.quickTo(el, 'y', {duration:.35, ease:'power3.out'});
      el.addEventListener('mousemove', function(e){
        var r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width/2)) * 0.28);
        yTo((e.clientY - (r.top + r.height/2)) * 0.5);
      });
      el.addEventListener('mouseleave', function(){ xTo(0); yTo(0); });
    });
  }

  /* =====================================================
     PILLAR TILT
     ===================================================== */
  function initTilt(){
    if(!hasGsap()) return;
    document.querySelectorAll('[data-tilt]').forEach(function(card){
      var rxTo = gsap.quickTo(card, 'rotationX', {duration:.4, ease:'power2.out'});
      var ryTo = gsap.quickTo(card, 'rotationY', {duration:.4, ease:'power2.out'});
      card.addEventListener('mousemove', function(e){
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        rxTo(py * -8); ryTo(px * 8);
      });
      card.addEventListener('mouseleave', function(){ rxTo(0); ryTo(0); });
    });
  }

  /* =====================================================
     SCROLL PROGRESS BAR
     ===================================================== */
  function initScrollProgress(){
    var bar = document.getElementById('scrollProgressBar');
    if(!bar) return;
    function update(){
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
    }
    window.addEventListener('scroll', update, {passive:true});
    update();
  }

  /* =====================================================
     PATH SVG DRAW-ON-SCROLL
     ===================================================== */
  function initPathDraw(){
    var line = document.getElementById('pathLineFill');
    if(!line || !hasGsap()) return;
    gsap.to(line, {
      strokeDashoffset: 0, ease:'none',
      scrollTrigger:{ trigger:'.path-track', start:'top 80%', end:'bottom 60%', scrub:.6 }
    });
  }

  /* =====================================================
     HERO ENTRANCE + SCROLL REVEALS
     ===================================================== */
  function runHeroEntrance(){
    gsap.timeline({defaults:{ease:'power3.out'}})
      .to('.hero-eyebrow', {opacity:1, y:0, duration:.5})
      .to('.hero h1', {opacity:1, y:0, duration:.7}, '-=.25')
      .to('.hero-sub', {opacity:1, y:0, duration:.6}, '-=.4')
      .to('.hero-form-wrap', {opacity:1, y:0, duration:.6}, '-=.35')
      .to('.hero-trust', {opacity:1, duration:.5}, '-=.3');
  }

  function runScrollReveals(){
    document.querySelectorAll('.reveal').forEach(function(el){
      gsap.to(el, {
        opacity:1, y:0, duration:.8, ease:'power2.out',
        scrollTrigger:{ trigger:el, start:'top 85%' }
      });
    });
  }

  function hasGsap(){
    return (typeof gsap !== 'undefined') && (typeof ScrollTrigger !== 'undefined');
  }

  /* =====================================================
     BOOT
     ===================================================== */
  initForms();
  initFaq();
  initNavCta();
  initHeroFloaters();
  initScrollProgress();
  buildLangSwitcher();
  initQuiz();
  initPlans();

  currentLang = detectDefaultLang();
  applyLanguage(currentLang);

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if(hasGsap() && !reduceMotion){
    gsap.registerPlugin(ScrollTrigger);
    runHeroEntrance();
    runScrollReveals();
    initMagnetic();
    initTilt();
    initPathDraw();
  } else {
    document.documentElement.classList.add('hp-fallback');
  }

  document.documentElement.setAttribute('data-hp-loaded', '1');

})();
