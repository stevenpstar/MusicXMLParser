export type XMLClef = {
  Type: string;
  Staff: number;
}

export enum XMLArticulationType {
  NONE = 0,
  ACCENT = 1,
  STACCATO = 2,
  MARCATO = 3,
}

export type XMLArticulation = {
  Type: XMLArticulationType,
  Beat: number,
  Staff: number,
  Voice: number,
};

export type XMLDynamic = {
  Symbol: string,
  Staff: number,
  Beat: number,
};

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
   TiedStart: number;
   TiedEnd: number;
}

export type XMLMeasure = {
  InstrumentID: number,
  ID: number,
  Clefs: XMLClef[],
  Staves: XMLStaff[],
  Key: string,
  TimeSignature: { top: number, bottom: number },
  Notes: XMLNote[],
  Articulations: XMLArticulation[],
  Dynamics: XMLDynamic[],
};

export type XMLInstrument = {
  IDNo: number,
  ID: string,
  Measures: XMLMeasure[],
};

export type XMLScore = {
  Instruments: XMLInstrument[]
}

export function CreateEmptyScore(): XMLScore {
  return {
    Instruments: [],
  };
}
