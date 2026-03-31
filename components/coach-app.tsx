"use client";

import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { SpeakingRecorder } from "@/components/speaking-recorder";
import { supplementalResources, sectionMeta } from "@/lib/delf-data";
import { evaluateProduction } from "@/lib/feedback";
import {
  buildStudyPlan,
  computeWeaknessProfile,
  createAttempt,
  generateMockExam,
  generateSectionPractice,
  generateSectionPracticePack,
  generateTaskVariant,
  generateTodayBundle,
  scoreObjectiveTask
} from "@/lib/generator";
import { publicReadingExercises, resolveCuratedCitation } from "@/lib/public-reading";
import { publicWritingExercises } from "@/lib/public-writing";
import { siteMeta } from "@/lib/site-meta";
import { loadStoredCoachState, saveStoredCoachState } from "@/lib/storage";
import {
  Attempt,
  CuratedReadingExercise,
  CuratedReadingQuestion,
  ExamSection,
  SectionPracticePacks,
  StoredCoachState,
  TaskVariant,
  TelemetryEvent
} from "@/lib/types";

type TabId =
  | "today"
  | "reading"
  | "writing"
  | "listening"
  | "speaking"
  | "mock"
  | "review"
  | "progress";
type TodaySlot = "comprehension" | "grammar" | "productive";
type PracticeSection = Extract<ExamSection, "reading" | "writing" | "listening" | "speaking">;
type CuratedAnswerMap = Record<string, { choiceIndex?: number; boolValue?: boolean; text?: string }>;
type PresenceState = {
  activeVisitors: number | null;
  connected: boolean;
  estimated: boolean;
  ttlMs: number;
};

const tabs: Array<{ id: TabId; label: string; description: string }> = [
  { id: "today", label: "Aujourd'hui", description: "Session courte et ciblée" },
  { id: "reading", label: "Compréhension écrite", description: "4 dossiers publics + générateur" },
  { id: "writing", label: "Production écrite", description: "12 sujets publics + générateur" },
  { id: "listening", label: "Compréhension orale", description: "Écoute guidée" },
  { id: "speaking", label: "Production orale", description: "Monologue et interaction" },
  { id: "mock", label: "Mock Exam", description: "Simulation chronométrée" },
  { id: "review", label: "Review", description: "Erreurs par motif" },
  { id: "progress", label: "Progress", description: "Readiness et tendances" }
];

function getDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function trimTelemetry(events: TelemetryEvent[]) {
  const trimmed = events.slice(-120);
  const counts = new Map<string, number>();

  return trimmed.map((event) => {
    const seen = counts.get(event.id) ?? 0;
    counts.set(event.id, seen + 1);

    if (seen === 0) {
      return event;
    }

    return {
      ...event,
      id: `${event.id}-${seen}`
    };
  });
}

function hasSectionPractice(value: unknown): value is SectionPracticePacks {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return ["listening", "reading", "writing", "speaking"].every((section) =>
    Array.isArray(record[section])
  );
}

function buildStateFromAttempts(attempts: Attempt[], variantSeed = getDateKey()): StoredCoachState {
  const dateKey = getDateKey();
  const today = generateTodayBundle(attempts, dateKey, `${variantSeed}-today`);
  const mock = generateMockExam(attempts, dateKey, `${variantSeed}-mock`);
  const practice = generateSectionPractice(attempts, dateKey, `${variantSeed}-practice`);

  return {
    version: 4,
    attempts,
    telemetry: trimTelemetry([...today.telemetry, ...mock.telemetry, ...practice.telemetry]),
    todayBundle: today.bundle,
    mockExam: mock.session,
    sectionPractice: practice.packs
  };
}

function normalizeStoredState(raw: unknown): StoredCoachState | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const candidate = raw as Partial<StoredCoachState> & { attempts?: Attempt[] };
  if (!Array.isArray(candidate.attempts)) {
    return null;
  }

  const dateKey = getDateKey();
  if (
    candidate.todayBundle?.dateKey === dateKey &&
    candidate.mockExam?.dateKey === dateKey &&
    hasSectionPractice(candidate.sectionPractice)
  ) {
    return {
      version: 4,
      attempts: candidate.attempts,
      telemetry: trimTelemetry(candidate.telemetry ?? []),
      todayBundle: candidate.todayBundle,
      mockExam: candidate.mockExam,
      sectionPractice: candidate.sectionPractice
    };
  }

  return buildStateFromAttempts(candidate.attempts);
}

function syncStateDate(state: StoredCoachState): StoredCoachState {
  const dateKey = getDateKey();
  if (
    state.todayBundle.dateKey === dateKey &&
    state.mockExam.dateKey === dateKey &&
    hasSectionPractice(state.sectionPractice)
  ) {
    return {
      ...state,
      version: 4,
      telemetry: trimTelemetry(state.telemetry)
    };
  }

  const rebuilt = buildStateFromAttempts(state.attempts);
  return {
    ...rebuilt,
    telemetry: trimTelemetry([...state.telemetry, ...rebuilt.telemetry])
  };
}

function pushTelemetry(state: StoredCoachState, incoming: TelemetryEvent[]) {
  return {
    ...state,
    telemetry: trimTelemetry([...state.telemetry, ...incoming])
  };
}

function humanizeTag(tag: string) {
  return tag.replace(/-/g, " ");
}

function latestAttemptForTask(attempts: Attempt[], taskId: string) {
  return [...attempts].reverse().find((attempt) => attempt.taskId === taskId);
}

function average(values: number[], fallback: number) {
  if (values.length === 0) {
    return fallback;
  }
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function sectionReadinessTone(score: number) {
  if (score >= 80) return "strong";
  if (score >= 60) return "steady";
  return "fragile";
}

function tabToSection(tab: TabId): PracticeSection | null {
  if (tab === "reading" || tab === "writing" || tab === "listening" || tab === "speaking") {
    return tab;
  }
  return null;
}

const readingSignals = [
  "Question probable : thèse centrale ou intention de l'auteur.",
  "Question probable : ton, posture, prudence ou concession.",
  "Question probable : rôle d'un exemple ou d'un détail cité.",
  "Question probable : recommandation finale ou compromis.",
  "Question probable : mot-clé, titre ou synthèse fidèle."
];

const writingSignals = [
  "Copie forte : position visible dans l'introduction.",
  "Copie forte : deux arguments différents et illustrés.",
  "Copie forte : concession réelle, puis réponse nuancée.",
  "Copie forte : conclusion qui propose une action crédible.",
  "Copie forte : registre stable, connecteurs utiles, pas de remplissage."
];

const oralSignals = [
  "Commencer par reformuler le thème et annoncer ta priorité.",
  "Prévoir un exemple concret et une objection possible.",
  "Utiliser une concession courte, puis revenir à ton critère central."
];

export function CoachApp() {
  const [state, setState] = useState<StoredCoachState>(() => buildStateFromAttempts([]));
  const [activeTab, setActiveTab] = useState<TabId>("today");
  const [objectiveAnswers, setObjectiveAnswers] = useState<Record<string, Record<string, number>>>({});
  const [curatedAnswers, setCuratedAnswers] = useState<CuratedAnswerMap>({});
  const [revealedCuratedCorrections, setRevealedCuratedCorrections] = useState<Record<string, boolean>>({});
  const [activeReadingExerciseId, setActiveReadingExerciseId] = useState<string>(
    publicReadingExercises[0]?.id ?? ""
  );
  const [activeWritingExerciseId, setActiveWritingExerciseId] = useState<string>(
    publicWritingExercises[0]?.id ?? ""
  );
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [transcriptVisible, setTranscriptVisible] = useState<Record<string, boolean>>({});
  const [reviewFilter, setReviewFilter] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [presence, setPresence] = useState<PresenceState>({
    activeVisitors: null,
    connected: false,
    estimated: true,
    ttlMs: 45_000
  });
  const deferredReviewFilter = useDeferredValue(reviewFilter);
  const privateAnswers = curatedAnswers;
  const revealedPrivateCorrections = revealedCuratedCorrections;
  const setRevealedPrivateCorrections = setRevealedCuratedCorrections;

  useEffect(() => {
    const stored = loadStoredCoachState();
    const frame = window.requestAnimationFrame(() => {
      const normalized = normalizeStoredState(stored);
      if (normalized) {
        setState(normalized);
      }
      setHydrated(true);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (hydrated) {
      saveStoredCoachState(state);
    }
  }, [hydrated, state]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const sessionId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `presence-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    let active = true;
    const heartbeatEveryMs = 20_000;
    let intervalId = 0;

    const syncPresence = async (method: "POST" | "DELETE" = "POST") => {
      try {
        const response = await fetch("/api/presence", {
          method,
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ sessionId }),
          cache: "no-store",
          keepalive: method === "DELETE"
        });

        if (!response.ok || !active) {
          return;
        }

        const payload = (await response.json()) as {
          activeVisitors: number;
          estimated: boolean;
          ttlMs: number;
        };

        setPresence({
          activeVisitors: payload.activeVisitors,
          connected: true,
          estimated: payload.estimated,
          ttlMs: payload.ttlMs
        });
      } catch {
        if (active) {
          setPresence((current) => ({
            ...current,
            connected: false
          }));
        }
      }
    };

    void syncPresence();
    intervalId = window.setInterval(() => {
      void syncPresence();
    }, heartbeatEveryMs);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void syncPresence();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibility);
      void fetch("/api/presence", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ sessionId }),
        cache: "no-store",
        keepalive: true
      }).catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const profile = useMemo(() => computeWeaknessProfile(state.attempts), [state.attempts]);
  const studyPlan = useMemo(
    () => buildStudyPlan(state.attempts, state.todayBundle),
    [state.attempts, state.todayBundle]
  );
  const activeReadingExercise = useMemo(
    () =>
      publicReadingExercises.find((exercise) => exercise.id === activeReadingExerciseId) ??
      publicReadingExercises[0],
    [activeReadingExerciseId]
  );
  const activeWritingExercise = useMemo(
    () =>
      publicWritingExercises.find((exercise) => exercise.id === activeWritingExerciseId) ??
      publicWritingExercises[0],
    [activeWritingExerciseId]
  );

  const overallReadiness = useMemo(
    () =>
      average(
        [
          profile.sectionScores.listening,
          profile.sectionScores.reading,
          profile.sectionScores.writing,
          profile.sectionScores.speaking
        ],
        47
      ),
    [profile.sectionScores]
  );

  const rubricAverages = useMemo(() => {
    const buckets = new Map<string, { label: string; values: number[] }>();
    state.attempts.forEach((attempt) => {
      attempt.feedback?.categoryScores.forEach((score) => {
        const bucket = buckets.get(score.id) ?? { label: score.label, values: [] };
        bucket.values.push(score.score);
        buckets.set(score.id, bucket);
      });
    });
    return Array.from(buckets.values()).map((bucket) => ({
      label: bucket.label,
      value: average(bucket.values, 0)
    }));
  }, [state.attempts]);

  const filteredAttempts = useMemo(() => {
    const query = deferredReviewFilter.trim().toLowerCase();
    const attempts = [...state.attempts].reverse();
    if (!query) {
      return attempts;
    }
    return attempts.filter((attempt) => {
      const haystack = [
        attempt.section,
        attempt.topicLabel,
        attempt.responseSummary,
        attempt.mistakeTags.join(" ")
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [deferredReviewFilter, state.attempts]);

  const studyDays = useMemo(() => {
    const dates = new Set(state.attempts.map((attempt) => attempt.timestamp.slice(0, 10)));
    return dates.size;
  }, [state.attempts]);

  const liveVisitorsValue = presence.activeVisitors === null ? "..." : `~${presence.activeVisitors}`;
  const visitorWindowSeconds = Math.round(presence.ttlMs / 1000);

  const heroCopy = useMemo(() => {
    if (activeTab === "today") {
      return {
        eyebrow: "Plan du jour",
        title: studyPlan.headline,
        text: studyPlan.recap
      };
    }

    if (activeTab === "reading") {
      return {
        eyebrow: "Compréhension écrite",
        title: "Quatre dossiers publics + des sujets renouvelés",
        text: "Travaille d’abord sur quatre vrais formats fixes avec corrigés, puis enchaîne avec les générateurs pour éviter la répétition."
      };
    }

    if (activeTab === "writing") {
      return {
        eyebrow: "Production écrite",
        title: "Douze sujets publics probables + des variantes nouvelles",
        text: "Travaille d’abord sur 12 formats très plausibles avec modèles haut niveau, puis passe aux sujets générés pour élargir ton entraînement."
      };
    }

    if (activeTab === "listening") {
      return {
        eyebrow: "Compréhension orale",
        title: "Mieux écouter les indices qui font la différence",
        text: "Le travail oral reste présent, mais la priorité actuelle reste la lecture et l'écriture."
      };
    }

    if (activeTab === "speaking") {
      return {
        eyebrow: "Production orale",
        title: "Préparer des réponses défendables sous relance",
        text: "Monologue, interaction et concessions courtes pour garder une position stable."
      };
    }

    if (activeTab === "mock") {
      return {
        eyebrow: "Mock exam",
        title: "Simuler l'examen complet avec contenu renouvelé",
        text: "Chrono, quatre épreuves et nouvelles variantes au lieu des mêmes questions répétées."
      };
    }

    if (activeTab === "review") {
      return {
        eyebrow: "Review",
        title: "Comprendre tes erreurs avant d'en créer de nouvelles",
        text: "On suit ici les motifs qui reviennent et les sections qui demandent encore de la stabilité."
      };
    }

    return {
      eyebrow: "Progress",
      title: "Suivre ta progression par section et par catégorie",
      text: "Readiness globale, rubrics productives et couverture des grands thèmes B2."
    };
  }, [activeTab, studyPlan.headline, studyPlan.recap]);

  function updateObjectiveAnswer(taskId: string, questionId: string, choiceIndex: number) {
    setObjectiveAnswers((current) => ({
      ...current,
      [taskId]: {
        ...current[taskId],
        [questionId]: choiceIndex
      }
    }));
  }

  function updateDraft(taskId: string, value: string) {
    setDrafts((current) => ({
      ...current,
      [taskId]: value
    }));
  }

  function updateCuratedChoice(questionId: string, choiceIndex: number) {
    setCuratedAnswers((current) => ({
      ...current,
      [questionId]: {
        ...current[questionId],
        choiceIndex
      }
    }));
  }

  function updateCuratedBoolean(questionId: string, boolValue: boolean) {
    setCuratedAnswers((current) => ({
      ...current,
      [questionId]: {
        ...current[questionId],
        boolValue
      }
    }));
  }

  function updateCuratedText(questionId: string, text: string) {
    setCuratedAnswers((current) => ({
      ...current,
      [questionId]: {
        ...current[questionId],
        text
      }
    }));
  }

  const updatePrivateChoice = updateCuratedChoice;
  const updatePrivateBoolean = updateCuratedBoolean;
  const updatePrivateText = updateCuratedText;

  function playListeningTask(task: TaskVariant) {
    if (task.section !== "listening" || typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(task.content.transcript);
    utterance.lang = "fr-FR";
    utterance.rate = 0.93;
    utterance.pitch = 1.02;
    window.speechSynthesis.speak(utterance);
  }

  function recomposeToday() {
    startTransition(() => {
      setState((current) => {
        const synced = syncStateDate(current);
        const seed = `${getDateKey()}-${Date.now()}`;
        const today = generateTodayBundle(synced.attempts, getDateKey(), `${seed}-today`);
        const practice = generateSectionPractice(synced.attempts, getDateKey(), `${seed}-practice`);
        return pushTelemetry(
          {
            ...synced,
            todayBundle: today.bundle,
            sectionPractice: practice.packs
          },
          [...today.telemetry, ...practice.telemetry]
        );
      });
    });
  }

  function replaceTodaySlot(slot: TodaySlot) {
    startTransition(() => {
      setState((current) => {
        const synced = syncStateDate(current);
        const currentTask = synced.todayBundle[slot];
        const generated = generateTaskVariant({
          section: currentTask.section,
          attempts: synced.attempts,
          seedKey: `${getDateKey()}-${slot}-${Date.now()}`,
          preferredSkill: currentTask.section === "grammar" ? profile.focusSkills[0] : undefined
        });
        return pushTelemetry(
          {
            ...synced,
            todayBundle: {
              ...synced.todayBundle,
              [slot]: generated.task
            }
          },
          generated.telemetry
        );
      });
    });
  }

  function regenerateMock() {
    startTransition(() => {
      setState((current) => {
        const synced = syncStateDate(current);
        const generated = generateMockExam(synced.attempts, getDateKey(), `${getDateKey()}-${Date.now()}`);
        return pushTelemetry(
          {
            ...synced,
            mockExam: generated.session
          },
          generated.telemetry
        );
      });
    });
  }

  function regeneratePracticeSection(section: PracticeSection) {
    startTransition(() => {
      setState((current) => {
        const synced = syncStateDate(current);
        const generated = generateSectionPracticePack({
          section,
          attempts: synced.attempts,
          dateKey: getDateKey(),
          variantSeed: `${getDateKey()}-${section}-${Date.now()}`,
          count: synced.sectionPractice[section].length || (section === "reading" || section === "writing" ? 3 : 2)
        });

        return pushTelemetry(
          {
            ...synced,
            sectionPractice: {
              ...synced.sectionPractice,
              [section]: generated.tasks
            }
          },
          generated.telemetry
        );
      });
    });
  }

  function submitObjective(task: TaskVariant) {
    const answers = objectiveAnswers[task.id] ?? {};
    const result = scoreObjectiveTask(task, answers);
    const attempt = createAttempt({
      task,
      score: result.score,
      responseSummary: `${result.correct}/${result.total} correct · ${result.summary}`,
      mistakeTags: result.mistakeTags
    });

    startTransition(() => {
      setState((current) => {
        const synced = syncStateDate(current);
        const extraTelemetry: TelemetryEvent[] =
          result.score < 45
            ? [
                {
                  id: `warn-${task.id}-${Date.now()}`,
                  timestamp: new Date().toISOString(),
                  type: "difficulty-warning",
                  message: "Low score detected on an objective task.",
                  context: `${task.section} · ${task.topicLabel}`
                }
              ]
            : [];
        return pushTelemetry(
          {
            ...synced,
            attempts: [...synced.attempts, attempt]
          },
          extraTelemetry
        );
      });
    });
  }

  function submitProduction(task: TaskVariant) {
    const submission = drafts[task.id]?.trim() ?? "";
    if (!submission) {
      return;
    }

    const feedback = evaluateProduction(task, submission);
    const attempt = createAttempt({
      task,
      score: feedback.score,
      responseSummary: feedback.summary,
      mistakeTags: feedback.nextDrills,
      feedback
    });

    startTransition(() => {
      setState((current) => {
        const synced = syncStateDate(current);
        const extraTelemetry: TelemetryEvent[] =
          feedback.score < 55
            ? [
                {
                  id: `stability-${task.id}-${Date.now()}`,
                  timestamp: new Date().toISOString(),
                  type: "score-stability",
                  message: "Productive task scored below the stable threshold.",
                  context: `${task.section} · ${task.topicLabel}`
                }
              ]
            : [];
        return pushTelemetry(
          {
            ...synced,
            attempts: [...synced.attempts, attempt]
          },
          extraTelemetry
        );
      });
    });
  }

  function renderAttemptFeedback(attempt?: Attempt) {
    if (!attempt) {
      return null;
    }

    return (
      <div className="feedback-card">
        <div className="feedback-head">
          <div>
            <p className="eyebrow">Dernier passage</p>
            <h4>{attempt.responseSummary}</h4>
          </div>
          <span className={`score-badge score-${sectionReadinessTone(attempt.score)}`}>
            {attempt.score}/100
          </span>
        </div>
        {attempt.feedback ? (
          <div className="feedback-grid">
            {attempt.feedback.categoryScores.map((score) => (
              <div className="metric-chip" key={score.id}>
                <span>{score.label}</span>
                <strong>{score.score}</strong>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  function countPrivateAutoCorrect(exercise: CuratedReadingExercise) {
    const autoQuestions = exercise.questions.filter(
      (question) => question.type === "mcq" || question.type === "true-false"
    );
    const correct = autoQuestions.reduce((sum, question) => {
      const answer = privateAnswers[question.id];
      if (question.type === "mcq") {
        return sum + (answer?.choiceIndex === question.correction.correctChoiceIndex ? 1 : 0);
      }
      return sum + (answer?.boolValue === question.correction.correctValue ? 1 : 0);
    }, 0);

    return {
      correct,
      total: autoQuestions.length
    };
  }

  function renderPrivateCorrection(
    exercise: CuratedReadingExercise,
    question: CuratedReadingQuestion
  ) {
    const citation = resolveCuratedCitation(exercise, question.correction.citation);

    if (question.type === "mcq") {
      return (
        <div className="private-correction">
          <p className="muted">
            Réponse attendue : <strong>{question.choices[question.correction.correctChoiceIndex]}</strong>
          </p>
          <p className="notice">{question.correction.explanation}</p>
          {citation ? <p className="citation-block">{citation}</p> : null}
        </div>
      );
    }

    if (question.type === "true-false") {
      return (
        <div className="private-correction">
          <p className="muted">
            Réponse attendue : <strong>{question.correction.correctValue ? "VRAI" : "FAUX"}</strong>
          </p>
          <p className="notice">{question.correction.explanation}</p>
          {citation ? <p className="citation-block">{citation}</p> : null}
        </div>
      );
    }

    return (
      <div className="private-correction">
        <p className="muted">
          Modèle de réponse : <strong>{question.correction.modelAnswer}</strong>
        </p>
        <ul className="hint-list">
          {question.correction.keyPoints.map((point, index) => (
            <li key={`${question.id}-point-${index}`}>{point}</li>
          ))}
        </ul>
        <p className="notice">{question.correction.explanation}</p>
        {citation ? <p className="citation-block">{citation}</p> : null}
      </div>
    );
  }

  function renderPrivateReadingExercise(exercise: CuratedReadingExercise) {
    const correctionVisible = revealedPrivateCorrections[exercise.id];
    const objective = countPrivateAutoCorrect(exercise);

    return (
      <section className="task-card" key={exercise.id}>
        <div className="task-head">
          <div>
            <p className="eyebrow">Sujet public DELF B2</p>
            <h3>{exercise.title}</h3>
            <p className="muted">{exercise.sourceLabel}</p>
          </div>
          <div className="task-meta">
            <span className="pill">Public</span>
            <span className="pill">{exercise.questions.length} questions</span>
          </div>
        </div>

        <div className="stimulus">
          {exercise.instructions ? <p className="notice">{exercise.instructions}</p> : null}
          {exercise.passage.map((paragraph, index) => (
            <p className="reading-paragraph" key={`${exercise.id}-paragraph-${index}`}>
              {paragraph}
            </p>
          ))}
          {exercise.vocabulary?.length ? (
            <div className="feedback-card">
              <div className="feedback-head">
                <div>
                  <p className="eyebrow">Vocabulaire</p>
                  <h4>Repères utiles avant de répondre</h4>
                </div>
              </div>
              <ul className="hint-list">
                {exercise.vocabulary.map((item, index) => (
                  <li key={`${exercise.id}-vocabulary-${index}`}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="questions">
          {exercise.questions.map((question) => (
            <div className="question-block" key={question.id}>
              <p>
                <strong>{question.label}.</strong> {question.prompt}
              </p>

              {question.type === "mcq" ? (
                <div className="choice-grid">
                  {question.choices.map((choice, choiceIndex) => (
                    <label className="choice" key={`${question.id}-${choiceIndex}`}>
                      <input
                        checked={privateAnswers[question.id]?.choiceIndex === choiceIndex}
                        name={question.id}
                        onChange={() => updatePrivateChoice(question.id, choiceIndex)}
                        type="radio"
                      />
                      <span>{choice}</span>
                    </label>
                  ))}
                </div>
              ) : null}

              {question.type === "true-false" ? (
                <div className="choice-grid private-boolean-grid">
                  {[
                    { label: "VRAI", value: true },
                    { label: "FAUX", value: false }
                  ].map((option) => (
                    <label className="choice" key={`${question.id}-${option.label}`}>
                      <input
                        checked={privateAnswers[question.id]?.boolValue === option.value}
                        name={question.id}
                        onChange={() => updatePrivateBoolean(question.id, option.value)}
                        type="radio"
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                  <textarea
                    className="draft-input private-mini-textarea"
                    onChange={(event) => updatePrivateText(question.id, event.target.value)}
                    placeholder="Justifie ta réponse en citant le texte."
                    rows={3}
                    value={privateAnswers[question.id]?.text ?? ""}
                  />
                </div>
              ) : null}

              {question.type === "short-answer" ? (
                <textarea
                  className="draft-input private-mini-textarea"
                  onChange={(event) => updatePrivateText(question.id, event.target.value)}
                  placeholder={question.placeholder ?? "Rédige ta réponse."}
                  rows={4}
                  value={privateAnswers[question.id]?.text ?? ""}
                />
              ) : null}

              {correctionVisible ? renderPrivateCorrection(exercise, question) : null}
            </div>
          ))}
        </div>

        <div className="task-actions">
          <button
            className="button"
            onClick={() =>
              setRevealedPrivateCorrections((current) => ({
                ...current,
                [exercise.id]: true
              }))
            }
            type="button"
          >
            Afficher le corrigé complet
          </button>
        </div>

        {correctionVisible ? (
          <div className="feedback-card">
            <div className="feedback-head">
              <div>
                <p className="eyebrow">Bilan guidé</p>
                <h4>Corrigé affiché pour ce sujet public</h4>
              </div>
              <span className="pill">
                {objective.correct}/{objective.total} réponses objectives repérées
              </span>
            </div>
            <p className="muted">
              Les réponses courtes ne sont pas notées automatiquement. Le corrigé te donne ici la logique attendue, les points-clés et les citations utiles pour viser une réponse très forte.
            </p>
          </div>
        ) : null}
      </section>
    );
  }

  function renderCorrectionKey(task: TaskVariant, attempt?: Attempt) {
    if (!attempt || (task.section !== "reading" && task.section !== "listening" && task.section !== "grammar")) {
      return null;
    }

    const items = task.section === "grammar" ? task.content.items : task.content.questions;

    return (
      <div className="feedback-card">
        <div className="feedback-head">
          <div>
            <p className="eyebrow">Corrigé commenté</p>
            <h4>Réponses modèles et logique attendue</h4>
          </div>
          <span className="pill">Après correction</span>
        </div>
        <div className="questions">
          {items.map((item, index) => (
            <div className="question-block" key={`${task.id}-answer-${index}`}>
              <p>
                <strong>{index + 1}.</strong> {item.prompt}
              </p>
              <p className="muted">
                Réponse attendue : <strong>{item.choices[item.correctIndex]}</strong>
              </p>
              <p className="notice">{item.explanation}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderObjectiveTask(task: TaskVariant, slot?: TodaySlot) {
    if (task.section !== "listening" && task.section !== "reading" && task.section !== "grammar") {
      return null;
    }

    const latestAttempt = latestAttemptForTask(state.attempts, task.id);
    const answers = objectiveAnswers[task.id] ?? {};
    const questions = task.section === "grammar" ? task.content.items : task.content.questions;

    return (
      <section className="task-card" key={task.id}>
        <div className="task-head">
          <div>
            <p className="eyebrow">{sectionMeta[task.section].label}</p>
            <h3>{task.title}</h3>
            <p className="muted">{task.subtitle}</p>
          </div>
          <div className="task-meta">
            <span className="pill">{task.estimatedMinutes} min</span>
            <span className="pill">Difficulté {task.difficulty}/5</span>
          </div>
        </div>

        {task.section === "listening" ? (
          <div className="stimulus">
            <div className="stimulus-tools">
              <button className="button button-secondary" onClick={() => playListeningTask(task)} type="button">
                Lire l&apos;audio coach
              </button>
              <button
                className="button button-ghost"
                onClick={() =>
                  setTranscriptVisible((current) => ({
                    ...current,
                    [task.id]: !current[task.id]
                  }))
                }
                type="button"
              >
                {transcriptVisible[task.id] ? "Masquer le transcript" : "Afficher le transcript"}
              </button>
            </div>
            <p className="notice">{task.content.notePrompt}</p>
            <ul className="hint-list">
              {task.content.bullets.map((bullet, index) => (
                <li key={`${task.id}-bullet-${index}`}>{bullet}</li>
              ))}
            </ul>
            {transcriptVisible[task.id] ? <p className="transcript">{task.content.transcript}</p> : null}
          </div>
        ) : null}

        {task.section === "reading" ? (
          <div className="stimulus">
            <div className="tag-row">
              <span className="pill">{task.content.formatLabel}</span>
              <span className="pill">{task.content.examFocus}</span>
            </div>
            <p className="eyebrow">{task.content.kicker}</p>
            <h4>{task.content.headline}</h4>
            {task.content.passage.map((paragraph, index) => (
              <p key={`${task.id}-paragraph-${index}`} className="reading-paragraph">
                {paragraph}
              </p>
            ))}
            <ul className="hint-list">
              {task.content.strategy.map((item, index) => (
                <li key={`${task.id}-strategy-${index}`}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {task.section === "grammar" ? (
          <div className="stimulus">
            <p className="eyebrow">Focus</p>
            <h4>{task.content.focus}</h4>
            <p className="muted">On vise les structures les plus rentables pour stabiliser ta production.</p>
          </div>
        ) : null}

        <div className="questions">
          {questions.map((question, questionIndex) => (
            <div className="question-block" key={question.id}>
              <p>
                <strong>{questionIndex + 1}.</strong> {question.prompt}
              </p>
              <div className="choice-grid">
                {question.choices.map((choice, choiceIndex) => (
                  <label className="choice" key={`${question.id}-${choiceIndex}`}>
                    <input
                      checked={answers[question.id] === choiceIndex}
                      name={question.id}
                      onChange={() => updateObjectiveAnswer(task.id, question.id, choiceIndex)}
                      type="radio"
                    />
                    <span>{choice}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="task-actions">
          <button className="button" onClick={() => submitObjective(task)} type="button">
            Corriger l&apos;exercice
          </button>
          {slot ? (
            <button className="button button-secondary" onClick={() => replaceTodaySlot(slot)} type="button">
              Nouvelle variante
            </button>
          ) : null}
        </div>

        {renderAttemptFeedback(latestAttempt)}
        {renderCorrectionKey(task, latestAttempt)}
      </section>
    );
  }

  function renderProductiveTask(task: TaskVariant, slot?: TodaySlot) {
    if (task.section !== "writing" && task.section !== "speaking") {
      return null;
    }

    const latestAttempt = latestAttemptForTask(state.attempts, task.id);
    const draft = drafts[task.id] ?? "";

    return (
      <section className="task-card" key={task.id}>
        <div className="task-head">
          <div>
            <p className="eyebrow">{sectionMeta[task.section].label}</p>
            <h3>{task.title}</h3>
            <p className="muted">{task.subtitle}</p>
          </div>
          <div className="task-meta">
            <span className="pill">{task.estimatedMinutes} min</span>
            <span className="pill">Coach feedback</span>
          </div>
        </div>

        <div className="stimulus">
          <div className="tag-row">
            {task.section === "writing" ? (
              <>
                <span className="pill">{task.content.formatLabel}</span>
                <span className="pill">{task.content.examFocus}</span>
              </>
            ) : null}
          </div>
          <h4>Consigne</h4>
          <p className="reading-paragraph">{task.content.brief}</p>
          <div className="two-col">
            <div>
              <p className="eyebrow">Checklist</p>
              <ul className="hint-list">
                {(task.section === "writing" ? task.content.checklist : task.content.prep).map((item, index) => (
                  <li key={`${task.id}-prep-${index}`}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="eyebrow">Model moves</p>
              <ul className="hint-list">
                {task.content.modelMoves.map((item, index) => (
                  <li key={`${task.id}-move-${index}`}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          {task.section === "writing" ? (
            <>
              <ul className="hint-list">
                {task.content.constraints.map((constraint, index) => (
                  <li key={`${task.id}-constraint-${index}`}>{constraint}</li>
                ))}
              </ul>
              <div className="feedback-card">
                <div className="feedback-head">
                  <div>
                    <p className="eyebrow">Modèle haut niveau</p>
                    <h4>{task.content.modelAnswer.title}</h4>
                  </div>
                  <span className="pill">Objectif 25/25</span>
                </div>
                <div className="two-col">
                  <div>
                    <p className="eyebrow">Plan conseillé</p>
                    <ul className="hint-list">
                      {task.content.outline.map((item, index) => (
                        <li key={`${task.id}-outline-${index}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="eyebrow">Pourquoi ce modèle marque</p>
                    <ul className="hint-list">
                      {task.content.modelAnswer.whyItScores.map((item, index) => (
                        <li key={`${task.id}-score-${index}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                {task.content.modelAnswer.paragraphs.map((paragraph, index) => (
                  <p className="reading-paragraph" key={`${task.id}-model-${index}`}>
                    {paragraph}
                  </p>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="notice">{task.content.interactionCue}</p>
              <ul className="hint-list">
                {task.content.followUps.map((item, index) => (
                  <li key={`${task.id}-follow-${index}`}>{item}</li>
                ))}
              </ul>
              <SpeakingRecorder taskId={task.id} />
            </>
          )}
        </div>

        <div className="draft-area">
          <div className="draft-head">
            <p className="eyebrow">{task.section === "writing" ? "Rédaction" : "Transcript ou notes structurées"}</p>
            <span className="muted">{draft.trim().split(/\s+/).filter(Boolean).length} mots</span>
          </div>
          <textarea
            className="draft-input"
            onChange={(event) => updateDraft(task.id, event.target.value)}
            placeholder={
              task.section === "writing"
                ? "Rédige ta réponse complète ici."
                : "Après ta prise de parole, colle ici ton transcript ou des notes structurées."
            }
            rows={task.section === "writing" ? 12 : 10}
            value={draft}
          />
        </div>

        <div className="task-actions">
          <button className="button" onClick={() => submitProduction(task)} type="button">
            Recevoir le coach feedback
          </button>
          {slot ? (
            <button className="button button-secondary" onClick={() => replaceTodaySlot(slot)} type="button">
              Nouvelle variante
            </button>
          ) : null}
        </div>

        {latestAttempt?.feedback ? (
          <div className="feedback-card">
            <div className="feedback-head">
              <div>
                <p className="eyebrow">{latestAttempt.feedback.coachLabel}</p>
                <h4>{latestAttempt.feedback.summary}</h4>
              </div>
              <span className={`score-badge score-${sectionReadinessTone(latestAttempt.feedback.score)}`}>
                {latestAttempt.feedback.score}/100
              </span>
            </div>
            <div className="feedback-grid">
              {latestAttempt.feedback.categoryScores.map((score) => (
                <div className="metric-chip" key={score.id}>
                  <span>{score.label}</span>
                  <strong>{score.score}</strong>
                </div>
              ))}
            </div>
            <div className="two-col">
              <div>
                <p className="eyebrow">Forces</p>
                <ul className="hint-list">
                  {latestAttempt.feedback.strengths.map((strength, index) => (
                    <li key={`${task.id}-strength-${index}`}>{strength}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="eyebrow">Priorités</p>
                <ul className="hint-list">
                  {latestAttempt.feedback.priorities.map((priority, index) => (
                    <li key={`${task.id}-priority-${index}`}>{priority}</li>
                  ))}
                </ul>
              </div>
            </div>
            {latestAttempt.feedback.caution ? <p className="notice">{latestAttempt.feedback.caution}</p> : null}
          </div>
        ) : null}
      </section>
    );
  }

  function renderSectionPanel(section: PracticeSection) {
    const tasks = state.sectionPractice[section];
    const signals = section === "reading" ? readingSignals : section === "writing" ? writingSignals : oralSignals;

    return (
      <div className="panel-stack">
        {section === "reading" ? (
          <section className="panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Dossiers publics</p>
                <h3>Quatre sujets fixes de compréhension écrite</h3>
              </div>
              <div className="hero-actions">
                <button
                  className="button button-secondary"
                  onClick={() =>
                    setActiveReadingExerciseId(
                      publicReadingExercises[Math.floor(Math.random() * publicReadingExercises.length)]?.id ??
                        publicReadingExercises[0].id
                    )
                  }
                  type="button"
                >
                  Choisir un sujet au hasard
                </button>
                <span className="pill">{publicReadingExercises.length} options publiques</span>
              </div>
            </div>
            <p className="muted">
              Ces quatre dossiers restent visibles sur le site pour t&apos;entraîner quand tu veux. Ils sont séparés des sujets générés plus bas.
            </p>
            <div className="reading-option-grid">
              {publicReadingExercises.map((exercise) => {
                const isActive = exercise.id === activeReadingExercise?.id;
                const teaser = `${exercise.passage[0].slice(0, 180)}${exercise.passage[0].length > 180 ? "..." : ""}`;

                return (
                  <button
                    className={`reading-option-card ${isActive ? "reading-option-card-active" : ""}`}
                    key={exercise.id}
                    onClick={() => setActiveReadingExerciseId(exercise.id)}
                    type="button"
                  >
                    <div className="reading-option-head">
                      <span className="pill">{exercise.questions.length} questions</span>
                      <span className="pill">Public</span>
                    </div>
                    <strong>{exercise.title}</strong>
                    <span>{exercise.sourceLabel}</span>
                    <small>{teaser}</small>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {section === "reading" && activeReadingExercise ? renderPrivateReadingExercise(activeReadingExercise) : null}

        {section === "writing" ? (
          <section className="panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Banque publique</p>
                <h3>Douze sujets probables de production écrite</h3>
              </div>
              <div className="hero-actions">
                <button
                  className="button button-secondary"
                  onClick={() =>
                    setActiveWritingExerciseId(
                      publicWritingExercises[Math.floor(Math.random() * publicWritingExercises.length)]?.id ??
                        publicWritingExercises[0].id
                    )
                  }
                  type="button"
                >
                  Choisir un sujet au hasard
                </button>
                <span className="pill">{publicWritingExercises.length} sujets publics</span>
              </div>
            </div>
            <p className="muted">
              Ces 12 sujets reprennent les formats les plus plausibles du DELF B2 : lettre, forum, article et rapport bref, avec modèle de copie haut niveau.
            </p>
            <div className="reading-option-grid">
              {publicWritingExercises.map((exercise) => {
                const isActive = exercise.id === activeWritingExercise?.id;
                const teaser = `${exercise.content.brief.slice(0, 190)}${exercise.content.brief.length > 190 ? "..." : ""}`;

                return (
                  <button
                    className={`reading-option-card ${isActive ? "reading-option-card-active" : ""}`}
                    key={exercise.id}
                    onClick={() => setActiveWritingExerciseId(exercise.id)}
                    type="button"
                  >
                    <div className="reading-option-head">
                      <span className="pill">{exercise.content.formatLabel}</span>
                      <span className="pill">Public</span>
                    </div>
                    <strong>{exercise.title}</strong>
                    <span>{exercise.subtitle}</span>
                    <small>{teaser}</small>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {section === "writing" && activeWritingExercise ? renderProductiveTask(activeWritingExercise) : null}

        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">{sectionMeta[section].label}</p>
              <h3>{section === "reading" ? "Entraînement renouvelé" : "Entraînement ciblé"}</h3>
            </div>
            <button className="button" onClick={() => regeneratePracticeSection(section)} type="button">
              Générer {section === "reading" || section === "writing" ? "de nouveaux sujets" : "de nouvelles variantes"}
            </button>
          </div>
          <div className="study-plan-grid">
            {signals.map((signal, index) => (
              <article className="plan-chip" key={`${section}-signal-${index}`}>
                <strong>{signal}</strong>
                <span>{sectionMeta[section].description}</span>
              </article>
            ))}
          </div>
        </section>

        {tasks.map((task) =>
          task.section === "reading" || task.section === "listening"
            ? renderObjectiveTask(task)
            : renderProductiveTask(task)
        )}
      </div>
    );
  }

  const topicSnapshots = Object.keys(profile.topicScores).length > 0 ? Object.entries(profile.topicScores) : [];
  const heroMetrics = [
    {
      label: "Visiteurs actifs",
      value: liveVisitorsValue,
      detail: presence.estimated ? "estimation en direct" : "en direct"
    },
    {
      label: "Lecture publique",
      value: `${publicReadingExercises.length}`,
      detail: "dossiers commentés"
    },
    {
      label: "Écriture publique",
      value: `${publicWritingExercises.length}`,
      detail: "sujets probables"
    }
  ];

  return (
    <div className="coach-shell">
      <aside className="coach-rail">
        <div className="brand-block">
          <p className="eyebrow">Personal DELF coach</p>
          <h1>Élan B2</h1>
          <p className="muted">Lecture, écriture, écoute et oral avec génération plus utile et moins répétitive.</p>
          <div className="brand-badges">
            <span className="brand-badge">Lecture ciblée</span>
            <span className="brand-badge">Écriture probable</span>
            <span className="brand-badge">Feedback coach</span>
          </div>
        </div>

        <div className="readiness-card">
          <p className="eyebrow">Readiness</p>
          <div className="readiness-score">{overallReadiness}</div>
          <p className="muted">{studyDays} jours de pratique enregistrés.</p>
        </div>

        <section className="community-card" aria-live="polite">
          <div className="community-head">
            <div>
              <p className="eyebrow">Communauté</p>
              <h3>Audience active</h3>
            </div>
            <span className={`live-pill ${presence.connected ? "live-pill-active" : ""}`}>
              <span className="live-dot" />
              {liveVisitorsValue} en ligne
            </span>
          </div>
          <p className="muted">
            Estimation basée sur les visiteurs actifs des {visitorWindowSeconds} dernières secondes.
          </p>
          <div className="rail-chip-grid">
            <div className="rail-chip">
              <strong>{publicReadingExercises.length}</strong>
              <span>dossiers de lecture</span>
            </div>
            <div className="rail-chip">
              <strong>{publicWritingExercises.length}</strong>
              <span>sujets d&apos;écriture</span>
            </div>
          </div>
          <div className="support-stack">
            <a className="button button-support" href={siteMeta.donationUrl} rel="noreferrer" target="_blank">
              {siteMeta.donationLabel}
            </a>
            <a className="button button-secondary" href={siteMeta.repoUrl} rel="noreferrer" target="_blank">
              Voir le projet
            </a>
          </div>
          <p className="small-note">{siteMeta.donationHint}</p>
        </section>

        <nav className="tab-nav" aria-label="Navigation principale">
          {tabs.map((tab) => (
            <button
              className={`tab-link ${activeTab === tab.id ? "tab-link-active" : ""}`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              <span>{tab.label}</span>
              <small>{tab.description}</small>
            </button>
          ))}
        </nav>

        <div className="rail-footer">
          <p className="eyebrow">Legal note</p>
          <p className="muted">Contenu original seulement. Les liens RFI et TV5MONDE restent externes.</p>
        </div>
      </aside>

      <main className="coach-stage">
        <header className="hero-panel">
          <div className="hero-copy">
            <p className="eyebrow">{heroCopy.eyebrow}</p>
            <h2>{heroCopy.title}</h2>
            <p className="muted">{heroCopy.text}</p>
            <div className="hero-ribbon">
              <span className={`live-pill ${presence.connected ? "live-pill-active" : ""}`}>
                <span className="live-dot" />
                {presence.estimated ? "Audience estimée" : "Audience en direct"}
              </span>
              <span className="pill">Contenu original</span>
              <span className="pill">Feedback coach</span>
            </div>
          </div>
          <div className="hero-side">
            <div className="hero-metrics">
              {heroMetrics.map((metric) => (
                <div className="hero-metric" key={metric.label}>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                  <small>{metric.detail}</small>
                </div>
              ))}
            </div>
            <p className="hero-note">
              L&apos;app reste locale pour la progression, mais la présence publique est maintenant visible en temps
              réel
              estimée.
            </p>
            <div className="hero-actions">
              <button className="button button-secondary" onClick={() => setActiveTab("mock")} type="button">
                Aller au mock
              </button>
              <button className="button button-ghost" onClick={recomposeToday} type="button">
                Recomposer aujourd&apos;hui
              </button>
            </div>
          </div>
        </header>

        {activeTab === "today" ? (
          <div className="panel-stack">
            <section className="panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Aujourd&apos;hui</p>
                  <h3>Séance de 10 à 20 minutes</h3>
                </div>
                <p className="muted">Lecture DELF, réparation grammaticale, puis production écrite coachée.</p>
              </div>
              <div className="study-plan-grid">
                {studyPlan.tasks.map((item, index) => (
                  <article className="plan-chip" key={`${item.section}-${index}`}>
                    <strong>{item.title}</strong>
                    <span>{item.reason}</span>
                  </article>
                ))}
              </div>
            </section>

            {renderObjectiveTask(state.todayBundle.comprehension, "comprehension")}
            {renderObjectiveTask(state.todayBundle.grammar, "grammar")}
            {renderProductiveTask(state.todayBundle.productive, "productive")}
          </div>
        ) : null}

        {tabToSection(activeTab) ? renderSectionPanel(tabToSection(activeTab) as PracticeSection) : null}

        {activeTab === "mock" ? (
          <div className="panel-stack">
            <section className="panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Mock Exam</p>
                  <h3>Simulation complète</h3>
                </div>
                <button className="button" onClick={regenerateMock} type="button">
                  Générer un nouveau mock
                </button>
              </div>
              <div className="study-plan-grid">
                {state.mockExam.tasks.map((task, index) => (
                  <article className="plan-chip" key={`${task.id}-${index}`}>
                    <strong>{sectionMeta[task.section].label}</strong>
                    <span>{sectionMeta[task.section].duration}</span>
                  </article>
                ))}
              </div>
            </section>

            {state.mockExam.tasks.map((task) =>
              task.section === "listening" || task.section === "reading" || task.section === "grammar"
                ? renderObjectiveTask(task)
                : renderProductiveTask(task)
            )}
          </div>
        ) : null}

        {activeTab === "review" ? (
          <div className="panel-stack">
            <section className="panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Review</p>
                  <h3>Erreurs par motif</h3>
                </div>
                <input
                  className="search-input"
                  onChange={(event) => setReviewFilter(event.target.value)}
                  placeholder="Filtrer par section, thème ou erreur"
                  value={reviewFilter}
                />
              </div>
              <div className="mistake-grid">
                {profile.recurringMistakes.length > 0 ? (
                  profile.recurringMistakes.map((mistake) => (
                    <article className="mistake-card" key={`${mistake.section}-${mistake.tag}`}>
                      <strong>{humanizeTag(mistake.tag)}</strong>
                      <span>{mistake.count} fois</span>
                      <small>{sectionMeta[mistake.section].label}</small>
                    </article>
                  ))
                ) : (
                  <p className="muted">Tes motifs d&apos;erreur apparaîtront ici après quelques passages.</p>
                )}
              </div>
            </section>

            <section className="panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Historique</p>
                  <h3>Dernières tentatives</h3>
                </div>
                <p className="muted">{filteredAttempts.length} éléments visibles</p>
              </div>
              <div className="attempt-list">
                {filteredAttempts.length > 0 ? (
                  filteredAttempts.map((attempt) => {
                    const visibleTags = Array.from(new Set(attempt.mistakeTags));

                    return (
                      <article className="attempt-card" key={attempt.id}>
                        <div className="attempt-head">
                          <div>
                            <p className="eyebrow">{sectionMeta[attempt.section].label}</p>
                            <h4>{attempt.topicLabel}</h4>
                          </div>
                          <span className={`score-badge score-${sectionReadinessTone(attempt.score)}`}>{attempt.score}</span>
                        </div>
                        <p>{attempt.responseSummary}</p>
                        {visibleTags.length > 0 ? (
                          <div className="tag-row">
                            {visibleTags.map((tag, index) => (
                              <span className="pill" key={`${attempt.id}-${index}`}>
                                {humanizeTag(tag)}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </article>
                    );
                  })
                ) : (
                  <p className="muted">Aucune tentative pour ce filtre.</p>
                )}
              </div>
            </section>

            <section className="panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Ressources externes</p>
                  <h3>Compléments autorisés</h3>
                </div>
              </div>
              <div className="resource-grid">
                {supplementalResources.map((resource) => (
                  <a className="resource-card" href={resource.href} key={resource.href} rel="noreferrer" target="_blank">
                    <strong>{resource.label}</strong>
                    <span>{resource.note}</span>
                  </a>
                ))}
              </div>
            </section>
          </div>
        ) : null}

        {activeTab === "progress" ? (
          <div className="panel-stack">
            <section className="panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Progress</p>
                  <h3>Readiness par section</h3>
                </div>
              </div>
              <div className="section-bars">
                {(Object.keys(sectionMeta) as ExamSection[]).map((section) => {
                  const score = profile.sectionScores[section];
                  return (
                    <div className="section-bar" key={section}>
                      <div className="section-bar-head">
                        <strong>{sectionMeta[section].label}</strong>
                        <span>{score}</span>
                      </div>
                      <div className="progress-track">
                        <div className={`progress-fill tone-${sectionReadinessTone(score)}`} style={{ width: `${score}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Rubrics</p>
                  <h3>Catégories productives</h3>
                </div>
              </div>
              <div className="skill-grid">
                {rubricAverages.length > 0 ? (
                  rubricAverages.map((item) => (
                    <article className="skill-card" key={item.label}>
                      <div className="skill-head">
                        <span className="pill">Coach rubric</span>
                        <strong>{item.value}</strong>
                      </div>
                      <h4>{item.label}</h4>
                      <div className="progress-track">
                        <div className={`progress-fill tone-${sectionReadinessTone(item.value)}`} style={{ width: `${item.value}%` }} />
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="muted">Les catégories de rubric apparaîtront après tes premières productions.</p>
                )}
              </div>
            </section>

            <section className="panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Themes</p>
                  <h3>Couverture des thèmes B2</h3>
                </div>
              </div>
              <div className="tag-row">
                {topicSnapshots.length > 0 ? (
                  topicSnapshots.map(([topic, score]) => (
                    <span className="pill" key={topic}>
                      {topic} · {score}
                    </span>
                  ))
                ) : (
                  <span className="pill">Les thèmes apparaîtront après plusieurs séances.</span>
                )}
              </div>
            </section>

            <section className="panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Telemetry</p>
                  <h3>Contrôle qualité local</h3>
                </div>
              </div>
              <div className="attempt-list">
                {state.telemetry
                  .slice()
                  .reverse()
                  .map((event) => (
                    <article className="attempt-card" key={event.id}>
                      <div className="attempt-head">
                        <div>
                          <p className="eyebrow">{event.type}</p>
                          <h4>{event.message}</h4>
                        </div>
                      </div>
                      <p>{event.context}</p>
                    </article>
                  ))}
              </div>
            </section>
          </div>
        ) : null}
      </main>
    </div>
  );
}
