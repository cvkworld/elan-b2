import {
  Rubric,
  SkillNode,
  TaskTemplate,
  TopicSeed,
} from "@/lib/types";

export const sectionMeta = {
  listening: {
    label: "Compréhension orale",
    duration: "30 min",
    accent: "#f47b4a",
    description: "2 exercices, annonces, entretiens, émissions ou débats."
  },
  reading: {
    label: "Compréhension écrite",
    duration: "1 h",
    accent: "#3c8f77",
    description: "2 exercices pour lire vite, repérer le point de vue et relier les preuves."
  },
  writing: {
    label: "Production écrite",
    duration: "1 h",
    accent: "#d3a625",
    description: "1 texte argumentatif de 250 mots minimum."
  },
  speaking: {
    label: "Production orale",
    duration: "20 min + 30 min de préparation",
    accent: "#6a6ff2",
    description: "Monologue suivi puis interaction guidée."
  },
  grammar: {
    label: "Réparation grammaticale",
    duration: "10 min",
    accent: "#5b4a3b",
    description: "Drills ciblés à partir de tes erreurs récentes."
  }
} as const;

export const writingRubric: Rubric = {
  id: "writing-rubric",
  label: "Coach writing rubric",
  categories: [
    {
      id: "task",
      label: "Consigne",
      description: "Réponse complète, angle clair, 250+ mots, destinataire respecté.",
      weight: 0.24
    },
    {
      id: "argument",
      label: "Argumentation",
      description: "Thèse, exemples, nuance, contre-argument et conclusion.",
      weight: 0.24
    },
    {
      id: "coherence",
      label: "Cohérence",
      description: "Organisation visible, connecteurs, progression logique.",
      weight: 0.2
    },
    {
      id: "lexicon",
      label: "Lexique",
      description: "Vocabulaire précis, varié et adapté au thème.",
      weight: 0.16
    },
    {
      id: "accuracy",
      label: "Correction",
      description: "Stabilité grammaticale, ponctuation, accords, syntaxe.",
      weight: 0.16
    }
  ]
};

export const speakingRubric: Rubric = {
  id: "speaking-rubric",
  label: "Coach speaking rubric",
  categories: [
    {
      id: "task",
      label: "Prise de parole",
      description: "Position claire, exemples et couverture de la consigne.",
      weight: 0.24
    },
    {
      id: "structure",
      label: "Structure",
      description: "Introduction, développement, transitions et conclusion.",
      weight: 0.22
    },
    {
      id: "interaction",
      label: "Interaction",
      description: "Capacité à relancer, concéder, négocier et reformuler.",
      weight: 0.18
    },
    {
      id: "lexicon",
      label: "Lexique",
      description: "Vocabulaire souple, assez précis pour défendre une opinion.",
      weight: 0.18
    },
    {
      id: "control",
      label: "Contrôle",
      description: "Fluidité générale et stabilité des structures.",
      weight: 0.18
    }
  ]
};

export const skillNodes: SkillNode[] = [
  {
    id: "gist-extraction",
    label: "Idée générale",
    description: "Repérer vite le sujet, la situation et l'intention globale.",
    section: "listening",
    milestone: "Tu saisis l'angle d'un document en moins d'une minute."
  },
  {
    id: "stance-detection",
    label: "Position du locuteur",
    description: "Détecter soutien, réserve, nuance ou opposition.",
    section: "listening",
    milestone: "Tu distingues opinion, concession et recommandation."
  },
  {
    id: "note-taking",
    label: "Prise de notes",
    description: "Filtrer les informations utiles pendant l'écoute.",
    section: "listening",
    milestone: "Tes notes gardent idées, chiffres et exemples sans saturation."
  },
  {
    id: "detail-discrimination",
    label: "Détails pertinents",
    description: "Séparer information centrale, exemple et piège.",
    section: "reading",
    milestone: "Tu évites de confondre détail cité et idée défendue."
  },
  {
    id: "tone-analysis",
    label: "Ton et posture",
    description: "Lire la distance, l'ironie, la prudence ou l'engagement.",
    section: "reading",
    milestone: "Tu repères la posture de l'auteur sans relire tout le texte."
  },
  {
    id: "evidence-matching",
    label: "Preuve et thèse",
    description: "Relier citation, exemple et idée qu'ils soutiennent.",
    section: "reading",
    milestone: "Tu relies preuves et argument principal avec précision."
  },
  {
    id: "argument-structure",
    label: "Architecture d'un texte",
    description: "Construire thèse, développement, concession et ouverture.",
    section: "writing",
    milestone: "Ton texte avance avec un vrai fil argumentatif."
  },
  {
    id: "formal-register",
    label: "Registre adapté",
    description: "Ajuster distance, politesse et formulation au destinataire.",
    section: "writing",
    milestone: "Tu restes précis sans devenir scolaire ni familier."
  },
  {
    id: "opinion-defense",
    label: "Défendre une opinion",
    description: "Prendre position, nuancer et convaincre.",
    section: "speaking",
    milestone: "Tu tiens une position stable sous relance."
  },
  {
    id: "oral-interaction",
    label: "Interaction",
    description: "Relancer, proposer, concéder, négocier une solution.",
    section: "speaking",
    milestone: "Tu transformes la relance de l'examinateur en opportunité."
  },
  {
    id: "connectors",
    label: "Connecteurs",
    description: "Structurer et nuancer avec logique.",
    section: "grammar",
    milestone: "Tes liens logiques sonnent naturels et précis."
  },
  {
    id: "error-correction",
    label: "Révision ciblée",
    description: "Réparer accord, syntaxe et précision sur les erreurs utiles.",
    section: "grammar",
    milestone: "Tu corriges rapidement les faiblesses les plus coûteuses."
  },
  {
    id: "hypothesis",
    label: "Hypothèse et condition",
    description: "Maîtriser si, conditionnel, conséquence et prudence.",
    section: "grammar",
    milestone: "Tu nuances des solutions sans casser la phrase."
  },
  {
    id: "reported-speech",
    label: "Discours rapporté",
    description: "Transformer citation, opinion et reformulation.",
    section: "grammar",
    milestone: "Tu reformules des idées sans copier la source."
  },
  {
    id: "nominalization",
    label: "Nominalisation",
    description: "Condensation utile pour un style B2 plus dense.",
    section: "grammar",
    milestone: "Tes phrases gagnent en densité sans perdre en clarté."
  },
  {
    id: "task-completion",
    label: "Réponse complète",
    description: "Couvrir toutes les attentes de la consigne.",
    section: "writing",
    milestone: "Tu réponds à toute la tâche sans digression."
  }
];

export const topicSeeds: TopicSeed[] = [
  {
    id: "media",
    label: "Médias et esprit critique",
    domain: "media",
    contexts: ["une émission locale", "un forum d'étudiants", "une médiathèque municipale"],
    audiences: ["des lycéens", "des parents", "des habitants du quartier"],
    claims: [
      "La vérification des sources devrait être enseignée comme une compétence civique.",
      "Les formats courts informent vite mais simplifient trop les débats publics.",
      "Les médias de proximité créent plus de confiance quand ils expliquent leurs choix éditoriaux."
    ],
    counterpoints: [
      "trop de vérification peut ralentir l'accès à l'information urgente",
      "les formats courts peuvent être utiles s'ils renvoient vers des analyses",
      "la proximité ne garantit pas à elle seule la neutralité"
    ],
    vocabulary: ["source", "fiabilité", "rumeur", "vérification", "auditeur", "angle"],
    frictionPoints: ["vitesse contre précision", "confiance contre saturation", "accès contre simplification"]
  },
  {
    id: "work",
    label: "Travail et organisation",
    domain: "work",
    contexts: ["une réunion d'équipe", "un magazine professionnel", "une association de quartier"],
    audiences: ["des salariés", "des responsables de service", "des jeunes diplômés"],
    claims: [
      "Le travail hybride fonctionne mieux quand les règles communes sont explicites.",
      "Les entreprises devraient former davantage à la coopération plutôt qu'aux seuls outils.",
      "Réduire les réunions augmente la qualité des décisions si l'écrit circule mieux."
    ],
    counterpoints: [
      "la flexibilité peut créer de nouvelles inégalités dans une équipe",
      "moins de réunions peut aussi isoler les personnes les moins visibles",
      "les outils restent indispensables quand les pratiques changent vite"
    ],
    vocabulary: ["coordination", "autonomie", "planning", "priorité", "équipe", "compte rendu"],
    frictionPoints: ["autonomie contre contrôle", "souplesse contre isolement", "rapidité contre concertation"]
  },
  {
    id: "education",
    label: "Éducation et apprentissage",
    domain: "education",
    contexts: ["un lycée", "une université", "un centre culturel"],
    audiences: ["des enseignants", "des étudiants", "des familles"],
    claims: [
      "Les projets collectifs évaluent mieux certaines compétences que les examens classiques.",
      "L'autonomie s'apprend lorsque l'élève sait comment planifier son travail.",
      "Les outils numériques sont utiles surtout quand ils servent une méthode claire."
    ],
    counterpoints: [
      "les projets collectifs rendent l'évaluation individuelle plus délicate",
      "trop d'autonomie peut désorienter les élèves les moins accompagnés",
      "les outils numériques fatiguent quand ils multiplient les notifications"
    ],
    vocabulary: ["évaluation", "consigne", "accompagnement", "méthode", "progression", "atelier"],
    frictionPoints: ["guidage contre autonomie", "innovation contre fatigue", "collectif contre équité"]
  },
  {
    id: "environment",
    label: "Environnement et ville",
    domain: "environment",
    contexts: ["un conseil municipal", "une radio citoyenne", "un journal local"],
    audiences: ["des habitants", "des commerçants", "des bénévoles"],
    claims: [
      "Les petites mesures locales deviennent crédibles quand elles sont visibles et régulières.",
      "La transition écologique réussit mieux si elle améliore aussi le quotidien.",
      "Les habitants adhèrent davantage aux changements quand ils voient les bénéfices concrets."
    ],
    counterpoints: [
      "les mesures locales peuvent sembler symboliques sans vision plus large",
      "les bénéfices concrets ne sont pas toujours immédiats",
      "certaines transformations demandent un effort avant de produire un gain"
    ],
    vocabulary: ["mobilité", "déchet", "quartier", "impact", "aménagement", "habitude"],
    frictionPoints: ["urgence contre acceptation", "coût contre bénéfice", "collectif contre confort individuel"]
  },
  {
    id: "technology",
    label: "Technologie et usages",
    domain: "technology",
    contexts: ["un podcast", "une résidence étudiante", "une maison des associations"],
    audiences: ["des utilisateurs", "des seniors", "des responsables associatifs"],
    claims: [
      "Une innovation utile doit simplifier une tâche précise avant de promettre une révolution.",
      "La technologie devrait être évaluée sur le temps gagné mais aussi sur l'attention perdue.",
      "Former les utilisateurs reste plus efficace que multiplier les fonctionnalités."
    ],
    counterpoints: [
      "certaines innovations créent d'abord de la complexité avant de devenir intuitives",
      "le gain de temps dépend beaucoup du profil des usagers",
      "les fonctionnalités avancées peuvent être utiles pour des besoins spécifiques"
    ],
    vocabulary: ["interface", "usage", "notification", "automatisation", "adoption", "paramétrage"],
    frictionPoints: ["innovation contre surcharge", "gain de temps contre distraction", "outil contre compétence"]
  },
  {
    id: "citizenship",
    label: "Citoyenneté et vie publique",
    domain: "citizenship",
    contexts: ["une consultation locale", "un débat radiophonique", "une maison de quartier"],
    audiences: ["des habitants", "des jeunes adultes", "des associations"],
    claims: [
      "La participation augmente lorsque les décisions prises sont clairement expliquées ensuite.",
      "Les débats publics gagnent en qualité quand chacun doit justifier ses priorités.",
      "Les espaces de discussion fonctionnent mieux avec peu de règles mais des rôles clairs."
    ],
    counterpoints: [
      "trop d'explications peuvent éloigner les personnes déjà peu disponibles",
      "certaines priorités restent difficiles à comparer entre elles",
      "des règles légères ne suffisent pas toujours à calmer les tensions"
    ],
    vocabulary: ["participation", "priorité", "concertation", "décision", "engagement", "médiation"],
    frictionPoints: ["ouverture contre lenteur", "discussion contre polarisation", "équité contre efficacité"]
  },
  {
    id: "culture",
    label: "Culture et accès",
    domain: "culture",
    contexts: ["un centre culturel", "une scène locale", "une plateforme associative"],
    audiences: ["des adolescents", "des familles", "des bénévoles"],
    claims: [
      "L'offre culturelle attire davantage quand elle ressemble à une invitation plutôt qu'à une injonction.",
      "Les partenariats entre écoles et lieux culturels créent des habitudes durables.",
      "La médiation est aussi importante que le programme lui-même."
    ],
    counterpoints: [
      "une médiation plus forte demande du temps et du personnel",
      "les partenariats ne compensent pas toujours la distance géographique",
      "l'attractivité dépend aussi du prix et des horaires"
    ],
    vocabulary: ["médiation", "public", "atelier", "programmation", "participation", "habitude"],
    frictionPoints: ["qualité contre accessibilité", "offre contre accompagnement", "envie contre disponibilité"]
  },
  {
    id: "health",
    label: "Santé et habitudes de vie",
    domain: "health",
    contexts: ["une campagne locale", "une newsletter universitaire", "une maison de santé"],
    audiences: ["des étudiants", "des familles", "des salariés"],
    claims: [
      "Les messages de prévention convainquent mieux quand ils proposent des gestes réalistes.",
      "La santé mentale mérite des espaces de parole aussi réguliers que les bilans physiques.",
      "Changer une habitude devient plus facile quand l'entourage comprend l'objectif."
    ],
    counterpoints: [
      "les gestes réalistes peuvent sembler trop modestes pour certains publics",
      "ouvrir des espaces de parole suppose une vraie confidentialité",
      "l'entourage n'est pas toujours disponible ou favorable"
    ],
    vocabulary: ["prévention", "rythme", "équilibre", "fatigue", "accompagnement", "stress"],
    frictionPoints: ["objectif ambitieux contre réalisme", "intimité contre soutien", "régularité contre urgence"]
  }
];

export const taskTemplates: TaskTemplate[] = [
  {
    id: "listen-bulletin",
    section: "listening",
    label: "Bulletin guidé",
    format: "annonce ou chronique brève",
    allowedPromptShape: "Écouter une intervention courte et répondre à 4 questions ciblées.",
    skillTags: ["gist-extraction", "detail-discrimination", "note-taking"],
    distractorStrategy: "Opposer détail vrai mais secondaire, idée excessive et inversion cause/solution.",
    difficultyRange: [2, 3],
    scoringMethod: "objective",
    estimatedMinutes: 8,
    cooldownFamily: "listening-short",
    variationFamilies: ["public-service", "campus", "association"]
  },
  {
    id: "listen-debate",
    section: "listening",
    label: "Entretien nuancé",
    format: "interview ou débat radio",
    allowedPromptShape: "Écouter un document plus long, repérer position, nuance et recommandation.",
    skillTags: ["stance-detection", "note-taking", "gist-extraction"],
    distractorStrategy: "Proposer une reformulation trop tranchée, une citation isolée ou une conclusion hors sujet.",
    difficultyRange: [3, 4],
    scoringMethod: "objective",
    estimatedMinutes: 12,
    cooldownFamily: "listening-long",
    variationFamilies: ["expert", "citizen", "moderator"]
  },
  {
    id: "read-editorial",
    section: "reading",
    label: "Article d'opinion",
    format: "texte argumentatif",
    allowedPromptShape: "Lire un article court et relier thèse, preuves, ton et implication.",
    skillTags: ["tone-analysis", "evidence-matching", "detail-discrimination"],
    distractorStrategy: "Créer une option qui copie une phrase sans en saisir la fonction argumentative.",
    difficultyRange: [3, 4],
    scoringMethod: "objective",
    estimatedMinutes: 12,
    cooldownFamily: "reading-opinion",
    variationFamilies: ["editorial", "column", "forum"]
  },
  {
    id: "read-notice",
    section: "reading",
    label: "Forum et synthèse",
    format: "message, réponse et synthèse",
    allowedPromptShape: "Lire plusieurs voix et distinguer proposition, réserve et compromis.",
    skillTags: ["evidence-matching", "tone-analysis", "task-completion"],
    distractorStrategy: "Mélanger consensus apparent et désaccord implicite.",
    difficultyRange: [2, 4],
    scoringMethod: "objective",
    estimatedMinutes: 10,
    cooldownFamily: "reading-multi-voice",
    variationFamilies: ["forum", "notice", "response"]
  },
  {
    id: "write-letter",
    section: "writing",
    label: "Lettre argumentée",
    format: "courrier ou tribune",
    allowedPromptShape: "Prendre position, argumenter, nuancer, conclure.",
    skillTags: ["argument-structure", "formal-register", "task-completion", "connectors"],
    distractorStrategy: "Sans objet",
    difficultyRange: [3, 4],
    scoringMethod: "rubric",
    estimatedMinutes: 18,
    cooldownFamily: "writing-opinion",
    variationFamilies: ["community-letter", "platform-post", "editorial-letter"]
  },
  {
    id: "write-forum",
    section: "writing",
    label: "Contribution à un forum",
    format: "message structuré",
    allowedPromptShape: "Réagir à une situation, proposer des pistes concrètes et répondre aux objections.",
    skillTags: ["argument-structure", "task-completion", "formal-register"],
    distractorStrategy: "Sans objet",
    difficultyRange: [2, 4],
    scoringMethod: "rubric",
    estimatedMinutes: 16,
    cooldownFamily: "writing-forum",
    variationFamilies: ["student-forum", "citizen-forum", "association-forum"]
  },
  {
    id: "speak-monologue",
    section: "speaking",
    label: "Monologue suivi",
    format: "prise de position",
    allowedPromptShape: "Préparer un exposé bref avec proposition finale claire.",
    skillTags: ["opinion-defense", "argument-structure", "connectors"],
    distractorStrategy: "Sans objet",
    difficultyRange: [3, 4],
    scoringMethod: "rubric",
    estimatedMinutes: 15,
    cooldownFamily: "speaking-monologue",
    variationFamilies: ["proposal", "opinion", "tradeoff"]
  },
  {
    id: "speak-interaction",
    section: "speaking",
    label: "Interaction guidée",
    format: "négociation ou recherche d'accord",
    allowedPromptShape: "Défendre une priorité, concéder, reformuler et conclure.",
    skillTags: ["oral-interaction", "opinion-defense", "connectors"],
    distractorStrategy: "Sans objet",
    difficultyRange: [3, 5],
    scoringMethod: "rubric",
    estimatedMinutes: 14,
    cooldownFamily: "speaking-interaction",
    variationFamilies: ["negotiation", "planning", "compromise"]
  },
  {
    id: "grammar-connectors",
    section: "grammar",
    label: "Connecteurs utiles",
    format: "phrases à compléter",
    allowedPromptShape: "Choisir ou réparer le lien logique le plus utile.",
    skillTags: ["connectors", "error-correction"],
    distractorStrategy: "Opposer concession, opposition, conséquence et addition.",
    difficultyRange: [2, 3],
    scoringMethod: "objective",
    estimatedMinutes: 8,
    cooldownFamily: "grammar-connectors",
    variationFamilies: ["contrast", "result", "concession"]
  },
  {
    id: "grammar-condition",
    section: "grammar",
    label: "Hypothèse et nuance",
    format: "transformation guidée",
    allowedPromptShape: "Réécrire une idée avec condition, hypothèse ou prudence.",
    skillTags: ["hypothesis", "reported-speech", "error-correction"],
    distractorStrategy: "Opposer certitude, souhait, conséquence et condition mal formée.",
    difficultyRange: [3, 4],
    scoringMethod: "objective",
    estimatedMinutes: 8,
    cooldownFamily: "grammar-condition",
    variationFamilies: ["if-clause", "reported-opinion", "hedging"]
  }
];

export const supplementalResources = [
  {
    label: "France Éducation international",
    href: "https://www.france-education-international.fr/en/diplome/delf-tout-public/niveau-b2",
    note: "Structure officielle des épreuves et exemples."
  },
  {
    label: "RFI Français facile",
    href: "https://francaisfacile.rfi.fr/fr/dipl%C3%B4mes-tests/",
    note: "À utiliser comme ressource externe, sans recopier les exercices."
  },
  {
    label: "TV5MONDE Apprendre",
    href: "https://apprendre.tv5monde.com/fr",
    note: "Idéal pour du complément autonome, pas pour intégrer le contenu dans l'app."
  }
];
