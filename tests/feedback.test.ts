import { describe, expect, it } from "vitest";
import { evaluateProduction } from "@/lib/feedback";
import { publicWritingExercises } from "@/lib/public-writing";

describe("writing feedback guardrails", () => {
  const writingTask = publicWritingExercises[0];

  it("heavily penalizes gibberish or unusable writing submissions", () => {
    const report = evaluateProduction(writingTask, "fklsadfjasdfowenlk asdfj aslfjsldfjsaldk");

    expect(report.score).toBeLessThan(20);
    expect(report.summary.toLowerCase()).toContain("trop bref");

    const lexicon = report.categoryScores.find((score) => score.id === "lexicon");
    const accuracy = report.categoryScores.find((score) => score.id === "accuracy");

    expect(lexicon?.score).toBeLessThanOrEqual(10);
    expect(accuracy?.score).toBeLessThanOrEqual(10);
  });

  it("rewards a substantive DELF-style response much more than gibberish", () => {
    const strongSubmission = [
      "Madame, Monsieur,",
      "",
      "Je souhaite réagir à votre consultation sur l'usage du numérique à l'école. À mon avis, ces outils peuvent être utiles, à condition qu'ils soient intégrés avec méthode et qu'ils ne remplacent jamais entièrement le travail d'explication mené par les enseignants.",
      "",
      "D'abord, le numérique permet d'adapter certains supports aux besoins réels des élèves. Un document interactif, une capsule vidéo courte ou un exercice différencié peuvent aider un élève en difficulté à reprendre confiance. Ensuite, ces outils facilitent l'accès aux ressources et rendent l'entraînement plus souple, notamment lorsqu'il faut revoir une notion à la maison.",
      "",
      "Certes, on peut objecter que les écrans fatiguent et dispersent l'attention. Cette réserve ne doit pas être minimisée. Cependant, elle ne justifie pas un refus global du numérique. Le vrai enjeu consiste plutôt à fixer des règles claires, à limiter les usages inutiles et à former les élèves à un emploi réfléchi des outils.",
      "",
      "En conclusion, je suis favorable à une intégration progressive du numérique, à condition qu'elle reste encadrée, évaluée et réellement utile aux apprentissages."
    ].join("\n");

    const weakReport = evaluateProduction(writingTask, "fklsadfjasdfowenlk asdfj aslfjsldfjsaldk");
    const strongReport = evaluateProduction(writingTask, strongSubmission);

    expect(strongReport.score).toBeGreaterThan(weakReport.score + 35);
    expect(strongReport.categoryScores.find((score) => score.id === "task")?.score).toBeGreaterThan(45);
    expect(strongReport.categoryScores.find((score) => score.id === "argument")?.score).toBeGreaterThan(45);
  });
});
