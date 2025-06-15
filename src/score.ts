export enum Clef {
  G,
}

export type Note = {
   ID: number;
   Beat: number;
   Duration: number; // should be divided by 4 from XML value
   NoteName: string;
}

export type Measure = {
  ID: number,
  Clef: Clef,
  Key: string,
  TimeSignature: { top: number, bottom: number },
  Notes: Note[],
};

export type Score = {
  Measures: Measure[]
}

export function CreateEmptyScore(): Score {
  return {
    Measures: [],
  };
}
