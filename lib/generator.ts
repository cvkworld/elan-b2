import {
  Attempt,
  ExamSection,
  FeedbackReport,
  MockExamSession,
  ObjectiveQuestion,
  SectionPracticePacks,
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
const officialSections: Array<Extract<ExamSection, "listening" | "reading" | "writing" | "speaking">> = [
  "listening",
  "reading",
  "writing",
  "speaking"
];

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

function safeSplitClaim(claim: string) {
  return claim.replace(/[«»"]/g, "").trim();
}

export function computeWeaknessProfile(attempts: Attempt[]): WeaknessProfile {
  const sectionScores = {
    listening: 48,
    reading: 49,
    writing: 42,
    speaking: 44,
    grammar: 47
  } satisfies Record<ExamSection, number>;

  const skillScores = Object.fromEntries(skillTags.map((tag) => [tag, 48])) as Record<
    SkillTag,
    number
  >;
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

  const focusSection = (Object.entries(sectionScores) as Array<[ExamSection, number]>).sort(
    (left, right) => left[1] - right[1]
  )[0][0];

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

function chooseTopic(profile: WeaknessProfile, random: () => number, attempts: Attempt[]) {
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
      "Cherche la nuance finale : le DELF B2 aime les positions non absolues."
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

function composeReadingEditorialTask(
  template: TaskTemplate,
  topic: (typeof topicSeeds)[number],
  random: () => number
): TaskVariant {
  const claim = pickOne(topic.claims, random);
  const counterpoint = pickOne(topic.counterpoints, random);
  const context = pickOne(topic.contexts, random);
  const audience = pickOne(topic.audiences, random);
  const vocabulary = sampleWithoutReplacement(topic.vocabulary, 3, random);

  const passage = [
    `Dans ${context}, une même interrogation revient de plus en plus souvent : ${safeSplitClaim(claim)}. L'auteur explique que l'adhésion n'est pas seulement une question d'opinion. Elle dépend surtout de la manière dont ${audience} comprennent les critères retenus et les effets attendus.`,
    `Pour étayer sa thèse, le texte montre que les décisions les mieux acceptées sont celles qui rendent visibles leurs étapes, leurs priorités et leurs indicateurs. Cette lisibilité réduit la méfiance, car chacun sait ce qui sera observé, à quel moment un ajustement sera possible et sur quelle base il sera discuté.`,
    `L'auteur ne cède pourtant pas à l'optimisme facile : ${counterpoint}. La conclusion reste donc prudente. Il faut avancer de façon crédible, expliquer sans simplifier à l'excès et associer les personnes concernées au suivi des mesures.`
  ];

  const questions: ObjectiveQuestion[] = [
    {
      id: createId("q", `${template.id}-${topic.id}-1`),
      prompt: "Quelle thèse l'auteur défend-il principalement ?",
      choices: [
        "Une politique crédible repose surtout sur la contrainte.",
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
      prompt: "À quoi sert le deuxième paragraphe ?",
      choices: [
        "À raconter l'origine historique du problème.",
        "À prouver par des exemples ce qui rend un projet crédible.",
        "À montrer que le contexte étudié est exceptionnel.",
        "À décrire les réactions individuelles les plus extrêmes."
      ],
      correctIndex: 1,
      explanation: "Le deuxième paragraphe joue le rôle de preuve argumentée.",
      mistakeTag: "evidence-function-slip",
      skillTag: "evidence-matching"
    },
    {
      id: createId("q", `${template.id}-${topic.id}-3`),
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
      id: createId("q", `${template.id}-${topic.id}-4`),
      prompt: "Quelle recommandation finale résume le mieux le texte ?",
      choices: [
        "Décider vite pour éviter toute contestation.",
        "Retarder toute action jusqu'à l'accord de tous.",
        "Expliquer la logique choisie et montrer comment l'action sera suivie.",
        "Réserver la décision aux seuls experts."
      ],
      correctIndex: 2,
      explanation: "La conclusion insiste sur l'explication et le suivi visible.",
      mistakeTag: "recommendation-missed",
      skillTag: "detail-discrimination"
    },
    {
      id: createId("q", `${template.id}-${topic.id}-5`),
      prompt: "Quel groupe de mots aide le plus à retenir le cœur du texte ?",
      choices: [
        vocabulary.join(", "),
        "nostalgie, géographie, sanction",
        "microphone, archive, détour",
        "urgence, hasard, habitude"
      ],
      correctIndex: 0,
      explanation: "Le champ lexical choisi renvoie à l'argument central du texte.",
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
      "Lis d'abord le titre, puis la conclusion pour repérer la posture.",
      "Demande-toi à chaque paragraphe : preuve, nuance ou recommandation ?"
    ],
    answerKey: questionPack(questions),
    content: {
      formatLabel: template.format,
      examFocus: "Thèse centrale, ton, fonction des exemples et recommandation finale.",
      headline: "Pourquoi la clarté change la réception d'un projet",
      kicker: topic.label,
      passage,
      strategy: [
        "Encadre les marqueurs de prudence : pourtant, cependant, toutefois, certes.",
        "Repère ce qui est affirmé et ce qui est seulement nuancé.",
        "Relie chaque exemple à l'idée qu'il vient soutenir."
      ],
      questions
    }
  };
}

function composeReadingForumTask(
  template: TaskTemplate,
  topic: (typeof topicSeeds)[number],
  random: () => number
): TaskVariant {
  const claim = pickOne(topic.claims, random);
  const counterpoint = pickOne(topic.counterpoints, random);
  const context = pickOne(topic.contexts, random);
  const friction = pickOne(topic.frictionPoints, random);

  const passage = [
    `Message initial - Sur un espace de discussion lié à ${context}, une participante lance le débat autour de cette idée : ${safeSplitClaim(claim)}. Elle propose d'expérimenter une mesure simple pendant quelques semaines afin de vérifier son effet réel sur le terrain.`,
    `Réponse 1 - Un premier intervenant soutient la proposition. Selon lui, la difficulté n'est pas d'agir, mais d'expliquer clairement comment l'essai sera évalué. Il ajoute qu'un cadre limité dans le temps rassure les personnes qui hésitent encore.`,
    `Réponse 2 - Une autre contributrice reste plus réservée. Elle rappelle que ${counterpoint} et que ${friction} risque de provoquer des malentendus si la communication reste trop rapide.`,
    `Synthèse - Le modérateur retient donc une piste médiane : mener un test visible, publier les critères de suivi et ouvrir un temps de retour afin de corriger ce qui fonctionne mal avant toute généralisation.`
  ];

  const questions: ObjectiveQuestion[] = [
    {
      id: createId("q", `${template.id}-${topic.id}-1`),
      prompt: "Quelle proposition apparaît dans le message initial ?",
      choices: [
        "Supprimer toute expérimentation locale.",
        "Lancer un essai limité et observable avant de décider.",
        "Réserver la discussion aux experts du sujet.",
        "Reporter le débat à une date indéterminée."
      ],
      correctIndex: 1,
      explanation: "Le message initial propose un test limité dans le temps.",
      mistakeTag: "proposal-missed",
      skillTag: "task-completion"
    },
    {
      id: createId("q", `${template.id}-${topic.id}-2`),
      prompt: "Quel intervenant exprime la réserve la plus nette ?",
      choices: [
        "Le message initial.",
        "Le premier répondant.",
        "La seconde contributrice.",
        "Le modérateur."
      ],
      correctIndex: 2,
      explanation: "La deuxième réponse insiste sur les limites et les risques de malentendu.",
      mistakeTag: "voice-mixup",
      skillTag: "tone-analysis"
    },
    {
      id: createId("q", `${template.id}-${topic.id}-3`),
      prompt: "Quel point commun relie malgré tout les interventions ?",
      choices: [
        "Tous demandent l'abandon immédiat du projet.",
        "Tous veulent une décision discrète et sans communication.",
        "Tous soulignent la nécessité de rendre les critères lisibles.",
        "Tous préfèrent une solution strictement nationale."
      ],
      correctIndex: 2,
      explanation: "Même la réponse la plus réservée insiste sur la clarté de la communication.",
      mistakeTag: "consensus-slip",
      skillTag: "evidence-matching"
    },
    {
      id: createId("q", `${template.id}-${topic.id}-4`),
      prompt: "Quel ton adopte la synthèse du modérateur ?",
      choices: [
        "Un ton de compromis opérationnel.",
        "Un ton ironique et distant.",
        "Un ton polémique.",
        "Un ton purement émotionnel."
      ],
      correctIndex: 0,
      explanation: "Le modérateur reformule pour dégager un compromis praticable.",
      mistakeTag: "tone-missed",
      skillTag: "tone-analysis"
    },
    {
      id: createId("q", `${template.id}-${topic.id}-5`),
      prompt: "Quelle décision finale correspond le mieux à la synthèse ?",
      choices: [
        "Généraliser immédiatement la proposition.",
        "Refuser toute mesure sans nouvelle étude.",
        "Tester, publier les critères puis ajuster avant d'étendre.",
        "Transférer la responsabilité à un acteur extérieur."
      ],
      correctIndex: 2,
      explanation: "La synthèse défend une expérimentation suivie d'ajustements.",
      mistakeTag: "compromise-missed",
      skillTag: "task-completion"
    }
  ];

  const family = pickOne(template.variationFamilies, random);
  const fingerprint = createFingerprint([
    template.id,
    template.cooldownFamily,
    topic.id,
    family,
    slugify(friction)
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
      "Dans un forum DELF, repère d'abord qui propose, qui nuance et qui tranche.",
      "La bonne réponse est souvent un compromis, pas une position extrême."
    ],
    answerKey: questionPack(questions),
    content: {
      formatLabel: template.format,
      examFocus: "Voix multiples, réserve implicite, compromis final et fonction de la synthèse.",
      headline: "Forum croisé : comment décider sans répéter les mêmes erreurs",
      kicker: topic.label,
      passage,
      strategy: [
        "Attribue une étiquette mentale à chaque voix : proposition, soutien, réserve, arbitrage.",
        "Cherche ce qui est partagé par plusieurs voix, même si leur ton diffère.",
        "Méfie-toi des réponses trop radicales : la synthèse B2 préfère souvent l'ajustement."
      ],
      questions
    }
  };
}

function composeReadingAnalysisTask(
  template: TaskTemplate,
  topic: (typeof topicSeeds)[number],
  random: () => number
): TaskVariant {
  const claim = pickOne(topic.claims, random);
  const counterpoint = pickOne(topic.counterpoints, random);
  const context = pickOne(topic.contexts, random);
  const friction = pickOne(topic.frictionPoints, random);
  const vocabulary = sampleWithoutReplacement(topic.vocabulary, 3, random);

  const passage = [
    `Un dossier consacré à ${context} part du constat suivant : ${safeSplitClaim(claim)}. L'auteur précise toutefois que la difficulté n'est pas seulement idéologique. Elle tient souvent à ${friction}, c'est-à-dire à la distance entre le principe affiché et la façon dont les personnes vivent concrètement la mesure.`,
    `Le texte analyse ensuite plusieurs situations où une mesure pourtant pertinente a été mal reçue. Dans chaque cas, l'absence de critères visibles a brouillé la perception des bénéfices. À l'inverse, lorsque le dispositif était expliqué avec des objectifs simples et des points d'étape publics, la discussion devenait plus sereine.`,
    `L'auteur garde néanmoins une réserve nette : ${counterpoint}. La recommandation finale n'est donc pas de multiplier les annonces, mais de choisir peu d'objectifs, de montrer comment ils seront suivis et d'accepter une phase d'ajustement avant toute extension du dispositif.`
  ];

  const questions: ObjectiveQuestion[] = [
    {
      id: createId("q", `${template.id}-${topic.id}-1`),
      prompt: "Quel diagnostic principal le texte propose-t-il ?",
      choices: [
        "Le problème vient d'abord d'un rejet idéologique.",
        "La difficulté vient surtout de l'écart entre principe et expérience concrète.",
        "Le public manque toujours d'informations chiffrées très complexes.",
        "Les experts refusent toute phase d'ajustement."
      ],
      correctIndex: 1,
      explanation: "Le premier paragraphe insiste sur la distance entre principe et vécu concret.",
      mistakeTag: "diagnosis-missed",
      skillTag: "detail-discrimination"
    },
    {
      id: createId("q", `${template.id}-${topic.id}-2`),
      prompt: "Pourquoi l'auteur évoque-t-il plusieurs situations dans le deuxième paragraphe ?",
      choices: [
        "Pour donner des preuves comparables à son analyse.",
        "Pour détourner l'attention de sa thèse principale.",
        "Pour raconter l'histoire complète du sujet.",
        "Pour montrer que tous les contextes se ressemblent parfaitement."
      ],
      correctIndex: 0,
      explanation: "Ces situations servent de matériau d'analyse, pas d'anecdotes gratuites.",
      mistakeTag: "evidence-function-slip",
      skillTag: "evidence-matching"
    },
    {
      id: createId("q", `${template.id}-${topic.id}-3`),
      prompt: "Quelle réserve l'auteur maintient-il ?",
      choices: [
        `Il rappelle que ${counterpoint}.`,
        "Il affirme que toute phase d'essai est inutile.",
        "Il annonce que la solution fonctionne partout immédiatement.",
        "Il refuse toute explication au public."
      ],
      correctIndex: 0,
      explanation: "Le dernier paragraphe introduit explicitement cette réserve.",
      mistakeTag: "nuance-missed",
      skillTag: "tone-analysis"
    },
    {
      id: createId("q", `${template.id}-${topic.id}-4`),
      prompt: "Quelle est la recommandation finale du texte ?",
      choices: [
        "Multiplier les annonces pour occuper le débat public.",
        "Choisir peu d'objectifs, les suivre clairement et accepter un ajustement.",
        "Attendre une solution parfaite avant toute action.",
        "Confier la décision à un acteur extérieur au contexte."
      ],
      correctIndex: 1,
      explanation: "La conclusion retient une logique de clarté, de suivi et d'ajustement.",
      mistakeTag: "recommendation-missed",
      skillTag: "evidence-matching"
    },
    {
      id: createId("q", `${template.id}-${topic.id}-5`),
      prompt: "Quel trio lexical résume le mieux le raisonnement ?",
      choices: [
        vocabulary.join(", "),
        "hasard, nostalgie, détour",
        "colère, rupture, sanction",
        "distance, vitesse, frontière"
      ],
      correctIndex: 0,
      explanation: "Le vocabulaire retenu renvoie au cœur argumentatif du dossier.",
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
    slugify(claim)
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
    difficulty: 4,
    estimatedMinutes: template.estimatedMinutes,
    scoringMethod: template.scoringMethod,
    coachHints: [
      "Sépare bien diagnostic, preuve et recommandation finale.",
      "Au DELF B2, un texte analytique garde souvent une réserve avant de conclure."
    ],
    answerKey: questionPack(questions),
    content: {
      formatLabel: template.format,
      examFocus: "Diagnostic, exemples comparables, réserve et recommandation stratégique.",
      headline: "Rendre une décision crédible sans la rendre rigide",
      kicker: topic.label,
      passage,
      strategy: [
        "Note à part la thèse, puis la réserve, puis la recommandation.",
        "Ne confonds pas un exemple de cas avec l'idée générale du texte.",
        "Surveille les adverbes de nuance : toutefois, néanmoins, pourtant."
      ],
      questions
    }
  };
}

function composeReadingTask(
  template: TaskTemplate,
  topic: (typeof topicSeeds)[number],
  random: () => number
): TaskVariant {
  if (template.id === "read-notice") {
    return composeReadingForumTask(template, topic, random);
  }

  if (template.id === "read-analysis") {
    return composeReadingAnalysisTask(template, topic, random);
  }

  return composeReadingEditorialTask(template, topic, random);
}

function buildWritingIntro(templateId: string, claim: string) {
  if (templateId === "write-letter") {
    return `Madame, Monsieur, dans de nombreux contextes, on entend aujourd'hui que ${safeSplitClaim(claim)}. À mes yeux, cette idée mérite d'être défendue, à condition d'être mise en œuvre avec méthode et lisibilité.`;
  }

  if (templateId === "write-article") {
    return `On présente souvent l'idée suivante comme une évidence : ${safeSplitClaim(claim)}. Pourtant, le vrai débat ne porte pas seulement sur le principe, mais sur la manière d'en faire une mesure concrète, crédible et utile.`;
  }

  return `Je voudrais réagir à cette affirmation souvent reprise dans les échanges récents : ${safeSplitClaim(claim)}. Pour ma part, je pense qu'elle va dans la bonne direction, mais seulement si l'on fixe des règles claires et des objectifs visibles.`;
}

function buildWritingModelAnswer(
  template: TaskTemplate,
  topic: (typeof topicSeeds)[number],
  context: string,
  audience: string,
  claim: string,
  counterpoint: string,
  friction: string,
  vocabulary: string[]
) {
  const title =
    template.id === "write-letter"
      ? "Modèle haut niveau : lettre argumentative"
      : template.id === "write-article"
        ? "Modèle haut niveau : article d'opinion"
        : "Modèle haut niveau : contribution structurée";

  const paragraphs = [
    buildWritingIntro(template.id, claim),
    `D'abord, une décision devient plus acceptable lorsqu'elle rend visibles ses critères. Dans ${context}, cela signifie expliquer à ${audience} ce qui sera vraiment évalué, comment le suivi sera organisé et pourquoi certaines priorités ont été retenues. Cette clarté réduit la méfiance et transforme la discussion en débat de fond plutôt qu'en simple réaction d'humeur.`,
    `Ensuite, une mesure utile doit améliorer concrètement l'expérience vécue. Si l'on veut progresser sur ce thème, il faut relier les principes à des gestes simples : mieux partager l'information, prévoir un calendrier réaliste et montrer des résultats observables. Autrement dit, le vocabulaire de ${vocabulary.join(", ")} doit sortir du discours abstrait pour entrer dans des habitudes régulières.`,
    `Certes, on peut objecter que ${counterpoint}. Cette réserve est sérieuse et elle ne doit pas être écartée trop vite. Cependant, elle ne justifie pas l'immobilisme. Au contraire, elle montre qu'il faut agir avec prudence : expérimenter, évaluer, corriger, puis seulement généraliser ce qui s'avère réellement convaincant.`,
    `En conclusion, je suis donc favorable à cette orientation, à condition qu'elle traite vraiment ${friction}. Une bonne réponse ne consiste pas à promettre une transformation spectaculaire, mais à proposer une méthode lisible, suivie et ajustable. C'est ainsi, me semble-t-il, qu'on peut convaincre durablement sans forcer l'adhésion.`
  ];

  if (template.id === "write-letter") {
    paragraphs.push("Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.");
  }

  return {
    title,
    paragraphs,
    whyItScores: [
      "La position est annoncée dès l'ouverture et reste stable jusqu'à la conclusion.",
      "Deux arguments distincts sont développés avec logique et exemples plausibles.",
      "La concession est réelle, puis dépassée par une réponse nuancée.",
      "La conclusion propose une action concrète au lieu d'un slogan abstrait."
    ]
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
  const friction = pickOne(topic.frictionPoints, random);
  const vocabulary = sampleWithoutReplacement(topic.vocabulary, 3, random);
  const family = pickOne(template.variationFamilies, random);
  const fingerprint = createFingerprint([
    template.id,
    template.cooldownFamily,
    topic.id,
    family,
    slugify(claim)
  ]);

  const targetLabel =
    template.id === "write-letter"
      ? `Tu écris une lettre ouverte liée à ${context}.`
      : template.id === "write-article"
        ? `Tu rédiges un article court pour un support lié à ${context}.`
        : `Tu postes une contribution argumentée sur un espace lié à ${context}.`;

  const modelAnswer = buildWritingModelAnswer(
    template,
    topic,
    context,
    audience,
    claim,
    counterpoint,
    friction,
    vocabulary
  );

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
      "Annonce ta position dans les deux premières phrases.",
      "Garde une vraie concession avant de finir sur une proposition concrète."
    ],
    content: {
      formatLabel: template.format,
      examFocus: "Thèse nette, deux arguments, concession crédible et proposition finale.",
      brief: `${targetLabel} Ton texte s'adresse à ${audience}. Tu réagis à l'idée suivante : « ${claim} ». Prends position, développe au moins deux arguments, réponds à une objection possible (${counterpoint}) et termine par une recommandation concrète.`,
      constraints: [
        "250 mots minimum.",
        "Le registre doit rester clair, structuré et adapté à un lecteur inconnu.",
        "Insère une concession, puis une recommandation finale.",
        "Évite les slogans vagues : privilégie un exemple plausible."
      ],
      checklist: [
        "Position annoncée dès l'introduction.",
        "Deux arguments différents, chacun illustré.",
        "Une objection traitée, pas seulement mentionnée.",
        "Une conclusion qui ouvre sur une action ou une condition."
      ],
      targetWords: 250,
      outline: [
        "Introduction : reformuler le thème et annoncer clairement ta position.",
        "Argument 1 : montrer un bénéfice concret avec un exemple crédible.",
        "Argument 2 : ajouter un critère de méthode, d'équité ou d'efficacité.",
        "Concession : reconnaître une objection, puis la recadrer.",
        "Conclusion : proposer une mesure réaliste ou une condition de réussite."
      ],
      modelMoves: [
        "D'abord situer le problème, puis prendre position sans détour.",
        "Nuancer avec « certes », « cependant », « en revanche », « à condition que ».",
        "Conclure avec une mesure réaliste au lieu d'une formule générale."
      ],
      modelAnswer
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
            explanation: "Après « si » à l'imparfait, la conséquence se met au conditionnel présent.",
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
            prompt: `Réécris l'idée en version plus nuancée : « Cette solution résout tout. »`,
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

  const fingerprint = createFingerprint([template.id, template.cooldownFamily, topic.id, focus]);

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

function buildCandidateTask(
  section: ExamSection,
  template: TaskTemplate,
  topic: (typeof topicSeeds)[number],
  random: () => number,
  preferredSkill?: SkillTag
) {
  if (section === "listening") return composeListeningTask(template, topic, random);
  if (section === "reading") return composeReadingTask(template, topic, random);
  if (section === "grammar") return composeGrammarTask(template, topic, random, preferredSkill);
  if (section === "writing") return composeWritingTask(template, topic, random);
  return composeSpeakingTask(template, topic, random);
}

export function generateTaskVariant(options: {
  section: ExamSection;
  attempts: Attempt[];
  seedKey: string;
  preferredSkill?: SkillTag;
}): { task: TaskVariant; telemetry: TelemetryEvent[] } {
  const profile = computeWeaknessProfile(options.attempts);
  const recentFingerprints = new Set(options.attempts.slice(-16).map((attempt) => attempt.taskFingerprint));

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
    candidate = buildCandidateTask(options.section, template, topic, random, options.preferredSkill);
    rerollCount += 1;
  } while (recentFingerprints.has(candidate.fingerprint) && rerollCount < 8);

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

  return [...grammarTags].sort((left, right) => profile.skillScores[left] - profile.skillScores[right])[0];
}

function createShadowAttempt(task: TaskVariant, index: number): Attempt {
  return {
    id: `shadow-${task.id}-${index}`,
    taskId: task.id,
    taskFingerprint: task.fingerprint,
    section: task.section,
    templateId: task.templateId,
    topicId: task.topicId,
    topicLabel: task.topicLabel,
    timestamp: new Date().toISOString(),
    score: 50,
    skillTags: task.skillTags,
    mistakeTags: [],
    responseSummary: "Shadow practice attempt"
  };
}

export function generateSectionPracticePack(options: {
  section: Extract<ExamSection, "listening" | "reading" | "writing" | "speaking">;
  attempts: Attempt[];
  dateKey: string;
  variantSeed?: string;
  count?: number;
}): { tasks: TaskVariant[]; telemetry: TelemetryEvent[] } {
  const count =
    options.count ??
    (options.section === "reading" || options.section === "writing" ? 3 : 2);
  const tasks: TaskVariant[] = [];
  const telemetry: TelemetryEvent[] = [];
  let shadowAttempts = [...options.attempts];
  const seen = new Set<string>();
  const seedBase = options.variantSeed ?? options.dateKey;

  for (let index = 0; index < count; index += 1) {
    let attempt = 0;
    let generated: { task: TaskVariant; telemetry: TelemetryEvent[] } | null = null;

    do {
      generated = generateTaskVariant({
        section: options.section,
        attempts: shadowAttempts,
        seedKey: `${seedBase}-${options.section}-${index}-${attempt}`
      });
      attempt += 1;
    } while (generated && seen.has(generated.task.fingerprint) && attempt < 8);

    if (!generated) {
      continue;
    }

    tasks.push(generated.task);
    telemetry.push(...generated.telemetry);
    seen.add(generated.task.fingerprint);
    shadowAttempts = [...shadowAttempts, createShadowAttempt(generated.task, index)];
  }

  return { tasks, telemetry };
}

export function generateSectionPractice(
  attempts: Attempt[],
  dateKey: string,
  variantSeed = dateKey
): { packs: SectionPracticePacks; telemetry: TelemetryEvent[] } {
  const reading = generateSectionPracticePack({
    section: "reading",
    attempts,
    dateKey,
    variantSeed: `${variantSeed}-reading`,
    count: 3
  });
  const writing = generateSectionPracticePack({
    section: "writing",
    attempts: [...attempts, ...reading.tasks.map((task, index) => createShadowAttempt(task, index))],
    dateKey,
    variantSeed: `${variantSeed}-writing`,
    count: 3
  });
  const listening = generateSectionPracticePack({
    section: "listening",
    attempts,
    dateKey,
    variantSeed: `${variantSeed}-listening`,
    count: 2
  });
  const speaking = generateSectionPracticePack({
    section: "speaking",
    attempts,
    dateKey,
    variantSeed: `${variantSeed}-speaking`,
    count: 2
  });

  return {
    packs: {
      listening: listening.tasks,
      reading: reading.tasks,
      writing: writing.tasks,
      speaking: speaking.tasks
    },
    telemetry: [...reading.telemetry, ...writing.telemetry, ...listening.telemetry, ...speaking.telemetry]
  };
}

export function generateTodayBundle(
  attempts: Attempt[],
  dateKey: string,
  variantSeed = dateKey
): { bundle: TodayBundle; telemetry: TelemetryEvent[] } {
  const profile = computeWeaknessProfile(attempts);
  const comprehension = generateTaskVariant({
    section: "reading",
    attempts,
    seedKey: `${variantSeed}-today-reading`
  });
  const grammar = generateTaskVariant({
    section: "grammar",
    attempts,
    seedKey: `${variantSeed}-today-grammar`,
    preferredSkill: pickGrammarFocus(profile)
  });
  const productive = generateTaskVariant({
    section: "writing",
    attempts,
    seedKey: `${variantSeed}-today-writing`
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

export function generateMockExam(
  attempts: Attempt[],
  dateKey: string,
  variantSeed = dateKey
): { session: MockExamSession; telemetry: TelemetryEvent[] } {
  const sessionTasks = officialSections.map((section, index) =>
    generateTaskVariant({
      section,
      attempts,
      seedKey: `${variantSeed}-mock-${section}-${index}`
    })
  );

  return {
    session: {
      id: createId("mock", `${dateKey}-${variantSeed}`),
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

  const questions = task.section === "grammar" ? task.content.items : task.content.questions;
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
  const topMistake = profile.recurringMistakes[0];

  return {
    headline: "Lecture et écriture en priorité aujourd'hui",
    recap: topMistake
      ? `Ton signal le plus coûteux reste "${topMistake.tag}". On garde donc une lecture DELF ciblée, une réparation grammaticale utile et une production écrite structurée.`
      : "On privilégie aujourd'hui la compréhension écrite, la correction utile et une production écrite ambitieuse.",
    tasks: [
      {
        section: bundle.comprehension.section,
        title: bundle.comprehension.title,
        reason: "Travailler les types de questions les plus probables : thèse, ton, preuve et recommandation."
      },
      {
        section: bundle.grammar.section,
        title: bundle.grammar.title,
        reason: "Stabiliser les connecteurs et les nuances qui font monter la note."
      },
      {
        section: bundle.productive.section,
        title: bundle.productive.title,
        reason: "Ancrer une copie argumentative proche d'un niveau très solide."
      }
    ],
    nextMock:
      attempts.length < 6
        ? "Après deux autres séances, lance un mini-mock écrit pour mesurer la stabilité."
        : "Cette semaine, fais un mock complet pour vérifier l'endurance et la gestion du temps."
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
