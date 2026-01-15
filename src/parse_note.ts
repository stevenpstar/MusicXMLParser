import { XMLMeasure, XMLNote } from "./score";

function TieNotesInMeasure(msr: XMLMeasure): XMLMeasure {
  // TODO: May need to sort by beat, should usually be pre-sorted in xml but who knows
  msr.Notes.filter((fn: XMLNote) => fn.Tied).forEach((n: XMLNote) => {
    let prevTiedNote = null;
    msr.Notes.filter((fnn: XMLNote) => fnn.Tied && fnn.Staff === n.Staff).forEach((pn: XMLNote) => {
      if (pn.Beat === n.Beat - (n.Duration * msr.TimeSignature.bottom)) {
        prevTiedNote = pn;
      }
    });

    if (!prevTiedNote) {
      n.TiedStart === n.Beat;
    } else {
      n.TiedStart === prevTiedNote.TiedStart;
    }
    let nextNotes = msr.Notes.filter((nn: XMLNote) => nn.Staff === n.Staff &&
                                     n.NoteName === nn.NoteName && nn.Tied &&
                                     nn.Beat > n.Beat);

    n.TiedEnd = n.Beat + n.Duration;
    nextNotes.forEach((nn: XMLNote) => {
      n.TiedEnd = nn.Beat + nn.Duration;
    });
  });

  return msr;
}

export { TieNotesInMeasure };
