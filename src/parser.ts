import { XMLClef, CreateEmptyScore, XMLMeasure, XMLNote, XMLScore } from "./score.js";

type Params = {
  state: State,
  score: XMLScore,
  lines: string[],
};

enum State {
  FindMeasure = 0,
  DefineMeasure = 1,
};

enum Token {
  OpenTagStart = "<",
  EndTagStart = "</",
  CloseTagEnd = ">",
  Score = "score-part",
  PartList = "part-list",
  Part = "score-part",
  MeasureStart = "<measure",
  MeasureEnd = "</measure>",
};

export function ParseTextPartWise(fileString: string): XMLScore {
  const Params: Params = {
    state: State.FindMeasure,
    score: CreateEmptyScore(),
    lines: fileString.split("\n")
  };

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

  Params.lines.forEach((line: string, i: number) => {
    if (line.includes(Token.MeasureStart)) {
      CurrentMeasure = FindMeasure(Params, line);
      CurrentBeat = 1;
      LastStaff = 0;
      CurrentMeasure.Staves.push( { Number: 0 } );
    }
    if (CurrentMeasure) {

      if (line.includes("</measure")) {
        CurrentMeasure = null;
        LastBeat = 1;
        CurrentBeat = 1;
        LastDuration = 0;
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

      } // CurrentNote End Loop

    } // CurrentMeasure End Loop
  });

  // do it in one loop

  return Params.score;
}

function FindMeasure(params: Params, line: String): XMLMeasure {
  if (line.includes(Token.MeasureStart)) {
    let id = 0;
    if (line.includes('number="')) {
      let split_line = line.split('"');
      if (split_line.length >= 3) {
        id = parseInt(split_line[1]);
      }
    }
    let msr: XMLMeasure = CreateEmptyMeasure(id);
    params.score.Measures.push(msr);
    params.state = State.DefineMeasure;
    return msr;
  }
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
  };
}

function CreateEmptyMeasure(id: number): XMLMeasure {
  return {
    ID: id,
    Clefs: [],
    Staves: [],
    Key: "",
    TimeSignature: { top: 0, bottom: 0 },
    Notes: [],
  };
}


