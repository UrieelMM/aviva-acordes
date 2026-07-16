import type { Setlist, Song } from "@/types/domain";

export const demoSongs: Song[] = [
  {
    id: "digno-y-santo",
    title: "Digno y Santo",
    artist: "Gateway Worship",
    originalKey: "D",
    tempo: 72,
    timeSignature: "4/4",
    duration: "6:12",
    tags: ["Adoración", "Congregacional"],
    updatedAt: "2026-07-11T19:20:00.000Z",
    status: "synced",
    sections: [
      { id: "intro", label: "Intro", type: "intro" },
      { id: "verse-1", label: "Verso 1", type: "verse" },
      { id: "chorus", label: "Coro", type: "chorus" },
      { id: "bridge", label: "Puente", type: "bridge" },
    ],
    notes: [
      { id: "n1", sectionId: "intro", instrument: "general", content: "Entrar suave, 4 compases de intro." },
      { id: "n2", sectionId: "chorus", instrument: "guitar", content: "Abrir voicings y dejar respirar el último D." },
      { id: "n3", sectionId: "bridge", instrument: "drums", content: "Build gradual con toms; crash hasta la segunda vuelta." },
      { id: "n4", sectionId: "verse-1", instrument: "piano", content: "Pad sostenido, sin marcar terceras al inicio." },
    ],
    chordProSource: `{title: Digno y Santo}\n{artist: Gateway Worship}\n{key: D}\n{tempo: 72}\n\n{comment: Intro}\n[D]  [A]  [Em]  [G]\n\n{start_of_verse: Verso 1}\n[D]Digno es el Cordero [A]Santo, Santo es Él\n[Em]Levantamos nuestra alabanza [G]al que en el trono está\n{end_of_verse}\n\n{start_of_chorus: Coro}\n[D]Santo, Santo, Santo [A]Dios Todopoderoso\n[Em]Quien fue, quien es y quien [G]vendrá\n[D]La creación hoy canta y [A]damos gloria a Él\n[Em]Tú eres digno por [G]siempre y siempre\n{end_of_chorus}\n\n{start_of_bridge: Puente}\n[D]Lleno está mi ser de [A]asombro y maravilla\n[Em]Al mencionar tu [G]nombre, Jesús\n{end_of_bridge}`,
  },
  {
    id: "gracia-sublime",
    title: "Gracia Sublime Es",
    artist: "En Espíritu y en Verdad",
    originalKey: "G",
    tempo: 98,
    timeSignature: "4/4",
    duration: "4:48",
    tags: ["Celebración", "Gracia"],
    updatedAt: "2026-07-10T16:45:00.000Z",
    status: "synced",
    sections: [
      { id: "verse-1", label: "Verso 1", type: "verse" },
      { id: "chorus", label: "Coro", type: "chorus" },
    ],
    notes: [{ id: "n5", sectionId: "chorus", instrument: "bass", content: "Octavas en la segunda mitad del coro." }],
    chordProSource: `{title: Gracia Sublime Es}\n{artist: En Espíritu y en Verdad}\n{key: G}\n\n{start_of_verse: Verso 1}\n[G]¿Quién rompe el poder del pecado?\n[C]Su amor es fuerte y poderoso\n[Em]El Rey de gloria, [D]el Rey de majestad\n{end_of_verse}\n\n{start_of_chorus: Coro}\n[G]Gracia sublime es, [C]perfecto es tu amor\n[Em]Tomaste mi lugar, [D]cargaste tú mi cruz\n{end_of_chorus}`,
  },
  {
    id: "bueno-es-dios",
    title: "Bueno es Dios",
    artist: "Miel San Marcos",
    originalKey: "A",
    tempo: 124,
    timeSignature: "4/4",
    duration: "5:03",
    tags: ["Celebración", "Rápida"],
    updatedAt: "2026-07-08T21:10:00.000Z",
    status: "pending",
    sections: [{ id: "chorus", label: "Coro", type: "chorus" }],
    notes: [],
    chordProSource: `{title: Bueno es Dios}\n{artist: Miel San Marcos}\n{key: A}\n\n{start_of_chorus: Coro}\n[A]Bueno es Dios, [D]bueno es Dios\n[F#m]Su misericordia [E]es para siempre\n{end_of_chorus}`,
  },
  {
    id: "mil-generaciones",
    title: "Mil Generaciones",
    artist: "Elevation Worship",
    originalKey: "B",
    tempo: 68,
    timeSignature: "6/8",
    duration: "7:20",
    tags: ["Bendición", "Adoración"],
    updatedAt: "2026-07-06T14:00:00.000Z",
    status: "synced",
    sections: [{ id: "verse-1", label: "Verso 1", type: "verse" }],
    notes: [],
    chordProSource: `{title: Mil Generaciones}\n{artist: Elevation Worship}\n{key: B}\n\n[B]Dios te guarde y bendiga\n[E]Que extienda su amor y te muestre favor`,
  },
  {
    id: "la-bondad-de-dios",
    title: "La Bondad de Dios",
    artist: "Bethel Music",
    originalKey: "Ab",
    tempo: 63,
    timeSignature: "4/4",
    duration: "5:41",
    tags: ["Adoración", "Testimonio"],
    updatedAt: "2026-07-03T18:30:00.000Z",
    status: "synced",
    sections: [{ id: "chorus", label: "Coro", type: "chorus" }],
    notes: [],
    chordProSource: `{title: La Bondad de Dios}\n{artist: Bethel Music}\n{key: Ab}\n\n[Ab]En mi vida has sido bueno\n[Db]En mi vida has sido tan fiel\n[Fm]Con mi ser, con cada aliento\n[Eb]Yo cantaré de la bondad de Dios`,
  },
];

export const demoSetlists: Setlist[] = [
  {
    id: "domingo-14-julio",
    name: "Domingo · Reunión general",
    date: "2026-07-14",
    time: "11:00",
    venue: "Auditorio principal",
    leader: "Daniel R.",
    status: "ready",
    items: [
      { id: "si-1", songId: "bueno-es-dios", transposeSemitones: 0, capo: 0 },
      { id: "si-2", songId: "gracia-sublime", transposeSemitones: 2, capo: 2, note: "Repetir coro final x2" },
      { id: "si-3", songId: "digno-y-santo", transposeSemitones: 0, capo: 2 },
      { id: "si-4", songId: "la-bondad-de-dios", transposeSemitones: 0, capo: 1 },
    ],
  },
  {
    id: "noche-de-oracion",
    name: "Noche de oración",
    date: "2026-07-18",
    time: "20:00",
    venue: "Sala norte",
    leader: "Sofía M.",
    status: "draft",
    items: [
      { id: "si-5", songId: "mil-generaciones", transposeSemitones: -2, capo: 0 },
      { id: "si-6", songId: "digno-y-santo", transposeSemitones: -2, capo: 0 },
    ],
  },
];

export function getSong(id: string) {
  return demoSongs.find((song) => song.id === id) ?? demoSongs[0];
}

export function getSetlist(id: string) {
  return demoSetlists.find((setlist) => setlist.id === id) ?? demoSetlists[0];
}

