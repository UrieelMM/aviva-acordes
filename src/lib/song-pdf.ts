export type SongPdfInput = {
  source: string;
  title: string;
  artist: string;
  key: string;
  tempo: number;
  timeSignature: string;
  duration: string;
  tags: string[];
  transposeDescription?: string;
};

type PrintableLine =
  | { kind: "section"; text: string }
  | { kind: "chords"; text: string }
  | { kind: "lyrics"; text: string }
  | { kind: "space"; text: "" };

const sectionNames: Record<string, string> = {
  verse: "Verso",
  chorus: "Coro",
  prechorus: "Pre-coro",
  bridge: "Puente",
  intro: "Intro",
  instrumental: "Instrumental",
  interlude: "Interludio",
  solo: "Solo",
  tag: "Tag",
  outro: "Outro",
};

export async function createSongPdfBlob(input: SongPdfInput) {
  const { jsPDF } = await import("jspdf");
  const document = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter", putOnlyUsedFonts: true });
  const pageWidth = document.internal.pageSize.getWidth();
  const pageHeight = document.internal.pageSize.getHeight();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  document.setProperties({ title: input.title, author: input.artist, subject: "Canción con acordes" });

  const drawHeader = (continuation = false) => {
    document.setFillColor(30, 27, 75);
    document.rect(0, 0, pageWidth, continuation ? 54 : 132, "F");
    document.setTextColor(255, 255, 255);
    document.setFont("helvetica", "bold");
    document.setFontSize(continuation ? 13 : 24);
    document.text(input.title, margin, continuation ? 33 : 50, { maxWidth: contentWidth });

    if (continuation) {
      document.setFont("helvetica", "normal");
      document.setFontSize(8.5);
      document.setTextColor(199, 210, 254);
      document.text("Continuación", pageWidth - margin, 33, { align: "right" });
      y = 78;
      return;
    }

    document.setFont("helvetica", "normal");
    document.setFontSize(11);
    document.setTextColor(199, 210, 254);
    document.text(input.artist || "Sin artista", margin, 72);

    const details = [`Tono ${input.key}`, `${input.tempo} bpm`, input.timeSignature, input.duration]
      .filter(Boolean)
      .join("   •   ");
    document.setFontSize(9.5);
    document.setTextColor(238, 242, 255);
    document.text(details, margin, 100);
    if (input.transposeDescription) {
      document.setTextColor(199, 210, 254);
      document.text(input.transposeDescription, margin, 118, { maxWidth: contentWidth });
    }
    y = 158;
  };

  const ensureSpace = (height: number) => {
    if (y + height <= pageHeight - 48) return;
    document.addPage();
    drawHeader(true);
  };

  drawHeader();

  if (input.tags.length) {
    document.setFont("helvetica", "bold");
    document.setFontSize(8.5);
    document.setTextColor(79, 70, 229);
    document.text(input.tags.map((tag) => tag.toUpperCase()).join("  •  "), margin, y);
    y += 25;
  }

  const printableLines = chordProToPrintableLines(input.source);
  printableLines.forEach((line) => {
    if (line.kind === "space") {
      y += 8;
      return;
    }

    if (line.kind === "section") {
      ensureSpace(42);
      y += 10;
      document.setFillColor(238, 242, 255);
      document.roundedRect(margin, y - 13, Math.min(contentWidth, document.getTextWidth(line.text.toUpperCase()) + 26), 25, 8, 8, "F");
      document.setFont("helvetica", "bold");
      document.setFontSize(9);
      document.setTextColor(55, 48, 163);
      document.text(line.text.toUpperCase(), margin + 13, y + 3);
      y += 27;
      return;
    }

    document.setFont("courier", line.kind === "chords" ? "bold" : "normal");
    document.setFontSize(line.kind === "chords" ? 9.5 : 10.5);
    if (line.kind === "chords") document.setTextColor(79, 70, 229);
    else document.setTextColor(30, 41, 59);
    const wrapped = document.splitTextToSize(line.text || " ", contentWidth) as string[];
    ensureSpace(wrapped.length * 14 + 4);
    wrapped.forEach((part) => {
      document.text(part, margin, y);
      y += 14;
    });
    if (line.kind === "lyrics") y += 4;
  });

  const pages = document.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    document.setPage(page);
    document.setDrawColor(226, 232, 240);
    document.line(margin, pageHeight - 34, pageWidth - margin, pageHeight - 34);
    document.setFont("helvetica", "normal");
    document.setFontSize(8);
    document.setTextColor(100, 116, 139);
    document.text("WorshipNotes · Canción exportada", margin, pageHeight - 18);
    document.text(`${page} / ${pages}`, pageWidth - margin, pageHeight - 18, { align: "right" });
  }

  return document.output("blob");
}

export async function downloadSongPdf(input: SongPdfInput) {
  const blob = await createSongPdfBlob(input);
  downloadBlob(blob, `${slugify(input.title)}.pdf`);
}

export function downloadTextFile(content: string, filename: string) {
  downloadBlob(new Blob([content], { type: "text/plain;charset=utf-8" }), filename);
}

function chordProToPrintableLines(source: string): PrintableLine[] {
  const output: PrintableLine[] = [];

  source.split("\n").forEach((rawLine) => {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      output.push({ kind: "space", text: "" });
      return;
    }

    const section = line.match(/^\{start_of_([a-z_]+)(?::\s*([^}]+))?\}$/i);
    if (section) {
      output.push({ kind: "section", text: section[2]?.trim() || sectionNames[section[1].replaceAll("_", "")] || section[1] });
      return;
    }
    if (/^\{end_of_[^}]+\}$/i.test(line)) return;

    const comment = line.match(/^\{comment:\s*([^}]+)\}$/i);
    if (comment) {
      output.push({ kind: "section", text: comment[1].trim() });
      return;
    }
    if (/^\{[^}]+\}$/.test(line)) return;

    const { chords, lyrics } = splitChordLine(line);
    if (chords.trim()) output.push({ kind: "chords", text: chords.trimEnd() });
    if (lyrics.trim()) output.push({ kind: "lyrics", text: lyrics.trimEnd() });
  });

  return output;
}

function splitChordLine(line: string) {
  let lyrics = "";
  let chords = "";
  let cursor = 0;

  for (const match of line.matchAll(/\[([^\]]+)]/g)) {
    const index = match.index ?? 0;
    lyrics += line.slice(cursor, index);
    const chord = match[1].trim();
    const chordPosition = Math.max(lyrics.length, chords.length ? chords.length + 1 : 0);
    chords = chords.padEnd(chordPosition, " ") + chord;
    cursor = index + match[0].length;
  }
  lyrics += line.slice(cursor);

  return { chords, lyrics };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "cancion";
}
