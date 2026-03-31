import { describe, expect, it } from "vitest";
import { publicWritingExercises } from "@/lib/public-writing";

describe("public writing bank", () => {
  it("exposes twelve public production prompts", () => {
    expect(publicWritingExercises).toHaveLength(12);
    expect(publicWritingExercises.every((exercise) => exercise.section === "writing")).toBe(true);
  });

  it("keeps prompt ids unique and target length exam-ready", () => {
    const ids = publicWritingExercises.map((exercise) => exercise.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(publicWritingExercises.every((exercise) => exercise.content.targetWords >= 250)).toBe(true);
  });

  it("covers multiple DELF-style writing formats", () => {
    const formats = new Set(publicWritingExercises.map((exercise) => exercise.content.formatLabel));
    expect(formats.has("Lettre ouverte")).toBe(true);
    expect(formats.has("Contribution à un forum")).toBe(true);
    expect(formats.has("Article d’opinion")).toBe(true);
    expect(formats.has("Rapport bref")).toBe(true);
  });
});
