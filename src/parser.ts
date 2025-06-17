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

enum MeasureSteps {
  FindKey,
  FindTimeSig,

  MeasureStepCount
}

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
  let MeasureDivisions: number = 1;
  let RunningNoteID: number = 0;
  let CurrentBeat = 1;
  let NoteLetter: string = "";
  let NoteOctave: string = "";

  Params.lines.forEach((line: string) => {
    if (line.includes(Token.MeasureStart)) {
      CurrentMeasure = FindMeasure(Params, line);
      CurrentBeat = 1;
    }
    if (CurrentMeasure) {

      if (line.includes("</measure")) {
        CurrentMeasure = null;
      }

      if (line.includes("<divisions")) {
        MeasureDivisions = parseInt(GetContentBetweenTags(line));
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
        let clefType = GetContentBetweenTags(line);
        CurrentMeasure.Clef = ReturnClefType(clefType);
      }

      if (line.includes("<note")) {
        CurrentNote = null;
        CurrentNote = CreateEmptyNote(RunningNoteID);
        CurrentMeasure.Notes.push(CurrentNote);
        CurrentNote.Beat = CurrentBeat;
      } else if (line.includes("</note")) {
        CurrentNote = null;
        RunningNoteID += 1;
      }

      if (CurrentNote) {

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
            CurrentBeat += CurrentNote.Duration * 4;
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
        console.log("Parsed measure id: ", id);
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

function ReturnClefType(clefString: string): number {
  if (clefString === "G") {
    return 0;
  }
  return -1;
}

function ReturnKeyString(keyData: number): string {
  switch (keyData) {
    case 0:
      return "CMaj/Amin";
    case -1:
      return "FMaj/Dmin";
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
  };
}

function CreateEmptyMeasure(id: number): XMLMeasure {
  return {
    ID: id,
    Clef: XMLClef.G,
    Key: "",
    TimeSignature: { top: 0, bottom: 0 },
    Notes: [],
  };
}


