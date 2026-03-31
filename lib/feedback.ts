import {
  FeedbackReport,
  Rubric,
  RubricScore,
  SkillTag,
  TaskVariant
} from "@/lib/types";

const connectors = [
  "cependant",
  "pourtant",
  "en revanche",
  "d'abord",
  "ensuite",
  "par ailleurs",
  "en outre",
  "certes",
  "donc",
  "ainsi",
  "en conclusion",
  "à condition que"
];

const formalMarkers = [
  "il faudrait",
  "il convient",
  "il me semble",
  "dans cette perspective",
  "par conséquent",
  "afin de"
];

const informalMarkers = ["trop cool", "super", "génial", "franchement", "grave"];

const topicalTokens = [
  "source",
  "fiabilité",
  "coordination",
  "évaluation",
  "mobilité",
  "participation",
  "prévention",
  "médiation",
  "usage",
  "priorité"
];

const positionMarkers = [
  "à mon avis",
  "à mon sens",
  "selon moi",
  "je pense",
  "je crois",
  "il me semble",
  "je suis favorable",
  "je suis opposé",
  "je souhaite",
  "je voudrais"
];

const exampleMarkers = ["par exemple", "notamment", "en effet", "comme le montre", "c'est le cas", "ainsi"];

const casualRegisterMarkers = ["salut", "coucou", "hello", "lol", "mdr", "franchement", "grave", "super"];

const farewellMarkers = [
  "je vous prie d'agreer",
  "je vous prie d’agréer",
  "veuillez agreer",
  "veuillez agréer",
  "salutations distinguees",
  "salutations distinguées",
  "cordialement"
];

const commonFrenchWords = new Set([
  "à",
  "afin",
  "ainsi",
  "alors",
  "au",
  "aucun",
  "aussi",
  "autre",
  "aux",
  "avec",
  "avoir",
  "bien",
  "car",
  "ce",
  "cela",
  "celle",
  "celles",
  "celui",
  "cependant",
  "ces",
  "cet",
  "cette",
  "chaque",
  "comme",
  "comment",
  "contre",
  "d'abord",
  "dans",
  "de",
  "des",
  "doit",
  "donc",
  "du",
  "elle",
  "elles",
  "en",
  "encore",
  "entre",
  "est",
  "et",
  "être",
  "faudrait",
  "faut",
  "grâce",
  "il",
  "ils",
  "je",
  "la",
  "le",
  "les",
  "leur",
  "leurs",
  "lorsque",
  "mais",
  "me",
  "même",
  "mon",
  "ne",
  "nous",
  "notre",
  "on",
  "ou",
  "où",
  "par",
  "parce",
  "pas",
  "peut",
  "plus",
  "pour",
  "pourtant",
  "qu'",
  "que",
  "qui",
  "sa",
  "sans",
  "se",
  "selon",
  "ses",
  "si",
  "son",
  "sont",
  "sur",
  "tandis",
  "te",
  "tout",
  "tous",
  "très",
  "un",
  "une",
  "vers",
  "votre",
  "vous"
]);

const promptGenericWords = new Set([
  "argument",
  "arguments",
  "article",
  "condition",
  "conclusion",
  "contribution",
  "concrete",
  "concrète",
  "debat",
  "débat",
  "destinataire",
  "developpe",
  "développe",
  "developpes",
  "développes",
  "donne",
  "donnes",
  "ecris",
  "écris",
  "forum",
  "lettre",
  "minimum",
  "objectif",
  "objection",
  "opinion",
  "position",
  "prendre",
  "propose",
  "proposition",
  "question",
  "reagis",
  "réagis",
  "reagir",
  "réagir",
  "realisme",
  "réalisme",
  "realiste",
  "réaliste",
  "reponse",
  "réponse",
  "sujet",
  "termes",
  "theme",
  "thème",
  "traiter"
]);

function normalizeToken(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z'-]+/g, "")
    .replace(/^['-]+|['-]+$/g, "")
    .trim();
}

function tokenizeForMatch(text: string) {
  return (text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .match(/[a-z'-]+/g) ?? [])
    .map((token) => normalizeToken(token))
    .filter(Boolean);
}

const normalizedCommonFrenchWords = new Set(Array.from(commonFrenchWords).map((word) => normalizeToken(word)));
const promptStopwords = new Set([
  ...Array.from(normalizedCommonFrenchWords),
  ...Array.from(promptGenericWords).map((word) => normalizeToken(word))
]);

function roughlyMatchesKeyword(keyword: string, token: string) {
  if (keyword === token) {
    return true;
  }

  if (keyword.length < 5 || token.length < 5) {
    return false;
  }

  return keyword.startsWith(token) || token.startsWith(keyword);
}

function extractPromptKeywords(task: Extract<TaskVariant, { section: "writing" }>) {
  const pool = [
    task.title,
    task.subtitle,
    task.topicLabel,
    task.content.brief,
    ...task.content.outline
  ].join(" ");

  const frequencies = new Map<string, number>();
  tokenizeForMatch(pool).forEach((token) => {
    if (token.length < 5 || promptStopwords.has(token)) {
      return;
    }

    frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
  });

  return Array.from(frequencies.entries())
    .sort((left, right) => right[1] - left[1] || right[0].length - left[0].length)
    .slice(0, 10)
    .map(([token]) => token);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function analyzeText(text: string) {
  const normalized = text.toLowerCase();
  const words = (normalized.match(/[a-zàâçéèêëîïôûùüÿæœ'-]+/gi) ?? [])
    .map((word) => word.replace(/^['-]+|['-]+$/g, "").trim())
    .filter(Boolean);
  const uniqueWords = new Set(words);
  const contentWords = words.filter((word) => word.length >= 5);
  const uniqueContentWords = new Set(contentWords);
  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const sentences = text
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const connectorHits = connectors.filter((connector) => normalized.includes(connector));
  const formalHits = formalMarkers.filter((marker) => normalized.includes(marker));
  const informalHits = informalMarkers.filter((marker) => normalized.includes(marker));
  const topicalHits = topicalTokens.filter((token) => normalized.includes(token));
  const commonWordHits = words.filter((word) => commonFrenchWords.has(word)).length;
  const punctuationMarks = (text.match(/[.!?;:]/g) ?? []).length;
  const sentenceWordAverage = words.length / Math.max(sentences.length, 1);
  const completionRatio = words.length / 250;
  const frenchSignalCount =
    commonWordHits + connectorHits.length * 2 + formalHits.length * 2 + topicalHits.length * 2;
  const likelyGibberish =
    words.length > 0 &&
    frenchSignalCount === 0 &&
    words.length < 80 &&
    connectorHits.length === 0 &&
    topicalHits.length === 0;
  const tooShortForReliableScoring = words.length < 40;

  return {
    wordCount: words.length,
    uniqueRatio: words.length === 0 ? 0 : uniqueWords.size / words.length,
    contentUniqueRatio: contentWords.length === 0 ? 0 : uniqueContentWords.size / contentWords.length,
    paragraphs,
    words,
    paragraphCount: paragraphs.length,
    sentenceCount: sentences.length,
    connectorHits,
    formalHits,
    informalHits,
    topicalHits,
    commonWordHits,
    commonWordRatio: words.length === 0 ? 0 : commonWordHits / words.length,
    punctuationMarks,
    sentenceWordAverage,
    completionRatio,
    likelyGibberish,
    tooShortForReliableScoring,
    hasConclusion:
      normalized.includes("en conclusion") ||
      normalized.includes("pour conclure") ||
      normalized.includes("en somme"),
    hasConcession:
      normalized.includes("certes") ||
      normalized.includes("même si") ||
      normalized.includes("bien que"),
    questionCount: (text.match(/\?/g) ?? []).length
  };
}

function analyzeWritingFit(task: Extract<TaskVariant, { section: "writing" }>, text: string) {
  const metrics = analyzeText(text);
  const normalizedText = tokenizeForMatch(text).join(" ");
  const promptKeywords = extractPromptKeywords(task);
  const matchedKeywords = promptKeywords.filter((keyword) =>
    metrics.words.some((word) => roughlyMatchesKeyword(normalizeToken(keyword), normalizeToken(word)))
  );
  const topicCoverage = promptKeywords.length === 0 ? 0.5 : matchedKeywords.length / promptKeywords.length;
  const letterExpected = normalizeToken(task.content.formatLabel).includes("lettre");
  const hasGreeting = /(?:^|\n)\s*(madame|monsieur)\b/i.test(text);
  const introParagraphIndex =
    letterExpected && hasGreeting && tokenizeForMatch(metrics.paragraphs[0] ?? "").length <= 4 ? 1 : 0;
  const firstParagraph = metrics.paragraphs[introParagraphIndex] ?? "";
  const firstParagraphWords = tokenizeForMatch(firstParagraph).length;
  const bodyParagraphCount = Math.max(
    metrics.paragraphCount - (introParagraphIndex + 1) - (metrics.hasConclusion && metrics.paragraphCount > 1 ? 1 : 0),
    0
  );
  const hasFarewell = farewellMarkers.some((marker) => normalizedText.includes(normalizeToken(marker)));
  const hasPosition = positionMarkers.some((marker) => normalizedText.includes(normalizeToken(marker)));
  const exampleHits = exampleMarkers.filter((marker) => normalizedText.includes(normalizeToken(marker)));
  const hasIntroduction = firstParagraphWords >= 12 && (hasPosition || metrics.sentenceCount >= 3);
  const hasDevelopment = bodyParagraphCount >= 1 || (metrics.sentenceCount >= 4 && metrics.wordCount >= 80);
  const articleOrForumExpected =
    normalizeToken(task.content.formatLabel).includes("article") ||
    normalizeToken(task.content.formatLabel).includes("forum");
  const casualHits = casualRegisterMarkers.filter((marker) =>
    normalizedText.includes(normalizeToken(marker))
  );
  const exclamationCount = (text.match(/!/g) ?? []).length;

  const structureCoverage =
    [hasIntroduction, hasDevelopment, metrics.hasConcession, metrics.hasConclusion].filter(Boolean).length / 4;

  let formatAdequacy = 0.65;
  if (letterExpected) {
    formatAdequacy = clamp(
      (hasGreeting ? 0.38 : 0) +
        (hasFarewell ? 0.32 : 0) +
        (metrics.formalHits.length > 0 || hasPosition ? 0.18 : 0) +
        (casualHits.length === 0 ? 0.12 : 0),
      0,
      1
    );
  } else if (articleOrForumExpected) {
    formatAdequacy = clamp(
      0.42 +
        (hasPosition ? 0.16 : 0) +
        (exampleHits.length > 0 ? 0.12 : 0) +
        (metrics.informalHits.length === 0 ? 0.15 : -0.12) +
        (casualHits.length === 0 ? 0.1 : -0.12),
      0,
      1
    );
  }

  const registerAdequacy = clamp(
    0.34 +
      Math.min(metrics.formalHits.length, 2) * 0.12 +
      (metrics.informalHits.length === 0 ? 0.12 : -0.14 * metrics.informalHits.length) +
      (casualHits.length === 0 ? 0.18 : -0.18 * casualHits.length) +
      (exclamationCount === 0 ? 0.08 : exclamationCount > 2 ? -0.08 : 0) +
      (letterExpected && hasGreeting && hasFarewell ? 0.16 : 0),
    0,
    1
  );

  return {
    ...metrics,
    promptKeywords,
    matchedKeywords,
    topicCoverage,
    hasGreeting,
    hasFarewell,
    hasPosition,
    exampleHits,
    hasIntroduction,
    hasDevelopment,
    letterExpected,
    articleOrForumExpected,
    casualHits,
    exclamationCount,
    structureCoverage,
    formatAdequacy,
    registerAdequacy
  };
}

function scoreWritingRubric(task: Extract<TaskVariant, { section: "writing" }>, text: string): RubricScore[] {
  const rubric = task.rubric;
  if (!rubric) {
    throw new Error("Writing task is missing its rubric.");
  }

  const targetWords = task.content.targetWords;
  const metrics = analyzeWritingFit(task, text);
  const completionRatio = metrics.wordCount / targetWords;
  const offTopicCap =
    metrics.topicCoverage === 0 ? 24 : metrics.topicCoverage < 0.2 ? 38 : metrics.topicCoverage < 0.35 ? 56 : 100;
  const structureCap =
    metrics.structureCoverage < 0.26 ? 34 : metrics.structureCoverage < 0.51 ? 56 : 100;
  const registerCap =
    metrics.registerAdequacy < 0.25 ? 34 : metrics.registerAdequacy < 0.5 ? 54 : 100;
  const shortCap = metrics.likelyGibberish
    ? 10
    : metrics.wordCount < 15
      ? 14
      : metrics.wordCount < 40
        ? 30
        : metrics.wordCount < 90
          ? 62
          : 100;

  const taskBase =
    6 +
    completionRatio * 44 +
    metrics.topicCoverage * 28 +
    metrics.formatAdequacy * 12 +
    (metrics.hasPosition ? 8 : 0);
  const argumentBase =
    10 +
    Math.min(metrics.sentenceCount, 9) * 3 +
    Math.min(metrics.connectorHits.length, 5) * 6 +
    (metrics.hasConcession ? 12 : 0) +
    (metrics.exampleHits.length > 0 ? 10 : 0) +
    (metrics.hasPosition ? 8 : 0) +
    metrics.topicCoverage * 12;
  const coherenceBase =
    10 +
    (metrics.hasIntroduction ? 12 : 0) +
    (metrics.hasDevelopment ? 18 : 0) +
    (metrics.hasConclusion ? 14 : 0) +
    Math.min(metrics.paragraphCount, 4) * 8 +
    Math.min(metrics.connectorHits.length, 5) * 4;
  const lexiconBase =
    10 +
    metrics.contentUniqueRatio * 24 +
    metrics.topicCoverage * 18 +
    metrics.matchedKeywords.length * 4 +
    Math.min(metrics.commonWordRatio * 18, 14) +
    metrics.formalHits.length * 3;
  const accuracyBase =
    12 +
    Math.min(metrics.sentenceCount, 8) * 3 +
    Math.min(metrics.commonWordRatio * 26, 18) +
    metrics.registerAdequacy * 22 +
    Math.min(metrics.punctuationMarks, 8) * 1.5 -
    metrics.informalHits.length * 10 -
    metrics.casualHits.length * 10 -
    (metrics.exclamationCount > 2 ? 8 : 0);

  const scores: Record<string, number> = {
    task: clamp(taskBase, 0, Math.min(shortCap, offTopicCap, metrics.letterExpected && metrics.formatAdequacy < 0.35 ? 48 : 100)),
    argument: clamp(argumentBase, 0, Math.min(shortCap, offTopicCap + 10, structureCap, 98)),
    coherence: clamp(coherenceBase, 0, Math.min(shortCap, structureCap, 95)),
    lexicon: clamp(lexiconBase, 0, Math.min(shortCap, offTopicCap === 24 ? 44 : offTopicCap + 20, 96)),
    accuracy: clamp(accuracyBase, 0, Math.min(shortCap, registerCap, 92))
  };

  return rubric.categories.map((category) => ({
    id: category.id,
    label: category.label,
    score: Math.round(scores[category.id] ?? 50),
    reason:
      category.id === "task"
        ? `${metrics.wordCount} mots sur ${targetWords}+ ; thème repris par ${metrics.matchedKeywords.length}/${Math.max(
            metrics.promptKeywords.length,
            1
          )} repères${metrics.tooShortForReliableScoring ? " ; texte encore trop bref." : "."}`
        : category.id === "argument"
          ? metrics.likelyGibberish
            ? "Texte non exploitable pour juger une vraie argumentation."
            : `${metrics.connectorHits.length} connecteurs, ${
                metrics.exampleHits.length > 0 ? "au moins un exemple visible" : "peu d'exemples visibles"
              } et ${metrics.hasConcession ? "une concession repérée" : "pas encore de concession nette"}.`
          : category.id === "coherence"
            ? `${metrics.hasIntroduction ? "introduction présente" : "introduction peu visible"}, ${
                metrics.hasDevelopment ? "développement présent" : "développement insuffisant"
              } et ${metrics.hasConclusion ? "conclusion présente" : "conclusion absente"}.`
            : category.id === "lexicon"
              ? metrics.likelyGibberish
                ? "Le texte contient trop peu de français exploitable pour juger le lexique."
                : `${metrics.matchedKeywords.length} repères de thème retrouvés${
                    metrics.matchedKeywords.length > 0 ? ` (${metrics.matchedKeywords.slice(0, 3).join(", ")})` : ""
                  } et ${Math.round(metrics.contentUniqueRatio * 100)} % de variété sur les mots porteurs.`
              : `${
                  metrics.letterExpected
                    ? metrics.hasGreeting && metrics.hasFarewell
                      ? "Cadre de lettre bien tenu"
                      : "Cadre de lettre encore incomplet"
                    : metrics.registerAdequacy >= 0.6
                      ? "Registre globalement adapté"
                      : "Registre encore trop relâché"
                }${metrics.casualHits.length > 0 ? ` ; marqueurs trop familiers : ${metrics.casualHits.join(", ")}` : ""}.`
  }));
}

function scoreSpeakingRubric(rubric: Rubric, text: string): RubricScore[] {
  const metrics = analyzeText(text);

  const scores: Record<string, number> = {
    task: clamp((metrics.wordCount / 150) * 100, 18, 100),
    structure: clamp(
      28 +
        metrics.connectorHits.length * 9 +
        (metrics.hasConclusion ? 12 : 0),
      20,
      95
    ),
    interaction: clamp(
      30 +
        metrics.questionCount * 10 +
        (metrics.hasConcession ? 10 : 0),
      20,
      90
    ),
    lexicon: clamp(34 + metrics.uniqueRatio * 82 + metrics.topicalHits.length * 6, 20, 95),
    control: clamp(40 + Math.min(metrics.sentenceCount, 10) * 4, 20, 92)
  };

  return rubric.categories.map((category) => ({
    id: category.id,
    label: category.label,
    score: Math.round(scores[category.id] ?? 50),
    reason:
      category.id === "interaction"
        ? `${metrics.questionCount} relances ou questions visibles et ${
            metrics.hasConcession ? "une concession utile" : "peu de négociation explicite"
          }.`
        : category.id === "structure"
          ? `${metrics.connectorHits.length} marqueurs de structure et ${
              metrics.hasConclusion ? "une clôture nette" : "une fin encore ouverte"
            }.`
          : category.id === "task"
            ? `${metrics.wordCount} mots transcrits pour une prise de parole suffisamment développée.`
            : category.id === "lexicon"
              ? `${metrics.topicalHits.length} mots de thème et une variété de ${Math.round(
                  metrics.uniqueRatio * 100
                )} %.`
              : "Le texte donne une image partielle de la fluidité ; réécoute l'audio pour valider l'aisance réelle."
  }));
}

function weightedAverage(scores: RubricScore[], rubric: Rubric) {
  return Math.round(
    scores.reduce((sum, score) => {
      const weight = rubric.categories.find((category) => category.id === score.id)?.weight ?? 0;
      return sum + score.score * weight;
    }, 0)
  );
}

function pickStrengths(scores: RubricScore[]): string[] {
  return [...scores]
    .sort((left, right) => right.score - left.score)
    .slice(0, 2)
    .map((score) => `${score.label} solide : ${score.reason}`);
}

function pickPriorities(scores: RubricScore[]): string[] {
  return [...scores]
    .sort((left, right) => left.score - right.score)
    .slice(0, 2)
    .map((score) => `${score.label} à remonter : ${score.reason}`);
}

function mapToDrills(scores: RubricScore[], section: "writing" | "speaking"): SkillTag[] {
  const weakest = [...scores].sort((left, right) => left.score - right.score)[0];
  const shared: Record<string, SkillTag[]> = {
    task: ["task-completion", "argument-structure"],
    argument: ["argument-structure", "connectors"],
    coherence: ["connectors", "argument-structure"],
    lexicon: ["formal-register"],
    accuracy: ["error-correction", "reported-speech"],
    structure: ["connectors", "opinion-defense"],
    interaction: ["oral-interaction", "opinion-defense"],
    control: ["error-correction", "connectors"]
  };

  return shared[weakest?.id ?? "task"] ?? (section === "writing" ? ["task-completion"] : ["opinion-defense"]);
}

export function evaluateProduction(task: TaskVariant, submission: string): FeedbackReport {
  if (task.section !== "writing" && task.section !== "speaking") {
    throw new Error("Production feedback only supports writing and speaking tasks.");
  }

  const rubric = task.rubric;
  if (!rubric) {
    throw new Error("Productive task is missing its rubric.");
  }

  const scores =
    task.section === "writing"
      ? scoreWritingRubric(task, submission)
      : scoreSpeakingRubric(rubric, submission);
  const score = weightedAverage(scores, rubric);
  const strengths = pickStrengths(scores);
  const priorities = pickPriorities(scores);
  const nextDrills = mapToDrills(scores, task.section);
  const criticalLow = scores.some((item) => item.score <= 12);

  return {
    summary:
      criticalLow && task.section === "writing"
        ? "Texte trop bref ou non exploitable : la base linguistique doit être reconstruite avant toute vraie notation B2."
        : score >= 80
        ? "Réponse convaincante et déjà proche d'une copie stable de préparation."
        : score >= 62
          ? "Base crédible, mais deux catégories limitent encore la constance B2."
          : "Le message passe, mais la structure et la précision doivent encore gagner en stabilité.",
    coachLabel: task.section === "writing" ? "Coach writing feedback" : "Coach speaking feedback",
    score,
    categoryScores: scores,
    strengths,
    priorities,
    nextDrills,
    caution:
      task.section === "speaking"
        ? "La prononciation réelle n'est pas évaluée automatiquement ici. Réécoute ton enregistrement pour vérifier débit, articulation et intonation."
        : "Ce score reste un repère de coach, pas une note officielle DELF."
  };
}
