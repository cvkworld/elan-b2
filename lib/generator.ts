import {
  Attempt,
  ExamSection,
  FeedbackReport,
  MockExamSession,
  ObjectiveQuestion,
  SkillTag,
  StudyPlan,
  TaskTemplate,
  TaskVariant,
  TelemetryEvent,
  TodayBundle,
  WeaknessProfile
} from "@/lib/types";
import {
  sectionMeta,
  skillNodes,
  speakingRubric,
  taskTemplates,
  topicSeeds,
  writingRubric
} from "@/lib/delf-data";

const skillTags = skillNodes.map((node) => node.id);
const officialSections: ExamSection[] = ["listening", "reading", "writing", "speaking"];

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInt(random: () => number, max: number): number {
  return Math.floor(random() * max);
}

function pickOne<T>(items: T[], random: () => number): T {
  return items[randomInt(random, items.length)];
}

function sampleWithoutReplacement<T>(items: T[], count: number, random: () => number): T[] {
  const pool = [...items];
  const picked: T[] = [];
  while (pool.length > 0 && picked.length < count) {
    const index = randomInt(random, pool.length);
    picked.push(pool.splice(index, 1)[0]);
  }
  return picked;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createId(prefix: string, seed: string): string {
  return `${prefix}-${slugify(seed)}-${hashString(seed).toString(36).slice(0, 6)}`;
}

function createEventId(seed: string): string {
  return `${createId("evt", seed)}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function questionPack(questions: ObjectiveQuestion[]) {
  return questions.map((question) => ({
    questionId: question.id,
    correctIndex: question.correctIndex,
    rationale: question.explanation,
    skillTag: question.skillTag
  }));
}

function createFingerprint(parts: string[]): string {
  return parts.join("|");
}

function average(values: number[], fallback: number): number {
  if (values.length === 0) {
    return fallback;
  }
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function summarizeRecentAttempts(attempts: Attempt[], section?: ExamSection) {
  return attempts
    .filter((attempt) => (section ? attempt.section === section : true))
    .slice(-12);
}

export function computeWeaknessProfile(attempts: Attempt[]): WeaknessProfile {
  const sectionScores = {
    listening: 48,
    reading: 50,
    writing: 46,
    speaking: 44,
    grammar: 47
  } satisfies Record<ExamSection, number>;

  const skillScores = Object.fromEntries(
    skillTags.map((tag) => [tag, 48])
  ) as Record<SkillTag, number>;
  const topicScores: Record<string, number> = {};
  const mistakeCounter = new Map<string, { count: number; section: ExamSection }>();

  (Object.keys(sectionScores) as ExamSection[]).forEach((section) => {
    const recent = summarizeRecentAttempts(attempts, section).map((attempt) => attempt.score);
    sectionScores[section] = average(recent, sectionScores[section]);
  });

  skillTags.forEach((tag) => {
    const relevant = attempts
      .filter((attempt) => attempt.skillTags.includes(tag))
      .slice(-10)
      .map((attempt) => attempt.score);
    skillScores[tag] = average(relevant, skillScores[tag]);
  });

  attempts.forEach((attempt) => {
    topicScores[attempt.topicId] ??= 50;
    topicScores[attempt.topicId] = Math.round((topicScores[attempt.topicId] + attempt.score) / 2);

    attempt.mistakeTags.forEach((tag) => {
      const current = mistakeCounter.get(tag) ?? { count: 0, section: attempt.section };
      mistakeCounter.set(tag, { count: current.count + 1, section: attempt.section });
    });
  });

  const recurringMistakes = Array.from(mistakeCounter.entries())
    .map(([tag, data]) => ({
      tag,
      count: data.count,
      section: data.section
    }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 6);

  const focusSkills = Object.entries(skillScores)
    .sort((left, right) => left[1] - right[1])
    .slice(0, 4)
    .map(([tag]) => tag as SkillTag);

  const focusSection = (Object.entries(sectionScores) as Array<[ExamSection, number]>)
    .sort((left, right) => left[1] - right[1])[0][0];

  return {
    sectionScores,
    skillScores,
    topicScores,
    recurringMistakes,
    focusSkills,
    focusSection
  };
}

function getTemplates(section: ExamSection): TaskTemplate[] {
  return taskTemplates.filter((template) => template.section === section);
}

function chooseTemplate(
  section: ExamSection,
  profile: WeaknessProfile,
  attempts: Attempt[],
  random: () => number,
  preferredSkill?: SkillTag
): TaskTemplate {
  const recentFingerprints = new Set(
    attempts
      .slice(-10)
      .filter((attempt) => attempt.section === section)
      .map((attempt) => attempt.taskFingerprint.split("|").slice(0, 2).join("|"))
  );

  const ranked = getTemplates(section)
    .map((template) => {
      const weakSkillBoost = template.skillTags.some((tag) =>
        (preferredSkill ? [preferredSkill] : profile.focusSkills).includes(tag)
      )
        ? 12
        : 0;
      const reusePenalty = recentFingerprints.has(`${template.id}|${template.cooldownFamily}`) ? -8 : 0;
      const depthBoost = profile.focusSection === section ? 5 : 0;
      return {
        template,
        score: weakSkillBoost + reusePenalty + depthBoost + random()
      };
    })
    .sort((left, right) => right.score - left.score);

  return ranked[0]?.template ?? getTemplates(section)[0];
}

function chooseTopic(
  profile: WeaknessProfile,
  random: () => number,
  attempts: Attempt[]
) {
  const ranked = topicSeeds
    .map((topic) => {
      const lowScore = 100 - (profile.topicScores[topic.id] ?? 52);
      const recentPenalty = attempts.slice(-8).some((attempt) => attempt.topicId === topic.id) ? -8 : 0;
      return {
        topic,
        score: lowScore + recentPenalty + random() * 12
      };
    })
    .sort((left, right) => right.score - left.score);

  return ranked[0]?.topic ?? topicSeeds[0];
}

function composeListeningTask(
  template: TaskTemplate,
  topic: (typeof topicSeeds)[number],
  random: () => number
): TaskVariant {
  const context = pickOne(topic.contexts, random);
  const audience = pickOne(topic.audiences, random);
  const claim = pickOne(topic.claims, random);
  const counterpoint = pickOne(topic.counterpoints, random);
  const friction = pickOne(topic.frictionPoints, random);
  const emphasis = sampleWithoutReplacement(topic.vocabulary, 3, random);

  const transcript = [
    `Bonjour à tous. Dans ${context}, plusieurs intervenants discutent aujourd'hui d'un même constat : ${claim}`,
    `L'invitée explique que le vrai enjeu n'est pas seulement ${friction}, mais aussi la manière dont ${audience} comprennent les décisions prises. Elle rappelle qu'un bon dispositif doit montrer des bénéfices visibles, sinon la participation baisse très vite.`,
    `En fin d'échange, elle nuance pourtant son propos : ${counterpoint}. Sa conclusion reste claire. Il faut avancer progressivement, expliquer les critères choisis et donner aux personnes concernées un rôle concret dans l'évaluation.`
  ].join(" ");

  const questions: ObjectiveQuestion[] = [
    {
      id: createId("q", `${template.id}-${topic.id}-1`),
      prompt: "Quelle est l'idée générale de l'intervention ?",
      choices: [
        "La mesure critiquée doit être abandonnée immédiatement.",
        "Le sujet traité exige à la fois explication, visibilité et progression.",
        "Le public refuse toute évolution touchant à ses habitudes.",
        "L'intervenante compare surtout plusieurs pays européens."
      ],
      correctIndex: 1,
      explanation: "Le document défend une progression expliquée et visible, pas un rejet total.",
      mistakeTag: "main-idea-slip",
      skillTag: "gist-extraction"
    },
    {
      id: createId("q", `${template.id}-${topic.id}-2`),
      prompt: "Quelle nuance l'invitée apporte-t-elle ?",
      choices: [
        `Elle admet que ${counterpoint}.`,
        "Elle affirme que le problème est déjà entièrement résolu.",
        "Elle soutient que seules les grandes villes peuvent agir.",
        "Elle refuse de parler des effets concrets sur le public."
      ],
      correctIndex: 0,
      explanation: "La nuance est formulée explicitement avant la conclusion.",
      mistakeTag: "nuance-missed",
      skillTag: "stance-detection"
    },
    {
      id: createId("q", `${template.id}-${topic.id}-3`),
      prompt: "Que devrait noter un candidat pendant l'écoute ?",
      choices: [
        `Les trois mots repères : ${emphasis.join(", ")}.`,
        "Le nom exact de toutes les personnes présentes.",
        "La totalité des exemples donnés mot à mot.",
        "Une définition juridique précise du sujet."
      ],
      correctIndex: 0,
      explanation: "L'idée est de garder les repères sémantiques les plus porteurs.",
      mistakeTag: "notes-too-dense",
      skillTag: "note-taking"
    },
    {
      id: createId("q", `${template.id}-${topic.id}-4`),
      prompt: "Quelle recommandation finale résume le mieux le document ?",
      choices: [
        "Lancer une réforme complète sans phase d'essai.",
        "Attendre un consensus parfait avant toute décision.",
        "Avancer progressivement et rendre les critères lisibles.",
        "Laisser chaque groupe décider sans cadre commun."
      ],
      correctIndex: 2,
      explanation: "La fin du document insiste sur la progressivité et la lisibilité.",
      mistakeTag: "recommendation-missed",
      skillTag: "detail-discrimination"
    }
  ];

  const family = pickOne(template.variationFamilies, random);
  const fingerprint = createFingerprint([
    template.id,
    template.cooldownFamily,
    topic.id,
    family,
    slugify(claim)
  ]);

  return {
    id: createId(template.id, fingerprint),
    section: "listening",
    templateId: template.id,
    fingerprint,
    title: `${sectionMeta.listening.label} · ${topic.label}`,
    subtitle: `${template.label} · ${context}`,
    topicId: topic.id,
    topicLabel: topic.label,
    skillTags: template.skillTags,
    difficulty: 3,
    estimatedMinutes: template.estimatedMinutes,
    scoringMethod: template.scoringMethod,
    coachHints: [
      "Lis d'abord les questions, puis note seulement les pivots.",
      "Cherche la nuance finale : DELF B2 aime les positions non absolues."
    ],
    answerKey: questionPack(questions),
    content: {
      transcript,
      bullets: [
        "Repère l'idée globale dès les 20 premières secondes.",
        "Ne copie pas tout. Garde surtout position, nuance, recommandation."
      ],
      questions,
      replaysAllowed: template.id === "listen-bulletin" ? 2 : 1,
      voiceHint: "Voix coach synthétique, débit conseillé 0.93x pour noter.",
      notePrompt: "Pendant l'écoute, note : problème, position, nuance, solution."
    }
  };
}

function composeReadingTask(
  template: TaskTemplate,
  topic: (typeof topicSeeds)[number],
  random: () => number
): TaskVariant {
  const claim = pickOne(topic.claims, random);
  const counterpoint = pickOne(topic.counterpoints, random);
  const context = pickOne(topic.contexts, random);
  const audience = pickOne(topic.audiences, random);
  const evidenceWords = sampleWithoutReplacement(topic.vocabulary, 3, random);

  const passage = [
    `Dans ${context}, la question suivante revient souvent : ${claim} L'auteur rappelle que les décisions publiques sont rarement rejetées pour leur principe seul. Elles deviennent surtout fragiles quand leurs critères restent flous pour ${audience}.`,
    `Pour étayer cette idée, il cite plusieurs situations où l'explication des priorités a changé la réception d'un projet. Les participants acceptent plus volontiers un effort quand ils voient comment il sera évalué, quels effets seront mesurés et à quel moment un ajustement sera possible.`,
    `Le texte refuse pourtant tout enthousiasme naïf : ${counterpoint}. L'auteur conclut donc qu'une action crédible combine visibilité, rythme réaliste et langage compréhensible.`
  ];

  const questions: ObjectiveQuestion[] = [
    {
      id: createId("q", `${template.id}-${topic.id}-1`),
      prompt: "Quelle thèse l'auteur défend-il principalement ?",
      choices: [
        "Une politique locale est crédible seulement si elle repose sur la contrainte.",
        "La compréhension des critères rend l'action plus acceptable.",
        "Les habitants refusent toujours les changements qui touchent leur routine.",
        "Les projets les plus coûteux sont automatiquement les plus efficaces."
      ],
      correctIndex: 1,
      explanation: "La thèse centrale relie lisibilité des critères et adhésion.",
      mistakeTag: "thesis-missed",
      skillTag: "evidence-matching"
    },
    {
      id: createId("q", `${template.id}-${topic.id}-2`),
      prompt: "Quel ton domine dans le dernier paragraphe ?",
      choices: [
        "Un enthousiasme sans réserve.",
        "Une ironie moqueuse.",
        "Une prudence constructive.",
        "Une colère accusatrice."
      ],
      correctIndex: 2,
      explanation: "L'auteur nuance sans renoncer à son idée principale.",
      mistakeTag: "tone-missed",
      skillTag: "tone-analysis"
    },
    {
      id: createId("q", `${template.id}-${topic.id}-3`),
      prompt: "À quoi servent les exemples du deuxième paragraphe ?",
      choices: [
        "À raconter l'origine historique du problème.",
        "À prouver que la transparence modifie la réception d'un projet.",
        "À montrer que le contexte étudié est exceptionnel.",
        "À décrire les réactions individuelles les plus extrêmes."
      ],
      correctIndex: 1,
      explanation: "Les exemples servent de preuves, pas d'anecdotes décoratives.",
      mistakeTag: "evidence-function-slip",
      skillTag: "evidence-matching"
    },
    {
      id: createId("q", `${template.id}-${topic.id}-4`),
      prompt: "Quel groupe de mots aide le plus à retenir le cœur du texte ?",
      choices: [
        evidenceWords,
        ["urgence", "sanction", "exception"],
        ["routine", "microphone", "archives"],
        ["géographie", "nostalgie", "isolement"]
      ].map((choice) => choice.join(", ")),
      correctIndex: 0,
      explanation: "Ce champ lexical correspond au raisonnement du texte.",
      mistakeTag: "keyword-slip",
      skillTag: "detail-discrimination"
    }
  ];

  const family = pickOne(template.variationFamilies, random);
  const fingerprint = createFingerprint([
    template.id,
    template.cooldownFamily,
    topic.id,
    family,
    slugify(counterpoint)
  ]);

  return {
    id: createId(template.id, fingerprint),
    section: "reading",
    templateId: template.id,
    fingerprint,
    title: `${sectionMeta.reading.label} · ${topic.label}`,
    subtitle: `${template.label} · ${context}`,
    topicId: topic.id,
    topicLabel: topic.label,
    skillTags: template.skillTags,
    difficulty: 3,
    estimatedMinutes: template.estimatedMinutes,
    scoringMethod: template.scoringMethod,
    coachHints: [
      "Commence par le titre et la conclusion pour repérer la posture.",
      "Relie chaque exemple à la thèse qu'il sert."
    ],
    answerKey: questionPack(questions),
    content: {
      headline: "Pourquoi la clarté change la réception d'un projet",
      kicker: topic.label,
      passage,
      questions
    }
  };
}

function composeGrammarTask(
  template: TaskTemplate,
  topic: (typeof topicSeeds)[number],
  random: () => number,
  focusSkill?: SkillTag
): TaskVariant {
  const focus =
    focusSkill === "hypothesis" || template.id === "grammar-condition"
      ? "Hypothèse, prudence et reformulation"
      : "Connecteurs utiles pour nuancer";

  const items =
    template.id === "grammar-condition"
      ? [
          {
            id: createId("g", `${topic.id}-1`),
            prompt: `Si les critères étaient expliqués plus tôt, le public ______ davantage au projet.`,
            choices: ["adhère", "adhérerait", "adhérera", "adhérait"],
            correctIndex: 1,
            explanation: "Après 'si' à l'imparfait, la conséquence se met au conditionnel présent.",
            skillTag: "hypothesis" as const
          },
          {
            id: createId("g", `${topic.id}-2`),
            prompt: `L'animatrice a rappelé que la mesure ______ ajustée après l'évaluation.`,
            choices: ["peut être", "pourrait être", "aurait pu être", "sera"],
            correctIndex: 1,
            explanation: "Le discours rapporté prudent attend ici une hypothèse, pas une certitude.",
            skillTag: "reported-speech" as const
          },
          {
            id: createId("g", `${topic.id}-3`),
            prompt: `Réécris l'idée en version plus nuancée : 'Cette solution résout tout.'`,
            choices: [
              "Cette solution résout tout.",
              "Cette solution pourrait répondre à une partie du problème.",
              "Cette solution résolvait tout hier.",
              "Cette solution a tout résolu, certainement."
            ],
            correctIndex: 1,
            explanation: "B2 préfère souvent une formulation prudente et crédible.",
            skillTag: "error-correction" as const
          }
        ]
      : [
          {
            id: createId("g", `${topic.id}-1`),
            prompt: `La mesure semble utile ; ______, elle doit rester lisible pour le public.`,
            choices: ["cependant", "donc", "par conséquent", "en plus"],
            correctIndex: 0,
            explanation: "Il faut un lien d'opposition nuancée, pas de conséquence.",
            skillTag: "connectors" as const
          },
          {
            id: createId("g", `${topic.id}-2`),
            prompt: `Le projet est exigeant. ______, ses bénéfices concrets encouragent la participation.`,
            choices: ["En revanche", "Bref", "Au lieu de", "En effet de"],
            correctIndex: 0,
            explanation: "La seconde phrase oppose l'effort et l'avantage.",
            skillTag: "connectors" as const
          },
          {
            id: createId("g", `${topic.id}-3`),
            prompt: "Choisis la version la plus naturelle :",
            choices: [
              "Premièrement, le projet est utile. Deuxièmement, il est utile aussi.",
              "D'abord, le projet apporte un gain concret ; ensuite, il reste ajustable.",
              "Le projet est utile mais donc tout le monde accepte.",
              "Par ailleurs cependant le projet convainc."
            ],
            correctIndex: 1,
            explanation: "Les connecteurs doivent structurer sans surcharge.",
            skillTag: "error-correction" as const
          }
        ];

  const fingerprint = createFingerprint([
    template.id,
    template.cooldownFamily,
    topic.id,
    focus
  ]);

  return {
    id: createId(template.id, fingerprint),
    section: "grammar",
    templateId: template.id,
    fingerprint,
    title: `${sectionMeta.grammar.label} · ${focus}`,
    subtitle: `${topic.label} · drill utile`,
    topicId: topic.id,
    topicLabel: topic.label,
    skillTags: template.skillTags,
    difficulty: template.id === "grammar-condition" ? 4 : 3,
    estimatedMinutes: template.estimatedMinutes,
    scoringMethod: template.scoringMethod,
    coachHints: [
      "Choisis le lien logique avant de penser au mot exact.",
      "Réécris tes erreurs de production avec ces structures."
    ],
    answerKey: items.map((item) => ({
      questionId: item.id,
      correctIndex: item.correctIndex,
      rationale: item.explanation,
      skillTag: item.skillTag
    })),
    content: {
      focus,
      items
    }
  };
}

function composeWritingTask(
  template: TaskTemplate,
  topic: (typeof topicSeeds)[number],
  random: () => number
): TaskVariant {
  const context = pickOne(topic.contexts, random);
  const audience = pickOne(topic.audiences, random);
  const claim = pickOne(topic.claims, random);
  const counterpoint = pickOne(topic.counterpoints, random);
  const fingerprint = createFingerprint([
    template.id,
    template.cooldownFamily,
    topic.id,
    slugify(claim)
  ]);

  return {
    id: createId(template.id, fingerprint),
    section: "writing",
    templateId: template.id,
    fingerprint,
    title: `${sectionMeta.writing.label} · ${topic.label}`,
    subtitle: `${template.label} · ${context}`,
    topicId: topic.id,
    topicLabel: topic.label,
    skillTags: template.skillTags,
    difficulty: 4,
    estimatedMinutes: template.estimatedMinutes,
    scoringMethod: "rubric",
    rubric: writingRubric,
    coachHints: [
      "Annonce ta position en une phrase nette dès l'introduction.",
      "Ajoute un contre-argument bref avant ta conclusion."
    ],
    content: {
      brief: `Tu écris pour ${context}. Rédige un texte argumentatif destiné à ${audience}. Tu réagis à l'idée suivante : « ${claim} ». Prends position, développe au moins deux arguments, réponds à une objection possible (${counterpoint}) et termine par une proposition concrète.`,
      constraints: [
        "250 mots minimum.",
        "Ton registre doit rester clair, structuré et adapté à un lecteur inconnu.",
        "Insère une concession et une recommandation finale."
      ],
      checklist: [
        "Position annoncée dès l'introduction.",
        "Deux arguments illustrés par un exemple concret.",
        "Une concession ou objection réellement traitée.",
        "Conclusion qui ouvre vers une action."
      ],
      targetWords: 250,
      modelMoves: [
        "D'abord situer le problème, puis prendre position sans détour.",
        "Nuancer avec 'certes', 'cependant', 'en revanche', 'à condition que'.",
        "Conclure avec une mesure réaliste au lieu d'un slogan."
      ]
    }
  };
}

function composeSpeakingTask(
  template: TaskTemplate,
  topic: (typeof topicSeeds)[number],
  random: () => number
): TaskVariant {
  const context = pickOne(topic.contexts, random);
  const claim = pickOne(topic.claims, random);
  const friction = pickOne(topic.frictionPoints, random);
  const counterpoint = pickOne(topic.counterpoints, random);
  const interactionCue =
    template.id === "speak-interaction"
      ? "L'examinateur veut défendre une option différente. Il faut écouter, concéder un point utile et recentrer."
      : "Après l'exposé, l'examinateur demandera de préciser tes priorités.";
  const fingerprint = createFingerprint([
    template.id,
    template.cooldownFamily,
    topic.id,
    slugify(friction)
  ]);

  return {
    id: createId(template.id, fingerprint),
    section: "speaking",
    templateId: template.id,
    fingerprint,
    title: `${sectionMeta.speaking.label} · ${topic.label}`,
    subtitle: `${template.label} · ${context}`,
    topicId: topic.id,
    topicLabel: topic.label,
    skillTags: template.skillTags,
    difficulty: 4,
    estimatedMinutes: template.estimatedMinutes,
    scoringMethod: "rubric",
    rubric: speakingRubric,
    coachHints: [
      "Plan en trois blocs : constat, position, proposition.",
      "Prépare une concession courte puis reviens à ton critère principal."
    ],
    content: {
      brief: `Tu prépares une prise de parole sur le thème suivant : « ${claim} ». Présente le problème, explique pourquoi ${friction} crée une difficulté, puis défends une solution prioritaire.`,
      prep: [
        "Note ta thèse en une phrase de 12 à 18 mots.",
        "Prévois un exemple concret et une objection possible.",
        `Garde une réponse prête si l'examinateur te dit que ${counterpoint}.`
      ],
      followUps: [
        "Quelle priorité fixerais-tu en premier et pourquoi ?",
        "Que réponds-tu à quelqu'un qui n'est pas convaincu ?",
        "Quel compromis accepterais-tu sans perdre l'idée centrale ?"
      ],
      interactionCue,
      targetMinutes: template.id === "speak-interaction" ? 6 : 5,
      modelMoves: [
        "Introduire le thème en reformulant la consigne.",
        "Utiliser au moins un marqueur de concession et un marqueur de priorité.",
        "Clore sur une décision réaliste et argumentée."
      ]
    }
  };
}

function buildCandidateTask(
  section: ExamSection,
  template: TaskTemplate,
  topic: (typeof topicSeeds)[number],
  random: () => number,
  preferredSkill?: SkillTag
) {
  if (section === "listening") {
    return composeListeningTask(template, topic, random);
  }
  if (section === "reading") {
    return composeReadingTask(template, topic, random);
  }
  if (section === "grammar") {
    return composeGrammarTask(template, topic, random, preferredSkill);
  }
  if (section === "writing") {
    return composeWritingTask(template, topic, random);
  }
  return composeSpeakingTask(template, topic, random);
}

export function generateTaskVariant(options: {
  section: ExamSection;
  attempts: Attempt[];
  seedKey: string;
  preferredSkill?: SkillTag;
}): { task: TaskVariant; telemetry: TelemetryEvent[] } {
  const profile = computeWeaknessProfile(options.attempts);
  const recentFingerprints = new Set(
    options.attempts.slice(-16).map((attempt) => attempt.taskFingerprint)
  );

  let rerollCount = 0;
  let candidate: TaskVariant;

  do {
    const random = mulberry32(
      hashString(`${options.section}-${options.seedKey}-${options.attempts.length}-${rerollCount}`)
    );
    const template = chooseTemplate(
      options.section,
      profile,
      options.attempts,
      random,
      options.preferredSkill
    );
    const topic = chooseTopic(profile, random, options.attempts);
    candidate = buildCandidateTask(
      options.section,
      template,
      topic,
      random,
      options.preferredSkill
    );
    rerollCount += 1;
  } while (recentFingerprints.has(candidate.fingerprint) && rerollCount < 6);
  const telemetry: TelemetryEvent[] = [
    {
      id: createEventId(`${candidate.fingerprint}-generation`),
      timestamp: new Date().toISOString(),
      type: "generation",
      message: `Generated ${candidate.section} task from ${candidate.templateId}.`,
      context: `${candidate.topicLabel} · ${candidate.fingerprint}`
    }
  ];

  if (rerollCount > 1) {
    telemetry.push({
      id: createEventId(`${candidate.fingerprint}-collision`),
      timestamp: new Date().toISOString(),
      type: "collision",
      message: "Generator rerolled to avoid a repeated fingerprint.",
      context: `${candidate.fingerprint} · rerolls=${rerollCount - 1}`
    });
  }

  return { task: candidate, telemetry };
}

function pickGrammarFocus(profile: WeaknessProfile): SkillTag {
  const grammarTags: SkillTag[] = [
    "connectors",
    "error-correction",
    "hypothesis",
    "reported-speech",
    "nominalization"
  ];

  return [...grammarTags].sort(
    (left, right) => profile.skillScores[left] - profile.skillScores[right]
  )[0];
}

export function generateTodayBundle(attempts: Attempt[], dateKey: string): {
  bundle: TodayBundle;
  telemetry: TelemetryEvent[];
} {
  const profile = computeWeaknessProfile(attempts);
  const comprehensionSection =
    profile.sectionScores.listening <= profile.sectionScores.reading ? "listening" : "reading";
  const productiveSection =
    profile.sectionScores.writing <= profile.sectionScores.speaking ? "writing" : "speaking";

  const comprehension = generateTaskVariant({
    section: comprehensionSection,
    attempts,
    seedKey: `${dateKey}-comp`
  });
  const grammar = generateTaskVariant({
    section: "grammar",
    attempts,
    seedKey: `${dateKey}-grammar`,
    preferredSkill: pickGrammarFocus(profile)
  });
  const productive = generateTaskVariant({
    section: productiveSection,
    attempts,
    seedKey: `${dateKey}-prod`
  });

  return {
    bundle: {
      dateKey,
      comprehension: comprehension.task,
      grammar: grammar.task,
      productive: productive.task
    },
    telemetry: [...comprehension.telemetry, ...grammar.telemetry, ...productive.telemetry]
  };
}

export function generateMockExam(attempts: Attempt[], dateKey: string): {
  session: MockExamSession;
  telemetry: TelemetryEvent[];
} {
  const sessionTasks = officialSections.map((section, index) =>
    generateTaskVariant({
      section,
      attempts,
      seedKey: `${dateKey}-mock-${section}-${index}`
    })
  );

  return {
    session: {
      id: createId("mock", dateKey),
      dateKey,
      tasks: sessionTasks.map((entry) => entry.task)
    },
    telemetry: sessionTasks.flatMap((entry) => entry.telemetry)
  };
}

export function scoreObjectiveTask(task: TaskVariant, answers: Record<string, number>) {
  if (task.section !== "listening" && task.section !== "reading" && task.section !== "grammar") {
    throw new Error("Objective scoring is only supported for listening, reading and grammar tasks.");
  }

  const questions =
    task.section === "grammar" ? task.content.items : task.content.questions;

  const total = questions.length;
  let correct = 0;
  const mistakeTags: string[] = [];

  questions.forEach((question) => {
    const selected = answers[question.id];
    if (selected === question.correctIndex) {
      correct += 1;
    } else {
      mistakeTags.push(question.skillTag);
    }
  });

  const score = Math.round((correct / total) * 100);
  const summary =
    score >= 85
      ? "Excellent rythme. Tu lis la logique de l'exercice avec précision."
      : score >= 60
        ? "Base solide, mais une ou deux nuances t'échappent encore."
        : "Le fond est accessible, mais le repérage des indices doit devenir plus rapide.";

  return {
    score,
    correct,
    total,
    mistakeTags,
    summary
  };
}

export function buildStudyPlan(attempts: Attempt[], bundle: TodayBundle): StudyPlan {
  const profile = computeWeaknessProfile(attempts);
  const primarySection = sectionMeta[profile.focusSection];
  const topMistake = profile.recurringMistakes[0];

  return {
    headline: `${primarySection.label} en priorité aujourd'hui`,
    recap: topMistake
      ? `Ton signal le plus coûteux reste "${topMistake.tag}". On garde un travail court mais ciblé pour faire monter la stabilité.`
      : "On installe une cadence régulière : compréhension, réparation grammaticale, puis production guidée.",
    tasks: [
      {
        section: bundle.comprehension.section,
        title: bundle.comprehension.title,
        reason: "Renforcer un point officiel du DELF B2 sans répéter exactement le même exercice."
      },
      {
        section: bundle.grammar.section,
        title: bundle.grammar.title,
        reason: "Réparer la structure la plus rentable à court terme."
      },
      {
        section: bundle.productive.section,
        title: bundle.productive.title,
        reason: "Transformer les idées en argumentation notée comme un coach d'examen."
      }
    ],
    nextMock:
      attempts.length < 6
        ? "Après deux autres séances, lance un mock de section pour mesurer la stabilité."
        : "Planifie un mock complet cette semaine pour vérifier endurance et gestion du temps."
  };
}

export function createAttempt(input: {
  task: TaskVariant;
  score: number;
  responseSummary: string;
  mistakeTags: string[];
  feedback?: FeedbackReport;
}): Attempt {
  return {
    id: createId("attempt", `${input.task.id}-${Date.now()}`),
    taskId: input.task.id,
    taskFingerprint: input.task.fingerprint,
    section: input.task.section,
    templateId: input.task.templateId,
    topicId: input.task.topicId,
    topicLabel: input.task.topicLabel,
    timestamp: new Date().toISOString(),
    score: input.score,
    skillTags: input.task.skillTags,
    mistakeTags: input.mistakeTags,
    responseSummary: input.responseSummary,
    feedback: input.feedback
  };
}
