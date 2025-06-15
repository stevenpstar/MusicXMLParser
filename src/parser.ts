import { Clef, CreateEmptyScore, Measure, Note, Score } from "./score.js";

type Params = {
  state: State,
  score: Score,
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

export function ParseTextPartWiseOld(fileString: string): Score {
  const Parameters: Params = {
    state: State.FindMeasure,
    score: CreateEmptyScore(),
    lines: fileString.split("\n")
  };
  let current_measure_id = -1;
  let current_measure_end_line = -1;
  Parameters.lines.forEach((line: String, line_number: number) => {
    switch (Parameters.state) {
      case State.FindMeasure:

         // current_measure_id = FindMeasure(Parameters, line);
          for (let i = line_number; i < Parameters.lines.length; i++) {
            if (Parameters.lines[i].includes("</measure>")) {

              current_measure_end_line = i;
              break;
            }
          }

          break;
      case State.DefineMeasure:
          DefineMeasure(Parameters, line_number, current_measure_id, current_measure_end_line);
       // Parameters.state = State.FindMeasure;
        break;
      default:
        break;
    }
  });
  console.log(Parameters.score);
  return Parameters.score;
}

export function ParseTextPartWise(fileString: string): Score {
  const Params: Params = {
    state: State.FindMeasure,
    score: CreateEmptyScore(),
    lines: fileString.split("\n")
  };

  let CurrentMeasure: Measure = null;
  let CurrentNote: Note = null;
  let RunningNoteID: number = 0;
  let CurrentBeat = 1;
  let NoteLetter: string = "";
  let NoteOctave: string = "";

  Params.lines.forEach((line: string) => {
    console.log("line: ", line);
    if (line.includes(Token.MeasureStart)) {
      CurrentMeasure = FindMeasure(Params, line);
    }
    if (CurrentMeasure) {

      if (line.includes("</measure")) {
        CurrentMeasure = null;
        return;
      }

      if (line.includes("<fifths")) {
        let keyData = GetContentBetweenTags(line);
        let keyString = ReturnKeyString(parseInt(keyData));
        if (keyString === "KeyNotFound") {
          console.error("Key Not Found!");
          return;
        }
        CurrentMeasure.Key = keyString;
      }
      else if (line.includes("<beats>")) {
        let beat = parseInt(GetContentBetweenTags(line));
        CurrentMeasure.TimeSignature.top = beat;
      } else if (line.includes("<beat-type>")) {
        let beatType = parseInt(GetContentBetweenTags(line));
        CurrentMeasure.TimeSignature.bottom = beatType;
      } else if (line.includes("<sign>")) {
        let clefType = GetContentBetweenTags(line);
        CurrentMeasure.Clef = ReturnClefType(clefType);
      }

      if (line.includes("<note>")) {
        CurrentNote = null;
        RunningNoteID += 1;
        CurrentNote = CreateEmptyNote(RunningNoteID);
        CurrentMeasure.Notes.push(CurrentNote);
        CurrentBeat = 1;
        CurrentNote.Beat = CurrentBeat;
      }

      if (CurrentNote) {

        if (line.includes("<step>")) {
            NoteLetter = GetContentBetweenTags(line);
            if (NoteOctave !== "") {
              CurrentNote.NoteName = NoteLetter + NoteOctave;
            }
          } else if (line.includes("<octave>")) {
            NoteOctave = GetContentBetweenTags(line);
            if (NoteLetter !== "") {
              CurrentNote.NoteName = NoteLetter + NoteOctave;
            }
          } else if (line.includes("<duration>")) {
            let note_duration = parseInt(GetContentBetweenTags(line)) / 4;
            CurrentNote.Duration = note_duration;
            CurrentBeat += note_duration * 4;
          }

      } // CurrentNote End Loop

    } // CurrentMeasure End Loop
  });

  // do it in one loop

  return Params.score;
}

function FindMeasure(params: Params, line: String): Measure {
  if (line.includes(Token.MeasureStart)) {
    let id = 0;
    if (line.includes('number="')) {
      let split_line = line.split('"');
      if (split_line.length === 3) {
        id = parseInt(split_line[1]);
      }
    }
    let msr: Measure = CreateEmptyMeasure(id);
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

function DefineMeasure(Parameters: Params, line_number: number, 
                       current_measure_id: number, end_line: number): number {
    const msr = Parameters.score.Measures.find((m: Measure) => m.ID === current_measure_id);
    if (msr === undefined) {
      console.error("Current measure id does not exist, returning!");
      return;
    }
    let current_note_id = -1;
    let current_note_end_line = -1;
    let current_note: Note = null;
    let current_beat = 1;
    let j = line_number;
 //   if (Parameters.lines[j].includes("<fifths")) {
 //     let keyData = GetContentBetweenTags(Parameters.lines[j], "<fifths>", "</fifths>");
 //     let keyString = ReturnKeyString(parseInt(keyData));
 //     if (keyString === "KeyNotFound") {
 //       console.error("Key Not Found!");
 //       return;
 //     }
 //     msr.Key = keyString;
 //   }
 //   else if (Parameters.lines[j].includes("<beats>")) {
 //     let beat = parseInt(GetContentBetweenTags(Parameters.lines[j], "<beats>", "</beats>"));
 //     msr.TimeSignature.top = beat;
 //   } else if (Parameters.lines[j].includes("<beat-type>")) {
 //     let beatType = parseInt(GetContentBetweenTags(Parameters.lines[j], "<beat-type>", "</beat-type>"));
 //     msr.TimeSignature.bottom = beatType;
 //   } else if (Parameters.lines[j].includes("<sign>")) {
 //     let clefType = GetContentBetweenTags(Parameters.lines[j], "<sign>", "</sign>");
 //     msr.Clef = ReturnClefType(clefType);
 //   }

    if (current_note !== null) {
      console.log("whoawhoa");
      let note_letter = "";
      let note_octave = "";
      let note_duration = 0;
      // Get end line
      for (let l = j; l < end_line; l++) {
        let ln = Parameters.lines[l];
        if (Parameters.lines[l].includes("</note>")) {
          current_note_end_line = l;
          console.log("Found end of note!");
          break;
        }
      }

      let ln = Parameters.lines[j];
      console.log("ln: ", ln);
      }

    return end_line;
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
    default:
      return "KeyNotFound";
  }
}

function CreateEmptyNote(id: number): Note {
  return {
    ID: id,
    Beat: -1,
    Duration: -1,
    NoteName: "",
  };
}

function CreateEmptyMeasure(id: number): Measure {
  console.log("Creating empty measure of id: !", id);
  return {
    ID: id,
    Clef: Clef.G,
    Key: "",
    TimeSignature: { top: 0, bottom: 0 },
    Notes: [],
  };
}


