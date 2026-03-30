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

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function analyzeText(text: string) {
  const normalized = text.toLowerCase();
  const words = normalized
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
  const uniqueWords = new Set(words);
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

  return {
    wordCount: words.length,
    uniqueRatio: words.length === 0 ? 0 : uniqueWords.size / words.length,
    paragraphCount: paragraphs.length,
    sentenceCount: sentences.length,
    connectorHits,
    formalHits,
    informalHits,
    topicalHits,
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

function scoreWritingRubric(rubric: Rubric, text: string): RubricScore[] {
  const metrics = analyzeText(text);

  const scores: Record<string, number> = {
    task: clamp((metrics.wordCount / 250) * 100, 20, 100),
    argument: clamp(
      35 +
        metrics.connectorHits.length * 10 +
        (metrics.hasConcession ? 14 : 0) +
        (metrics.hasConclusion ? 10 : 0),
      20,
      98
    ),
    coherence: clamp(
      30 +
        metrics.paragraphCount * 14 +
        Math.min(metrics.connectorHits.length, 5) * 6,
      20,
      95
    ),
    lexicon: clamp(
      32 +
        metrics.uniqueRatio * 80 +
        metrics.topicalHits.length * 6,
      20,
      96
    ),
    accuracy: clamp(
      42 +
        Math.min(metrics.sentenceCount, 8) * 4 +
        metrics.formalHits.length * 4 -
        metrics.informalHits.length * 12,
      20,
      92
    )
  };

  return rubric.categories.map((category) => ({
    id: category.id,
    label: category.label,
    score: Math.round(scores[category.id] ?? 50),
    reason:
      category.id === "task"
        ? `${metrics.wordCount} mots produits pour un objectif de 250+.`
        : category.id === "argument"
          ? `${metrics.connectorHits.length} connecteurs visibles et ${
              metrics.hasConcession ? "une concession repérée" : "pas encore de vraie concession"
            }.`
          : category.id === "coherence"
            ? `${metrics.paragraphCount} blocs lisibles et ${metrics.sentenceCount} phrases distinctes.`
            : category.id === "lexicon"
              ? `${Math.round(metrics.uniqueRatio * 100)} % de variété lexicale et ${metrics.topicalHits.length} mots de thème.`
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
      ? scoreWritingRubric(rubric, submission)
      : scoreSpeakingRubric(rubric, submission);
  const score = weightedAverage(scores, rubric);
  const strengths = pickStrengths(scores);
  const priorities = pickPriorities(scores);
  const nextDrills = mapToDrills(scores, task.section);

  return {
    summary:
      score >= 80
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
