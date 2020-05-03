import {houseSVG} from "../img/svgs";
import {v5 as uuidv5} from 'uuid';
import {sha256} from "js-sha256";

type ImageParameters = {
    [seletector: string]: string | { [attribute: string]: string }
};

export const uuidNamespace = "70072bd9-cf2b-4044-b541-53ad5518c4b5";

export interface Image {
    image?: string;
    url?: string;
    infoURL?: string;
    parameters?: ImageParameters;
}

export interface IndexCard {
    id: string;
    question?: string;
    questionImage?: Image;
    description?: string;
    answers: string[];
    answerImage?: Image;
    time_s: number;
    groups: string[];
    inputType?: "text" | "number" | "number_or_nan" | "select";
    inputOptions?: string[];
    owner: string | undefined;
}

export const officialOwner = "lernbox";

export interface Slot {
    durationInDays: number;
}

/*
  Alle Karten außerhalb der Kartei
  Am Anfang kommen 10 in zufälliger Reihenfolge in Fach 1
* Fach 1 jeden Tag bis leer, nicht gewusst nach hinten; gewusst in nächstes Fach nach hinten
* Evtl. neue Karten in Fach 1
* Fach 2 nach einer Woche in dem Fach
Fach 3 nach einem Monat in dem Fach
fach 4 nach 3 Monaten in dem Fach
Fach 5 nach 6 Monaten in dem Fach
* */
export const slots: Slot[] = [
    {durationInDays: 0},
    {durationInDays: 7},
    {durationInDays: 30},
    {durationInDays: 90},
    {durationInDays: 180},
];

export const predefinedCards: IndexCard[] = [];

/** 1-mal-1 */
for (let x = 0; x <= 10; x++) {
    for (let y = 0; y <= 10; y++) {
        predefinedCards.push({
            id: uuidv5(`${x}*${y}`, uuidNamespace),
            question: `${x} • ${y}`,
            description: "Wie lautet das Ergebnis?",
            answers: [`${x} • ${y} = ${x * y}`, `${x * y}`],
            time_s: 4,
            groups: ["1•1", `1•1 Reihe ${y}`].concat([1, 2, 5, 10].indexOf(y) >= 0 ? ["1x1 Kern"] : []),
            inputType: "number_or_nan",
            owner: officialOwner,
        });
        predefinedCards.push({
            id: uuidv5(`${x}:${y}`, uuidNamespace),
            question: `${y !== 0 ? x * y : x} : ${y}`,
            description: "Wie lautet das Ergebnis?",
            answers: [`${y !== 0 ? x * y : x} : ${y} = ${x}`, y !== 0 ? `${x}` : "NaN"],
            time_s: 4,
            groups: ["1:1", `1:1 Reihe ${y}`].concat([1, 2, 5, 10].indexOf(y) >= 0 ? ["1:1 Kern"] : []),
            inputType: "number_or_nan",
            owner: officialOwner,
        });
    }
}

/** Zahlzerlegung */
for (let x = 0; x <= 10; x++) {
    for (let y = 0; y <= x; y++) {
        predefinedCards.push({
            id: uuidv5(`${x - y}+${y}`, uuidNamespace),
            questionImage: {
                url: houseSVG,
                parameters: {"#Summe": "" + x, "#Summand1": "" + y, "#Summand2": ""},
            },
            answerImage: {
                url: houseSVG,
                parameters: {"#Summe": "" + x, "#Summand1": "" + y, "#Summand2": "" + (x - y)},
            },
            description: "Was fehlt?",
            answers: ["", "" + (x - y)],
            time_s: 6,
            groups: ["Zahlzerlegung"],
            inputType: "number",
            owner: officialOwner,
        });
    }
}

/** Artikel **/
([{
    group: "Pflanzen",
    words: [
        "die Rose",
        "der Busch",
        "der Rosenbusch",
        "der Strauch",
    ],
}, {
    group: "Tiere",
    words: [
        "die Katze",
        "der Kater",
        "der Hund",
        "die Maus",
        "das Schwein",
    ],
},
]).forEach(({words, group}) => {
    words.forEach(wordsEntry => {
        const spacePosition = wordsEntry.indexOf(" ");
        const word = wordsEntry.substr(spacePosition + 1);
        const article = wordsEntry.substr(0, spacePosition);
        let card: IndexCard = {
            id: uuidv5(`artikel:${word}`, uuidNamespace),
            question: word,
            answers: [wordsEntry, article, article.substr(0, 1).toUpperCase() + article.substr(1)],
            time_s: 15,
            groups: ["Artikel", group],
            description: "Der? Die? Das?",
            inputType: "select",
            inputOptions: ["der", "die", "das"],
            owner: officialOwner,
        };
        let existingCard = predefinedCards.find(someCard => someCard.question === card.question
            && JSON.stringify(someCard.groups) === JSON.stringify(card.groups));
        if (existingCard) {
            card = existingCard;
        } else {
            predefinedCards.push(card);
        }
    });
});

export const predefinedCardsHash = sha256(JSON.stringify(predefinedCards));