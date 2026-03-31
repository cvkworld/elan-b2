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

function scoreWritingRubric(rubric: Rubric, text: string, targetWords = 250): RubricScore[] {
  const metrics = analyzeText(text);
  const completionRatio = metrics.wordCount / targetWords;
  const taskScore = clamp(completionRatio * 92, 0, 96);
  const argumentBase =
    6 +
    Math.min(metrics.sentenceCount, 8) * 4 +
    Math.min(metrics.connectorHits.length, 5) * 8 +
    (metrics.hasConcession ? 12 : 0) +
    (metrics.hasConclusion ? 10 : 0) +
    metrics.topicalHits.length * 5;
  const coherenceBase =
    8 +
    Math.min(metrics.paragraphCount, 4) * 16 +
    Math.min(metrics.sentenceCount, 8) * 3 +
    Math.min(metrics.connectorHits.length, 5) * 6 +
    (metrics.hasConclusion ? 4 : 0);
  const lexiconBase =
    8 +
    metrics.contentUniqueRatio * 34 +
    Math.min(metrics.commonWordRatio * 28, 18) +
    metrics.topicalHits.length * 6 +
    metrics.formalHits.length * 4;
  const accuracyBase =
    8 +
    Math.min(metrics.sentenceCount, 8) * 4 +
    Math.min(metrics.commonWordRatio * 42, 24) +
    Math.min(metrics.punctuationMarks, 8) * 2 +
    metrics.formalHits.length * 3 -
    metrics.informalHits.length * 12;

  const taskCap = metrics.likelyGibberish ? 6 : metrics.wordCount < 15 ? 10 : metrics.wordCount < 40 ? 22 : 100;
  const argumentCap = metrics.likelyGibberish ? 8 : metrics.wordCount < 15 ? 12 : metrics.wordCount < 40 ? 26 : metrics.wordCount < 90 ? 48 : 98;
  const coherenceCap = metrics.likelyGibberish ? 10 : metrics.wordCount < 15 ? 14 : metrics.wordCount < 40 ? 28 : metrics.wordCount < 90 ? 52 : 95;
  const lexiconCap = metrics.likelyGibberish ? 10 : metrics.wordCount < 15 ? 14 : metrics.wordCount < 40 ? 30 : metrics.wordCount < 90 ? 58 : 96;
  const accuracyCap = metrics.likelyGibberish ? 10 : metrics.wordCount < 15 ? 14 : metrics.wordCount < 40 ? 32 : metrics.wordCount < 90 ? 60 : 92;

  const scores: Record<string, number> = {
    task: clamp(taskScore, 0, taskCap),
    argument: clamp(argumentBase, 0, argumentCap),
    coherence: clamp(coherenceBase, 0, coherenceCap),
    lexicon: clamp(lexiconBase, 0, lexiconCap),
    accuracy: clamp(accuracyBase, 0, accuracyCap)
  };

  return rubric.categories.map((category) => ({
    id: category.id,
    label: category.label,
    score: Math.round(scores[category.id] ?? 50),
    reason:
      category.id === "task"
        ? `${metrics.wordCount} mots produits pour un objectif de ${targetWords}+${metrics.tooShortForReliableScoring ? " : texte encore trop bref." : "."}`
        : category.id === "argument"
          ? metrics.likelyGibberish
            ? "Texte non exploitable pour juger une vraie argumentation."
            : `${metrics.connectorHits.length} connecteurs visibles et ${
                metrics.hasConcession ? "une concession repérée" : "pas encore de vraie concession"
              }.`
          : category.id === "coherence"
            ? metrics.wordCount < 15
              ? "Texte trop court pour montrer une progression logique stable."
              : `${metrics.paragraphCount} blocs lisibles et ${metrics.sentenceCount} phrases distinctes.`
            : category.id === "lexicon"
              ? metrics.likelyGibberish
                ? "Le texte contient trop peu de français exploitable pour juger le lexique."
                : `${Math.round(metrics.contentUniqueRatio * 100)} % de variété sur les mots porteurs et ${metrics.topicalHits.length} mots de thème.`
              : metrics.likelyGibberish
                ? "Texte non exploitable : correction grammaticale impossible à estimer sérieusement."
                : `${metrics.informalHits.length === 0 ? "Registre stable" : "Registre parfois trop relâché"} pour une réponse de type DELF.`
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
      ? scoreWritingRubric(rubric, submission, task.content.targetWords)
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
