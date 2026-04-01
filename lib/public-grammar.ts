export interface PublicGrammarExercise {
  id: string;
  prompt: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
}

export type GrammarDifficulty = "basic" | "exam" | "challenge";

export interface GrammarDifficultyMeta {
  label: string;
  summary: string;
}

export interface PublicGrammarExample {
  sentence: string;
  note: string;
}

export interface PublicGrammarLesson {
  id: string;
  title: string;
  summary: string;
  explanations: string[];
  examTips: string[];
  examples: PublicGrammarExample[];
  exercises: PublicGrammarExercise[];
}

export const grammarDifficultyMeta: Record<GrammarDifficulty, GrammarDifficultyMeta> = {
  basic: {
    label: "Basic",
    summary: "Repérer la règle et sécuriser les automatismes essentiels."
  },
  exam: {
    label: "Exam",
    summary: "S'entraîner au niveau attendu dans une copie ou un exercice DELF B2."
  },
  challenge: {
    label: "Challenge",
    summary: "Aller plus loin avec des choix plus piégeux et des réflexes plus fins."
  }
};

function ex(
  id: string,
  prompt: string,
  choices: string[],
  correctIndex: number,
  explanation: string
): PublicGrammarExercise {
  return { id, prompt, choices, correctIndex, explanation };
}

function eg(sentence: string, note: string): PublicGrammarExample {
  return { sentence, note };
}

function lesson(config: PublicGrammarLesson): PublicGrammarLesson {
  return config;
}

export const publicGrammarLessons: PublicGrammarLesson[] = [
  lesson({
    id: "grammar-article",
    title: "L'article",
    summary: "Articles definis, indefinis et partitifs.",
    explanations: [
      "Le, la, les servent a designer un element deja connu ou identifie.",
      "Un, une, des introduisent un element nouveau. Du, de la, de l' expriment une quantite non comptable."
    ],
    examTips: [
      "Apres la negation, du / de la / des deviennent souvent de / d'.",
      "Une erreur d'article se voit tres vite dans une copie B2."
    ],
    examples: [
      eg("La bibliotheque de mon universite ferme trop tot.", "Lieu precis et connu."),
      eg("Je bois du cafe, mais je ne bois pas de soda.", "Partitif puis reduction avec la negation.")
    ],
    exercises: [
      ex("article-1", "Complete : J'ai achete ___ pain.", ["du", "le", "un"], 0, "Pain est ici une quantite non comptee."),
      ex("article-2", "Choisis la phrase correcte.", ["Je n'ai pas du temps.", "Je n'ai pas de temps.", "Je n'ai pas le tempss."], 1, "Apres la negation, on emploie de.")
    ]
  }),
  lesson({
    id: "grammar-adjective",
    title: "L'adjectif",
    summary: "Accord et place de l'adjectif.",
    explanations: [
      "L'adjectif s'accorde avec le nom en genre et en nombre.",
      "Sa place peut changer le sens : un ancien professeur / un professeur ancien."
    ],
    examTips: [
      "Les accords d'adjectifs sont tres visibles en production ecrite.",
      "Apprends quelques adjectifs qui changent de sens selon leur place."
    ],
    examples: [
      eg("Des solutions concretes et realistes sont necessaires.", "Accord feminin pluriel."),
      eg("Un grand homme / une grande maison.", "Le sens varie selon le contexte.")
    ],
    exercises: [
      ex("adjective-1", "Choisis la bonne forme.", ["des mesures efficace", "des mesures efficaces", "des mesures efficacement"], 1, "L'adjectif s'accorde avec mesures."),
      ex("adjective-2", "Complete : une solution tres ___.", ["interessant", "interessante", "interesser"], 1, "Solution est feminin singulier.")
    ]
  }),
  lesson({
    id: "grammar-negation",
    title: "Les negations",
    summary: "Ne... pas, plus, jamais, rien, personne, aucun.",
    explanations: [
      "La negation simple se construit avec ne... pas.",
      "D'autres mots nuancent l'absence : plus, jamais, rien, personne, aucun."
    ],
    examTips: [
      "A l'ecrit DELF B2, conserve ne dans la negation.",
      "Pense aussi a la negation avec infinitif : ne pas oublier."
    ],
    examples: [
      eg("Je ne partage pas cette opinion.", "Negation simple."),
      eg("Personne ne peut nier ce probleme.", "Personne devient sujet negatif.")
    ],
    exercises: [
      ex("negation-1", "Complete : Je n'ai ___ compris.", ["rien", "jamais", "personne"], 0, "Rien nie une chose."),
      ex("negation-2", "Choisis la phrase correcte.", ["Je veux pas partir.", "Je ne veux pas partir.", "Je ne veux partir pas."], 1, "La negation ecrite correcte est ne... pas.")
    ]
  }),
  lesson({
    id: "grammar-indicative",
    title: "Les temps de l'indicatif",
    summary: "Present, passe compose, imparfait, futur et plus-que-parfait.",
    explanations: [
      "Le present sert au constat, a l'habitude ou a la verite generale.",
      "Le passe compose marque un fait acheve, l'imparfait le decor ou l'habitude, le futur la projection."
    ],
    examTips: [
      "Au DELF B2, la coherence des temps est essentielle.",
      "Dans un recit, combine imparfait et passe compose avec logique."
    ],
    examples: [
      eg("Quand j'etais petit, je lisais beaucoup.", "Habitude et decor au passe."),
      eg("Hier, nous avons termine le rapport.", "Action achevee au passe.")
    ],
    exercises: [
      ex("indicative-1", "Complete : Quand j'etais petit, j'___ souvent a pied.", ["irai", "allais", "vais"], 1, "Il s'agit d'une habitude passee."),
      ex("indicative-2", "Choisis la forme correcte : Hier, nous ___ le rapport.", ["avons termine", "terminions", "terminerons"], 0, "Action achevee dans le passe.")
    ]
  }),
  lesson({
    id: "grammar-subjunctive",
    title: "Le subjonctif",
    summary: "Mode de la necessite, du doute, du jugement et de l'emotion.",
    explanations: [
      "Le subjonctif apparait apres il faut que, bien que, pour que, avant que, il est possible que.",
      "Il exprime une attitude du locuteur plutot qu'un fait simplement constate."
    ],
    examTips: [
      "Le subjonctif sert souvent a nuancer dans les lettres et articles d'opinion.",
      "Memorise d'abord les formes frequentes : soit, ait, fasse, puisse."
    ],
    examples: [
      eg("Il faut que nous soyons plus clairs.", "Necessite."),
      eg("Bien qu'il soit motive, il manque de methode.", "Concession.")
    ],
    exercises: [
      ex("subjunctive-1", "Complete : Il faut que tu ___.", ["viens", "viennes", "venir"], 1, "Il faut que impose le subjonctif."),
      ex("subjunctive-2", "Choisis la phrase correcte.", ["Bien qu'il est fatigue, il continue.", "Bien qu'il soit fatigue, il continue.", "Bien qu'il etait fatigue, il continue."], 1, "Bien que demande le subjonctif.")
    ]
  }),
  lesson({
    id: "grammar-conditionnel",
    title: "Le conditionnel",
    summary: "Politesse, hypothese et information nuancee.",
    explanations: [
      "Le conditionnel exprime une action soumise a une condition, une politesse ou une information prudente.",
      "Avec si : si + imparfait, conditionnel present ; si + plus-que-parfait, conditionnel passe."
    ],
    examTips: [
      "Le conditionnel aide a nuancer une proposition B2.",
      "On ne met pas si + conditionnel dans la structure classique."
    ],
    examples: [
      eg("Je voudrais proposer une autre solution.", "Politesse."),
      eg("Si nous avions plus de temps, nous approfondirions ce point.", "Hypothese.")
    ],
    exercises: [
      ex("conditionnel-1", "Complete : Si j'avais le choix, je ___.", ["partirai", "partirais", "pars"], 1, "Si + imparfait appelle le conditionnel present."),
      ex("conditionnel-2", "Quelle phrase est correcte ?", ["Si je pourrais, je viendrais.", "Si je pouvais, je viendrais.", "Si je viendrais, je pourrais."], 1, "On utilise si + imparfait.")
    ]
  }),
  lesson({
    id: "grammar-infinitive",
    title: "L'infinitif",
    summary: "Construction apres preposition, verbe ou expression impersonnelle.",
    explanations: [
      "L'infinitif suit souvent une preposition : avant de, sans, pour, afin de.",
      "Il suit aussi certains verbes : vouloir faire, pouvoir venir, devoir expliquer."
    ],
    examTips: [
      "Les constructions a l'infinitif rendent le style plus naturel.",
      "Memorise les verbes suivis de a ou de."
    ],
    examples: [
      eg("Avant de partir, relis ta conclusion.", "Infinitif apres une preposition."),
      eg("Il faut agir sans attendre.", "Infinitif apres sans.")
    ],
    exercises: [
      ex("infinitive-1", "Complete : Merci de ___ rapidement.", ["repondre", "reponds", "repondait"], 0, "Apres de, on met l'infinitif."),
      ex("infinitive-2", "Choisis la phrase correcte.", ["Avant partir, il faut prevenir.", "Avant de partir, il faut prevenir.", "Avant que partir, il faut prevenir."], 1, "Avant de + infinitif.")
    ]
  }),
  lesson({
    id: "grammar-participe-present",
    title: "Le participe present",
    summary: "Forme en -ant, invariable, utile pour condenser.",
    explanations: [
      "Le participe present reste invariable et se forme sur nous au present sans -ons.",
      "Il permet de condenser une information : sachant cela, comprenant ce point."
    ],
    examTips: [
      "Utilise-le avec moderation pour densifier le style.",
      "Ne le confonds pas avec l'adjectif verbal, qui s'accorde."
    ],
    examples: [
      eg("Sachant que le budget est limite, nous proposons une solution progressive.", "Participe present invariable."),
      eg("Les etudiants travaillant le soir ont besoin d'horaires plus souples.", "Precision sur le nom.")
    ],
    exercises: [
      ex("participe-1", "Choisis la bonne forme.", ["sachant", "sachants", "saches"], 0, "Le participe present est invariable."),
      ex("participe-2", "Complete : ___ la reponse, elle a pu nuancer son avis.", ["Sachant", "Sachante", "Savoir"], 0, "On attend le participe present.")
    ]
  }),
  lesson({
    id: "grammar-gerondif",
    title: "Le gerondif",
    summary: "En + participe present pour exprimer moyen, maniere ou simultaneite.",
    explanations: [
      "Le gerondif se forme avec en + participe present : en travaillant, en lisant.",
      "Il exprime souvent le moyen : on apprend en pratiquant."
    ],
    examTips: [
      "Le gerondif relie deux idees sans alourdir la phrase.",
      "Le sujet du gerondif est en principe le meme que celui de l'action principale."
    ],
    examples: [
      eg("On progresse en pratiquant regulierement.", "Le gerondif exprime le moyen."),
      eg("En relisant son texte, elle a repere plusieurs erreurs.", "Deux actions liees.")
    ],
    exercises: [
      ex("gerondif-1", "Complete : Il a ameliore son accent ___ des podcasts.", ["en ecoutant", "ecoutant", "a ecouter"], 0, "Le gerondif prend en + participe present."),
      ex("gerondif-2", "Choisis la phrase correcte.", ["En travaillant chaque jour, on progresse.", "Travailant chaque jour, on progresse.", "En travaille chaque jour, on progresse."], 0, "Seule la forme en + participe present est correcte.")
    ]
  }),
  lesson({
    id: "grammar-adjectif-verbal",
    title: "L'adjectif verbal",
    summary: "Forme proche du participe present, mais employee comme adjectif.",
    explanations: [
      "L'adjectif verbal qualifie un nom et s'accorde : des arguments convaincants.",
      "Il peut avoir une orthographe differente du participe present."
    ],
    examTips: [
      "Si le mot qualifie un nom et s'accorde, pense a l'adjectif verbal.",
      "Ce point renforce l'impression de precision grammaticale."
    ],
    examples: [
      eg("Des arguments convaincants peuvent faire changer d'avis.", "Le mot s'accorde avec arguments."),
      eg("Une remarque fatigante peut decourager un etudiant.", "Le mot qualifie remarque.")
    ],
    exercises: [
      ex("adjectif-verbal-1", "Choisis la bonne phrase.", ["Des arguments convaincants", "Des arguments convainquant", "Des arguments convaincre"], 0, "L'adjectif verbal s'accorde avec arguments."),
      ex("adjectif-verbal-2", "Complete : des mesures tres ___.", ["convaincantes", "convaincant", "convainquant"], 0, "Au feminin pluriel, on ecrit convaincantes.")
    ]
  }),
  lesson({
    id: "grammar-passive",
    title: "La forme passive",
    summary: "Etre + participe passe pour mettre l'accent sur le resultat.",
    explanations: [
      "La voix passive se forme avec etre + participe passe : le projet est adopte.",
      "L'agent peut etre exprime avec par, mais il peut aussi etre omis."
    ],
    examTips: [
      "La forme passive convient bien aux textes formels et comptes rendus.",
      "Pense a l'accord du participe passe avec le sujet du verbe passif."
    ],
    examples: [
      eg("La decision a ete annoncee hier soir.", "Passive au passe compose."),
      eg("Le projet a ete soutenu par plusieurs associations.", "Agent introduit par par.")
    ],
    exercises: [
      ex("passive-1", "Choisis la phrase passive.", ["Le maire presente le projet.", "Le projet est presente par le maire.", "Le maire presenterait le projet."], 1, "Etre + participe passe + agent eventuel."),
      ex("passive-2", "Complete : Les mesures ___ par le conseil.", ["ont adopte", "ont ete adoptees", "adoptaient"], 1, "Voix passive au passe compose avec accord.")
    ]
  }),
  lesson({
    id: "grammar-pronominales",
    title: "Les formes pronominales",
    summary: "Verbes avec se, s' pour parler de soi, d'une action reciproque ou d'un sens lexical fixe.",
    explanations: [
      "Les verbes pronominaux se conjuguent generalement avec etre : je me leve, ils se sont rencontres.",
      "Certains sont essentiellement pronominaux : se souvenir, s'enfuir, s'apercevoir."
    ],
    examTips: [
      "Surveille l'auxiliaire etre et l'accord du participe passe.",
      "Ne confonds pas se souvenir de avec se rappeler."
    ],
    examples: [
      eg("Elle s'est preparee serieusement pour l'examen.", "Verbe pronominal aux temps composes."),
      eg("Nous nous souvenons de cette consigne.", "Se souvenir de.")
    ],
    exercises: [
      ex("pronominales-1", "Choisis la phrase correcte.", ["Je me souviens cette date.", "Je me souviens de cette date.", "Je souviens de cette date."], 1, "Se souvenir se construit avec de."),
      ex("pronominales-2", "Quel auxiliaire emploie-t-on avec la plupart des verbes pronominaux ?", ["avoir", "etre", "faire"], 1, "Les verbes pronominaux se conjuguent avec etre.")
    ]
  }),
  lesson({
    id: "grammar-impersonnelles",
    title: "Les formes impersonnelles",
    summary: "Il impersonnel pour exprimer necessite, possibilite ou constat general.",
    explanations: [
      "Le il impersonnel ne renvoie a aucune personne precise : il faut, il semble, il est utile de.",
      "Ces formes sont tres utiles pour argumenter avec distance et objectivite."
    ],
    examTips: [
      "Les formes impersonnelles rendent un texte plus formel.",
      "Alterne avec des formulations personnelles pour garder du rythme."
    ],
    examples: [
      eg("Il faut mieux informer les usagers.", "Necessite."),
      eg("Il est possible de commencer par une phase d'essai.", "Possibilite.")
    ],
    exercises: [
      ex("impersonnelles-1", "Choisis la forme impersonnelle.", ["Il faut agir vite.", "Il mange vite.", "Il parle avec son ami."], 0, "Ici il n'a pas de referent precis."),
      ex("impersonnelles-2", "Complete : ___ utile de clarifier la consigne.", ["Il est", "Elle est", "Ils sont"], 0, "La forme impersonnelle correcte est il est.")
    ]
  }),
  lesson({
    id: "grammar-discours-indirect",
    title: "Le discours indirect",
    summary: "Rapporter des paroles ou des idees en adaptant pronoms, temps et reperes.",
    explanations: [
      "Au discours indirect, on introduit souvent avec que, si, ce que ou de + infinitif selon le verbe.",
      "Quand le verbe introducteur est au passe, certains reperes changent : demain -> le lendemain."
    ],
    examTips: [
      "Tres utile pour synthese, compte rendu et mediation.",
      "Fais attention aux pronoms et aux marqueurs de temps."
    ],
    examples: [
      eg("Il a dit : 'Je viendrai demain.' -> Il a dit qu'il viendrait le lendemain.", "Temps et repere changent."),
      eg("Elle demande : 'Pourquoi pars-tu ?' -> Elle demande pourquoi il part.", "Question au style indirect.")
    ],
    exercises: [
      ex("indirect-1", "Choisis la bonne transformation : Il a dit : 'Je suis fatigue.'", ["Il a dit qu'il etait fatigue.", "Il a dit qu'il est fatigue.", "Il a dit : qu'il etait fatigue."], 0, "Avec un introducteur au passe, on passe souvent a l'imparfait."),
      ex("indirect-2", "Quel mot introduit souvent une question fermee au discours indirect ?", ["que", "si", "dont"], 1, "On demande si..., il a voulu savoir si...")
    ]
  }),
  lesson({
    id: "grammar-adverb",
    title: "L'adverbe",
    summary: "Mot invariable qui modifie un verbe, un adjectif ou une phrase entiere.",
    explanations: [
      "L'adverbe apporte une precision de maniere, de temps, de quantite, de doute ou d'intensite.",
      "Beaucoup d'adverbes se forment avec -ment, mais leur place varie selon ce qu'ils modifient."
    ],
    examTips: [
      "Des adverbes bien choisis rendent l'argumentation plus nuancee.",
      "Evite d'en accumuler trop dans une meme phrase."
    ],
    examples: [
      eg("Elle s'exprime clairement devant le jury.", "Adverbe de maniere."),
      eg("Cette mesure est particulierement utile.", "L'adverbe modifie un adjectif.")
    ],
    exercises: [
      ex("adverb-1", "Quel mot est un adverbe ?", ["rapide", "rapidement", "rapidite"], 1, "Rapidement modifie l'action ou l'enonce."),
      ex("adverb-2", "Choisis la phrase correcte.", ["Il explique claire.", "Il explique clairement.", "Il clairement expliquee."], 1, "Clairement est l'adverbe attendu.")
    ]
  }),
  lesson({
    id: "grammar-prepositions",
    title: "Les prepositions",
    summary: "A, de, pour, avec, sans, chez, contre et autres liaisons essentielles.",
    explanations: [
      "Les prepositions marquent relation, direction, cause, moyen ou but.",
      "Certaines constructions doivent etre memorisees : penser a, dependre de, participer a."
    ],
    examTips: [
      "Les erreurs de preposition reviennent souvent au DELF B2.",
      "Memorise les verbes avec leur preposition."
    ],
    examples: [
      eg("Cette decision depend de plusieurs criteres.", "Dependre de."),
      eg("Nous comptons sur votre soutien pour avancer.", "Compter sur.")
    ],
    exercises: [
      ex("prepositions-1", "Complete : Cela depend ___ la situation.", ["a", "de", "sur"], 1, "Le verbe dependre se construit avec de."),
      ex("prepositions-2", "Choisis la phrase correcte.", ["Je pense de ce projet.", "Je pense a ce projet.", "Je pense sur ce projet."], 1, "Penser a quelque chose dans ce sens.")
    ]
  }),
  lesson({
    id: "grammar-relative-pronouns",
    title: "Les pronoms relatifs",
    summary: "Qui, que, dont, ou, lequel et leurs fonctions.",
    explanations: [
      "Les pronoms relatifs relient deux propositions en evitant la repetition d'un nom.",
      "Qui remplace souvent le sujet, que le COD, dont un complement avec de, ou un lieu ou un moment."
    ],
    examTips: [
      "Dont est tres frequent dans les textes DELF.",
      "Relis la fonction du mot remplace : sujet, objet, lieu, possession."
    ],
    examples: [
      eg("Le livre dont je parle est tres utile.", "Parler de -> dont."),
      eg("La ville ou j'etudie est calme.", "Ou renvoie au lieu.")
    ],
    exercises: [
      ex("relative-1", "Complete : La personne ___ m'a aidee habite ici.", ["que", "qui", "dont"], 1, "Le pronom remplace le sujet du verbe a aide."),
      ex("relative-2", "Complete : Le sujet ___ nous discutons est delicat.", ["qui", "dont", "ou"], 1, "Discuter de -> dont.")
    ]
  }),
  lesson({
    id: "grammar-object-pronouns",
    title: "Les pronoms personnels complements",
    summary: "COD, COI et doubles pronoms pour eviter les repetitions.",
    explanations: [
      "Les pronoms COD sont me, te, le, la, nous, vous, les. Les COI frequents sont lui, leur, me, te, nous, vous.",
      "Ils se placent avant le verbe conjugue : je le vois, je lui parle, je la lui donne."
    ],
    examTips: [
      "Ce point aide beaucoup la fluidite a l'oral comme a l'ecrit.",
      "Attention a l'ordre des doubles pronoms."
    ],
    examples: [
      eg("Je vois Marie. -> Je la vois.", "COD."),
      eg("Je parle au directeur. -> Je lui parle.", "COI.")
    ],
    exercises: [
      ex("object-1", "Remplace 'Marie' : Je vois Marie.", ["Je lui vois.", "Je la vois.", "Je les vois."], 1, "Marie est COD feminin singulier."),
      ex("object-2", "Choisis la bonne phrase.", ["Je la lui donne.", "Je lui la donne.", "Je donne la lui."], 0, "L'ordre correct ici est la + lui.")
    ]
  }),
  lesson({
    id: "grammar-indefinite-pronouns",
    title: "Les pronoms indefinis",
    summary: "Quelqu'un, personne, chacun, plusieurs, certains, aucun, tout...",
    explanations: [
      "Les pronoms indefinis designent des personnes ou des choses de maniere vague ou globale.",
      "Ils permettent de generaliser, nuancer ou limiter sans nommer precisement le referent."
    ],
    examTips: [
      "Ils sont utiles dans les textes d'opinion pour generaliser sans absolutiser.",
      "Fais attention au sens negatif de personne, rien, aucun."
    ],
    examples: [
      eg("Chacun doit prendre sa part de responsabilite.", "Generalisation individuelle."),
      eg("Personne n'a conteste cette idee.", "Pronom indefini negatif.")
    ],
    exercises: [
      ex("indefinite-1", "Choisis le bon mot : ___ n'a repondu au message.", ["Quelqu'un", "Personne", "Chacun"], 1, "Personne exprime l'absence de reponse."),
      ex("indefinite-2", "Complete : ___ doit faire un effort pour progresser.", ["Chacun", "Personne", "Aucune"], 0, "Chacun renvoie a chaque individu.")
    ]
  }),
  lesson({
    id: "grammar-time-location",
    title: "La situation dans le temps",
    summary: "Depuis, pendant, il y a, dans, a partir de, jusqu'a.",
    explanations: [
      "Depuis exprime une duree qui continue jusqu'au present. Pendant exprime une duree limitee. Il y a situe un fait dans le passe.",
      "Dans renvoie souvent a un delai futur : dans deux jours."
    ],
    examTips: [
      "Ces marqueurs sont essentiels pour la coherence temporelle.",
      "Relis bien si l'action continue encore ou si elle est terminee."
    ],
    examples: [
      eg("J'etudie le francais depuis trois ans.", "L'action continue."),
      eg("Il a commence ce projet il y a deux semaines.", "Point de depart situe dans le passe.")
    ],
    exercises: [
      ex("time-1", "Complete : J'habite ici ___ 2022.", ["depuis", "pendant", "dans"], 0, "Depuis convient pour une situation qui continue."),
      ex("time-2", "Choisis la phrase correcte.", ["Je pars depuis deux jours.", "Je pars dans deux jours.", "Je pars pendant deux jours."], 1, "Dans deux jours indique un delai avant le depart.")
    ]
  })
];

function cloneExercise(
  lesson: PublicGrammarLesson,
  difficulty: GrammarDifficulty,
  exercise: PublicGrammarExercise,
  index: number
): PublicGrammarExercise {
  return {
    ...exercise,
    id: `${lesson.id}-${difficulty}-${index + 1}`,
    prompt:
      difficulty === "basic"
        ? `${exercise.prompt}`
        : difficulty === "challenge"
          ? `${exercise.prompt} Fais attention au piège de registre ou de logique.`
          : exercise.prompt
  };
}

function buildRuleCheckExercise(lesson: PublicGrammarLesson): PublicGrammarExercise {
  return ex(
    `${lesson.id}-rule-check`,
    `Quelle idée-clé résume le mieux la règle de ${lesson.title.toLowerCase()} ?`,
    [
      lesson.explanations[0],
      "Il faut surtout éviter cette structure dans tout texte formel.",
      "Le plus important est de traduire mot à mot depuis sa langue maternelle."
    ],
    0,
    `Le bon point de départ est bien celui-ci : ${lesson.explanations[0]}`
  );
}

function buildExampleCheckExercise(lesson: PublicGrammarLesson): PublicGrammarExercise {
  const example = lesson.examples[0];

  return ex(
    `${lesson.id}-example-check`,
    `Dans l'exemple « ${example.sentence} », quelle observation est correcte ?`,
    [
      example.note,
      "Cette phrase montre surtout qu'il faut supprimer le verbe principal.",
      "Cette phrase prouve qu'aucun contexte n'est nécessaire pour choisir la forme."
    ],
    0,
    example.note
  );
}

function buildTipCheckExercise(lesson: PublicGrammarLesson): PublicGrammarExercise {
  const tip = lesson.examTips[0] ?? lesson.explanations[0];

  return ex(
    `${lesson.id}-tip-check`,
    `Quel réflexe DELF B2 est le plus utile pour ${lesson.title.toLowerCase()} ?`,
    [
      tip,
      "Allonger la phrase autant que possible, même si la structure devient floue.",
      "Éviter totalement cette structure pour ne prendre aucun risque."
    ],
    0,
    tip
  );
}

export function getGrammarLessonExercises(
  lesson: PublicGrammarLesson,
  difficulty: GrammarDifficulty
): PublicGrammarExercise[] {
  const examExercises = lesson.exercises.map((exercise, index) =>
    cloneExercise(lesson, difficulty, exercise, index)
  );

  if (difficulty === "basic") {
    return [buildRuleCheckExercise(lesson), buildExampleCheckExercise(lesson), examExercises[0]].filter(
      Boolean
    ) as PublicGrammarExercise[];
  }

  if (difficulty === "challenge") {
    return [...examExercises, buildTipCheckExercise(lesson), buildExampleCheckExercise(lesson)];
  }

  return examExercises;
}
