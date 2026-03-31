import { writingRubric } from "@/lib/delf-data";
import { SkillTag, TaskVariant } from "@/lib/types";

type PublicWritingTask = Extract<TaskVariant, { section: "writing" }>;

interface PublicWritingConfig {
  id: string;
  title: string;
  subtitle: string;
  topicId: string;
  topicLabel: string;
  formatLabel: string;
  brief: string;
  outline: string[];
  modelParagraphs: string[];
  modelTitle?: string;
  whyItScores?: string[];
  modelMoves?: string[];
  constraints?: string[];
  checklist?: string[];
  coachHints?: string[];
  estimatedMinutes?: number;
  difficulty?: number;
  examFocus?: string;
  skillTags?: SkillTag[];
}

const defaultSkillTags: SkillTag[] = [
  "argument-structure",
  "formal-register",
  "task-completion",
  "connectors"
];

const defaultConstraints = [
  "250 mots minimum.",
  "Le registre doit rester clair, structuré et adapté au destinataire.",
  "Prends position, développe au moins deux arguments et traite une objection.",
  "Termine par une proposition concrète ou une recommandation réaliste."
];

const defaultChecklist = [
  "Position annoncée dès l’introduction.",
  "Deux arguments différents, chacun illustré.",
  "Concession réelle, puis réponse nuancée.",
  "Conclusion utile, pas simplement décorative."
];

const defaultWhyItScores = [
  "La tâche est traitée entièrement avec un destinataire et un registre cohérents.",
  "Les arguments sont distincts, illustrés et reliés par des connecteurs naturels.",
  "La concession montre une vraie nuance au lieu d’un simple mot de transition.",
  "La conclusion propose une action crédible, ce qui renforce l’impression de maîtrise B2."
];

const defaultModelMoves = [
  "Introduire le sujet en reformulant clairement la question posée.",
  "Passer d’un argument à l’autre avec des liens visibles.",
  "Nuancer avec « certes », « toutefois », « en revanche », « à condition que ».",
  "Finir sur une mesure concrète ou une condition de réussite."
];

function createPublicWritingTask(config: PublicWritingConfig): PublicWritingTask {
  return {
    id: config.id,
    section: "writing",
    templateId: `public-${config.id}`,
    fingerprint: `public-writing|${config.id}`,
    title: config.title,
    subtitle: config.subtitle,
    topicId: config.topicId,
    topicLabel: config.topicLabel,
    skillTags: config.skillTags ?? defaultSkillTags,
    difficulty: config.difficulty ?? 4,
    estimatedMinutes: config.estimatedMinutes ?? 22,
    scoringMethod: "rubric",
    rubric: writingRubric,
    coachHints: config.coachHints ?? [
      "Annonce ta position dans les deux premières phrases.",
      "Garde une vraie concession avant la conclusion."
    ],
    content: {
      formatLabel: config.formatLabel,
      examFocus:
        config.examFocus ??
        "Argumentation personnelle de 250+ mots avec position claire, exemples précis et conclusion crédible.",
      brief: config.brief,
      constraints: config.constraints ?? defaultConstraints,
      checklist: config.checklist ?? defaultChecklist,
      targetWords: 250,
      outline: config.outline,
      modelMoves: config.modelMoves ?? defaultModelMoves,
      modelAnswer: {
        title: config.modelTitle ?? "Modèle haut niveau : copie DELF B2",
        paragraphs: config.modelParagraphs,
        whyItScores: config.whyItScores ?? defaultWhyItScores
      }
    }
  };
}

export const publicWritingExercises: PublicWritingTask[] = [
  createPublicWritingTask({
    id: "public-writing-library-hours",
    title: "Bibliothèque universitaire et horaires du soir",
    subtitle: "Lettre ouverte · vie étudiante",
    topicId: "education-library-hours",
    topicLabel: "Études et temps de travail",
    formatLabel: "Lettre ouverte",
    brief:
      "Tu écris une lettre ouverte à la direction de ton université pour défendre l’idée suivante : la bibliothèque devrait rester ouverte plus tard plusieurs soirs par semaine. Tu présentes ton point de vue, tu développes au moins deux arguments, tu réponds à une objection possible liée au coût ou à l’organisation, puis tu proposes une solution réaliste.",
    outline: [
      "Formule d’appel et présentation du problème concret.",
      "Argument 1 : les horaires actuels pénalisent certains étudiants.",
      "Argument 2 : une bibliothèque plus accessible améliore l’égalité des chances.",
      "Concession : le coût et la sécurité sont de vraies questions.",
      "Conclusion : proposer une expérimentation limitée et évaluée."
    ],
    modelTitle: "Modèle haut niveau : lettre ouverte à une direction",
    modelParagraphs: [
      "Madame, Monsieur, je me permets de vous écrire au sujet des horaires de la bibliothèque universitaire, qui paraissent aujourd’hui insuffisants pour répondre aux besoins réels des étudiants. À mon sens, une ouverture plus tardive plusieurs soirs par semaine constituerait une mesure utile, à condition d’être organisée de manière progressive et raisonnable.",
      "D’abord, les horaires actuels ne tiennent pas assez compte de la diversité des situations étudiantes. Beaucoup d’étudiants suivent des cours tardifs, occupent un emploi à temps partiel ou vivent dans des logements peu favorables au travail. Dans ces conditions, quitter la bibliothèque trop tôt revient à réserver de bonnes conditions d’étude à une partie seulement du public universitaire.",
      "Ensuite, une bibliothèque plus accessible représente un enjeu d’égalité. L’université ne peut pas se contenter d’offrir des cours ; elle doit aussi garantir un cadre de travail correct. Un étudiant qui dispose d’un lieu calme, bien éclairé et équipé d’ouvrages ou d’ordinateurs a davantage de chances de réussir qu’un étudiant obligé de travailler dans le bruit ou l’isolement.",
      "Certes, on peut objecter qu’une telle ouverture coûterait cher et demanderait davantage de personnel. Cette réserve est sérieuse. Toutefois, elle ne justifie pas l’inaction. Il serait possible de commencer par deux soirées par semaine, pendant les périodes les plus chargées, puis d’évaluer la fréquentation, le coût réel et les bénéfices pédagogiques.",
      "En conclusion, prolonger les horaires de la bibliothèque ne serait pas un luxe, mais une mesure de soutien concret à la réussite étudiante. Je serais donc favorable à une expérimentation claire, limitée dans le temps et accompagnée d’un bilan public. Je vous prie d’agréer, Madame, Monsieur, l’expression de mes salutations distinguées."
    ]
  }),
  createPublicWritingTask({
    id: "public-writing-phones-learning",
    title: "Faut-il limiter les téléphones dans les espaces d’apprentissage ?",
    subtitle: "Contribution à un forum · éducation",
    topicId: "education-phones",
    topicLabel: "Éducation et attention",
    formatLabel: "Contribution à un forum",
    brief:
      "Tu participes à un forum d’étudiants consacré aux conditions d’apprentissage. Le débat porte sur la question suivante : faut-il limiter l’usage des téléphones dans les salles de cours et les espaces d’étude ? Tu prends position, tu donnes au moins deux arguments, tu réponds à l’argument de la liberté individuelle, puis tu termines par une proposition concrète.",
    outline: [
      "Réagir au débat et annoncer clairement ta position.",
      "Argument 1 : l’attention est une ressource fragile.",
      "Argument 2 : un cadre commun protège aussi les plus motivés.",
      "Concession : le téléphone peut parfois être utile.",
      "Conclusion : proposer une règle simple et proportionnée."
    ],
    modelTitle: "Modèle haut niveau : contribution argumentée à un forum",
    modelParagraphs: [
      "À mon avis, limiter l’usage des téléphones dans les espaces d’apprentissage est une bonne idée, à condition que cette limitation reste intelligente et non punitive. Le vrai enjeu n’est pas de diaboliser l’outil, mais de protéger des conditions de concentration qui deviennent de plus en plus fragiles.",
      "D’abord, il faut reconnaître qu’un téléphone n’est pas un objet neutre. Même lorsqu’il reste silencieux, il attire l’attention, interrompt l’effort et favorise la dispersion. Or, dans un cours ou dans une salle d’étude, quelques secondes de distraction répétées suffisent à casser une explication, une prise de notes ou une lecture exigeante.",
      "Ensuite, un cadre commun peut aider tout le monde, y compris les étudiants les plus sérieux. Lorsqu’aucune règle n’existe, chacun subit les usages des autres : écran allumé sur la table, notifications visibles, conversations à voix basse ou consultation permanente des messages. Une règle simple rend l’espace plus lisible et plus respectueux pour tous.",
      "Certes, il serait excessif d’interdire totalement le téléphone, car cet outil peut servir à consulter un document, à vérifier un mot ou à faire face à une urgence. Cependant, cette utilité ponctuelle ne doit pas empêcher l’existence d’un principe clair. On peut très bien autoriser l’usage pédagogique ou nécessaire, tout en refusant l’usage dispersif.",
      "En conclusion, je suis donc favorable à une limitation encadrée : téléphone rangé par défaut, utilisation permise seulement à la demande de l’enseignant ou pour une raison justifiée. Une telle règle me paraît équilibrée, car elle protège l’attention sans transformer l’établissement en lieu de contrôle permanent."
    ]
  }),
  createPublicWritingTask({
    id: "public-writing-remote-work",
    title: "Le télétravail améliore-t-il vraiment la qualité de vie ?",
    subtitle: "Article d’opinion · travail",
    topicId: "work-remote-life",
    topicLabel: "Travail et organisation",
    formatLabel: "Article d’opinion",
    brief:
      "Tu rédiges un article pour un magazine local sur le thème du travail. Tu réagis à l’affirmation suivante : le télétravail améliore forcément la qualité de vie. Tu prends position, tu développes au moins deux arguments, tu réponds à une objection liée à l’isolement ou à l’inégalité entre métiers, puis tu conclus avec une condition de réussite.",
    outline: [
      "Introduire le débat sans simplifier.",
      "Argument 1 : gains réels de temps et d’énergie.",
      "Argument 2 : autonomie et réorganisation du travail.",
      "Concession : le télétravail ne convient pas à tout le monde.",
      "Conclusion : rappeler les conditions d’un modèle équilibré."
    ],
    modelParagraphs: [
      "On présente souvent le télétravail comme une solution évidente pour mieux vivre. À mes yeux, cette idée est partiellement vraie, mais seulement si l’on refuse les slogans simplistes. Le télétravail peut améliorer la qualité de vie, non pas automatiquement, mais lorsqu’il s’inscrit dans une organisation claire et équitable.",
      "D’abord, il offre un avantage concret : la réduction du temps perdu dans les transports. Pour beaucoup de salariés, supprimer plusieurs trajets par semaine signifie moins de fatigue, moins de stress et davantage de temps pour dormir, cuisiner, faire du sport ou simplement retrouver un rythme plus supportable. Cet effet n’est pas théorique ; il transforme réellement le quotidien.",
      "Ensuite, le télétravail peut favoriser une meilleure autonomie. Lorsqu’un salarié dispose d’objectifs précis et d’outils adaptés, il peut organiser son temps de façon plus efficace et plus concentrée. Certaines tâches, comme la rédaction, l’analyse ou la préparation, gagnent même en qualité lorsqu’elles sont réalisées dans un environnement calme.",
      "Certes, il faut reconnaître ses limites. Le télétravail peut renforcer l’isolement, brouiller la frontière entre vie privée et vie professionnelle, et ne concerne pas tous les métiers. Cette objection est importante. Cependant, elle invite surtout à construire un modèle mixte plutôt qu’à rejeter l’idée dans son ensemble.",
      "En conclusion, le télétravail peut être bénéfique, mais à une condition essentielle : il doit rester encadré, partiel et choisi autant que possible. Sans règles communes, il fatigue. Avec un cadre équilibré, il devient au contraire un outil utile pour mieux travailler et, parfois, mieux vivre."
    ]
  }),
  createPublicWritingTask({
    id: "public-writing-bike-lanes",
    title: "Pistes cyclables et circulation urbaine",
    subtitle: "Lettre formelle · ville et mobilité",
    topicId: "environment-bike-lanes",
    topicLabel: "Ville et déplacements",
    formatLabel: "Lettre formelle",
    brief:
      "Tu écris au maire de ta ville pour soutenir un projet de nouvelles pistes cyclables, tout en demandant une meilleure concertation avec les habitants et les commerçants. Tu défends ta position, tu développes au moins deux arguments, tu réponds à l’objection selon laquelle ces aménagements compliqueraient la circulation, puis tu proposes une méthode réaliste.",
    outline: [
      "Présenter le projet et annoncer une position nuancée.",
      "Argument 1 : sécurité et santé publique.",
      "Argument 2 : effets positifs sur la qualité de vie urbaine.",
      "Concession : inquiétudes des automobilistes et commerçants.",
      "Conclusion : recommander une concertation par étapes."
    ],
    modelParagraphs: [
      "Monsieur le Maire, je souhaite réagir au projet de création de nouvelles pistes cyclables dans notre ville. À mon sens, cette orientation va dans le bon sens, car elle peut améliorer durablement la sécurité et la qualité de vie. Cependant, sa réussite dépendra d’une concertation sérieuse avec les habitants et les commerçants concernés.",
      "D’abord, développer les déplacements à vélo répond à un besoin concret de sécurité. Aujourd’hui, beaucoup de personnes hésitent à utiliser ce moyen de transport non par manque d’envie, mais parce qu’elles ont peur de circuler au milieu d’un trafic dense. Des pistes continues et lisibles peuvent donc encourager une pratique plus large et réduire certains comportements dangereux.",
      "Ensuite, une ville qui facilite les mobilités douces devient souvent plus agréable à vivre. Moins de bruit, moins de pollution locale et davantage de déplacements courts effectués autrement qu’en voiture peuvent améliorer le quotidien. Il ne s’agit pas d’opposer brutalement les usagers, mais de mieux répartir l’espace public selon les besoins réels.",
      "Certes, plusieurs commerçants et automobilistes craignent une circulation plus difficile ou une baisse d’accessibilité. Cette inquiétude doit être entendue. Toutefois, elle ne doit pas bloquer tout projet. Au contraire, elle montre qu’il faut travailler rue par rue, observer les usages, ajuster les plans et corriger ce qui fonctionne mal.",
      "En conclusion, je soutiens donc la création de pistes cyclables, mais je recommande une mise en œuvre progressive, accompagnée de réunions publiques, de bilans réguliers et d’adaptations concrètes. Une politique urbaine solide ne se contente pas d’annoncer une direction ; elle montre aussi comment elle associe ceux qui la vivent. Je vous prie d’agréer, Monsieur le Maire, l’expression de ma considération distinguée."
    ]
  }),
  createPublicWritingTask({
    id: "public-writing-student-volunteering",
    title: "Le bénévolat devrait-il être davantage encouragé chez les étudiants ?",
    subtitle: "Contribution à un forum · engagement",
    topicId: "citizenship-student-volunteering",
    topicLabel: "Citoyenneté et engagement",
    formatLabel: "Contribution à un forum",
    brief:
      "Tu participes à un forum consacré à la vie étudiante. Le débat porte sur la question suivante : l’université devrait-elle encourager davantage le bénévolat et l’engagement associatif ? Tu prends position, tu développes deux arguments, tu réponds à l’objection selon laquelle les étudiants manquent déjà de temps, puis tu termines par une proposition réaliste.",
    outline: [
      "Présenter le débat et annoncer une position favorable mais mesurée.",
      "Argument 1 : le bénévolat développe des compétences utiles.",
      "Argument 2 : il renforce le lien social et l’ouverture civique.",
      "Concession : la charge d’études existe vraiment.",
      "Conclusion : proposer des formes souples d’engagement."
    ],
    modelParagraphs: [
      "Je pense que l’université devrait encourager davantage le bénévolat, non pas comme une obligation supplémentaire, mais comme une possibilité mieux valorisée. L’enjeu n’est pas seulement moral. Il s’agit aussi de reconnaître qu’un engagement concret peut compléter la formation académique et préparer les étudiants à prendre place dans la vie collective.",
      "D’abord, le bénévolat permet d’acquérir des compétences que les cours transmettent difficilement à eux seuls. Travailler en équipe, organiser un événement, accueillir un public ou gérer une petite responsabilité développent l’autonomie, l’initiative et le sens pratique. Ces qualités sont utiles dans le monde professionnel, mais aussi dans la vie quotidienne.",
      "Ensuite, l’engagement associatif donne souvent une meilleure compréhension de la société. Un étudiant qui participe à une action locale découvre des réalités différentes de son cadre habituel et comprend mieux les besoins d’un quartier, d’un public fragile ou d’un projet collectif. À ce titre, le bénévolat forme aussi le citoyen, pas seulement le futur salarié.",
      "Certes, beaucoup d’étudiants ont déjà des journées chargées, parfois un emploi à côté des études, et il serait injuste de leur demander toujours plus. Cependant, cette objection ne signifie pas qu’il faille renoncer. Elle montre surtout qu’il faut proposer des formes d’engagement flexibles, ponctuelles et compatibles avec des rythmes variés.",
      "En conclusion, encourager le bénévolat me paraît souhaitable, à condition de rester réaliste. L’université pourrait par exemple mieux informer sur les associations, reconnaître certaines heures d’engagement ou organiser des missions courtes. Une telle politique valoriserait l’initiative sans transformer un geste libre en contrainte mal vécue."
    ]
  }),
  createPublicWritingTask({
    id: "public-writing-culture-access",
    title: "Les jeunes lisent autrement : comment élargir l’accès à la culture ?",
    subtitle: "Article d’opinion · culture",
    topicId: "culture-access-youth",
    topicLabel: "Culture et accès",
    formatLabel: "Article d’opinion",
    brief:
      "Tu écris un article pour un journal local. Tu réagis à l’idée suivante : les jeunes se détournent de la culture traditionnelle et il faut repenser l’offre culturelle. Tu prends position, tu développes au moins deux arguments, tu réponds à l’objection selon laquelle il suffit de préserver les habitudes existantes, puis tu conclus par une piste d’action.",
    outline: [
      "Poser le débat sans opposer brutalement les générations.",
      "Argument 1 : les usages changent, pas forcément la curiosité.",
      "Argument 2 : l’accompagnement compte autant que l’offre.",
      "Concession : le patrimoine doit aussi être protégé.",
      "Conclusion : proposer une médiation plus active."
    ],
    modelParagraphs: [
      "Dire que les jeunes se détournent de la culture est une formule rapide, mais trompeuse. En réalité, ils lisent, regardent, écoutent et découvrent autrement. Le problème n’est donc pas seulement une supposée baisse d’intérêt ; il tient aussi au décalage entre certaines institutions culturelles et les usages actuels du public.",
      "D’abord, les pratiques culturelles ont changé. Beaucoup de jeunes découvrent un auteur, une exposition ou une œuvre par des formats courts, des recommandations ou des contenus numériques. On peut le regretter, mais il serait plus utile d’y voir une porte d’entrée. Une rencontre avec la culture commence rarement aujourd’hui comme elle commençait il y a trente ans.",
      "Ensuite, l’accès dépend fortement de la médiation. Une programmation de qualité ne suffit pas si elle reste intimidante, mal expliquée ou trop éloignée des habitudes du public. Les partenariats avec les écoles, les ateliers, les cartes jeunes ou les présentations claires avant un spectacle jouent souvent un rôle décisif.",
      "Certes, il ne faut pas transformer toute politique culturelle en simple stratégie d’attractivité. Le patrimoine, l’exigence artistique et la transmission restent essentiels. Toutefois, préserver ne signifie pas figer. Une institution culturelle fidèle à sa mission peut rester ambitieuse tout en inventant des formes d’accueil plus ouvertes.",
      "En conclusion, repenser l’accès à la culture ne veut pas dire abandonner les œuvres exigeantes ; cela signifie mieux accompagner la rencontre avec elles. À mon sens, la priorité devrait être d’investir davantage dans la médiation, car c’est souvent elle qui transforme une curiosité fragile en habitude durable."
    ]
  }),
  createPublicWritingTask({
    id: "public-writing-food-waste",
    title: "Réduire le gaspillage alimentaire dans une cantine",
    subtitle: "Rapport bref · vie collective",
    topicId: "health-food-waste",
    topicLabel: "Alimentation et habitudes",
    formatLabel: "Rapport bref",
    brief:
      "Tu rédiges un court rapport pour la direction d’un établissement sur le gaspillage alimentaire dans la cantine. Tu expliques pourquoi ce problème mérite une action, tu développes au moins deux causes ou conséquences, tu réponds à l’objection selon laquelle les habitudes sont difficiles à changer, puis tu proposes des mesures concrètes.",
    outline: [
      "Présenter le problème et son importance.",
      "Analyser une première cause : portions, organisation ou information.",
      "Analyser une deuxième cause : habitudes ou qualité perçue.",
      "Concession : les changements demandent du temps.",
      "Conclusion : recommander quelques actions précises."
    ],
    modelTitle: "Modèle haut niveau : rapport structuré",
    modelParagraphs: [
      "Objet : propositions pour réduire le gaspillage alimentaire à la cantine. Le gaspillage alimentaire représente à la fois une perte économique, un problème environnemental et un mauvais signal éducatif. Il me semble donc nécessaire d’agir, non par des discours moralisateurs, mais par des ajustements concrets de l’organisation.",
      "Une première cause tient souvent à la taille des portions et à une information insuffisante. Lorsque les usagers ne savent pas exactement ce qui sera servi ou ne peuvent pas adapter la quantité, une partie des aliments finit automatiquement à la poubelle. Le problème ne vient donc pas seulement des comportements individuels, mais aussi du fonctionnement du service.",
      "Une deuxième cause concerne le rapport au repas lui-même. Si le menu paraît peu attractif, si le temps pour manger est trop court ou si la file d’attente décourage, les convives consomment moins et jettent davantage. Le gaspillage révèle alors une difficulté plus large : l’organisation ne favorise pas un repas serein et choisi.",
      "Certes, les habitudes alimentaires ne changent pas du jour au lendemain et il serait naïf d’attendre des résultats immédiats. Cependant, cette difficulté ne doit pas servir de prétexte à l’inaction. Les comportements évoluent plus facilement lorsque les consignes sont simples, visibles et accompagnées par une offre plus souple.",
      "Je recommande donc de tester plusieurs mesures : portions ajustables, meilleure information sur les menus, valorisation des plats les moins choisis et suivi chiffré du gaspillage chaque semaine. Une telle démarche permettrait d’évaluer objectivement les progrès et de corriger les solutions insuffisantes au lieu de se contenter d’intentions générales."
    ],
    whyItScores: [
      "Le texte adopte un ton clair et professionnel adapté à un rapport bref.",
      "Les causes du problème sont analysées avant les recommandations.",
      "La concession montre du réalisme sans affaiblir la proposition finale.",
      "La conclusion passe d’un constat général à des mesures concrètes et évaluables."
    ]
  }),
  createPublicWritingTask({
    id: "public-writing-four-day-week",
    title: "Faut-il expérimenter la semaine de quatre jours ?",
    subtitle: "Lettre argumentée · monde du travail",
    topicId: "work-four-day-week",
    topicLabel: "Travail et temps",
    formatLabel: "Lettre argumentée",
    brief:
      "Tu écris à la direction d’une entreprise pour proposer une expérimentation de la semaine de quatre jours dans certains services. Tu défends ton idée, tu développes au moins deux arguments, tu réponds à l’objection selon laquelle cette organisation nuirait à la productivité ou aux clients, puis tu conclus avec une méthode d’essai réaliste.",
    outline: [
      "Présenter la proposition et la position générale.",
      "Argument 1 : motivation et concentration.",
      "Argument 2 : attractivité et fidélisation des salariés.",
      "Concession : continuité du service et organisation réelle.",
      "Conclusion : proposer un test limité avec indicateurs."
    ],
    modelParagraphs: [
      "Madame, Monsieur, je souhaite proposer que notre entreprise expérimente, dans certains services volontaires, une organisation du travail sur quatre jours. Je ne présente pas cette idée comme une solution miracle, mais comme une piste sérieuse pour améliorer à la fois l’efficacité, l’attractivité et l’équilibre des équipes.",
      "D’abord, un temps de travail mieux concentré peut renforcer l’engagement. Lorsque les journées sont organisées de manière cohérente, avec des priorités plus nettes et moins de réunions inutiles, les salariés travaillent souvent avec davantage d’attention. Le débat ne porte donc pas seulement sur le nombre de jours, mais sur la qualité réelle de l’organisation.",
      "Ensuite, une telle expérimentation pourrait devenir un facteur d’attractivité. Dans un contexte où de nombreuses entreprises peinent à recruter ou à fidéliser, proposer une forme de souplesse bien pensée peut constituer un avantage concret. Cet argument compte d’autant plus que la qualité de vie influence désormais fortement les choix professionnels.",
      "Certes, on peut craindre une baisse de disponibilité pour les clients ou une désorganisation des services. Cette objection est légitime. Cependant, elle ne condamne pas le projet. Elle montre qu’une telle évolution doit être testée avec méthode, sur un périmètre limité, avec des équipes volontaires et des objectifs de performance précis.",
      "En conclusion, je serais favorable à une expérimentation de quelques mois, fondée sur des indicateurs simples : qualité du service, charge de travail, absentéisme et satisfaction des salariés. Une décision importante mérite mieux qu’un débat théorique : elle doit être observée, mesurée et ajustée. Je vous prie d’agréer, Madame, Monsieur, l’expression de mes salutations distinguées."
    ]
  }),
  createPublicWritingTask({
    id: "public-writing-ai-learning",
    title: "L’intelligence artificielle aide-t-elle vraiment à apprendre ?",
    subtitle: "Contribution à un forum · innovation",
    topicId: "technology-ai-learning",
    topicLabel: "Technologie et apprentissage",
    formatLabel: "Contribution à un forum",
    brief:
      "Tu participes à un forum sur les outils numériques à l’université. Tu réagis à l’affirmation suivante : l’intelligence artificielle aide forcément les étudiants à mieux apprendre. Tu prends position, tu développes deux arguments, tu réponds à l’objection selon laquelle refuser ces outils serait dépassé, puis tu termines par une recommandation concrète.",
    outline: [
      "Poser le débat et éviter les jugements extrêmes.",
      "Argument 1 : ces outils peuvent réellement aider à comprendre.",
      "Argument 2 : ils deviennent dangereux s’ils remplacent l’effort personnel.",
      "Concession : on ne peut pas simplement les ignorer.",
      "Conclusion : proposer un usage guidé et transparent."
    ],
    modelParagraphs: [
      "Selon moi, l’intelligence artificielle peut aider à apprendre, mais elle n’aide pas forcément mieux par elle-même. Tout dépend de l’usage que l’étudiant en fait. Un outil peut soutenir la réflexion, mais il peut aussi donner l’illusion du progrès lorsqu’il remplace le travail personnel au lieu de le renforcer.",
      "D’abord, ces outils peuvent être utiles pour reformuler une notion, proposer un plan de travail ou fournir un exemple supplémentaire. Pour un étudiant bloqué devant une consigne difficile, ce type d’aide peut relancer la compréhension. L’intérêt est donc réel, surtout lorsqu’il s’agit d’éclairer un point précis ou d’organiser une méthode.",
      "Ensuite, il faut reconnaître un risque majeur : l’étudiant peut confondre assistance et apprentissage. Lorsqu’un outil produit directement une réponse complète, le gain immédiat masque parfois une perte plus profonde. On rend un travail correct, mais on retient peu. À long terme, cette dépendance fragilise l’autonomie intellectuelle au lieu de la développer.",
      "Certes, il serait absurde de vouloir bannir ces technologies, car elles font déjà partie du paysage universitaire et professionnel. Cependant, accepter leur présence ne signifie pas renoncer à toute exigence. Au contraire, plus l’outil est puissant, plus il faut apprendre à l’utiliser avec recul, en vérifiant, comparant et reformulant soi-même.",
      "En conclusion, l’intelligence artificielle peut devenir une aide précieuse, à condition de rester un appui et non un substitut. À mon avis, les établissements devraient surtout former les étudiants à l’usage critique de ces outils. Ce n’est pas la technologie qui garantit le progrès, mais la manière dont elle s’intègre à une vraie méthode d’apprentissage."
    ]
  }),
  createPublicWritingTask({
    id: "public-writing-digital-public-services",
    title: "Services publics en ligne : progrès ou nouvelle exclusion ?",
    subtitle: "Article d’opinion · vie publique",
    topicId: "public-life-digital-services",
    topicLabel: "Vie publique et services",
    formatLabel: "Article d’opinion",
    brief:
      "Tu rédiges un article pour un journal régional. Tu réagis à l’idée suivante : la dématérialisation des services publics simplifie la vie de tous les usagers. Tu prends position, tu développes au moins deux arguments, tu réponds à l’objection selon laquelle le numérique fait gagner du temps, puis tu conclus par une piste d’amélioration.",
    outline: [
      "Présenter l’idée reçue et annoncer une position nuancée.",
      "Argument 1 : le numérique simplifie réellement certaines démarches.",
      "Argument 2 : il exclut une partie du public s’il devient la seule porte d’entrée.",
      "Concession : les gains de temps existent.",
      "Conclusion : défendre une logique de complémentarité."
    ],
    modelParagraphs: [
      "La dématérialisation des services publics est souvent présentée comme un progrès évident. En réalité, cette évolution apporte à la fois des bénéfices réels et de nouvelles fragilités. À mon sens, elle simplifie certaines démarches, mais elle devient problématique lorsqu’elle remplace totalement la relation humaine au lieu de la compléter.",
      "D’abord, il faut reconnaître les avantages du numérique. Prendre un rendez-vous, télécharger un document ou suivre un dossier à distance peut faire gagner du temps, éviter des déplacements inutiles et rendre certains services plus accessibles pour les usagers autonomes. Sur ce point, la modernisation répond à un besoin réel.",
      "Cependant, cette logique devient injuste si elle suppose que tous les citoyens possèdent les mêmes compétences, le même équipement et la même aisance face aux plateformes. Or ce n’est pas le cas. Certaines personnes âgées, précaires ou simplement peu à l’aise avec l’écrit numérique se retrouvent rapidement exclues d’un service censé leur être destiné.",
      "Certes, on objectera qu’un retour complet au papier ou au guichet serait coûteux et peu efficace. C’est vrai. Mais cette objection pose mal le problème. Il ne s’agit pas de choisir entre passé et modernité ; il s’agit de maintenir plusieurs portes d’entrée afin que la simplification ne profite pas à certains au prix de l’exclusion des autres.",
      "En conclusion, la dématérialisation n’est un progrès que si elle reste accompagnée. Des guichets de proximité, des médiateurs numériques et des interfaces plus lisibles me paraissent indispensables. Un service public moderne ne devrait pas seulement être rapide ; il devrait aussi rester réellement accessible."
    ]
  }),
  createPublicWritingTask({
    id: "public-writing-public-transport",
    title: "Comment rendre les transports publics plus attractifs ?",
    subtitle: "Rapport bref · mobilité",
    topicId: "public-life-transport",
    topicLabel: "Mobilité quotidienne",
    formatLabel: "Rapport bref",
    brief:
      "Tu rédiges un court rapport pour une collectivité locale sur l’usage des transports publics par les jeunes actifs. Tu expliques pourquoi leur attractivité reste insuffisante, tu développes au moins deux causes ou priorités, tu réponds à l’objection selon laquelle le problème vient seulement du prix, puis tu termines par des recommandations concrètes.",
    outline: [
      "Poser le diagnostic de départ.",
      "Analyser une première priorité : régularité et lisibilité.",
      "Analyser une deuxième priorité : confort et articulation avec d’autres mobilités.",
      "Concession : le tarif reste important mais ne suffit pas.",
      "Conclusion : recommander des actions combinées."
    ],
    modelParagraphs: [
      "Objet : pistes pour renforcer l’usage des transports publics chez les jeunes actifs. Malgré les discours favorables à une mobilité plus durable, les transports publics peinent encore à convaincre une partie importante des jeunes travailleurs. À mon sens, cette difficulté tient moins à un manque de communication qu’à un problème de fiabilité et d’expérience concrète.",
      "La première priorité concerne la régularité du service. Un usager accepte difficilement de dépendre d’un réseau qu’il juge imprévisible. Retards répétés, correspondances mal pensées ou information floue découragent rapidement ceux qui ont des horaires contraints. Avant de promettre de nouvelles habitudes, il faut donc rendre le service lisible et fiable au quotidien.",
      "La deuxième priorité porte sur l’expérience globale du trajet. Le confort, la sécurité, l’information en temps réel et l’articulation avec le vélo ou la marche jouent un rôle décisif. Un transport public attractif ne se réduit pas à un véhicule ; c’est un parcours cohérent du départ à l’arrivée, avec peu d’incertitudes et peu de friction.",
      "Certes, le prix reste un facteur important, surtout pour les jeunes actifs au budget limité. Cependant, penser que tout se résout par une baisse tarifaire serait réducteur. Un abonnement peu cher mais associé à un service peu fiable ne crée pas une fidélité durable. Le tarif compte, mais il doit s’inscrire dans une amélioration plus large.",
      "Je recommande donc d’agir simultanément sur trois leviers : meilleure régularité, information plus claire et intermodalité plus simple. Des mesures ciblées sur ces points me semblent plus convaincantes qu’une campagne de communication générale. Pour changer durablement les habitudes, il faut d’abord rendre le choix des transports publics crédible et confortable."
    ],
    whyItScores: [
      "Le rapport hiérarchise le diagnostic avant de passer aux recommandations.",
      "Les arguments restent concrets et liés à l’expérience réelle de l’usager.",
      "La concession évite une explication unique trop simpliste.",
      "La conclusion formule des recommandations claires et immédiatement exploitables."
    ]
  }),
  createPublicWritingTask({
    id: "public-writing-screen-free-day",
    title: "Une journée sans écrans dans les établissements ?",
    subtitle: "Lettre argumentée · santé et éducation",
    topicId: "health-screens-education",
    topicLabel: "Écrans et habitudes",
    formatLabel: "Lettre argumentée",
    brief:
      "Tu écris à la direction d’un établissement pour défendre l’idée d’une journée sans écrans, organisée une ou deux fois par semestre. Tu présentes ton point de vue, tu développes au moins deux arguments, tu réponds à l’objection selon laquelle le numérique est désormais indispensable, puis tu conclus par une proposition d’organisation réaliste.",
    outline: [
      "Présenter l’idée et annoncer une position favorable mais non radicale.",
      "Argument 1 : créer une prise de conscience utile.",
      "Argument 2 : redonner de la place aux échanges et à l’attention.",
      "Concession : le numérique reste nécessaire dans de nombreux usages.",
      "Conclusion : proposer une journée ponctuelle et bien préparée."
    ],
    modelParagraphs: [
      "Madame, Monsieur, je souhaite vous soumettre l’idée d’organiser, une ou deux fois par semestre, une journée sans écrans au sein de l’établissement. Je ne propose pas de rejeter le numérique, dont l’utilité est évidente, mais d’ouvrir un moment ponctuel de recul collectif sur nos habitudes et sur leur influence sur l’attention, les échanges et le rythme de travail.",
      "D’abord, une telle journée permettrait une prise de conscience concrète. Beaucoup d’élèves ou d’étudiants savent déjà qu’ils passent beaucoup de temps sur les écrans, mais cette connaissance reste abstraite. En supprimant temporairement certains usages, on rend visibles des automatismes souvent ignorés : consultation réflexe du téléphone, dispersion constante ou difficulté à maintenir une concentration longue.",
      "Ensuite, cette initiative pourrait redonner de la place aux échanges directs. Dans un cadre où tout passe souvent par un écran, il est utile d’expérimenter d’autres formes de présence : discussion, lecture papier, ateliers, activités collectives ou débats. Ce déplacement temporaire n’a rien d’archaïque ; il peut au contraire enrichir la vie de l’établissement.",
      "Certes, le numérique est devenu indispensable pour de nombreuses tâches, et il serait absurde de prétendre revenir à un fonctionnement sans outils numériques. Cependant, l’idée d’une journée sans écrans n’a pas ce but. Elle vise seulement à créer un temps d’expérience et de réflexion, limité, préparé et cohérent avec les objectifs éducatifs.",
      "En conclusion, je serais favorable à une journée ponctuelle, annoncée à l’avance et accompagnée d’activités adaptées. Si elle est bien pensée, cette initiative pourrait aider chacun à mieux comprendre ses usages au lieu de subir des injonctions abstraites. Je vous prie d’agréer, Madame, Monsieur, l’expression de mes salutations distinguées."
    ]
  })
];
