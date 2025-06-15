export enum XMLClef {
  G,
}

export type XMLNote = {
   ID: number;
   Beat: number;
   Duration: number; // should be divided by 4 from XML value
   NoteName: string;
   Tied: boolean;
   Staff: number;
   Grace: boolean;
   Voice: number;
}

export type XMLMeasure = {
  ID: number,
  Clef: XMLClef,
  Key: string,
  TimeSignature: { top: number, bottom: number },
  Notes: XMLNote[],
};

export type XMLScore = {
  Measures: XMLMeasure[]
}

export function CreateEmptyScore(): XMLScore {
  return {
    Measures: [],
  };
}
