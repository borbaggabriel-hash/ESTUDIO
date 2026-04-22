export const initialSiteData = {
  banners: [
    {
      id: 1,
      title: "Da Voz ao Personagem",
      subtitle: "MÓDULO 1 — INICIAÇÃO",
      description: "Perca o medo do microfone. Em 6 meses você domina apoio respiratório, leitura dramática com subtexto, etiqueta de estúdio e os primeiros loops de sincronia.",
      imageUrl: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=2070&auto=format&fit=crop"
    },
    {
      id: 2,
      title: "Técnica, Precisão e Repertório",
      subtitle: "MÓDULO 2 — TÉCNICA APLICADA",
      description: "Sincronia labial fina, ADR, voz caracterizada, comédia, drama, animação, games e narração: um semestre inteiro expandindo seus limites técnicos e emocionais.",
      imageUrl: "https://images.unsplash.com/photo-1598653222000-6b7b7a552625?q=80&w=2070&auto=format&fit=crop"
    },
    {
      id: 3,
      title: "Do Estúdio ao Mercado",
      subtitle: "MÓDULO 3 — EXCELÊNCIA",
      description: "Simule o ritmo de um estúdio real. Aprenda a dirigir, configure seu home studio, grave seu demo reel e enfrente a banca final com o portfólio na mão.",
      imageUrl: "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?q=80&w=2070&auto=format&fit=crop"
    }
  ],
  modules: [
    {
      num: "01",
      slug: "iniciacao-bases-interpretacao",
      title: "MÓDULO 1 — INICIAÇÃO",
      teacher: "Vitor Paranhos",
      duration: "6 meses",
      desc: "Voz, presença e técnica: transforme leitura em interpretação e domine os fundamentos do estúdio em 24 aulas progressivas.",
      icon: "Mic",
      details: {
        methodology: [
          "Mês 1 — Voz e Respiração: apoio diafragmático, ressonância e articulação com trava-línguas",
          "Mês 2 — Leitura Dramática: roteiros sem imagem para desenvolver intenção de fala e subtexto",
          "Mês 3 — Introdução à Sincronia: exercícios de isócrona e marcações de roteiro (\\, /, ~)",
          "Mês 4 — Voz Caracterizada: personagens de desenhos animados infantis e vozes caricatas leves",
          "Mês 5 — Voice-Over: prática de reality shows e entrevistas com voz original ao fundo",
          "Mês 6 — Primeiros Loops: cenas curtas de diálogos cotidianos em filmes (anéis de gravação)"
        ],
        lessons: [
          "Fisiologia da Voz",
          "Articulação e Dicção",
          "Leitura Branca vs. Dramática",
          "Análise de Subtexto",
          "Ética e Comportamento",
          "O Roteiro de Dublagem",
          "Divisão de Anéis (Loops)",
          "Introdução à Isócrona",
          "Técnica de Papel na Mão",
          "Voice-Over I (Reality)",
          "Voice-Over II (Entrevistas)",
          "Sincronia de Labiais (B, P, M)",
          "Interpretação de Diálogos I",
          "Interpretação de Diálogos II",
          "Estudo de Personagem",
          "Introdução ao Desenho Animado",
          "Projeção Vocal no Microfone",
          "Dublagem de Documentários",
          "Revisão Técnica",
          "Micro-interpretação",
          "Sincronia em Frases Longas",
          "Gravação de Piloto I",
          "Gravação de Piloto II",
          "Avaliação e Feedback"
        ]
      }
    },
    {
      num: "02",
      slug: "tecnica-aplicada-generos",
      title: "MÓDULO 2 — TÉCNICA APLICADA",
      teacher: "Daniel Ávila",
      duration: "6 meses",
      desc: "Sincronia fina, emoção e gêneros: expanda seu repertório com comédia, drama, animação, games e ADR em cenários reais.",
      icon: "Headphones",
      details: {
        methodology: [
          "Mês 1 — Sincronia Labial Fina: foco em labiais (P, B, M) e ajuste de velocidade de fala",
          "Mês 2 — Séries e Sitcoms: timing de comédia, pausas para risadas e agilidade no diálogo",
          "Mês 3 — Animações e Games: criação de personagens, heróis, vilões e NPCs de jogos",
          "Mês 4 — Reações e ADR: gritos, quedas, lutas e reações físicas sem fala (Additional Dialogue Recording)",
          "Mês 5 — Documentários e Narração: padrões Discovery / NatGeo e locuções institucionais",
          "Mês 6 — Drama e Intensidade: cenas de choro, discussões acaloradas e interpretação densa"
        ],
        lessons: [
          "Timing de Comédia",
          "Dublagem de Séries Procedurais",
          "Voz Caracterizada I",
          "Voz Caracterizada II",
          "ADR e Esforços Físicos I",
          "ADR e Esforços Físicos II",
          "Games I (In-game)",
          "Games II (Cinematics)",
          "O Choro na Dublagem",
          "O Riso na Dublagem",
          "Intensidade Dramática I",
          "Intensidade Dramática II",
          "Dublagem de Cinema (Longas)",
          "Análise de Dublagens Icônicas",
          "Manutenção de Personagem",
          "Dublagem de Novelas",
          "Adaptação de Texto",
          "Trabalho em Dupla (Bancada)",
          "Versatilidade Vocal",
          "Inserção de Ad-libs",
          "Estudo de Idiomas",
          "Preparação de Demo Reel I",
          "Preparação de Demo Reel II",
          "Avaliação Técnica"
        ]
      }
    },
    {
      num: "03",
      slug: "excelencia-mercado-profissional",
      title: "MÓDULO 3 — EXCELÊNCIA",
      teacher: "Ettore Zuim",
      duration: "6 meses",
      desc: "Portfólio, mercado e direção: saia com demo reel gravado, home studio configurado e pronto para o mercado.",
      icon: "Star",
      details: {
        methodology: [
          "Mês 1 — Dublagem de Longas: cinema de grande orçamento e nuances de interpretação para a telona",
          "Mês 2 — Musical e Versões: dublagem cantada, métrica e adaptação de rima em canções",
          "Mês 3 — Direção de Dublagem: o aluno dirige o colega para entender a visão e os comandos do diretor",
          "Mês 4 — Home Studio e Técnica: equipamentos, acústica, isolamento e DAWs para gravação remota",
          "Mês 5 — Mercado de Trabalho: demo reel, portfólio, ética no estúdio, SATED e DRT",
          "Mês 6 — Projeto Final (Banca): gravação de portfólio completo com cenas variadas para avaliação final"
        ],
        lessons: [
          "Dublagem Cantada I",
          "Dublagem Cantada II",
          "Direção de Dublagem I",
          "Direção de Dublagem II",
          "Home Studio para Dubladores",
          "Software e Gravação Remota",
          "Edição Básica para Atores",
          "O Mercado Nacional",
          "Marketing Pessoal",
          "Testes de Dublagem (Mocks)",
          "Locução vs. Dublagem",
          "Localização de Softwares",
          "Masterclass: O Ator no Século XXI",
          "Alta Performance",
          "Estilo de Diretores",
          "Dublagem de Filmes de Época",
          "Versão Brasileira",
          "Gestão de Carreira",
          "Portfólio Final I",
          "Portfólio Final II",
          "Portfólio Final III",
          "Simulação de Casting",
          "Revisão Geral e Dúvidas",
          "Formatura e Audição Final"
        ]
      }
    }
  ],
  teachers: [
    {
      name: "Vitor Paranhos",
      role: "Módulo 1 — Iniciação",
      photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=800&auto=format&fit=crop",
      specialties: ["Desinibição", "Respiração", "Subtexto"],
      bio: "Especialista nas bases da interpretação vocal, Vitor conduz o aluno na transição entre leitura e atuação, com foco em segurança diante do microfone, dicção clara e etiqueta de estúdio."
    },
    {
      name: "Daniel Ávila",
      role: "Módulo 2 — Técnica Aplicada",
      photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=800&auto=format&fit=crop",
      specialties: ["Sincronia", "Personagens", "ADR"],
      bio: "Com foco em precisão técnica e repertório de gêneros, Daniel trabalha sincronia labial, personagens, emoção sob pressão e a adaptação de texto em cenas de cinema, séries, games e animação."
    },
    {
      name: "Ettore Zuim",
      role: "Módulo 3 — Excelência",
      photo: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=800&auto=format&fit=crop",
      specialties: ["Direção", "Home Studio", "Mercado"],
      bio: "Referência no mercado brasileiro, Ettore orienta o aluno na reta final da formação com direção de dublagem, portfólio, gravação remota e posicionamento profissional."
    }
  ],
  learnings: [
    {
      id: 1,
      title: "Fisiologia e apoio vocal",
      description: "Entenda como a voz funciona: apoio diafragmático, ressonância e articulação para garantir clareza, presença e saúde vocal em longas sessões de gravação."
    },
    {
      id: 2,
      title: "Leitura dramática e subtexto",
      description: "Pare de ler e comece a interpretar. Aprenda a identificar intenção, tensão e emoção no roteiro e a transformá-los em atuação natural diante do microfone."
    },
    {
      id: 3,
      title: "Sincronia labial e isócrona",
      description: "Domine o encaixe entre sua fala e o movimento de boca do personagem: velocidade, pausas, labiais (B, P, M) e marcações de roteiro com precisão crescente."
    },
    {
      id: 4,
      title: "Voz caracterizada e personagens",
      description: "Crie timbres únicos para animações, heróis, vilões e NPCs de games sem forçar a voz — mantendo naturalidade e consistência ao longo de horas de gravação."
    },
    {
      id: 5,
      title: "ADR, esforços e reações",
      description: "Grave gritos, quedas, lutas, choros, risos e micro-reações (suspiros, pigarros) com técnica e controle emocional, preservando a coerência com a cena original."
    },
    {
      id: 6,
      title: "Repertório de gêneros",
      description: "Atue em reality shows, sitcoms, procedurais, cinema, animação, documentários e jogos — cada gênero com seu timing, vocabulário e estilo de interpretação próprios."
    },
    {
      id: 7,
      title: "Home studio, direção e mercado",
      description: "Configure seu espaço de gravação, use DAWs e ferramentas de gravação remota (Source-Connect, Cleanfeed) e aprenda a dar e receber direção em estúdio profissional."
    },
    {
      id: 8,
      title: "Portfólio, demo reel e carreira",
      description: "Monte um demo reel com cenas de gêneros variados, entenda o SATED e o DRT, e posicione sua carreira com MEI, marketing pessoal e gestão financeira básica."
    }
  ],
  students: [
    { id: 1, name: "Lucas Silva", email: "lucas.silva@email.com", plan: "Formação Completa", status: "Ativo", date: "2026-03-20", progress: 45, avatar: "https://i.pravatar.cc/150?u=1" },
    { id: 2, name: "Mariana Costa", email: "mariana.costa@email.com", plan: "Módulo 1 — Iniciação", status: "Ativo", date: "2026-03-22", progress: 12, avatar: "https://i.pravatar.cc/150?u=2" },
    { id: 3, name: "João Pedro", email: "joao.pedro@email.com", plan: "Formação Completa", status: "Inadimplente", date: "2026-02-15", progress: 89, avatar: "https://i.pravatar.cc/150?u=3" },
    { id: 4, name: "Ana Clara", email: "ana.clara@email.com", plan: "Módulo 2 — Técnica Aplicada", status: "Ativo", date: "2026-03-24", progress: 5, avatar: "https://i.pravatar.cc/150?u=4" }
  ],
  testimonials: [
    {
      id: 1,
      name: "Carlos Eduardo",
      role: "Aluno — Módulo 1",
      text: "Antes do THE HUB eu lia o roteiro, não interpretava. No Módulo 1 aprendi a diferença entre leitura branca e dramática, entendi o subtexto e cheguei ao meu primeiro loop com muito mais segurança diante do microfone.",
      avatar: "https://i.pravatar.cc/150?u=11"
    },
    {
      id: 2,
      name: "Fernanda Lima",
      role: "Atriz — Módulo 2",
      text: "O Módulo 2 foi onde tudo clicou. Trabalhar ADR, voz caracterizada para games e gravar meu primeiro demo reel com cenas de comédia, drama e animação me mostrou que eu podia atuar em gêneros completamente diferentes.",
      avatar: "https://i.pravatar.cc/150?u=12"
    },
    {
      id: 3,
      name: "Roberto Alves",
      role: "Locutor — Formação Completa",
      text: "Eu já locutava há anos, mas o Módulo 3 mudou tudo. Configurei meu home studio do zero, entendi como funciona o SATED e a banca final me obrigou a montar um portfólio que de fato representa o que eu consigo entregar.",
      avatar: "https://i.pravatar.cc/150?u=13"
    }
  ],
  faqs: [
    {
      id: 1,
      question: "Preciso ter uma voz especial ou experiência prévia para começar?",
      answer: "Não. Dublagem é atuação, não locução. Você não precisa de uma voz grave, bonita ou especial — precisa de versatilidade e técnica, que é exatamente o que o Módulo 1 constrói do zero. Alunos sem nenhuma experiência prévia são bem-vindos e representam a maioria das turmas."
    },
    {
      id: 2,
      question: "As aulas são online ou presenciais?",
      answer: "As aulas acontecem online, ao vivo, uma vez por semana. Todas as sessões ficam gravadas para revisão posterior. O formato garante que alunos de qualquer cidade do Brasil tenham acesso à mesma qualidade de formação, sem abrir mão da interação em tempo real com o professor."
    },
    {
      id: 3,
      question: "Qual é a carga horária e duração total do curso?",
      answer: "São 3 módulos de 6 meses cada, totalizando 18 meses de formação. Cada módulo tem 24 aulas semanais de 2 horas — 48 horas por módulo e 144 horas no total. É uma formação completa, não um curso rápido: o mercado exige essa profundidade."
    },
    {
      id: 4,
      question: "Como é estruturada cada aula?",
      answer: "Cada aula tem 2 horas: abertura com aquecimento vocal e dicção, bloco de teoria com análise de cenas reais do mercado, e a maior parte do tempo em prática individual no microfone — cada aluno grava ao menos 3 vezes e recebe feedback direto do professor. A aula termina com referências de estudo para a semana."
    },
    {
      id: 5,
      question: "Como funciona a avaliação para avançar de módulo?",
      answer: "A progressão segue um modelo híbrido com quatro critérios: frequência mínima de 75%, exercícios semanais, prova prática e projeto final (banca). Todos precisam ser cumpridos. Essa estrutura garante que você entre no próximo módulo com a base realmente consolidada — não apenas assistida."
    },
    {
      id: 6,
      question: "Qual a diferença entre dublagem e locução? O curso ensina as duas?",
      answer: "Na locução você fala para o ouvinte (publicidade, narração, podcast). Na dublagem você substitui a voz de um ator real — sua performance precisa casar com a imagem em timing, emoção e sincronia labial. São mercados distintos, mas complementares. No Módulo 3 você aprende a transitar entre os dois."
    },
    {
      id: 7,
      question: "O que é o DRT e como eu obtenho o meu?",
      answer: "O DRT é o registro profissional obrigatório para atuar como dublador contratado no Brasil, vinculado ao SATED (Sindicato dos Artistas). Sem ele, você não pode assinar ficha em estúdio. No Módulo 3 dedicamos uma aula completa ao processo de filiação, documentação e os direitos que o registro garante."
    },
    {
      id: 8,
      question: "Vou precisar montar um home studio para fazer o curso?",
      answer: "Não é um requisito para cursar. Para as aulas online basta microfone, fone e conexão estável. Mas no Módulo 3 ensinamos como montar um setup profissional de baixo custo — acústica, equipamentos e softwares. Muitos alunos já saem gravando de casa para clientes reais antes mesmo de se formarem."
    },
    {
      id: 9,
      question: "Ao terminar o curso, estarei pronto para trabalhar como dublador?",
      answer: "Você estará tecnicamente preparado para encarar testes de estúdio e o dia a dia profissional. A formatura inclui uma banca simulada com cenas de alta complexidade e a entrega de um portfólio completo. O mercado é competitivo, mas alunos formados nos 3 módulos chegam com diferencial real de técnica e repertório."
    },
    {
      id: 10,
      question: "O curso emite certificado reconhecido pelo mercado?",
      answer: "Sim. Cada módulo concluído gera um certificado de conclusão e, ao final do Módulo 3, você recebe o diploma de formação completa da THE HUB. O reconhecimento de mercado, porém, vem do seu portfólio e do DRT — o diploma é o complemento formal que documenta sua trajetória de formação."
    }
  ],
  recentActivity: [
    { id: 1, user: "Lucas Silva", action: "concluiu a aula", target: "Fisiologia da Voz", time: "Há 5 min", avatar: "https://i.pravatar.cc/150?u=1" },
    { id: 2, user: "Mariana Costa", action: "enviou um ticket", target: "Módulo 2 — Técnica Aplicada", time: "Há 12 min", avatar: "https://i.pravatar.cc/150?u=2" },
    { id: 3, user: "Sistema", action: "pagamento aprovado", target: "Formação Completa", time: "Há 1 hora", avatar: "https://ui-avatars.com/api/?name=S&background=0D8ABC&color=fff" },
    { id: 4, user: "Ana Clara", action: "ganhou a conquista", target: "Portfólio Final I", time: "Há 2 horas", avatar: "https://i.pravatar.cc/150?u=4" }
  ],
  settings: {
    supabaseUrl: "",
    supabaseAnonKey: "",
    siteName: "THE HUB",
    contactEmail: "contato@thehub.com.br",
    promoBanner: {
      enabled: false,
      headline: "Aproveite a temporada de descontos",
      badge: "R$99",
      badgeSubtext: "DE ENTRADA",
      expiresAt: "",
      ctaText: "MATRICULE-SE",
      ctaAction: "enroll",
      bgStyle: "linear-gradient(90deg, #1a1060 0%, #2d1b8e 40%, #1a1060 100%)"
    }
  },
  enrollments: []
};
