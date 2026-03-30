export type ExamSection =
  | "listening"
  | "reading"
  | "writing"
  | "speaking"
  | "grammar";

export type SkillTag =
  | "gist-extraction"
  | "stance-detection"
  | "note-taking"
  | "detail-discrimination"
  | "argument-structure"
  | "formal-register"
  | "opinion-defense"
  | "connectors"
  | "error-correction"
  | "oral-interaction"
  | "hypothesis"
  | "reported-speech"
  | "nominalization"
  | "tone-analysis"
  | "evidence-matching"
  | "task-completion";

export type ScoringMethod = "objective" | "rubric" | "hybrid";

export interface TaskTemplate {
  id: string;
  section: ExamSection;
  label: string;
  format: string;
  allowedPromptShape: string;
  skillTags: SkillTag[];
  distractorStrategy: string;
  difficultyRange: [number, number];
  scoringMethod: ScoringMethod;
  estimatedMinutes: number;
  cooldownFamily: string;
  variationFamilies: string[];
}

export interface TopicSeed {
  id: string;
  label: string;
  domain: string;
  contexts: string[];
  audiences: string[];
  claims: string[];
  counterpoints: string[];
  vocabulary: string[];
  frictionPoints: string[];
}

export interface ObjectiveQuestion {
  id: string;
  prompt: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
  mistakeTag: string;
  skillTag: SkillTag;
}

export interface AnswerKey {
  questionId: string;
  correctIndex: number;
  rationale: string;
  skillTag: SkillTag;
}

export interface RubricCategory {
  id: string;
  label: string;
  description: string;
  weight: number;
}

export interface Rubric {
  id: string;
  label: string;
  categories: RubricCategory[];
}

export interface ListeningContent {
  transcript: string;
  bullets: string[];
  questions: ObjectiveQuestion[];
  replaysAllowed: number;
  voiceHint: string;
  notePrompt: string;
}

export interface ReadingContent {
  headline: string;
  kicker: string;
  passage: string[];
  questions: ObjectiveQuestion[];
}

export interface GrammarItem {
  id: string;
  prompt: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
  skillTag: SkillTag;
}

export interface GrammarContent {
  focus: string;
  items: GrammarItem[];
}

export interface WritingContent {
  brief: string;
  constraints: string[];
  checklist: string[];
  targetWords: number;
  modelMoves: string[];
}

export interface SpeakingContent {
  brief: string;
  prep: string[];
  followUps: string[];
  interactionCue: string;
  targetMinutes: number;
  modelMoves: string[];
}

export interface BaseTaskVariant {
  id: string;
  section: ExamSection;
  templateId: string;
  fingerprint: string;
  title: string;
  subtitle: string;
  topicId: string;
  topicLabel: string;
  skillTags: SkillTag[];
  difficulty: number;
  estimatedMinutes: number;
  scoringMethod: ScoringMethod;
  coachHints: string[];
  answerKey?: AnswerKey[];
  rubric?: Rubric;
}

export type TaskVariant =
  | (BaseTaskVariant & { section: "listening"; content: ListeningContent })
  | (BaseTaskVariant & { section: "reading"; content: ReadingContent })
  | (BaseTaskVariant & { section: "grammar"; content: GrammarContent })
  | (BaseTaskVariant & { section: "writing"; content: WritingContent })
  | (BaseTaskVariant & { section: "speaking"; content: SpeakingContent });

export interface RubricScore {
  id: string;
  label: string;
  score: number;
  reason: string;
}

export interface FeedbackReport {
  summary: string;
  coachLabel: string;
  score: number;
  categoryScores: RubricScore[];
  strengths: string[];
  priorities: string[];
  nextDrills: SkillTag[];
  caution?: string;
}

export interface Attempt {
  id: string;
  taskId: string;
  taskFingerprint: string;
  section: ExamSection;
  templateId: string;
  topicId: string;
  topicLabel: string;
  timestamp: string;
  score: number;
  skillTags: SkillTag[];
  mistakeTags: string[];
  responseSummary: string;
  feedback?: FeedbackReport;
}

export interface WeaknessProfile {
  sectionScores: Record<ExamSection, number>;
  skillScores: Record<SkillTag, number>;
  topicScores: Record<string, number>;
  recurringMistakes: Array<{
    tag: string;
    count: number;
    section: ExamSection;
  }>;
  focusSkills: SkillTag[];
  focusSection: ExamSection;
}

export interface StudyPlanItem {
  section: ExamSection;
  title: string;
  reason: string;
}

export interface StudyPlan {
  headline: string;
  recap: string;
  tasks: StudyPlanItem[];
  nextMock: string;
}

export interface TodayBundle {
  dateKey: string;
  comprehension: TaskVariant;
  grammar: TaskVariant;
  productive: TaskVariant;
}

export interface MockExamSession {
  id: string;
  dateKey: string;
  tasks: TaskVariant[];
}

export interface TelemetryEvent {
  id: string;
  timestamp: string;
  type:
    | "generation"
    | "collision"
    | "difficulty-warning"
    | "score-stability"
    | "quality-note";
  message: string;
  context: string;
}

export interface StoredCoachState {
  version: 1;
  attempts: Attempt[];
  telemetry: TelemetryEvent[];
  todayBundle: TodayBundle;
  mockExam: MockExamSession;
}

export interface SkillNode {
  id: SkillTag;
  label: string;
  description: string;
  section: ExamSection;
  milestone: string;
}
