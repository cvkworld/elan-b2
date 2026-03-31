import {
  CuratedReadingCitation,
  CuratedReadingExercise,
  CuratedReadingMcqQuestion,
  CuratedReadingShortAnswerQuestion,
  CuratedReadingTrueFalseQuestion
} from "@/lib/types";

function mcq(
  id: string,
  label: string,
  prompt: string,
  choices: string[],
  correctChoiceIndex: number,
  explanation: string,
  citation?: CuratedReadingCitation
): CuratedReadingMcqQuestion {
  return {
    id,
    label,
    prompt,
    type: "mcq",
    choices,
    correction: {
      correctChoiceIndex,
      explanation,
      citation
    }
  };
}

function tf(
  id: string,
  label: string,
  prompt: string,
  correctValue: boolean,
  explanation: string,
  citation?: CuratedReadingCitation
): CuratedReadingTrueFalseQuestion {
  return {
    id,
    label,
    prompt,
    type: "true-false",
    correction: {
      correctValue,
      explanation,
      citation
    }
  };
}

function shortAnswer(
  id: string,
  label: string,
  prompt: string,
  modelAnswer: string,
  keyPoints: string[],
  explanation: string,
  citation?: CuratedReadingCitation,
  placeholder = "Rédige ta réponse en quelques lignes."
): CuratedReadingShortAnswerQuestion {
  return {
    id,
    label,
    prompt,
    type: "short-answer",
    placeholder,
    correction: {
      modelAnswer,
      keyPoints,
      explanation,
      citation
    }
  };
}

export const publicReadingExercises: CuratedReadingExercise[] = [
  {
    id: "public-reading-ogm",
    title: "COMMENT REPÉRER LES OGM DANS NOS ASSIETTES",
    sourceLabel: "Le Pèlerin magazine, février 2005",
    passage: [
      "Mai 2004 : pour la première fois depuis 1998, la Commission européenne autorise l’importation en France d’un maïs doux transgénique. Jusque-là, seuls des additifs dérivés de maïs, soja et colza pouvaient se retrouver dans nos aliments.",
      "La nouvelle fait l’effet d’une bombe, car elle met fin à cinq ans de moratoire durant lesquels les États européens avaient décidé de ne plus accorder de nouvelles autorisations d’importation ou de mise en culture d’OGM. Pourtant, on ignore encore si les organismes transgéniques présentent véritablement des dangers pour l’homme. Des scientifiques s’inquiètent du risque éventuel de voir les plantes produire des toxines inhabituelles, d’augmenter les risques de cancer, de devenir plus allergisantes ou encore d’accroître la résistance aux antibiotiques.",
      "La mesure s’accompagne de l’entrée en vigueur d’un règlement européen sur l’étiquetage des OGM. Tous les OGM consommés tels quels ainsi que tous les aliments dont l’un des constituants est dérivé d’OGM doivent être étiquetés. En dessous de 0,9 %, les industriels ne sont pas obligés d’indiquer la présence d’OGM.",
      "Mais les produits d’animaux nourris avec des OGM, comme la viande, les œufs, le lait, le beurre, la crème et certains plats préparés, échappent à l’étiquetage. Aucun consommateur ne devrait trouver sur le marché français des OGM non transformés. Le maïs doux en grain a d’ailleurs été rejeté par les principaux transformateurs français, qui se sont engagés à ne pas le commercialiser.",
      "Une multitude d’aliments sont aussi susceptibles de contenir des additifs dérivés d’OGM, comme l’amidon de maïs, la lécithine de soja ou l’huile de soja.",
      "Pourtant, les aliments mentionnant la présence d’un ingrédient génétiquement transformé sont rares dans les magasins. Greenpeace évoque une vingtaine de produits concernés sur environ 80 000 produits alimentaires, surtout importés des États-Unis et du Canada.",
      "L’obligation d’étiqueter les aliments pouvant contenir des OGM se double de celle, pour les industriels, de mettre en place une traçabilité efficace. Les fournisseurs doivent présenter des certificats d’origine, consigner les entrées et sorties des denrées et conserver l’information pendant cinq ans.",
      "Les autorités nationales de contrôle peuvent effectuer des vérifications aléatoires : contrôles des documents et tests en laboratoire sur des échantillons prélevés dans les lots."
    ],
    questions: [
      mcq(
        "public-reading-ogm-q1",
        "1",
        "Le texte cherche à :",
        [
          "inciter les consommateurs à s’opposer aux OGM et à ne pas les consommer.",
          "exposer le point de vue des instances dirigeantes sur la question des OGM.",
          "faire le point sur les moyens pour les consommateurs de s’informer sur les OGM."
        ],
        2,
        "Le document présente surtout les règles, les limites de l’étiquetage et les moyens de repérer la présence d’OGM dans l’alimentation."
      ),
      tf(
        "public-reading-ogm-q2-1",
        "2.1",
        "Avant 2004 aucun produit alimentaire ne pouvait contenir d’OGM.",
        false,
        "Le texte précise qu’avant 2004, des additifs dérivés de maïs, de soja et de colza pouvaient déjà se retrouver dans les aliments.",
        { paragraphIndex: 0 }
      ),
      tf(
        "public-reading-ogm-q2-2",
        "2.2",
        "Le récent droit d’importer des produits issus d’OGM est une décision nationale.",
        false,
        "L’autorisation est attribuée à la Commission européenne, donc il ne s’agit pas d’une décision purement nationale.",
        { paragraphIndex: 0 }
      ),
      tf(
        "public-reading-ogm-q2-3",
        "2.3",
        "Les risques liés à la consommation d’OGM ne sont pas véritablement confirmés.",
        true,
        "Le document explique qu’on ignore encore si les organismes transgéniques présentent véritablement des dangers pour l’homme.",
        { paragraphIndex: 1 }
      ),
      tf(
        "public-reading-ogm-q2-4",
        "2.4",
        "Les transformateurs français sont très prudents quant à la commercialisation de produits contenant des OGM.",
        true,
        "Le maïs doux en grain a été rejeté par les principaux transformateurs français, qui se sont engagés à ne pas le commercialiser.",
        { paragraphIndex: 3 }
      ),
      tf(
        "public-reading-ogm-q2-5",
        "2.5",
        "Les produits alimentaires de l’ensemble du territoire sont systématiquement contrôlés.",
        false,
        "Le texte parle de vérifications aléatoires, pas d’un contrôle systématique de tous les produits.",
        { paragraphIndex: 7 }
      ),
      shortAnswer(
        "public-reading-ogm-q3",
        "3",
        "Citez 2 menaces potentielles liées à la consommation d’OGM.",
        "On peut citer l’augmentation possible des risques de cancer, le potentiel allergisant accru, ou encore le risque de résistance plus forte aux antibiotiques.",
        ["augmentation des risques de cancer", "potentiel allergisant", "résistance accrue aux antibiotiques"],
        "Une réponse forte reprend deux dangers précis mentionnés dans le passage scientifique.",
        { paragraphIndex: 1 }
      ),
      shortAnswer(
        "public-reading-ogm-q4",
        "4",
        "Donnez deux éléments qui prouvent que l’on peut absorber des aliments OGM à notre insu.",
        "On peut en absorber sans le savoir via les produits d’animaux nourris avec des OGM, via des additifs dérivés d’OGM, et aussi parce qu’en dessous de 0,9 % la présence n’a pas à être indiquée.",
        ["produits animaux nourris avec des OGM non étiquetés", "additifs dérivés d’OGM", "absence d’indication obligatoire sous le seuil de 0,9 %"],
        "Il faut montrer que l’étiquetage n’est pas total et qu’une consommation indirecte reste possible.",
        { paragraphIndex: 2 }
      ),
      shortAnswer(
        "public-reading-ogm-q5",
        "5",
        "Quelles mesures complémentaires à l’étiquetage les industriels doivent-ils respecter ?",
        "Ils doivent assurer une traçabilité complète : certificats d’origine, registre des entrées et sorties, et conservation des informations pendant cinq ans.",
        ["certificats garantissant l’origine", "registre des entrées et sorties", "conservation des informations pendant cinq ans"],
        "La réponse attendue porte sur la traçabilité et non seulement sur la mention visible au consommateur.",
        { paragraphIndex: 6 }
      ),
      shortAnswer(
        "public-reading-ogm-q6",
        "6",
        "Expliquez l’expression suivante en relation avec le contexte : « La nouvelle fait l’effet d’une bombe ».",
        "L’expression signifie que l’annonce a provoqué un choc important et une réaction très forte, car elle mettait fin à cinq ans de moratoire sur les OGM.",
        ["annonce brutale ou choquante", "fort impact dans l’opinion", "fin du moratoire sur les OGM"],
        "Une bonne reformulation traduit l’image de manière simple tout en la reliant à la décision européenne.",
        { paragraphIndex: 1 }
      )
    ]
  },
  {
    id: "public-reading-sugar",
    title: "UNE JEUNESSE DÉ-GOÛTÉE",
    sourceLabel: "D’après le magazine Marianne, 2005",
    instructions: "Répondez aux questions en cochant la bonne réponse.",
    passage: [
      "Un fléau majeur est en train de lessiver les papilles de la France de demain : le sucre. Non content de gâter les dents, de polluer les saveurs et d’envahir l’alimentation des jeunes, il est devenu un véritable symbole culturel. Notre jeunesse est confite dans le sucre, sous l’influence du lobby betteravier, de l’industrie agroalimentaire et de la grande distribution.",
      "La menace la plus sérieuse se situe au petit déjeuner, la céréale sucrée ayant remplacé la bonne vieille tartine de pain et de beurre avec miel ou confiture.",
      "La consommation quotidienne de céréales sucrées aboutit à une banalisation sensorielle. Aucune tartine ne ressemble à une autre, alors que la boîte de céréales est toujours, et partout, la même. L’apparition du light participe aussi à la désinformation des sens.",
      "Ainsi privés de repères et de mémoire, les jeunes ont désappris à manger. Les souvenirs d’enfance liés à la table et à un plat préparé en famille s’effacent. Le déjeuner en famille est en voie de disparition, et le repas collectif à une même table tend lui aussi à s’éteindre.",
      "S’il y a dîner familial, ce sera souvent sur la base d’une conserve ou d’un surgelé réchauffés à la va-vite. La femme active, libérée de ses contraintes domestiques ou empêchée par un timing impossible, trouve dans la malbouffe industrielle les outils de son émancipation culinaire. Non content de ne plus apprendre à manger au jeune, on lui désapprend à savourer."
    ],
    vocabulary: [
      "papilles : organes récepteurs du goût",
      "bedaine : ventre",
      "lobby betteravier : groupe de pression des producteurs de betteraves",
      "light : allégé",
      "ersatz : produit alimentaire qui en remplace un autre",
      "packaging : emballage",
      "faire florès : obtenir des succès",
      "ingurgiter : avaler"
    ],
    questions: [
      mcq(
        "public-reading-sugar-q1",
        "1",
        "D’après le journaliste, quel est le principal effet du sucre ?",
        [
          "Générer de la surcharge pondérale.",
          "Participer au rayonnement de la cuisine française.",
          "Neutraliser la sensibilité gustative.",
          "Mettre en danger les cultures céréalières."
        ],
        2,
        "Le journaliste insiste surtout sur l’appauvrissement du goût et sur la banalisation sensorielle provoqués par le sucre.",
        { paragraphIndex: 2 }
      ),
      mcq(
        "public-reading-sugar-q2",
        "2",
        "Le problème soulevé par le premier paragraphe est :",
        [
          "la suralimentation des enfants dès le plus jeune âge.",
          "le désintérêt des parents pour l’éducation de leurs enfants au goût.",
          "le rôle éducatif des médias sur les comportements alimentaires.",
          "l’influence des industriels sur la façon de s’alimenter."
        ],
        3,
        "La fin du premier paragraphe attribue cette situation au lobby betteravier, à l’industrie agroalimentaire et à la grande distribution.",
        { paragraphIndex: 0 }
      ),
      mcq(
        "public-reading-sugar-q3",
        "3",
        "Identifiez l’opinion exprimée par le journaliste :",
        [
          "Les céréales ont remplacé la tartine en raison de leurs qualités nutritives.",
          "La tartine présente l’avantage de préserver la sensibilité gustative.",
          "La sophistication des céréales nuit à leur qualité nutritive.",
          "La tartine n’est pas suffisamment nourrissante pour le petit-déjeuner."
        ],
        1,
        "La tartine est valorisée parce qu’elle garde une diversité de goûts, alors que la boîte de céréales est toujours identique.",
        { paragraphIndex: 2 }
      ),
      mcq(
        "public-reading-sugar-q4",
        "4",
        "Quelle est la cause du manque d’intérêt pour la nourriture chez les jeunes ?",
        [
          "La déstructuration du repas familial.",
          "Les repas interminables pendant l’enfance.",
          "La mauvaise qualité des produits alimentaires.",
          "Le conditionnement fantaisiste des aliments."
        ],
        0,
        "Le texte relie directement la perte de repères alimentaires à la disparition du repas en famille et du repas collectif.",
        { paragraphIndex: 3 }
      ),
      mcq(
        "public-reading-sugar-q5",
        "5",
        "Pourquoi ne cuisine-t-on plus ?",
        [
          "Les femmes n’apprennent plus la cuisine.",
          "Les femmes ne vivent plus en famille.",
          "Les femmes ont trop de contraintes domestiques.",
          "Les femmes ont un emploi du temps trop chargé."
        ],
        3,
        "La formule « empêchée par un timing impossible » renvoie à un rythme de vie trop chargé.",
        { paragraphIndex: 4 }
      ),
      mcq(
        "public-reading-sugar-q6",
        "6",
        "La position du journaliste par rapport à la présence de sucre dans l’alimentation des jeunes est :",
        ["clairement critique.", "plutôt sceptique.", "plutôt nuancée."],
        0,
        "Le vocabulaire est franchement accusateur dès l’ouverture du texte, avec des images très négatives.",
        { paragraphIndex: 0 }
      ),
      shortAnswer(
        "public-reading-sugar-q6b",
        "6b",
        "Relevez deux mots qui justifient votre réponse.",
        "On pouvait relever par exemple « fléau majeur » et « contaminé », ou encore « lessiver les papilles ».",
        ["deux expressions nettement négatives tirées du premier paragraphe", "vocabulaire critique ou agressif", "appui lexical clair à la condamnation du sucre"],
        "Pour viser tous les points, il faut citer le texte lui-même et choisir des expressions clairement dépréciatives.",
        { paragraphIndex: 0 },
        "Recopie deux mots ou expressions du texte."
      ),
      shortAnswer(
        "public-reading-sugar-q7",
        "7",
        "Expliquez le titre « Une jeunesse dé-goûtée » avec vos propres mots.",
        "Le titre veut dire que les jeunes perdent à la fois le goût des aliments variés et le plaisir de manger, parce qu’une alimentation industrielle trop sucrée uniformise leurs repères sensoriels.",
        ["perte du goût ou des repères sensoriels", "jeunesse façonnée par une alimentation industrielle", "jeu de mots entre dégoût et perte du goût"],
        "Une réponse forte explique à la fois la critique sociale et le jeu de mots du titre.",
        { paragraphIndex: 3 }
      )
    ]
  },
  {
    id: "public-reading-demography",
    title: "Une France de 75 millions d’habitants en 2050",
    sourceLabel: "Nicolas Barré et Marie Visot, Le Figaro, 12 mai 2005",
    passage: [
      "Aurait-on sous-estimé le dynamisme de la démographie française ? Le recensement réalisé en 2004 révèle que la population augmente plus rapidement que ne l’avaient prévu les démographes. La France pourrait ainsi compter 75 millions d’habitants en 2050 et devenir le pays le plus peuplé de l’Europe des vingt-cinq, devant l’Allemagne.",
      "Phénomène unique au sein de la vieille Europe, le taux de croissance de la population française a augmenté de plus de 50 % depuis une quinzaine d’années. La France retrouve ainsi un rythme de croissance démographique qu’elle n’avait pas connu depuis 1974.",
      "Les données du recensement montrent que cette croissance est due pour les trois quarts à l’excédent naturel de la population et pour un quart seulement à l’immigration. L’écart se creuse entre la France et les autres pays européens, à l’exception notable de l’Irlande dont la démographie est encore plus dynamique.",
      "Notre pays assure à lui seul la quasi-totalité de la croissance démographique de l’Europe des 25. En 2003, la population a augmenté de 216 000 habitants dans les vingt-cinq pays européens dont 211 000 en France. D’où la nécessité d’adapter les politiques publiques, notamment en matière de logement et d’aménagement du territoire.",
      "Les démographes ne sont pas tous d’accord sur ces projections à long terme. La population française a alterné des périodes de forte croissance et de déclin. Mais la mortalité a été plus faible que prévu, la fécondité s’est maintenue et le solde migratoire se situe dans la fourchette haute imaginée. Au total, on est bien au-dessus du scénario central retenu par l’Insee.",
      "L’un des enseignements clefs du recensement de 2004 est que le monde rural ne se dépeuple pas, au contraire. Le désert français est un mythe. Toutes les régions, à l’exception de Champagne-Ardennes, bénéficient d’un boom démographique. Mieux, ce sont les petites communes de moins de 2 000 habitants qui en profitent le plus."
    ],
    questions: [
      mcq(
        "public-reading-demography-q1",
        "1",
        "Quel est le ton général de l’article ?",
        ["alarmiste", "optimiste", "neutre"],
        1,
        "L’article insiste sur le dynamisme démographique français et sur un scénario révisé à la hausse, avec un vocabulaire globalement valorisant.",
        { paragraphIndex: 0 }
      ),
      tf(
        "public-reading-demography-q2-1",
        "2.1",
        "L’augmentation de la population française est due pour la plus grande part à l’immigration.",
        false,
        "Le texte précise que la croissance est due pour les trois quarts à l’excédent naturel et pour un quart seulement à l’immigration.",
        { paragraphIndex: 2 }
      ),
      tf(
        "public-reading-demography-q2-2",
        "2.2",
        "Cette augmentation est irrégulière depuis deux siècles.",
        true,
        "Le document explique que la population française a alterné des périodes de forte croissance et de déclin.",
        { paragraphIndex: 4 }
      ),
      tf(
        "public-reading-demography-q2-3",
        "2.3",
        "L’Irlande suit de très près la France en matière de croissance démographique.",
        false,
        "L’Irlande n’est pas présentée comme simplement proche : sa démographie est dite encore plus dynamique que celle de la France.",
        { paragraphIndex: 2 }
      ),
      tf(
        "public-reading-demography-q2-4",
        "2.4",
        "La France contribue très majoritairement à l’accroissement de la population européenne.",
        true,
        "L’article précise que sur 216 000 habitants supplémentaires dans l’Europe des 25, 211 000 concernent la France.",
        { paragraphIndex: 3 }
      ),
      tf(
        "public-reading-demography-q2-5",
        "2.5",
        "La croissance démographique a peu d’effet sur les petites communes.",
        false,
        "Le texte dit au contraire que ce sont les petites communes de moins de 2 000 habitants qui en profitent le plus.",
        { paragraphIndex: 5 }
      ),
      shortAnswer(
        "public-reading-demography-q3",
        "3",
        "Selon les résultats du dernier recensement, quelle serait la position de la France au sein de l’Europe des 25 en 2050 ?",
        "La France deviendrait le pays le plus peuplé de l’Europe des 25, devant l’Allemagne, avec environ 75 millions d’habitants.",
        ["pays le plus peuplé de l’Europe des 25", "devant l’Allemagne", "environ 75 millions d’habitants"],
        "Il faut donner à la fois le rang et l’ordre de grandeur annoncé.",
        { paragraphIndex: 0 }
      ),
      shortAnswer(
        "public-reading-demography-q4",
        "4",
        "Citez deux mesures à envisager pour répondre à la croissance du taux démographique.",
        "Le texte évoque l’adaptation des politiques publiques en matière de logement et d’aménagement du territoire.",
        ["logement", "aménagement du territoire"],
        "La réponse attendue reprend les deux domaines explicitement mentionnés dans l’article.",
        { paragraphIndex: 3 }
      ),
      shortAnswer(
        "public-reading-demography-q5",
        "5",
        "Qu’est-ce qui rend les démographes français optimistes ? Citez deux facteurs.",
        "Ils deviennent plus optimistes parce que la mortalité est plus faible que prévu, que la fécondité se maintient et que le solde migratoire se situe dans la fourchette haute.",
        ["mortalité plus faible que prévu", "fécondité maintenue", "solde migratoire dans la fourchette haute"],
        "Deux facteurs suffisent, à condition qu’ils soient tirés de la liste explicitée par l’expert.",
        { paragraphIndex: 4 }
      ),
      shortAnswer(
        "public-reading-demography-q6",
        "6",
        "Expliquez l’expression : « le désert français est un mythe ».",
        "Cela signifie que les campagnes françaises ne sont pas condamnées au dépeuplement : elles gagnent elles aussi des habitants, et les petites communes profitent fortement du boom démographique.",
        ["le monde rural ne se vide pas", "les régions gagnent des habitants", "les petites communes profitent du boom démographique"],
        "Une bonne explication reformule l’image et la relie à la situation des campagnes.",
        { paragraphIndex: 5 }
      )
    ]
  },
  {
    id: "public-reading-parity",
    title: "« Parité ne rime pas avec égalité »",
    sourceLabel: "Muriel Grémillet, Libération, 10 mai 2005",
    passage: [
      "Pour l’ouverture du débat à l’Assemblée sur l’égalité salariale, la ministre prévoit un texte qui vise à résorber en cinq ans les écarts de salaires entre hommes et femmes. Mais il n’y a rien de contraignant dans le projet de loi, lequel renvoie à la négociation d’entreprise. Les écarts de rémunérations restent pourtant de près de 25 %. Surtout, la nouvelle loi ne s’attaque pas au principal fléau de l’emploi féminin, le temps partiel, véritable machine à précariser.",
      "Aujourd’hui, les femmes représentent la moitié de la population active. Elles sont très diplômées et s’arrêtent de moins en moins de travailler dès qu’elles ont des enfants. Pourtant, cette parité quantitative ne rime pas avec égalité. Les inégalités entre hommes et femmes en termes de carrière, de salaire ou de chômage continuent à s’incruster. Les déconvenues commencent à l’entrée sur le marché du travail.",
      "On a cru qu’avec la féminisation massive du salariat, les inégalités allaient se diluer dans la modernité. Mais il a manqué la volonté politique de lutter vraiment contre ces discriminations. Les textes existants sont bons, mais ils ne fonctionnent pas faute de contraintes.",
      "Ce développement d’un sous-emploi féminin est massif et pourtant on n’en parle jamais. Le temps partiel est une question cruciale dans la lutte contre les inégalités entre les hommes et les femmes, pourtant les politiques publiques ne l’abordent pas. Ces emplois à temps partiel créent des poches de pauvreté féminine : toutes ces femmes qui travaillent sans parvenir à gagner leur vie. Nombreuses sont celles qui souhaiteraient travailler plus pour avoir un salaire décent."
    ],
    questions: [
      mcq(
        "public-reading-parity-q1",
        "1",
        "Cet article traite du thème de :",
        [
          "l’inégalité des femmes dans l’accès aux études.",
          "la réticence des hommes à employer des femmes.",
          "l’absence de lois pour réglementer l’accès des femmes au monde du travail.",
          "la précarisation du travail qui touche en premier les femmes."
        ],
        3,
        "Le texte centre son analyse sur le temps partiel et le sous-emploi féminin, présentés comme des mécanismes de précarisation.",
        { paragraphIndex: 3 }
      ),
      mcq(
        "public-reading-parity-q2",
        "2",
        "L’idée principale du premier paragraphe est que :",
        [
          "l’inégalité salariale sera résolue par la négociation.",
          "les textes de lois ont sensiblement réduit l’inégalité salariale.",
          "l’inégalité salariale réside dans le sous-emploi féminin.",
          "peu de textes se sont penchés sur l’inégalité salariale."
        ],
        2,
        "Le premier paragraphe insiste sur le fait que la loi ne traite pas le cœur du problème : le temps partiel, présenté comme le principal fléau de l’emploi féminin.",
        { paragraphIndex: 0 }
      ),
      mcq(
        "public-reading-parity-q3",
        "3",
        "Le deuxième paragraphe signifie que :",
        [
          "l’augmentation du nombre de femmes diplômées joue sur la natalité.",
          "l’inégalité professionnelle est prévisible dès l’école.",
          "les diplômes ne contribuent pas à diminuer l’écart salarial."
        ],
        2,
        "Le passage souligne que les femmes réussissent dans leurs études, mais que les inégalités réapparaissent dès l’entrée sur le marché du travail.",
        { paragraphIndex: 1 }
      ),
      mcq(
        "public-reading-parity-q4",
        "4",
        "Dans le troisième paragraphe, l’auteure :",
        [
          "estime que les textes ne sont pas accompagnés de mesures.",
          "critique la teneur des textes de lois déjà existants.",
          "juge ces textes inadaptés."
        ],
        0,
        "L’auteure dit que les textes sont bons, mais qu’ils restent inefficaces faute de contraintes concrètes.",
        { paragraphIndex: 2 }
      ),
      mcq(
        "public-reading-parity-q5",
        "5",
        "L’auteure conclut que :",
        [
          "la question sur les différences de salaire entre hommes et femmes est occultée.",
          "les femmes souhaiteraient dans l’ensemble travailler moins.",
          "l’inégalité salariale est due au fait d’une majorité de femmes employées à temps partiel.",
          "les femmes devraient travailler au moins 35 heures par semaine."
        ],
        2,
        "Le dernier paragraphe explique que le temps partiel féminin fabrique une précarité durable et entretient les inégalités économiques.",
        { paragraphIndex: 3 }
      ),
      mcq(
        "public-reading-parity-q6",
        "6",
        "L’auteure ajoute que :",
        [
          "les femmes ont surtout besoin d’égalité salariale.",
          "les femmes souhaiteraient surtout travailler moins et gagner plus.",
          "les femmes ont surtout besoin d’être autonomes financièrement."
        ],
        2,
        "La phrase finale souligne qu’elles voudraient travailler davantage pour obtenir enfin un salaire décent.",
        { paragraphIndex: 3 }
      ),
      shortAnswer(
        "public-reading-parity-q6b",
        "6b",
        "Justifiez votre réponse en relevant une phrase du texte.",
        "« Nombreuses sont celles qui souhaiteraient travailler plus pour avoir un salaire décent. »",
        ["citation exacte ou très proche de la phrase finale", "idée de travailler plus", "objectif d’obtenir un salaire décent"],
        "Ici, le plein de points demande une justification appuyée directement sur la formulation du texte.",
        { paragraphIndex: 3 },
        "Recopie la phrase du texte qui justifie ton choix."
      ),
      shortAnswer(
        "public-reading-parity-q7a",
        "7a",
        "Expliquez le choix du titre « Parité ne rime pas avec égalité » avec vos propres mots.",
        "Le titre signifie que la présence numérique des femmes dans la vie active ne garantit pas l’égalité réelle : elles restent défavorisées en matière de carrière, de salaire et de chômage.",
        ["parité quantitative", "absence d’égalité réelle", "inégalités de carrière, de salaire ou de chômage"],
        "Une bonne réponse reformule l’opposition entre présence numérique et égalité concrète.",
        { paragraphIndex: 1 }
      ),
      shortAnswer(
        "public-reading-parity-q7b",
        "7b",
        "Quel processus est à l’origine de la pauvreté féminine dans le monde professionnel ?",
        "C’est le développement massif du sous-emploi féminin, surtout le temps partiel, qui crée des poches de pauvreté parce que beaucoup de femmes travaillent sans réussir à vivre correctement de leur salaire.",
        ["développement du sous-emploi féminin", "temps partiel", "emplois qui ne permettent pas de gagner sa vie"],
        "La réponse attendue identifie clairement le mécanisme économique mis en avant par l’auteure.",
        { paragraphIndex: 3 }
      )
    ]
  }
];

export function resolveCuratedCitation(exercise: CuratedReadingExercise, citation?: CuratedReadingCitation) {
  if (!citation) {
    return null;
  }

  return exercise.passage[citation.paragraphIndex] ?? null;
}
