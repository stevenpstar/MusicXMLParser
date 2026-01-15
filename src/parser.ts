import { TieNotesInMeasure } from "./parse_note.js";
import { XMLClef, CreateEmptyScore, XMLMeasure, XMLNote, XMLScore, XMLInstrument, XMLArticulation, XMLArticulationType, XMLDynamic } from "./score.js";

type Params = {
  state: State,
  score: XMLScore,
  lines: string[],
};

enum State {
  FindParts = 0,
  FindMeasure = 1,
  DefineMeasure = 2,
};

enum Token {
  OpenTagStart = "<",
  EndTagStart = "</",
  CloseTagEnd = ">",
  Score = "score-part",
  PartList = "<part-list",
  EndPartList = "</part-list",
  ScorePart = "<score-part",
  ScorePartWise = "<score-partwise", 
  Part = "<part",
  MeasureStart = "<measure",
  MeasureEnd = "</measure>",
  TiedStart = "<tie",
  Staccato = "<staccato",
  Marcato = "<strong-accent",
  Accent = "<accent",
  Dynamics = "<dynamic"
};

export function ParseTextPartWise(fileString: string): XMLScore {
  const Params: Params = {
    state: State.FindParts,
    score: CreateEmptyScore(),
    lines: fileString.split("\n")
  };

  let CurrentInstrument: XMLInstrument = null;
  let CurrentMeasure: XMLMeasure = null;
  let CurrentNote: XMLNote = null;
  let CurrentClef: XMLClef = null;
  let MeasureDivisions: number = 1;
  let RunningNoteID: number = 0;
  let CurrentBeat: 1;
  let LastBeat = 1;
  let LastStaff = 0;
  let LastDuration = 0;
  let NoteLetter: string = "";
  let NoteOctave: string = "";
  let IsChord: boolean = false;
  let IsRest: boolean = false;
  let IsDynamicOnNextNote: boolean = false;
  let NextDynamicString: string = "";

  Params.lines.forEach((line: string, i: number) => {
    if (line.includes(Token.PartList)) {
      Params.state = State.FindParts;
    }
    if (line.includes(Token.ScorePart) && !line.includes(Token.ScorePartWise)) {
      // This does nothing for now
    }
    if (line.includes(Token.EndPartList)) {
      if (Params.score.Instruments.length > 0) {
        CurrentInstrument = Params.score.Instruments[0];
        Params.state = State.FindMeasure;
      }
    }
    if (line.includes(Token.Part)) {
      let instr: XMLInstrument = null;
      instr = FindOrCreateInstrument(Params, line);
      if (instr.ID !== "") {
        CurrentInstrument = instr;
      }
    }
    if (line.includes(Token.MeasureStart)) {
      CurrentMeasure = FindMeasure(Params, line, CurrentInstrument.ID);
      console.log("Adding measure to id: ", CurrentInstrument.ID);
      CurrentBeat = 1;
      LastStaff = 0;
      CurrentMeasure.Staves.push( { Number: 0 } );
    }
    if (CurrentMeasure) {

      if (line.includes("</measure")) {
        CurrentMeasure = TieNotesInMeasure(CurrentMeasure);
        console.log(CurrentMeasure.Dynamics);
        CurrentMeasure = null;
        LastBeat = 1;
        CurrentBeat = 1;
        LastDuration = 0;
      }

      if (line.includes(Token.Dynamics)) {
        // Get next line, which has specific dynamic string
        let nextLine = "";
        if (Params.lines.length > (i + 1)) {
          nextLine = Params.lines[i+1];
        }
        if (nextLine !== "") {
          IsDynamicOnNextNote = true;
          let split_line = nextLine.trim().split("/>");
          if (split_line.length < 2) {
            console.error("Could not get dynamic string");
            IsDynamicOnNextNote = false;
            NextDynamicString = "";
          } else {
            NextDynamicString = split_line[0].split("<")[1];
          }
        }
      }

      if (line.includes("<divisions")) {
        MeasureDivisions = parseInt(GetContentBetweenTags(line));
      }
      else if (line.includes("<clef")) {
        let default_clef = { Type: "treble", Staff: 0 };
        CurrentClef = default_clef;
        CurrentMeasure.Clefs.push(CurrentClef);
        if (line.includes('number="')) {
          let split_line = line.split('"');
          if (split_line.length >= 3) {
            //Brittle
            CurrentClef.Staff = parseInt(split_line[1]) - 1;
          }
        }
      }
      else if (line.includes("<fifths")) {
        let keyData = GetContentBetweenTags(line);
        let keyString = ReturnKeyString(parseInt(keyData));
        if (keyString === "KeyNotFound") {
          console.error("Key Not Found!");
        }
        CurrentMeasure.Key = keyString;
      }
      else if (line.includes("<beats")) {
        let beat = parseInt(GetContentBetweenTags(line));
        CurrentMeasure.TimeSignature.top = beat;
      } else if (line.includes("<beat-type")) {
        let beatType = parseInt(GetContentBetweenTags(line));
        CurrentMeasure.TimeSignature.bottom = beatType;
      } else if (line.includes("<sign")) {
        if (CurrentClef) {
          let clefType = GetContentBetweenTags(line);
          CurrentClef.Type = ReturnClefType(clefType);
        }
      } else if (line.includes("<staves>")) {
        let staff_count = parseInt(GetContentBetweenTags(line));
        CurrentMeasure.Staves = [];
        for (let s=0;s<staff_count;s++) {
          CurrentMeasure.Staves.push( { Number: s } );
        }
      } 

      if (line.includes("<note")) {
        IsChord = false;
        IsRest = false;
        CurrentNote = null;
        CurrentNote = CreateEmptyNote(RunningNoteID);
        // Get Next line to search for <chord /> tag, this is probably not be reliable. Will need to test.
        if (i + 1 <= Params.lines.length - 1) {
          if (!Params.lines[i+1].includes("<chord")) {
            CurrentBeat += LastDuration * 4;
          } 
          if (Params.lines[i+1].includes("<rest")) {
            IsRest = true;
          }
        }

        CurrentNote.Beat = CurrentBeat;
        if (!IsRest) {
          // For now we aren't adding rests to our notes, we can, but we're not for now.
          CurrentMeasure.Notes.push(CurrentNote);
        }
      } else if (line.includes("</note")) {
        // Dynamics appear in the music xml file before the note/beat that they are 
        // assigned to
        if (IsDynamicOnNextNote) {
          let newDynamic: XMLDynamic = {
            Symbol: NextDynamicString,
            Staff: CurrentNote.Staff,
            Beat: CurrentNote.Beat,
          };
          CurrentMeasure.Dynamics.push(newDynamic);
          // reset to check for other dynamics next
          IsDynamicOnNextNote = false;
          NextDynamicString = "";
        }
        CurrentNote = null;
        RunningNoteID += 1;
      }

      if (CurrentNote) {

        if (line.includes("<chord")) {
          IsChord = true;
        }

        if (line.includes("<step")) {
            NoteLetter = GetContentBetweenTags(line);
          if (NoteOctave !== "") {
            CurrentNote.NoteName = NoteLetter + NoteOctave;
          }
        } else if (line.includes("<octave")) {
          NoteOctave = GetContentBetweenTags(line);
          if (NoteLetter !== "") {
            CurrentNote.NoteName = NoteLetter + NoteOctave;
          }
        } else if (line.includes("<duration")) {
          let note_duration = parseInt(GetContentBetweenTags(line)) / 4;
          CurrentNote.Duration = note_duration / MeasureDivisions;
          LastDuration = CurrentNote.Duration;
        } else if (line.includes("<staff")) {
          CurrentNote.Staff = parseInt(GetContentBetweenTags(line)) - 1;
          if (CurrentNote.Staff !== LastStaff) {
            LastStaff = CurrentNote.Staff;
            CurrentNote.Beat = 1;
            CurrentBeat = 1;
          }
        } else if (line.includes("<alter")) {
          CurrentNote.Alter = parseInt(GetContentBetweenTags(line));
        }

        if (line.includes(Token.TiedStart)) {
          if (line.includes("start") || line.includes("stop")) {
            CurrentNote.Tied = true;
          }
        }

        if (line.includes(Token.Staccato) && CurrentMeasure) {
          if (!CurrentMeasure.Articulations) {
            CurrentMeasure.Articulations = [];
          }
          CurrentMeasure.Articulations.push({
            Type: XMLArticulationType.STACCATO,
            Beat: CurrentNote.Beat,
            Staff: CurrentNote.Staff,
            Voice: CurrentNote.Voice,
          });
        }

        if (line.includes(Token.Accent) && CurrentMeasure) {
          if (!CurrentMeasure.Articulations) {
            CurrentMeasure.Articulations = [];
          }
          CurrentMeasure.Articulations.push({
            Type: XMLArticulationType.ACCENT,
            Beat: CurrentNote.Beat,
            Staff: CurrentNote.Staff,
            Voice: CurrentNote.Voice,
          });
        }

        if (line.includes(Token.Marcato) && CurrentMeasure) {
          if (!CurrentMeasure.Articulations) {
            CurrentMeasure.Articulations = [];
          }
          CurrentMeasure.Articulations.push({
            Type: XMLArticulationType.MARCATO,
            Beat: CurrentNote.Beat,
            Staff: CurrentNote.Staff,
            Voice: CurrentNote.Voice,
          });
        }


      } // CurrentNote End Loop

    } // CurrentMeasure End Loop
  });

  // do it in one loop

  return Params.score;
}

function FindMeasure(params: Params, line: string, partId: string): XMLMeasure {
  console.log("Instruments should exist");
  console.log(params.score.Instruments);
  if (line.includes(Token.MeasureStart)) {
    let id = 0;
    if (line.includes('number="')) {
      let split_line = line.split('"');
      if (split_line.length >= 3) {
        id = parseInt(split_line[1]);
      }
    }
    let msr: XMLMeasure = CreateEmptyMeasure(id, -1);
    let instrument_index = 0;
    for (let i = 0; i < params.score.Instruments.length; ++i) {
      if (params.score.Instruments[i].ID === partId) {
        instrument_index = i;
      }
    }
    msr.InstrumentID = params.score.Instruments[instrument_index].IDNo;
    if (msr.InstrumentID === -1) {
      console.error("instrument ID is set to -1 for this measure!");
    }
    params.score.Instruments[instrument_index].Measures.push(msr);
    params.state = State.DefineMeasure;
    return msr;
  }
}

function FindOrCreateInstrument(params: Params, line: string): XMLInstrument {
  let id = "";
  let idNo = -1;
  if (line.includes(Token.Part)) {
      if (line.includes('id="')) {
        let split_line = line.split('"');
        if (split_line.length >= 3) {
          id = split_line[1];
        }
      } else {
        console.log("id not found in score part line");
      }
    
    if (params.score.Instruments.length > 0) {
      for (let i = 0; i < params.score.Instruments.length; ++i) {
        if (params.score.Instruments[i].ID == id) {
          return params.score.Instruments[i];
        }
      }
    }

    // Instrument not found, create a new one with ID
    if (id === "") {
      console.error("ID of Instrument not successfully parsed");
    }
  }
  idNo = params.score.Instruments.length;
  let instrument: XMLInstrument = CreateEmptyInstrument(id, idNo);
  if (id !== "") {
    params.score.Instruments.push(instrument);
  }
  return instrument;
}

function GetContentBetweenTags(line: string): string {
  let split_line = line.split(Token.CloseTagEnd);
  if (split_line.length < 2) {
    console.error("Could not get content, error with tag splitting!");
    return "";
  }
  return split_line[1].split(Token.EndTagStart)[0];
}

function ReturnClefType(clefString: string): string {
  if (clefString === "G") {
    return "treble";
  } else {
    return "bass";
  }
}

function ReturnKeyString(keyData: number): string {
  switch (keyData) {
    case 0:
      return "CMaj/Amin";
    case -1:
      return "FMaj/Dmin";
    case 2:
      return "DMaj/Bmin";
    default:
      return "KeyNotFound";
  }
}

function CreateEmptyNote(id: number): XMLNote {
  return {
    ID: id,
    Beat: -1,
    Duration: -1,
    NoteName: "",
    Tied: false,
    Staff: 0,
    Grace: false,
    Voice: 0,
    Alter: 0,
    TiedStart: 0,
    TiedEnd: 0,
  };
}

function CreateEmptyMeasure(id: number, instrumentIdNo: number): XMLMeasure {
  return {
    InstrumentID: instrumentIdNo,
    ID: id,
    Clefs: [],
    Staves: [],
    Key: "",
    TimeSignature: { top: 0, bottom: 0 },
    Notes: [],
    Articulations: [],
    Dynamics: [],
  };
}

function CreateEmptyInstrument(id: string, idno: number): XMLInstrument {
  return {
    IDNo: idno,
    ID: id,
    Measures: [],
  };
}


