export async function playReferenceTone() {
  const Tone = await import("tone");

  await Tone.start();

  const synth = new Tone.PolySynth(Tone.Synth).toDestination();
  const now = Tone.now();

  synth.triggerAttackRelease(["C4", "E4", "G4"], "8n", now);
  synth.triggerAttackRelease(["F4", "A4", "C5"], "8n", now + 0.45);

  window.setTimeout(() => {
    synth.dispose();
  }, 1500);
}
