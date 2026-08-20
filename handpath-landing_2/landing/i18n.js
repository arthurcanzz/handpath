/* =====================================================
   HANDPATH — DICIONÁRIO DE TRADUÇÕES
   Termos de poker (flop, turn, river, check, call, raise,
   fold, all-in, bluff, c-bet, button, blinds, stack, pot
   odds, equity, range, cash game, multi-table, GTO, nomes
   de mãos como Flush/Full House/Straight) ficam em INGLÊS
   nas três línguas de propósito — é assim que se fala na
   mesa, em qualquer um dos três mercados.
   ===================================================== */

var HANDPATH_SUPPORTED_LANGS = ["pt", "en", "es"];

var HANDPATH_I18N = {
  pt: {
    meta_title:
      "Handpath — Aprenda poker do zero. Treine como um profissional.",
    meta_description:
      "Handpath combina um curso estruturado de poker com um simulador de multi-table contra bots por nível. Faça o quiz e descubra seu nível.",

    nav_curso: "O Curso",
    nav_trilha: "Sua Trilha",
    nav_quiz: "Quiz",
    nav_planos: "Planos",
    nav_faq: "FAQ",
    nav_cta: "Comece agora",

    hero_eyebrow: "Já disponível · Crie sua conta grátis",
    hero_h1: "Do primeiro flop à mesa cheia de <em>bluffs</em>.",
    hero_sub:
      "Handpath é o único lugar que ensina poker do zero <strong>e</strong> treina a habilidade que nenhuma outra ferramenta treina: jogar bem em várias mesas ao mesmo tempo. Curso estruturado por nível + simulador com bots — sem dinheiro real envolvido.",
    hero_cta: "Criar conta grátis",
    trust_1: "100% treino, sem apostas reais",
    trust_2: "Do iniciante ao avançado",
    trust_3: "Sem cartão de crédito",

    problem_eyebrow: "O que falta hoje",
    problem_h2:
      "Ferramentas de estudo. Ferramentas de organizar janela. Nada que treine as duas coisas juntas.",
    problem_cell1_tag: "Cursos e solvers",
    problem_cell1_p:
      "Ensinam a teoria, mas não colocam você sob pressão de decidir rápido em várias mesas.",
    problem_cell2_tag: "Gerenciadores de multi-table",
    problem_cell2_p:
      "Organizam as janelas na tela — mas não ensinam a jogar bem dentro delas.",
    problem_cell3_tag: "Handpath",
    problem_cell3_p:
      "Currículo completo + simulador que treina exatamente o volume e a pressão de jogar várias mesas de verdade.",

    pillars_eyebrow: "Como funciona",
    pillars_h2: "Três peças, um único caminho",
    pillars_p:
      "Cada parte do Handpath existe para resolver uma lacuna específica de quem quer evoluir de verdade no poker.",
    pillar1_title: "Curso completo, do zero ao avançado",
    pillar1_p:
      "Uma trilha estruturada que começa no ranking de mãos e termina em leitura de adversário, teoria de jogo e ajuste de estratégia por formato — sem pular etapas, no seu ritmo.",
    pillar2_title: "Simulador multi-table contra bots reais",
    pillar2_p:
      "Jogue 1, 4, 12 ou 24 mesas ao mesmo tempo contra arquétipos como Nit, LAG, Calling Station e Maniac. O volume que você treina aqui é volume que realmente prepara para a mesa.",
    pillar3_title: "GUI de decisão, só dentro do treino",
    pillar3_p:
      "Recomendações por posição, profundidade de stack e formato de jogo — para você internalizar o padrão durante a prática, nunca como cola em mesa de dinheiro real.",

    trilha_eyebrow: "Sua trilha",
    trilha_h2: "Um curso para cada momento da sua evolução",
    path1_tag: "Nível 01",
    path1_title: "Iniciante",
    path1_p:
      "Fundamentos: ranking de mãos, odds, posição, primeiras mesas contra bots previsíveis. GUI sempre visível como apoio.",
    path2_tag: "Nível 02",
    path2_title: "Intermediário",
    path2_p:
      "Ranges dinâmicas, leitura de arquétipo de oponente, primeiras mesas simultâneas — o início real do treino de volume.",
    path3_tag: "Nível 03",
    path3_title: "Avançado",
    path3_p:
      "6 a 24 mesas simultâneas, população de bots variada, GUI só na análise pós-sessão. Decisão sob pressão, de verdade.",

    quiz_eyebrow: "Teste seu nível",
    quiz_h2: "Onde você está agora?",
    quiz_p:
      "8 situações reais de mesa. No final, mostramos seu nível e o plano ideal para começar.",
    quiz_intro_h3: "Pronto pra descobrir?",
    quiz_intro_p:
      "São 8 perguntas rápidas, baseadas em spots reais de jogo — não é sobre decorar teoria, é sobre o que você faria na mesa.",
    quiz_start_btn: "Começar quiz",
    quiz_qnum_template: "Pergunta {n} de {total}",
    quiz_loading_text: "Calculando seu nível",
    result_badge: "Seu nível",
    level_beginner: "Iniciante",
    level_intermediate: "Intermediário",
    level_advanced: "Avançado",
    result_plan_tag: "Plano recomendado",
    quiz_goplan_btn: "Ver plano recomendado",
    quiz_retry_btn: "Refazer quiz",

    quiz_q1: "Há quanto tempo você joga poker (online ou ao vivo)?",
    quiz_q1_opt1: "Nunca joguei uma mão sequer",
    quiz_q1_opt2: "Já joguei casualmente, sem estudar",
    quiz_q1_opt3: "Jogo com regularidade e já estudei um pouco",
    quiz_q1_opt4: "Jogo sério e estudo teoria com frequência",

    quiz_q2: "Qual dessas duas mãos vence no showdown?",
    quiz_q2_opt1: "Um Flush qualquer vence sempre esse Full House",
    quiz_q2_opt2: "Essa mão (Full House) vence um Flush",
    quiz_q2_opt3: "Empataria com qualquer Straight",
    quiz_q2_opt4: "Não sei dizer",

    quiz_q3:
      "Você está no Button, todos foldaram até você, e sua mão é A♣7♦. Qual costuma ser a jogada mais forte?",
    quiz_q3_opt1: "Foldar — mão fraca demais pra abrir",
    quiz_q3_opt2: "Só completar/limpar a aposta mínima",
    quiz_q3_opt3: "Dar um raise de roubo, isolando os blinds",
    quiz_q3_opt4: "Ir all-in direto",

    quiz_q4:
      "Pote de US$100. Seu oponente aposta US$50. De quanto de equity você precisa pra pagar com odds corretas?",
    quiz_q4_opt1: "~10%",
    quiz_q4_opt2: "~25%",
    quiz_q4_opt3: "~50%",
    quiz_q4_opt4: "~75%",

    quiz_q5:
      'Um adversário "Calling Station" nunca desiste de uma mão. Qual ajuste faz mais sentido contra ele?',
    quiz_q5_opt1: "Blefar mais — ele acaba desistindo em algum momento",
    quiz_q5_opt2: "Valorizar mais as mãos boas e blefar bem menos",
    quiz_q5_opt3: "Jogar exatamente igual jogaria contra qualquer um",
    quiz_q5_opt4: "Foldar sempre que ele sobe a aposta",

    quiz_q6:
      "Você deu raise pré-flop com A♠K♠ e o flop veio 7♦7♣2♠ — uma textura seca, sem conexão. O que costuma ser mais forte?",
    quiz_q6_opt1: "Check sempre, essa textura não favorece ninguém",
    quiz_q6_opt2: "C-bet pequeno — textura seca favorece quem deu o raise",
    quiz_q6_opt3: "C-bet grande sempre, pressionar ao máximo",
    quiz_q6_opt4: "Desistir da mão de cara",

    quiz_q7:
      "Quantas mesas simultâneas você já tentou jogar (ou se sente confortável tentando hoje)?",
    quiz_q7_opt1: "Nunca joguei mais de 1 mesa por vez",
    quiz_q7_opt2: "2 a 3 mesas",
    quiz_q7_opt3: "4 a 8 mesas",
    quiz_q7_opt4: "9 ou mais mesas",

    quiz_q8:
      'No river, o que determina a frequência "certa" de bluff pra você não ficar explorável?',
    quiz_q8_opt1: "Blefar sempre que a mão não tem valor de showdown",
    quiz_q8_opt2:
      "Blefar na proporção das odds oferecidas ao vilão (frequência mínima de defesa)",
    quiz_q8_opt3: "Nunca blefar no river, é jogada de amador",
    quiz_q8_opt4: "Blefar de forma aleatória, sem critério",

    plan_why_free:
      "Você ainda está construindo a base — comece de graça, sem custo, até pegar confiança nos fundamentos.",
    plan_why_starter:
      "Você já entende o jogo — o Starter te dá curso completo e até 4 mesas pra começar a treinar volume de verdade.",
    plan_why_pro:
      "Seu nível já pede simulação séria — o Pro libera todos os arquétipos de oponente e até 12 mesas simultâneas.",
    plan_why_elite:
      "Você já joga em nível avançado — o Elite te dá a simulação mais extrema (até 24 mesas) e ferramentas para levar isso a sério.",

    plans_eyebrow: "Planos",
    plans_h2: "Comece de graça. Evolua no seu ritmo.",
    toggle_monthly: "Mensal",
    toggle_annual: "Anual",
    toggle_save: "economize ~25%",
    price_suffix_monthly: "/mês",
    price_suffix_annual: "/mês (anual)",

    plan_free_tag: "Comece de graça",
    plan_free_desc:
      "Pra quem nunca jogou e quer entender o básico antes de tudo.",
    plan_free_li1: "Ranking de mãos e odds",
    plan_free_li2: "1 mesa vs. bot iniciante",
    plan_free_li3: "Sessão limitada por dia",
    plan_free_cta: "Começar grátis",

    plan_starter_desc:
      "Bots iniciante + intermediário, até 4 mesas ao mesmo tempo.",
    plan_starter_li1: "Curso completo (nível 1 e 2)",
    plan_starter_li2: "Até 4 mesas simultâneas",
    plan_starter_li3: "GUI básico sempre visível",
    plan_starter_cta: "Escolher Starter",

    plan_pro_tag: "Mais popular",
    plan_pro_desc:
      "Todos os arquétipos de oponente, até 12 mesas, analytics completo.",
    plan_pro_li1: "Curso completo (todos os níveis)",
    plan_pro_li2: "Até 12 mesas simultâneas",
    plan_pro_li3: "GUI completo (posição/stack/formato)",
    plan_pro_li4: "Analytics de sessão",
    plan_pro_cta: "Escolher Pro",

    plan_elite_tag: "Elite / Coach",
    plan_elite_desc:
      "Simulação extrema e ferramentas para quem leva o jogo a sério.",
    plan_elite_li1: "Até 24 mesas simultâneas",
    plan_elite_li2: "Pool de bots customizável",
    plan_elite_li3: "Relatórios exportáveis",
    plan_elite_li4: "Acesso antecipado a novidades",
    plan_elite_cta: "Escolher Elite",

    faq_eyebrow: "Perguntas frequentes",
    faq_h2: "Perguntas antes de começar",
    faq1_q: "Isso envolve dinheiro real?",
    faq1_a:
      "Não. Hoje o Handpath é 100% treino — sem apostas reais. Pense nele como um simulador de voo para poker: você constrói reflexo e conhecimento antes de levar isso para a mesa que já joga.",
    faq2_q: "Preciso já saber jogar para começar?",
    faq2_a:
      "Não. O curso começa do absoluto zero e o simulador ajusta o nível dos bots — e a quantidade de mesas — conforme você evolui.",
    faq3_q: "Funciona para cash game e torneio?",
    faq3_a:
      "Lançamos com NLHE cash game 6-max. Torneio e outros formatos entram no roadmap logo depois, com base no que for mais pedido.",
    faq4_q: "Quando o Handpath lança?",
    faq4_a:
      "Já está disponível — crie sua conta grátis e comece a treinar agora.",

    footer_note:
      "Plataforma educacional de poker. Curso estruturado e simulador de treino — não envolve jogo por dinheiro real.",
    footer_tagline: "POKER TRAINING PLATFORM",

    lang_switch_label: "Selecionar idioma",
    lang_name_pt: "Português",
    lang_name_en: "English",
    lang_name_es: "Español",
  },

  en: {
    meta_title: "Handpath — Learn poker from scratch. Train like a pro.",
    meta_description:
      "Handpath combines a structured poker course with a multi-table simulator against level-based bots. Take the quiz and find out your level.",

    nav_curso: "The Course",
    nav_trilha: "Your Path",
    nav_quiz: "Quiz",
    nav_planos: "Plans",
    nav_faq: "FAQ",
    nav_cta: "Get started",

    hero_eyebrow: "Available now · Create your free account",
    hero_h1: "From your first flop to a table full of <em>bluffs</em>.",
    hero_sub:
      "Handpath is the only place that teaches poker from scratch <strong>and</strong> trains the one skill no other tool trains: playing well across several tables at once. A level-based course + a bot simulator — no real money involved.",
    hero_cta: "Create free account",
    trust_1: "100% training, no real-money bets",
    trust_2: "From beginner to advanced",
    trust_3: "No credit card required",

    problem_eyebrow: "What's missing today",
    problem_h2:
      "Study tools. Window-management tools. Nothing that trains both at once.",
    problem_cell1_tag: "Courses and solvers",
    problem_cell1_p:
      "They teach the theory, but never put you under the pressure of deciding fast across several tables.",
    problem_cell2_tag: "Multi-table managers",
    problem_cell2_p:
      "They organize the windows on your screen — but never teach you to play well inside them.",
    problem_cell3_tag: "Handpath",
    problem_cell3_p:
      "A complete curriculum + a simulator that trains exactly the volume and pressure of real multi-tabling.",

    pillars_eyebrow: "How it works",
    pillars_h2: "Three pieces, one path",
    pillars_p:
      "Every part of Handpath exists to close a specific gap for anyone who wants to genuinely get better at poker.",
    pillar1_title: "A complete course, from zero to advanced",
    pillar1_p:
      "A structured path that starts at hand rankings and ends at opponent reads, game theory, and format-specific strategy — no skipped steps, at your own pace.",
    pillar2_title: "Multi-table simulator against real bots",
    pillar2_p:
      "Play 1, 4, 12, or 24 tables at once against archetypes like Nit, LAG, Calling Station, and Maniac. The volume you train here is volume that actually prepares you for the table.",
    pillar3_title: "Decision GUI, only inside training",
    pillar3_p:
      "Recommendations by position, stack depth, and game format — so you internalize the pattern during practice, never as a crutch at a real-money table.",

    trilha_eyebrow: "Your path",
    trilha_h2: "A course for every stage of your growth",
    path1_tag: "Level 01",
    path1_title: "Beginner",
    path1_p:
      "Fundamentals: hand rankings, odds, position, your first tables against predictable bots. GUI always visible as support.",
    path2_tag: "Level 02",
    path2_title: "Intermediate",
    path2_p:
      "Dynamic ranges, opponent-archetype reads, your first simultaneous tables — the real start of volume training.",
    path3_tag: "Level 03",
    path3_title: "Advanced",
    path3_p:
      "6 to 24 simultaneous tables, a varied bot population, GUI only in post-session review. Real decision-making under pressure.",

    quiz_eyebrow: "Test your level",
    quiz_h2: "Where are you right now?",
    quiz_p:
      "8 real table situations. At the end, we'll show your level and the ideal plan to get started.",
    quiz_intro_h3: "Ready to find out?",
    quiz_intro_p:
      "8 quick questions based on real game spots — this isn't about memorizing theory, it's about what you'd actually do at the table.",
    quiz_start_btn: "Start the quiz",
    quiz_qnum_template: "Question {n} of {total}",
    quiz_loading_text: "Calculating your level",
    result_badge: "Your level",
    level_beginner: "Beginner",
    level_intermediate: "Intermediate",
    level_advanced: "Advanced",
    result_plan_tag: "Recommended plan",
    quiz_goplan_btn: "See recommended plan",
    quiz_retry_btn: "Retake the quiz",

    quiz_q1: "How long have you been playing poker (online or live)?",
    quiz_q1_opt1: "I've never played a single hand",
    quiz_q1_opt2: "I've played casually, without studying",
    quiz_q1_opt3: "I play regularly and have studied a bit",
    quiz_q1_opt4: "I play seriously and study theory often",

    quiz_q2: "Which of these two hands wins at showdown?",
    quiz_q2_opt1: "Any Flush always beats this Full House",
    quiz_q2_opt2: "This hand (Full House) beats a Flush",
    quiz_q2_opt3: "It would tie with any Straight",
    quiz_q2_opt4: "I'm not sure",

    quiz_q3:
      "You're on the Button, everyone folded to you, and your hand is A♣7♦. What's usually the strongest play?",
    quiz_q3_opt1: "Fold — the hand is too weak to open",
    quiz_q3_opt2: "Just limp in for the minimum",
    quiz_q3_opt3: "Raise as a steal, isolating the blinds",
    quiz_q3_opt4: "Go all-in right away",

    quiz_q4:
      "The pot is $100. Your opponent bets $50. How much equity do you need to call with the right odds?",
    quiz_q4_opt1: "~10%",
    quiz_q4_opt2: "~25%",
    quiz_q4_opt3: "~50%",
    quiz_q4_opt4: "~75%",

    quiz_q5:
      'A "Calling Station" opponent never folds a hand. What adjustment makes the most sense against them?',
    quiz_q5_opt1: "Bluff more — they'll eventually fold",
    quiz_q5_opt2: "Value bet more and bluff a lot less",
    quiz_q5_opt3: "Play exactly like you would against anyone else",
    quiz_q5_opt4: "Fold every time they raise",

    quiz_q6:
      "You raised preflop with A♠K♠ and the flop came 7♦7♣2♠ — a dry, disconnected texture. What's usually stronger?",
    quiz_q6_opt1: "Always check, this texture doesn't favor anyone",
    quiz_q6_opt2: "A small c-bet — dry textures favor the preflop raiser",
    quiz_q6_opt3: "Always a big c-bet, apply max pressure",
    quiz_q6_opt4: "Give up on the hand right away",

    quiz_q7:
      "How many simultaneous tables have you tried playing (or would feel comfortable trying today)?",
    quiz_q7_opt1: "I've never played more than 1 table at a time",
    quiz_q7_opt2: "2 to 3 tables",
    quiz_q7_opt3: "4 to 8 tables",
    quiz_q7_opt4: "9 or more tables",

    quiz_q8:
      'On the river, what determines the "right" bluffing frequency so you don\'t become exploitable?',
    quiz_q8_opt1: "Bluff whenever the hand has no showdown value",
    quiz_q8_opt2:
      "Bluff in proportion to the odds you're giving the villain (minimum defense frequency)",
    quiz_q8_opt3: "Never bluff the river, it's an amateur play",
    quiz_q8_opt4: "Bluff randomly, with no criteria",

    plan_why_free:
      "You're still building the basics — start for free, at no cost, until you're confident with the fundamentals.",
    plan_why_starter:
      "You already understand the game — Starter gives you the full course and up to 4 tables to start training real volume.",
    plan_why_pro:
      "Your level already calls for serious simulation — Pro unlocks every opponent archetype and up to 12 simultaneous tables.",
    plan_why_elite:
      "You're already playing at an advanced level — Elite gives you the most extreme simulation (up to 24 tables) and tools to take it seriously.",

    plans_eyebrow: "Plans",
    plans_h2: "Start for free. Grow at your own pace.",
    toggle_monthly: "Monthly",
    toggle_annual: "Annual",
    toggle_save: "save ~25%",
    price_suffix_monthly: "/month",
    price_suffix_annual: "/month (annual)",

    plan_free_tag: "Start for free",
    plan_free_desc:
      "For anyone who's never played and wants to understand the basics first.",
    plan_free_li1: "Hand rankings and odds",
    plan_free_li2: "1 table vs. a beginner bot",
    plan_free_li3: "Limited session per day",
    plan_free_cta: "Start for free",

    plan_starter_desc: "Beginner + intermediate bots, up to 4 tables at once.",
    plan_starter_li1: "Full course (level 1 and 2)",
    plan_starter_li2: "Up to 4 simultaneous tables",
    plan_starter_li3: "Basic GUI always visible",
    plan_starter_cta: "Choose Starter",

    plan_pro_tag: "Most popular",
    plan_pro_desc: "Every opponent archetype, up to 12 tables, full analytics.",
    plan_pro_li1: "Full course (all levels)",
    plan_pro_li2: "Up to 12 simultaneous tables",
    plan_pro_li3: "Full GUI (position/stack/format)",
    plan_pro_li4: "Session analytics",
    plan_pro_cta: "Choose Pro",

    plan_elite_tag: "Elite / Coach",
    plan_elite_desc:
      "Extreme simulation and tools for those who take the game seriously.",
    plan_elite_li1: "Up to 24 simultaneous tables",
    plan_elite_li2: "Customizable bot pool",
    plan_elite_li3: "Exportable reports",
    plan_elite_li4: "Early access to new features",
    plan_elite_cta: "Choose Elite",

    faq_eyebrow: "Frequently asked questions",
    faq_h2: "Questions before you start",
    faq1_q: "Does this involve real money?",
    faq1_a:
      "No. Today Handpath is 100% training — no real-money betting. Think of it as a flight simulator for poker: you build reflexes and knowledge before taking it to the table you already play at.",
    faq2_q: "Do I need to already know how to play to get started?",
    faq2_a:
      "No. The course starts from absolute zero, and the simulator adjusts the bots' level — and the number of tables — as you progress.",
    faq3_q: "Does it work for cash games and tournaments?",
    faq3_a:
      "We're launching with NLHE cash game 6-max. Tournaments and other formats join the roadmap right after, based on what's requested most.",
    faq4_q: "When does Handpath launch?",
    faq4_a:
      "It's available right now — create your free account and start training today.",

    footer_note:
      "Educational poker platform. Structured course and training simulator — no real-money gambling involved.",
    footer_tagline: "POKER TRAINING PLATFORM",

    lang_switch_label: "Select language",
    lang_name_pt: "Português",
    lang_name_en: "English",
    lang_name_es: "Español",
  },

  es: {
    meta_title:
      "Handpath — Aprende poker desde cero. Entrena como un profesional.",
    meta_description:
      "Handpath combina un curso estructurado de poker con un simulador multi-table contra bots por nivel. Haz el quiz y descubre tu nivel.",

    nav_curso: "El Curso",
    nav_trilha: "Tu Camino",
    nav_quiz: "Quiz",
    nav_planos: "Planes",
    nav_faq: "FAQ",
    nav_cta: "Empieza ahora",

    hero_eyebrow: "Ya disponible · Crea tu cuenta gratis",
    hero_h1: "Del primer flop a una mesa llena de <em>bluffs</em>.",
    hero_sub:
      "Handpath es el único lugar que enseña poker desde cero <strong>y</strong> entrena la habilidad que ninguna otra herramienta entrena: jugar bien en varias mesas al mismo tiempo. Curso por nivel + simulador con bots — sin dinero real.",
    hero_cta: "Crear cuenta gratis",
    trust_1: "100% entrenamiento, sin apuestas reales",
    trust_2: "Del principiante al avanzado",
    trust_3: "Sin tarjeta de crédito",

    problem_eyebrow: "Lo que falta hoy",
    problem_h2:
      "Herramientas de estudio. Herramientas para organizar ventanas. Nada que entrene las dos cosas juntas.",
    problem_cell1_tag: "Cursos y solvers",
    problem_cell1_p:
      "Enseñan la teoría, pero no te ponen bajo la presión de decidir rápido en varias mesas.",
    problem_cell2_tag: "Gestores de multi-table",
    problem_cell2_p:
      "Organizan las ventanas en pantalla — pero no enseñan a jugar bien dentro de ellas.",
    problem_cell3_tag: "Handpath",
    problem_cell3_p:
      "Currículo completo + simulador que entrena exactamente el volumen y la presión de jugar varias mesas de verdad.",

    pillars_eyebrow: "Cómo funciona",
    pillars_h2: "Tres piezas, un solo camino",
    pillars_p:
      "Cada parte de Handpath existe para resolver una carencia específica de quien quiere mejorar de verdad en el poker.",
    pillar1_title: "Curso completo, de cero a avanzado",
    pillar1_p:
      "Un camino estructurado que empieza en el ranking de manos y termina en lectura de rivales, teoría de juego y ajuste de estrategia por formato — sin saltar etapas, a tu ritmo.",
    pillar2_title: "Simulador multi-table contra bots reales",
    pillar2_p:
      "Juega 1, 4, 12 o 24 mesas a la vez contra arquetipos como Nit, LAG, Calling Station y Maniac. El volumen que entrenas aquí es volumen que realmente te prepara para la mesa.",
    pillar3_title: "GUI de decisión, solo dentro del entrenamiento",
    pillar3_p:
      "Recomendaciones por posición, profundidad de stack y formato de juego — para que internalices el patrón durante la práctica, nunca como chuleta en una mesa de dinero real.",

    trilha_eyebrow: "Tu camino",
    trilha_h2: "Un curso para cada momento de tu evolución",
    path1_tag: "Nivel 01",
    path1_title: "Principiante",
    path1_p:
      "Fundamentos: ranking de manos, odds, posición, primeras mesas contra bots predecibles. GUI siempre visible como apoyo.",
    path2_tag: "Nivel 02",
    path2_title: "Intermedio",
    path2_p:
      "Ranges dinámicos, lectura de arquetipo de rival, primeras mesas simultáneas — el inicio real del entrenamiento de volumen.",
    path3_tag: "Nivel 03",
    path3_title: "Avanzado",
    path3_p:
      "De 6 a 24 mesas simultáneas, población de bots variada, GUI solo en el análisis post-sesión. Decisión bajo presión, de verdad.",

    quiz_eyebrow: "Pon a prueba tu nivel",
    quiz_h2: "¿Dónde estás ahora?",
    quiz_p:
      "8 situaciones reales de mesa. Al final, te mostramos tu nivel y el plan ideal para empezar.",
    quiz_intro_h3: "¿Listo para descubrirlo?",
    quiz_intro_p:
      "Son 8 preguntas rápidas, basadas en spots reales de juego — no se trata de memorizar teoría, sino de lo que harías en la mesa.",
    quiz_start_btn: "Empezar el quiz",
    quiz_qnum_template: "Pregunta {n} de {total}",
    quiz_loading_text: "Calculando tu nivel",
    result_badge: "Tu nivel",
    level_beginner: "Principiante",
    level_intermediate: "Intermedio",
    level_advanced: "Avanzado",
    result_plan_tag: "Plan recomendado",
    quiz_goplan_btn: "Ver plan recomendado",
    quiz_retry_btn: "Repetir el quiz",

    quiz_q1: "¿Hace cuánto juegas poker (online o en vivo)?",
    quiz_q1_opt1: "Nunca jugué ni una mano",
    quiz_q1_opt2: "Jugué casualmente, sin estudiar",
    quiz_q1_opt3: "Juego con regularidad y ya estudié un poco",
    quiz_q1_opt4: "Juego en serio y estudio teoría con frecuencia",

    quiz_q2: "¿Cuál de estas dos manos gana en el showdown?",
    quiz_q2_opt1: "Cualquier Flush siempre le gana a este Full House",
    quiz_q2_opt2: "Esta mano (Full House) le gana a un Flush",
    quiz_q2_opt3: "Empataría con cualquier Straight",
    quiz_q2_opt4: "No sabría decir",

    quiz_q3:
      "Estás en el Button, todos hicieron fold hasta llegar a ti, y tu mano es A♣7♦. ¿Cuál suele ser la jugada más fuerte?",
    quiz_q3_opt1: "Fold — la mano es demasiado floja para abrir",
    quiz_q3_opt2: "Solo pagar/limpar la apuesta mínima",
    quiz_q3_opt3: "Hacer un raise de robo, aislando los blinds",
    quiz_q3_opt4: "Ir all-in directamente",

    quiz_q4:
      "El pote es de US$100. Tu rival apuesta US$50. ¿Cuánta equity necesitas para pagar con las odds correctas?",
    quiz_q4_opt1: "~10%",
    quiz_q4_opt2: "~25%",
    quiz_q4_opt3: "~50%",
    quiz_q4_opt4: "~75%",

    quiz_q5:
      'Un rival "Calling Station" nunca suelta una mano. ¿Qué ajuste tiene más sentido contra él?',
    quiz_q5_opt1: "Hacer más bluff — en algún momento soltará",
    quiz_q5_opt2: "Apostar más por valor y hacer mucho menos bluff",
    quiz_q5_opt3: "Jugar exactamente igual que contra cualquier otro",
    quiz_q5_opt4: "Hacer fold siempre que suba la apuesta",

    quiz_q6:
      "Hiciste raise preflop con A♠K♠ y el flop salió 7♦7♣2♠ — una textura seca, sin conexión. ¿Qué suele ser más fuerte?",
    quiz_q6_opt1: "Check siempre, esta textura no favorece a nadie",
    quiz_q6_opt2:
      "C-bet pequeño — la textura seca favorece a quien hizo el raise",
    quiz_q6_opt3: "C-bet grande siempre, presionar al máximo",
    quiz_q6_opt4: "Rendirse con la mano de entrada",

    quiz_q7:
      "¿Cuántas mesas simultáneas ya intentaste jugar (o te sentirías cómodo intentando hoy)?",
    quiz_q7_opt1: "Nunca jugué más de 1 mesa a la vez",
    quiz_q7_opt2: "2 a 3 mesas",
    quiz_q7_opt3: "4 a 8 mesas",
    quiz_q7_opt4: "9 o más mesas",

    quiz_q8:
      'En el river, ¿qué determina la frecuencia "correcta" de bluff para que no seas explotable?',
    quiz_q8_opt1: "Hacer bluff siempre que la mano no tenga valor de showdown",
    quiz_q8_opt2:
      "Hacer bluff en proporción a las odds que le das al villano (frecuencia mínima de defensa)",
    quiz_q8_opt3: "Nunca hacer bluff en el river, es jugada de amateur",
    quiz_q8_opt4: "Hacer bluff al azar, sin criterio",

    plan_why_free:
      "Todavía estás construyendo la base — empieza gratis, sin costo, hasta ganar confianza con los fundamentos.",
    plan_why_starter:
      "Ya entiendes el juego — Starter te da el curso completo y hasta 4 mesas para empezar a entrenar volumen de verdad.",
    plan_why_pro:
      "Tu nivel ya pide simulación seria — Pro desbloquea todos los arquetipos de rival y hasta 12 mesas simultáneas.",
    plan_why_elite:
      "Ya juegas en nivel avanzado — Elite te da la simulación más extrema (hasta 24 mesas) y herramientas para tomártelo en serio.",

    plans_eyebrow: "Planes",
    plans_h2: "Empieza gratis. Evoluciona a tu ritmo.",
    toggle_monthly: "Mensual",
    toggle_annual: "Anual",
    toggle_save: "ahorra ~25%",
    price_suffix_monthly: "/mes",
    price_suffix_annual: "/mes (anual)",

    plan_free_tag: "Empieza gratis",
    plan_free_desc:
      "Para quien nunca jugó y quiere entender lo básico antes de todo.",
    plan_free_li1: "Ranking de manos y odds",
    plan_free_li2: "1 mesa vs. bot principiante",
    plan_free_li3: "Sesión limitada por día",
    plan_free_cta: "Empezar gratis",

    plan_starter_desc:
      "Bots principiante + intermedio, hasta 4 mesas a la vez.",
    plan_starter_li1: "Curso completo (nivel 1 y 2)",
    plan_starter_li2: "Hasta 4 mesas simultáneas",
    plan_starter_li3: "GUI básico siempre visible",
    plan_starter_cta: "Elegir Starter",

    plan_pro_tag: "Más popular",
    plan_pro_desc:
      "Todos los arquetipos de rival, hasta 12 mesas, analytics completo.",
    plan_pro_li1: "Curso completo (todos los niveles)",
    plan_pro_li2: "Hasta 12 mesas simultáneas",
    plan_pro_li3: "GUI completo (posición/stack/formato)",
    plan_pro_li4: "Analytics de sesión",
    plan_pro_cta: "Elegir Pro",

    plan_elite_tag: "Elite / Coach",
    plan_elite_desc:
      "Simulación extrema y herramientas para quien se toma el juego en serio.",
    plan_elite_li1: "Hasta 24 mesas simultáneas",
    plan_elite_li2: "Pool de bots personalizable",
    plan_elite_li3: "Informes exportables",
    plan_elite_li4: "Acceso anticipado a novedades",
    plan_elite_cta: "Elegir Elite",

    faq_eyebrow: "Preguntas frecuentes",
    faq_h2: "Preguntas antes de empezar",
    faq1_q: "¿Esto involucra dinero real?",
    faq1_a:
      "No. Hoy Handpath es 100% entrenamiento — sin apuestas reales. Piénsalo como un simulador de vuelo para el poker: construyes reflejos y conocimiento antes de llevarlo a la mesa donde ya juegas.",
    faq2_q: "¿Necesito saber jugar para empezar?",
    faq2_a:
      "No. El curso empieza desde cero absoluto y el simulador ajusta el nivel de los bots — y la cantidad de mesas — a medida que avanzas.",
    faq3_q: "¿Funciona para cash game y torneos?",
    faq3_a:
      "Lanzamos con NLHE cash game 6-max. Torneos y otros formatos entran al roadmap justo después, según lo que más se pida.",
    faq4_q: "¿Cuándo lanza Handpath?",
    faq4_a:
      "Ya está disponible — crea tu cuenta gratis y empieza a entrenar ahora.",

    footer_note:
      "Plataforma educativa de poker. Curso estructurado y simulador de entrenamiento — no involucra juego por dinero real.",
    footer_tagline: "POKER TRAINING PLATFORM",

    lang_switch_label: "Seleccionar idioma",
    lang_name_pt: "Português",
    lang_name_en: "English",
    lang_name_es: "Español",
  },
};
