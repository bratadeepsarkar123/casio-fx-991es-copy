let unlocked = false;
let ctx: AudioContext | null = null;

export function unlockAudio(): void {
  if (unlocked) {
    return;
  }
  const AC = globalThis.AudioContext || (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) {
    return;
  }
  ctx = new AC();
  void ctx.resume();
  unlocked = true;
}

export function playKeyClick(): void {
  if (!ctx) {
    return;
  }
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.value = 1800;
  gain.gain.value = 0.03;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.03);
  osc.stop(ctx.currentTime + 0.03);
}

export function haptic(): void {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(8);
  }
}
