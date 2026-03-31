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

  it("rewards a substantive on-topic DELF-style response much more than gibberish", () => {
    const strongSubmission = [
      "Madame, Monsieur,",
      "",
      "Je me permets de vous écrire au sujet des horaires de la bibliothèque universitaire. À mon sens, une ouverture plus tardive plusieurs soirs par semaine serait une mesure très utile pour les étudiants, à condition d'être organisée avec méthode.",
      "",
      "D'abord, les horaires actuels pénalisent les étudiants qui ont des cours tardifs ou un emploi à temps partiel. Dans ce cas, ils disposent de peu de temps pour travailler dans un lieu calme. Par exemple, plusieurs étudiants quittent le campus au moment même où ils pourraient enfin se concentrer sérieusement.",
      "",
      "Ensuite, une bibliothèque plus accessible renforcerait l'égalité entre les étudiants. Ceux qui vivent dans un logement bruyant ou partagé ont besoin d'un espace de travail stable. Certes, cette extension d'horaires représente un coût et demande une meilleure organisation. Cependant, il serait possible de commencer par deux soirées d'essai afin d'évaluer la fréquentation réelle.",
      "",
      "En conclusion, je suis donc favorable à une ouverture plus tardive, à condition qu'elle fasse l'objet d'une expérimentation claire et d'un bilan public. Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées."
    ].join("\n");

    const weakReport = evaluateProduction(writingTask, "fklsadfjasdfowenlk asdfj aslfjsldfjsaldk");
    const strongReport = evaluateProduction(writingTask, strongSubmission);
    const coherenceScore = strongReport.categoryScores.find((score) => score.id === "coherence");

    expect(strongReport.score).toBeGreaterThan(weakReport.score + 35);
    expect(strongReport.categoryScores.find((score) => score.id === "task")?.score).toBeGreaterThan(55);
    expect(strongReport.categoryScores.find((score) => score.id === "argument")?.score).toBeGreaterThan(55);
    expect(coherenceScore?.reason.toLowerCase()).toContain("introduction présente");
  });

  it("penalizes a fluent but off-topic answer", () => {
    const offTopicSubmission = [
      "Madame, Monsieur,",
      "",
      "Je souhaite défendre ici le développement du tourisme sportif sur le littoral méditerranéen. À mon avis, cette politique peut dynamiser la région si elle reste raisonnable et bien encadrée.",
      "",
      "D'abord, elle attire un public varié et crée de l'activité économique pour les commerces locaux. Ensuite, elle permet de mieux valoriser les équipements déjà existants et de renforcer l'image dynamique de la ville.",
      "",
      "Certes, certains habitants craignent davantage de bruit en été. Cependant, cette difficulté peut être réduite par une meilleure répartition des événements et par des horaires plus clairs.",
      "",
      "En conclusion, je suis favorable à ce projet, à condition qu'il reste compatible avec la tranquillité des riverains. Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées."
    ].join("\n");

    const report = evaluateProduction(writingTask, offTopicSubmission);
    const taskScore = report.categoryScores.find((score) => score.id === "task");
    const lexiconScore = report.categoryScores.find((score) => score.id === "lexicon");
    const priorities = report.priorities.join(" ").toLowerCase();

    expect(taskScore?.score).toBeLessThan(45);
    expect(lexiconScore?.reason.toLowerCase()).toContain("repères de thème");
    expect(priorities).toContain("thème");
  });

  it("penalizes casual register and missing letter conventions", () => {
    const casualSubmission = [
      "Salut,",
      "",
      "Franchement, ce serait super de fermer la biblio plus tard parce que c'est trop utile pour nous.",
      "Je pense qu'on pourrait bosser plus et c'est grave pratique quand on finit tard.",
      "",
      "Voilà, merci."
    ].join("\n");

    const report = evaluateProduction(writingTask, casualSubmission);
    const accuracyScore = report.categoryScores.find((score) => score.id === "accuracy");

    expect(accuracyScore?.score).toBeLessThan(45);
    expect(accuracyScore?.reason.toLowerCase()).toContain("cadre de lettre");
  });
});
