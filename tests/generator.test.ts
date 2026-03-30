import { describe, expect, it } from "vitest";
import { evaluateProduction } from "@/lib/feedback";
import {
  generateSectionPracticePack,
  generateTaskVariant,
  generateTodayBundle,
  scoreObjectiveTask
} from "@/lib/generator";
import { Attempt } from "@/lib/types";

function dummyAttempt(): Attempt {
  return {
    id: "attempt-1",
    taskId: "task-1",
    taskFingerprint: "baseline|fingerprint",
    section: "reading",
    templateId: "read-editorial",
    topicId: "media",
    topicLabel: "Médias et esprit critique",
    timestamp: new Date("2026-03-30T09:00:00.000Z").toISOString(),
    score: 62,
    skillTags: ["tone-analysis", "evidence-matching"],
    mistakeTags: ["tone-missed"],
    responseSummary: "Baseline review attempt"
  };
}

describe("generator", () => {
  it("creates a listening task with answer keys and aligned questions", () => {
    const result = generateTaskVariant({
      section: "listening",
      attempts: [],
      seedKey: "listen-seed"
    });

    expect(result.task.section).toBe("listening");
    expect(result.task.answerKey).toHaveLength(4);
    if (result.task.section !== "listening") {
      throw new Error("Expected a listening task.");
    }
    expect(result.task.content.questions).toHaveLength(4);
    expect(result.task.content.replaysAllowed).toBeGreaterThanOrEqual(1);
  });

  it("rerolls when a fingerprint would repeat inside the cooldown window", () => {
    const baseline = dummyAttempt();
    const first = generateTaskVariant({
      section: "listening",
      attempts: [baseline],
      seedKey: "repeat-seed"
    });

    const collisionAttempt: Attempt = {
      ...baseline,
      taskFingerprint: first.task.fingerprint
    };

    const rerolled = generateTaskVariant({
      section: "listening",
      attempts: [collisionAttempt],
      seedKey: "repeat-seed"
    });

    expect(rerolled.task.fingerprint).not.toBe(first.task.fingerprint);
    expect(rerolled.telemetry.some((event) => event.type === "collision")).toBe(true);
  });

  it("builds unique reading practice packs", () => {
    const result = generateSectionPracticePack({
      section: "reading",
      attempts: [],
      dateKey: "2026-03-30",
      variantSeed: "reading-pack",
      count: 3
    });

    expect(result.tasks).toHaveLength(3);
    expect(new Set(result.tasks.map((task) => task.fingerprint)).size).toBe(3);
    expect(result.tasks.every((task) => task.section === "reading")).toBe(true);
  });

  it("keeps today's bundle centered on reading, grammar and writing", () => {
    const result = generateTodayBundle([], "2026-03-30", "today-pack");

    expect(result.bundle.comprehension.section).toBe("reading");
    expect(result.bundle.grammar.section).toBe("grammar");
    expect(result.bundle.productive.section).toBe("writing");
  });

  it("scores objective tasks deterministically", () => {
    const result = generateTaskVariant({
      section: "grammar",
      attempts: [],
      seedKey: "grammar-seed"
    });

    if (result.task.section !== "grammar") {
      throw new Error("Expected a grammar task.");
    }

    const correctAnswers = Object.fromEntries(
      result.task.content.items.map((item) => [item.id, item.correctIndex])
    );
    const scored = scoreObjectiveTask(result.task, correctAnswers);

    expect(scored.score).toBe(100);
    expect(scored.correct).toBe(result.task.content.items.length);
  });

  it("keeps productive feedback stable for the same submission", () => {
    const generated = generateTaskVariant({
      section: "writing",
      attempts: [],
      seedKey: "writing-seed"
    });

    if (generated.task.section !== "writing") {
      throw new Error("Expected a writing task.");
    }

    const submission = [
      "À mon avis, la vérification des sources devrait être enseignée dès le lycée.",
      "",
      "D'abord, cette compétence aide les élèves à distinguer un fait d'une rumeur.",
      "Ensuite, elle permet de mieux participer aux débats publics, car chacun comprend mieux l'origine d'une information.",
      "Certes, cela demande du temps dans un programme déjà chargé, cependant cet apprentissage reste utile dans toutes les matières.",
      "",
      "En conclusion, il faudrait intégrer des ateliers courts mais réguliers afin de transformer cette pratique en réflexe collectif."
    ].join("\n");

    const one = evaluateProduction(generated.task, submission);
    const two = evaluateProduction(generated.task, submission);

    expect(one.score).toBe(two.score);
    expect(one.categoryScores).toEqual(two.categoryScores);
    expect(one.nextDrills).toEqual(two.nextDrills);
  });
});
