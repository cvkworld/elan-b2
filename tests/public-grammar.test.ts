import { describe, expect, it } from "vitest";
import {
  getGrammarLessonExercises,
  grammarDifficultyMeta,
  publicGrammarLessons
} from "@/lib/public-grammar";

describe("public grammar lessons", () => {
  it("exposes the full grammar lesson bank", () => {
    expect(publicGrammarLessons).toHaveLength(20);
    expect(publicGrammarLessons.some((lesson) => lesson.title === "L'article")).toBe(true);
    expect(publicGrammarLessons.some((lesson) => lesson.title === "Les pronoms relatifs")).toBe(true);
  });

  it("builds three difficulty modes for each lesson", () => {
    const lesson = publicGrammarLessons[0];

    const basic = getGrammarLessonExercises(lesson, "basic");
    const exam = getGrammarLessonExercises(lesson, "exam");
    const challenge = getGrammarLessonExercises(lesson, "challenge");

    expect(Object.keys(grammarDifficultyMeta)).toEqual(["basic", "exam", "challenge"]);
    expect(basic).toHaveLength(3);
    expect(exam).toHaveLength(lesson.exercises.length);
    expect(challenge).toHaveLength(lesson.exercises.length + 2);
  });

  it("keeps generated exercise ids unique inside a difficulty set", () => {
    const lesson = publicGrammarLessons[4];
    const challengeIds = getGrammarLessonExercises(lesson, "challenge").map((exercise) => exercise.id);

    expect(new Set(challengeIds).size).toBe(challengeIds.length);
  });
});
