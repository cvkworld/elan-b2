"use client";

import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState
} from "react";
import {
  sectionMeta,
  skillNodes,
  supplementalResources
} from "@/lib/delf-data";
import { evaluateProduction } from "@/lib/feedback";
import {
  buildStudyPlan,
  computeWeaknessProfile,
  createAttempt,
  generateMockExam,
  generateTaskVariant,
  generateTodayBundle,
  scoreObjectiveTask
} from "@/lib/generator";
import { loadStoredCoachState, saveStoredCoachState } from "@/lib/storage";
import {
  Attempt,
  ExamSection,
  StoredCoachState,
  TaskVariant,
  TelemetryEvent
} from "@/lib/types";
import { SpeakingRecorder } from "@/components/speaking-recorder";

type TabId = "today" | "path" | "mock" | "review" | "progress";
type TodaySlot = "comprehension" | "grammar" | "productive";

const tabs: Array<{ id: TabId; label: string; description: string }> = [
  { id: "today", label: "Today", description: "Séance courte et ciblée" },
  { id: "path", label: "Path", description: "Compétences DELF B2" },
  { id: "mock", label: "Mock Exam", description: "Simulation chronométrée" },
  { id: "review", label: "Review", description: "Erreurs par motif" },
  { id: "progress", label: "Progress", description: "Readiness et tendances" }
];

function getDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function trimTelemetry(events: TelemetryEvent[]) {
  const trimmed = events.slice(-90);
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

function buildStateFromAttempts(attempts: Attempt[]): StoredCoachState {
  const dateKey = getDateKey();
  const today = generateTodayBundle(attempts, dateKey);
  const mock = generateMockExam(attempts, dateKey);

  return {
    version: 1,
    attempts,
    telemetry: trimTelemetry([...today.telemetry, ...mock.telemetry]),
    todayBundle: today.bundle,
    mockExam: mock.session
  };
}

function syncStateDate(state: StoredCoachState): StoredCoachState {
  const dateKey = getDateKey();
  if (state.todayBundle.dateKey === dateKey && state.mockExam.dateKey === dateKey) {
    return {
      ...state,
      telemetry: trimTelemetry(state.telemetry)
    };
  }

  const today = generateTodayBundle(state.attempts, dateKey);
  const mock = generateMockExam(state.attempts, dateKey);

  return {
    ...state,
    telemetry: trimTelemetry([...state.telemetry, ...today.telemetry, ...mock.telemetry]),
    todayBundle: today.bundle,
    mockExam: mock.session
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

export function CoachApp() {
  const [state, setState] = useState<StoredCoachState>(() => buildStateFromAttempts([]));
  const [activeTab, setActiveTab] = useState<TabId>("today");
  const [objectiveAnswers, setObjectiveAnswers] = useState<Record<string, Record<string, number>>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [transcriptVisible, setTranscriptVisible] = useState<Record<string, boolean>>({});
  const [reviewFilter, setReviewFilter] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const deferredReviewFilter = useDeferredValue(reviewFilter);

  useEffect(() => {
    const stored = loadStoredCoachState();
    const frame = window.requestAnimationFrame(() => {
      if (stored) {
        setState(syncStateDate(stored));
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
    const dates = new Set(
      state.attempts.map((attempt) => attempt.timestamp.slice(0, 10))
    );
    return dates.size;
  }, [state.attempts]);

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

  function replaceTodaySlot(slot: TodaySlot) {
    startTransition(() => {
      setState((current) => {
        const synced = syncStateDate(current);
        const currentTask = synced.todayBundle[slot];
        const generated = generateTaskVariant({
          section: currentTask.section,
          attempts: synced.attempts,
          seedKey: `${synced.todayBundle.dateKey}-${slot}-${Date.now()}`,
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
        const generated = generateMockExam(synced.attempts, `${getDateKey()}-${Date.now()}`);
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

  function renderObjectiveTask(task: TaskVariant, slot?: TodaySlot) {
    if (task.section !== "listening" && task.section !== "reading" && task.section !== "grammar") {
      return null;
    }

    const latestAttempt = latestAttemptForTask(state.attempts, task.id);
    const answers = objectiveAnswers[task.id] ?? {};
    const questions =
      task.section === "grammar" ? task.content.items : task.content.questions;

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
              {task.content.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
            {transcriptVisible[task.id] ? <p className="transcript">{task.content.transcript}</p> : null}
          </div>
        ) : null}

        {task.section === "reading" ? (
          <div className="stimulus">
            <p className="eyebrow">{task.content.kicker}</p>
            <h4>{task.content.headline}</h4>
            {task.content.passage.map((paragraph) => (
              <p key={paragraph} className="reading-paragraph">
                {paragraph}
              </p>
            ))}
          </div>
        ) : null}

        {task.section === "grammar" ? (
          <div className="stimulus">
            <p className="eyebrow">Focus</p>
            <h4>{task.content.focus}</h4>
            <p className="muted">
              On vise les structures les plus rentables pour stabiliser ta production.
            </p>
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
          <h4>Consigne</h4>
          <p className="reading-paragraph">{task.content.brief}</p>
          <div className="two-col">
            <div>
              <p className="eyebrow">Checklist</p>
              <ul className="hint-list">
                {(task.section === "writing" ? task.content.checklist : task.content.prep).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="eyebrow">Model moves</p>
              <ul className="hint-list">
                {task.content.modelMoves.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          {task.section === "writing" ? (
            <ul className="hint-list">
              {task.content.constraints.map((constraint) => (
                <li key={constraint}>{constraint}</li>
              ))}
            </ul>
          ) : (
            <>
              <p className="notice">{task.content.interactionCue}</p>
              <ul className="hint-list">
                {task.content.followUps.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <SpeakingRecorder taskId={task.id} />
            </>
          )}
        </div>

        <div className="draft-area">
          <div className="draft-head">
            <p className="eyebrow">
              {task.section === "writing" ? "Rédaction" : "Transcript ou notes structurées"}
            </p>
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
                  {latestAttempt.feedback.strengths.map((strength) => (
                    <li key={strength}>{strength}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="eyebrow">Priorités</p>
                <ul className="hint-list">
                  {latestAttempt.feedback.priorities.map((priority) => (
                    <li key={priority}>{priority}</li>
                  ))}
                </ul>
              </div>
            </div>
            {latestAttempt.feedback.caution ? (
              <p className="notice">{latestAttempt.feedback.caution}</p>
            ) : null}
          </div>
        ) : null}
      </section>
    );
  }

  const topicSnapshots =
    Object.keys(profile.topicScores).length > 0
      ? Object.entries(profile.topicScores)
      : supplementalResources.map((resource) => [resource.label, 50]);

  return (
    <div className="coach-shell">
      <aside className="coach-rail">
        <div className="brand-block">
          <p className="eyebrow">Personal DELF coach</p>
          <h1>Élan B2</h1>
          <p className="muted">
            App mobile-first pour préparer les quatre épreuves, avec génération contrôlée
            et feedback de coach.
          </p>
        </div>

        <div className="readiness-card">
          <p className="eyebrow">Readiness</p>
          <div className="readiness-score">{overallReadiness}</div>
          <p className="muted">{studyDays} jours de pratique enregistrés.</p>
        </div>

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
          <p className="muted">
            Contenu original seulement. Les liens RFI et TV5MONDE restent externes.
          </p>
        </div>
      </aside>

      <main className="coach-stage">
        <header className="hero-panel">
          <div>
            <p className="eyebrow">Plan du jour</p>
            <h2>{studyPlan.headline}</h2>
            <p className="muted">{studyPlan.recap}</p>
          </div>
          <div className="hero-actions">
            <button className="button button-secondary" onClick={() => setActiveTab("mock")} type="button">
              Aller au mock
            </button>
            <button
              className="button button-ghost"
              onClick={() =>
                startTransition(() => {
                  setState((current) => buildStateFromAttempts(current.attempts));
                })
              }
              type="button"
            >
              Recomposer aujourd&apos;hui
            </button>
          </div>
        </header>

        {activeTab === "today" ? (
          <div className="panel-stack">
            <section className="panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Today</p>
                  <h3>Séance de 10 à 20 minutes</h3>
                </div>
                <p className="muted">
                  Compréhension, réparation grammaticale, puis production coachée.
                </p>
              </div>
              <div className="study-plan-grid">
                {studyPlan.tasks.map((item) => (
                  <article className="plan-chip" key={`${item.section}-${item.title}`}>
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

        {activeTab === "path" ? (
          <div className="panel-stack">
            <section className="panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Path</p>
                  <h3>Compétences DELF B2</h3>
                </div>
                <p className="muted">
                  La progression n&apos;est pas organisée par niveau CECRL général, mais par gestes d&apos;examen.
                </p>
              </div>
              <div className="skill-grid">
                {skillNodes.map((node) => {
                  const readiness = profile.skillScores[node.id];
                  return (
                    <article className="skill-card" key={node.id}>
                      <div className="skill-head">
                        <span className="pill">{sectionMeta[node.section].label}</span>
                        <strong>{readiness}</strong>
                      </div>
                      <h4>{node.label}</h4>
                      <p className="muted">{node.description}</p>
                      <div className="progress-track">
                        <div
                          className={`progress-fill tone-${sectionReadinessTone(readiness)}`}
                          style={{ width: `${readiness}%` }}
                        />
                      </div>
                      <p className="notice">{node.milestone}</p>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        ) : null}

        {activeTab === "mock" ? (
          <div className="panel-stack">
            <section className="panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Mock Exam</p>
                  <h3>Simulation complète ou par section</h3>
                </div>
                <button className="button" onClick={regenerateMock} type="button">
                  Générer un nouveau mock
                </button>
              </div>
              <div className="study-plan-grid">
                {state.mockExam.tasks.map((task) => (
                  <article className="plan-chip" key={task.id}>
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
                    <article className="mistake-card" key={mistake.tag}>
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
                          <span className={`score-badge score-${sectionReadinessTone(attempt.score)}`}>
                            {attempt.score}
                          </span>
                        </div>
                        <p>{attempt.responseSummary}</p>
                        {visibleTags.length > 0 ? (
                          <div className="tag-row">
                            {visibleTags.map((tag) => (
                              <span className="pill" key={`${attempt.id}-${tag}`}>
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
                        <div
                          className={`progress-fill tone-${sectionReadinessTone(score)}`}
                          style={{ width: `${score}%` }}
                        />
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
                        <div
                          className={`progress-fill tone-${sectionReadinessTone(item.value)}`}
                          style={{ width: `${item.value}%` }}
                        />
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
                {topicSnapshots.map(([topic, score]) => (
                  <span className="pill" key={topic}>
                    {topic} · {score}
                  </span>
                ))}
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
                {state.telemetry.slice().reverse().map((event) => (
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
