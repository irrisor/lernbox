export interface IndexCard {
  question: string;
  description?: string;
  answer: string;
  time_s: number;
  groups: string[];
  slot?: number;
}

export const cards: IndexCard[] = [
  {
    question: "3 • 7",
    description: "Was kommt raus bei der Rechnung?",
    answer: "21",
    time_s: 3,
    groups: ["1x1", "1x1-Kern"]
  },
  {
    question: "4 x 7",
    answer: "28",
    time_s: 3,
    groups: ["1x1"]
  },
  {
    question: "4 x 7",
    answer: "28",
    time_s: 3,
    groups: ["1x1"]
  }
];
