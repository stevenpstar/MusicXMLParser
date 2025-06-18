export type XMLClef = {
  Type: string;
  Staff: number;
}

export type XMLStaff = {
  Number: number;
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
   Alter: number;
}

export type XMLMeasure = {
  ID: number,
  Clefs: XMLClef[],
  Staves: XMLStaff[],
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
