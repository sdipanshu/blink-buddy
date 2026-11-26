// Themes, characters and settings shared by every part of Blink (popup, break window,
// page overlay, settings page and the toolbar icon). Assigned to globalThis so the page
// overlay can load it again on every break without "already declared" errors.
globalThis.BLINK = (() => {
  const THEMES = {
    amber:    { name: "Amber",    base: "#e5832f" },
    teal:     { name: "Teal",     base: "#18a08d" },
    purple:   { name: "Purple",   base: "#6a4cf0" },
    rose:     { name: "Rose",     base: "#e0557c" },
    graphite: { name: "Graphite", base: "#5b6673" },
  };

  // "eye" is drawn by Blink; every other character is an emoji, so the on-device AI can
  // choose any emoji that matches your photo. These are the ones offered in the picker.
  const PICKER = ["eye", "🐱", "🐶", "🦉", "🐼", "🦊", "🐰", "🐸", "🐧", "🦥", "🌱", "🌸", "☕", "🤖"];
  const isEmoji = (s) => typeof s === "string" && s.length <= 16 && /\p{Extended_Pictographic}/u.test(s);

  const DEFAULTS = { character: "eye", theme: "amber", customColor: null, characterLabel: "" };

  async function settings() {
    const s = await chrome.storage.local.get(DEFAULTS);
    if (s.character !== "eye" && !isEmoji(s.character)) s.character = "eye";
    if (s.theme === "custom" ? !/^#[0-9a-f]{6}$/i.test(s.customColor ?? "") : !THEMES[s.theme]) s.theme = "amber";
    return s;
  }

  // --- colour maths: one base colour becomes a full light and dark palette ---
  function hexToHsl(hex) {
    const n = parseInt(hex.slice(1), 16);
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
    if (max === min) return [0, 0, l * 100];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s * 100, l * 100];
  }
  const hsl = (h, s, l) => `hsl(${Math.round(h)} ${Math.round(Math.max(0, Math.min(100, s)))}% ${Math.round(Math.max(0, Math.min(100, l)))}%)`;

  function palette(base) {
    const [h, s0, l0] = hexToHsl(base);
    const s = Math.min(s0, 85);
    return {
      tile: [hsl(h, s, Math.min(l0 + 12, 68)), hsl(h, s, Math.max(l0 - 12, 30))],
      light: { bg: hsl(h, s * 0.6, 94), fg: hsl(h, 35, 12), mut: hsl(h, 12, 44), line: hsl(h, 30, 16), accent: hsl(h, Math.max(s, s0 > 8 ? 45 : 0), Math.min(Math.max(l0, 38), 48)), lid: hsl(h, s * 0.7, 80), off: hsl(h, 12, 78) },
      dark:  { bg: hsl(h, s * 0.35, 13), fg: hsl(h, 25, 93), mut: hsl(h, 10, 64), line: hsl(h, 20, 85), accent: hsl(h, Math.max(s, s0 > 8 ? 50 : 0), 62), lid: hsl(h, s * 0.4, 30), off: hsl(h, 10, 32) },
    };
  }
  const baseOf = (s) => (s.theme === "custom" ? s.customColor : THEMES[s.theme]?.base) ?? THEMES.amber.base;
  const paletteOf = (s) => palette(baseOf(s));

  const isDark = () => !!globalThis.matchMedia?.("(prefers-color-scheme: dark)").matches;

  // Put the palette on an element as CSS variables (--bg, --fg, --accent ...).
  function applyTheme(el, s) {
    const p = paletteOf(s);
    for (const [k, v] of Object.entries(isDark() ? p.dark : p.light)) el.style.setProperty("--" + k, v);
  }

  return { THEMES, PICKER, DEFAULTS, isEmoji, settings, palette, paletteOf, applyTheme };
})();
