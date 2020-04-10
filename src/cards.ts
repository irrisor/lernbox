export interface IndexCard {
    question?: string;
    image?: string;
    description?: string;
    answers: string[];
    time_s: number;
    groups: string[];
    slot?: number;
    previousSlot?: number;
    slotChanged?: number;
    restrictedToPupils?: string[];
    inputType?: "text" | "number" | "select";
    inputOptions?: string[];
}

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

export const cards: IndexCard[] = [{
    question: "Fach 1 jeden Tag bis leer, nicht gewusst ____ hinten; gewusst in nächstes Fach nach hinten.",
    time_s: 30,
    groups: ["Test"],
    answers: ["nach"],
    description: "Hier steht auch noch ein längerer Text über mehrere Zeilen, oder so..."
}];

/** 1-mal-1 */
for (let x = 1; x <= 10; x++) {
    for (let y = 1; y <= 10; y++) {
        cards.push({
            question: `${x} • ${y}`,
            description: "Wie lautet das Ergebnis?",
            answers: [`${x} • ${y} = ${x * y}`, `${x * y}`],
            time_s: 4,
            groups: ["1x1"].concat([1, 2, 5, 10].indexOf(y) >= 0 ? ["1x1-Kern"] : []),
            inputType: "number"
        });
    }
}

/** Artikel **/
([{
    pupil: "Christian",
    group: " meine Übungen",
    words: [
        "der Baum",
        "der Fuchs",
    ],
}, {
    pupil: "Joran",
    group: " meine Übungen",
    words: [
        "der Fuchs",
    ],
}, {
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
        "der Junge",
        "die Pizza",
        "der Luftballon",
        "die Fraktur",
    ],
},
]).forEach(({words, pupil, group}) => {
    words.forEach(wordsEntry => {
        const spacePosition = wordsEntry.indexOf(" ");
        const word = wordsEntry.substr(spacePosition + 1);
        const article = wordsEntry.substr(0, spacePosition);
        let card: IndexCard = {
            question: word,
            answers: [wordsEntry, article, article.substr(0, 1).toUpperCase() + article.substr(1)],
            time_s: 15,
            groups: ["Artikel", group],
            description: "Der? Die? Das?",
            restrictedToPupils: pupil ? [pupil] : undefined,
            inputType: "select",
            inputOptions: ["der", "die", "das"],
        };
        let existingCard = cards.find(someCard => someCard.question === card.question
            && JSON.stringify(someCard.groups) === JSON.stringify(card.groups));
        if (existingCard) {
            if (!existingCard.restrictedToPupils || existingCard.restrictedToPupils.length === 0 ||
                !card.restrictedToPupils || card.restrictedToPupils.length === 0) {
                existingCard.restrictedToPupils = undefined;
            } else {
                existingCard.restrictedToPupils = existingCard.restrictedToPupils.concat(card.restrictedToPupils);
            }
            card = existingCard;
        } else {
            cards.push(card);
        }
    });
});
