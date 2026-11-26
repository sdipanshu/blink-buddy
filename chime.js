// Plays a soft two-note chime, then removes this offscreen page.
const ctx = new AudioContext();
[659.25, 880].forEach((freq, i) => {
  const at = ctx.currentTime + 0.05 + i * 0.22;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(0.35, at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, at + 0.9);
  osc.connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + 1);
});
setTimeout(() => window.close(), 1800);
