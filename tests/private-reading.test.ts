import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import {
  extractParagraphsFromWordXml,
  parsePrivateReadingPackFromArrayBuffer,
  resolveCuratedCitation
} from "@/lib/private-reading";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildWordDocumentXml(lines: string[]) {
  const body = lines
    .map((line) => `<w:p><w:r><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`)
    .join("");

  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
    `<w:body>${body}</w:body>`,
    "</w:document>"
  ].join("");
}

async function buildDocxBuffer(lines: string[]) {
  const zip = new JSZip();
  zip.file("word/document.xml", buildWordDocumentXml(lines));
  return zip.generateAsync({ type: "arraybuffer" });
}

function buildSyntheticPrivateDocParagraphs() {
  return [
    "DELF B2",
    "Compréhension des écrits",
    "Texte converti en .docx — exercices de lecture",
    "PREMIER EXERCICE PRIVÉ",
    "Paragraphe 1 sur un premier thème de lecture.",
    "Paragraphe 2 avec une nuance supplémentaire.",
    "Paragraphe 3 qui ajoute un exemple concret.",
    "Paragraphe 4 centré sur la réception du public.",
    "Paragraphe 5 sur la mise en œuvre.",
    "Paragraphe 6 sur les limites du dispositif.",
    "Paragraphe 7 consacré au suivi.",
    "Paragraphe 8 sur les contrôles possibles.",
    "Magazine privé, 2005",
    "Question 1. Le texte cherche à :",
    "☐ Réfuter tout changement.",
    "☐ Exposer un récit historique.",
    "☐ Aider le lecteur à repérer les enjeux du texte.",
    "Question 2. Cochez VRAI ou FAUX et justifiez votre réponse.",
    "1. Première affirmation.",
    "VRAI ☐    FAUX ☐",
    "Justification :",
    "2. Deuxième affirmation.",
    "VRAI ☐    FAUX ☐",
    "Justification :",
    "3. Troisième affirmation.",
    "VRAI ☐    FAUX ☐",
    "Justification :",
    "4. Quatrième affirmation.",
    "VRAI ☐    FAUX ☐",
    "Justification :",
    "5. Cinquième affirmation.",
    "VRAI ☐    FAUX ☐",
    "Justification :",
    "Question 3. Citez deux menaces potentielles.",
    "Question 4. Donnez deux éléments d'information indirecte.",
    "Question 5. Quelles mesures complémentaires doivent être respectées ?",
    "Question 6. Expliquez une expression imagée.",
    "SECOND EXERCICE PRIVÉ",
    "Paragraphe A sur un deuxième thème.",
    "Paragraphe B sur les habitudes quotidiennes.",
    "Paragraphe C sur le cadre familial.",
    "Paragraphe D sur les effets sensoriels.",
    "Revue privée, 2006",
    "Vocabulaire",
    "mot 1 : définition 1",
    "mot 2 : définition 2",
    "Répondez aux questions en cochant la bonne réponse.",
    "Question 1. Première question du second exercice ?",
    "☐ Choix 1",
    "☐ Choix 2",
    "☐ Choix 3",
    "☐ Choix 4",
    "Question 2. Deuxième question du second exercice ?",
    "☐ Choix 1",
    "☐ Choix 2",
    "☐ Choix 3",
    "☐ Choix 4",
    "Question 3. Troisième question du second exercice ?",
    "☐ Choix 1",
    "☐ Choix 2",
    "☐ Choix 3",
    "☐ Choix 4",
    "Question 4. Quatrième question du second exercice ?",
    "☐ Choix 1",
    "☐ Choix 2",
    "☐ Choix 3",
    "☐ Choix 4",
    "Question 5. Cinquième question du second exercice ?",
    "☐ Choix 1",
    "☐ Choix 2",
    "☐ Choix 3",
    "☐ Choix 4",
    "Question 6. Sixième question du second exercice ?",
    "☐ Choix 1",
    "☐ Choix 2",
    "☐ Choix 3",
    "☐ Choix 4",
    "Relevez deux mots qui justifient votre réponse :",
    "Question 7. Expliquez le titre avec vos propres mots."
  ];
}

describe("private reading import", () => {
  it("extracts paragraphs from Word XML", () => {
    const xml = buildWordDocumentXml(["Titre", "Ligne avec & et caractères accentués."]);
    const paragraphs = extractParagraphsFromWordXml(xml);

    expect(paragraphs).toEqual(["Titre", "Ligne avec & et caractères accentués."]);
  });

  it("parses a private reading pack with two exercises", async () => {
    const buffer = await buildDocxBuffer(buildSyntheticPrivateDocParagraphs());
    const pack = await parsePrivateReadingPackFromArrayBuffer(buffer, "private-reading.docx");

    expect(pack.exercises).toHaveLength(2);
    expect(pack.exercises[0].questions).toHaveLength(10);
    expect(pack.exercises[1].questions).toHaveLength(8);
    expect(pack.exercises[0].questions[0].type).toBe("mcq");
    expect(pack.exercises[0].questions[1].type).toBe("true-false");
    expect(pack.exercises[1].questions[6].type).toBe("short-answer");
  });

  it("resolves citations from the imported passage", async () => {
    const buffer = await buildDocxBuffer(buildSyntheticPrivateDocParagraphs());
    const pack = await parsePrivateReadingPackFromArrayBuffer(buffer, "private-reading.docx");
    const firstExercise = pack.exercises[0];
    const citation = resolveCuratedCitation(firstExercise, { paragraphIndex: 1 });

    expect(citation).toBe("Paragraphe 2 avec une nuance supplémentaire.");
  });
});
