import JSZip from "jszip";
import {
  CuratedReadingCitation,
  CuratedReadingExercise,
  CuratedReadingMcqQuestion,
  CuratedReadingPack,
  CuratedReadingQuestion,
  CuratedReadingShortAnswerQuestion,
  CuratedReadingTrueFalseQuestion
} from "@/lib/types";

class PrivateReadingImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PrivateReadingImportError";
  }
}

function decodeXmlEntities(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

export function extractParagraphsFromWordXml(xml: string) {
  const paragraphs = xml.match(/<w:p\b[\s\S]*?<\/w:p>/g) ?? [];

  return paragraphs
    .map((paragraph) => {
      const withBreaks = paragraph.replace(/<w:(?:br|cr)\/>/g, "\n").replace(/<w:tab\/>/g, "\t");
      const texts = [...withBreaks.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g)].map((match) =>
        decodeXmlEntities(match[1])
      );
      return texts.join("").replace(/\s+\n/g, "\n").replace(/\n\s+/g, "\n").trim();
    })
    .filter(Boolean);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createId(prefix: string, seed: string) {
  return `${prefix}-${slugify(seed)}`;
}

function isQuestionLine(line: string) {
  return /^Question\s+\d+\./i.test(line);
}

function isExerciseHeading(line: string) {
  const compact = line.replace(/\s+/g, " ").trim();
  if (compact.length < 10) {
    return false;
  }

  if (/^(DELF B2|Compréhension des écrits|Texte converti|Vocabulaire|EXERCICE)/i.test(compact)) {
    return false;
  }

  return compact === compact.toUpperCase() && /^[A-ZÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸ'’\- ]+$/.test(compact);
}

function buildExerciseSlices(paragraphs: string[]) {
  const headingIndexes = paragraphs
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => isExerciseHeading(line))
    .map(({ index }) => index);

  if (headingIndexes.length < 2) {
    throw new PrivateReadingImportError("Le document ne contient pas les deux exercices attendus.");
  }

  return headingIndexes.slice(0, 2).map((start, index) => {
    const end = headingIndexes[index + 1] ?? paragraphs.length;
    return paragraphs.slice(start, end);
  });
}

function extractSourceLine(lines: string[], questionStartIndex: number) {
  const sourceIndex = [...lines.keys()]
    .filter((index) => index < questionStartIndex && /\b(19|20)\d{2}\b/.test(lines[index]))
    .at(-1);
  if (sourceIndex === undefined) {
    throw new PrivateReadingImportError("La source du texte n'a pas pu être repérée.");
  }
  return {
    sourceLine: lines[sourceIndex],
    sourceIndex
  };
}

function parseExercise1Questions(lines: string[], exerciseId: string): CuratedReadingQuestion[] {
  const questions: CuratedReadingQuestion[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!isQuestionLine(line)) {
      index += 1;
      continue;
    }

    const questionNumber = line.match(/^Question\s+(\d+)\./i)?.[1] ?? "0";
    const prompt = line.replace(/^Question\s+\d+\.\s*/i, "").trim();
    const nextQuestionIndex =
      lines.findIndex((candidate, innerIndex) => innerIndex > index && isQuestionLine(candidate)) === -1
        ? lines.length
        : lines.findIndex((candidate, innerIndex) => innerIndex > index && isQuestionLine(candidate));
    const block = lines.slice(index + 1, nextQuestionIndex === -1 ? lines.length : nextQuestionIndex);

    if (questionNumber === "1") {
      const choices = block
        .filter((item) => item.includes("☐"))
        .map((item) => item.replace(/^☐\s*/, "").trim());
      questions.push({
        id: `${exerciseId}-q1`,
        label: "1",
        prompt,
        type: "mcq",
        choices,
        correction: {
          correctChoiceIndex: 2,
          explanation: "Le texte informe surtout sur les moyens d'identifier ou de repérer la présence d'OGM dans l'alimentation."
        }
      } satisfies CuratedReadingMcqQuestion);
    } else if (questionNumber === "2") {
      const statements = block.filter((item) => /^\d+\./.test(item));
      const corrections: Array<{ value: boolean; explanation: string; citation: CuratedReadingCitation }> = [
        {
          value: false,
          explanation: "Avant 2004, certains additifs dérivés de cultures transgéniques pouvaient déjà se retrouver dans l'alimentation.",
          citation: { paragraphIndex: 0 }
        },
        {
          value: false,
          explanation: "L'autorisation évoquée dans le texte vient d'une décision européenne et non d'une décision strictement nationale.",
          citation: { paragraphIndex: 0 }
        },
        {
          value: true,
          explanation: "Le texte souligne que les risques sont encore discutés et ne sont pas présentés comme totalement confirmés.",
          citation: { paragraphIndex: 1 }
        },
        {
          value: true,
          explanation: "Les transformateurs français sont décrits comme prudents et refusent la commercialisation directe du maïs doux transgénique.",
          citation: { paragraphIndex: 3 }
        },
        {
          value: false,
          explanation: "Les contrôles sont possibles de façon aléatoire; le texte ne parle pas d'un contrôle systématique de tous les produits.",
          citation: { paragraphIndex: 7 }
        }
      ];

      statements.forEach((statement, statementIndex) => {
        questions.push({
          id: `${exerciseId}-q2-${statementIndex + 1}`,
          label: `2.${statementIndex + 1}`,
          prompt: statement.replace(/^\d+\.\s*/, "").trim(),
          type: "true-false",
          correction: {
            correctValue: corrections[statementIndex].value,
            explanation: corrections[statementIndex].explanation,
            citation: corrections[statementIndex].citation
          }
        } satisfies CuratedReadingTrueFalseQuestion);
      });
    } else {
      const shortAnswerCorrections: Record<
        string,
        CuratedReadingShortAnswerQuestion["correction"]
      > = {
        "3": {
          modelAnswer:
            "Deux menaces possibles sont l'augmentation du risque de cancer et le renforcement des résistances aux antibiotiques. Une autre réponse acceptable est le risque allergique.",
          keyPoints: [
            "toxines ou effets biologiques inattendus",
            "cancer ou effets préoccupants observés sur des rats",
            "potentiel allergisant",
            "résistance accrue aux antibiotiques"
          ],
          explanation: "La réponse attendue consiste à relever deux dangers potentiels évoqués dans le passage scientifique.",
          citation: { paragraphIndex: 1 }
        },
        "4": {
          modelAnswer:
            "On peut consommer des OGM sans le savoir via les produits d'animaux nourris avec des OGM, et via des additifs dérivés d'OGM présents dans différents aliments. Le seuil inférieur à 0,9 % peut aussi masquer certaines traces.",
          keyPoints: [
            "produits animaux non étiquetés",
            "additifs dérivés d'OGM",
            "seuil de 0,9 % sous lequel l'indication n'est pas obligatoire"
          ],
          explanation: "Il faut montrer que l'étiquetage ne couvre pas tous les cas possibles de consommation indirecte.",
          citation: { paragraphIndex: 2 }
        },
        "5": {
          modelAnswer:
            "Les industriels doivent assurer une traçabilité complète: certificats d'origine, registre des entrées et sorties, et conservation des informations pendant cinq ans.",
          keyPoints: [
            "certificats d'origine",
            "registre des entrées et sorties",
            "conservation des données pendant cinq ans"
          ],
          explanation: "Le texte attend une réponse sur la traçabilité, pas seulement sur l'étiquetage visible en magasin.",
          citation: { paragraphIndex: 6 }
        },
        "6": {
          modelAnswer:
            "L'expression signifie que l'annonce a provoqué un choc important et une réaction très forte dans l'opinion.",
          keyPoints: [
            "annonce très choquante",
            "réaction forte ou brutale",
            "impact immédiat sur le public"
          ],
          explanation: "Il faut reformuler l'image en français courant à partir du contexte.",
          citation: { paragraphIndex: 1 }
        }
      };

      const correction = shortAnswerCorrections[questionNumber];
      if (!correction) {
        throw new PrivateReadingImportError("Une question ouverte de l'exercice 1 n'a pas été reconnue.");
      }
      questions.push({
        id: `${exerciseId}-q${questionNumber}`,
        label: questionNumber,
        prompt,
        type: "short-answer",
        placeholder: "Rédige ta réponse en quelques lignes.",
        correction
      } satisfies CuratedReadingShortAnswerQuestion);
    }

    index = nextQuestionIndex === -1 ? lines.length : nextQuestionIndex;
  }

  return questions;
}

function parseExercise2Questions(lines: string[], exerciseId: string): CuratedReadingQuestion[] {
  const questions: CuratedReadingQuestion[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!isQuestionLine(line)) {
      index += 1;
      continue;
    }

    const questionNumber = line.match(/^Question\s+(\d+)\./i)?.[1] ?? "0";
    const prompt = line.replace(/^Question\s+\d+\.\s*/i, "").trim();
    const nextQuestionIndex =
      lines.findIndex((candidate, innerIndex) => innerIndex > index && isQuestionLine(candidate)) === -1
        ? lines.length
        : lines.findIndex((candidate, innerIndex) => innerIndex > index && isQuestionLine(candidate));
    const block = lines.slice(index + 1, nextQuestionIndex === -1 ? lines.length : nextQuestionIndex);

    if (questionNumber !== "7") {
      const choices = block
        .filter((item) => item.includes("☐"))
        .map((item) => item.replace(/^☐\s*/, "").trim());
      const correctChoiceIndexes: Record<string, number> = {
        "1": 2,
        "2": 3,
        "3": 1,
        "4": 0,
        "5": 3,
        "6": 0
      };
      const explanations: Record<string, string> = {
        "1": "Le journaliste insiste surtout sur l'appauvrissement du goût et sur la banalisation sensorielle provoqués par le sucre.",
        "2": "Le premier paragraphe met surtout en cause l'influence des industriels et de la grande distribution sur les habitudes alimentaires.",
        "3": "La tartine est valorisée parce qu'elle maintient une diversité de goûts et évite l'uniformisation sensorielle.",
        "4": "Le texte relie le manque d'intérêt alimentaire à la disparition du repas familial structuré.",
        "5": "Le passage final insiste sur un emploi du temps trop chargé et sur un rythme de vie qui pousse vers le prêt-à-manger.",
        "6": "Le ton du journaliste est nettement hostile et accusateur vis-à-vis de la place du sucre dans l'alimentation des jeunes."
      };

      questions.push({
        id: `${exerciseId}-q${questionNumber}`,
        label: questionNumber,
        prompt,
        type: "mcq",
        choices,
        correction: {
          correctChoiceIndex: correctChoiceIndexes[questionNumber],
          explanation: explanations[questionNumber]
        }
      } satisfies CuratedReadingMcqQuestion);

      if (questionNumber === "6") {
        questions.push({
          id: `${exerciseId}-q6b`,
          label: "6b",
          prompt: block.find((item) => !item.includes("☐")) ?? "Relevez deux mots qui justifient votre réponse.",
          type: "short-answer",
          placeholder: "Recopie deux mots ou expressions du texte.",
          correction: {
            modelAnswer:
              "Il faut relever deux termes fortement négatifs utilisés au début du texte pour condamner le sucre et son omniprésence.",
            keyPoints: [
              "deux mots ou expressions négatifs tirés du premier paragraphe",
              "appui dans l'attaque initiale du journaliste",
              "termes montrant une condamnation sans ambiguïté"
            ],
            explanation: "La justification attendue repose sur le vocabulaire très critique du premier paragraphe.",
            citation: { paragraphIndex: 0 }
          }
        } satisfies CuratedReadingShortAnswerQuestion);
      }
    } else {
      questions.push({
        id: `${exerciseId}-q7`,
        label: "7",
        prompt,
        type: "short-answer",
        placeholder: "Explique le titre avec tes propres mots.",
        correction: {
          modelAnswer:
            "Le titre signifie que les jeunes perdent peu à peu leur goût, leurs repères alimentaires et le plaisir d'une vraie éducation sensorielle à cause d'une alimentation industrielle trop sucrée.",
          keyPoints: [
            "perte du goût ou des repères sensoriels",
            "jeunesse façonnée par une alimentation industrielle",
            "jeu de mots entre dégoût et perte du goût"
          ],
          explanation: "Il faut expliquer à la fois le sens critique du titre et le jeu sur la perte du goût.",
          citation: { paragraphIndex: 3 }
        }
      } satisfies CuratedReadingShortAnswerQuestion);
    }

    index = nextQuestionIndex === -1 ? lines.length : nextQuestionIndex;
  }

  return questions;
}

function buildExercisesFromParagraphs(paragraphs: string[]) {
  const [firstSlice, secondSlice] = buildExerciseSlices(paragraphs);

  const buildExercise = (slice: string[], exerciseNumber: number): CuratedReadingExercise => {
    const title = slice[0];
    const questionStartIndex = slice.findIndex((line) => isQuestionLine(line));
    if (questionStartIndex === -1) {
      throw new PrivateReadingImportError("Les questions n'ont pas pu être repérées dans le document.");
    }

    const { sourceLine, sourceIndex } = extractSourceLine(slice, questionStartIndex);
    const vocabularyIndex = slice.findIndex((line) => /^Vocabulaire$/i.test(line));
    const instructionsIndex = slice.findIndex((line) => /^Répondez aux questions/i.test(line));

    const passage = slice.slice(1, sourceIndex);
    const vocabulary =
      vocabularyIndex !== -1
        ? slice.slice(vocabularyIndex + 1, questionStartIndex)
        : undefined;
    const instructions =
      instructionsIndex !== -1 && instructionsIndex < questionStartIndex
        ? slice[instructionsIndex]
        : undefined;
    const questionLines = slice.slice(questionStartIndex);

    if (passage.length === 0) {
      throw new PrivateReadingImportError("Le texte de lecture n'a pas pu être extrait.");
    }

    return {
      id: createId("private-reading-exercise", `${exerciseNumber}-${title}`),
      title,
      sourceLabel: sourceLine,
      instructions,
      passage,
      vocabulary,
      questions:
        exerciseNumber === 1
          ? parseExercise1Questions(questionLines, `exercise-${exerciseNumber}`)
          : parseExercise2Questions(questionLines, `exercise-${exerciseNumber}`)
    };
  };

  return [buildExercise(firstSlice, 1), buildExercise(secondSlice, 2)];
}

export async function parsePrivateReadingPackFromArrayBuffer(
  arrayBuffer: ArrayBuffer,
  filename: string
): Promise<CuratedReadingPack> {
  const zip = await JSZip.loadAsync(arrayBuffer);
  const documentFile = zip.file("word/document.xml");
  if (!documentFile) {
    throw new PrivateReadingImportError("Le fichier .docx ne contient pas le document attendu.");
  }

  const xml = await documentFile.async("string");
  const paragraphs = extractParagraphsFromWordXml(xml);
  const exercises = buildExercisesFromParagraphs(paragraphs);

  return {
    id: createId("private-reading-pack", filename),
    filename,
    label: "Dossier privé importé",
    importedAt: new Date().toISOString(),
    exercises
  };
}

export async function parsePrivateReadingPackFromFile(file: File) {
  return parsePrivateReadingPackFromArrayBuffer(await file.arrayBuffer(), file.name);
}

export function resolveCuratedCitation(exercise: CuratedReadingExercise, citation?: CuratedReadingCitation) {
  if (!citation) {
    return null;
  }

  return exercise.passage[citation.paragraphIndex] ?? null;
}

export function isPrivateReadingImportError(error: unknown): error is PrivateReadingImportError {
  return error instanceof PrivateReadingImportError;
}
