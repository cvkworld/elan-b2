import { describe, expect, it } from "vitest";
import { publicReadingExercises, resolveCuratedCitation } from "@/lib/public-reading";

describe("public reading bank", () => {
  it("exposes four public comprehension options", () => {
    expect(publicReadingExercises).toHaveLength(4);
    expect(publicReadingExercises.map((exercise) => exercise.title)).toEqual([
      "COMMENT REPÉRER LES OGM DANS NOS ASSIETTES",
      "UNE JEUNESSE DÉ-GOÛTÉE",
      "Une France de 75 millions d’habitants en 2050",
      "« Parité ne rime pas avec égalité »"
    ]);
  });

  it("keeps question ids unique across the public bank", () => {
    const ids = publicReadingExercises.flatMap((exercise) => exercise.questions.map((question) => question.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("resolves citations inside the selected exercise", () => {
    const exercise = publicReadingExercises[2];
    expect(resolveCuratedCitation(exercise, { paragraphIndex: 5 })).toContain("Le désert français est un mythe");
  });
});
