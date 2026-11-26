const $ = (id) => document.getElementById(id);
let current = null;
let proposal = null; // what the photo suggested, until "Use this"

async function render() {
  current = await BLINK.settings();
  const shown = proposal ? { ...current, ...proposal } : current;
  BLINK.applyTheme(document.documentElement, shown);
  BLINK_ART.mount($("preview"), shown).set(1);

  $("characters").replaceChildren(...BLINK.PICKER.map((c) => {
    const b = Object.assign(document.createElement("button"), { className: "chip" + (shown.character === c ? " on" : "") });
    b.setAttribute("role", "radio");
    b.setAttribute("aria-checked", String(shown.character === c));
    if (c === "eye") {
      b.setAttribute("aria-label", "Eye");
      BLINK_ART.mount(b, { character: "eye" }).set(1);
    } else {
      b.textContent = c;
      b.setAttribute("aria-label", c);
    }
    b.addEventListener("click", () => save({ character: c, characterLabel: "" }));
    return b;
  }));
  // A character the photo picked that isn't in the list still gets a chip.
  if (!BLINK.PICKER.includes(shown.character)) {
    const b = Object.assign(document.createElement("button"), { className: "chip on", textContent: shown.character });
    b.setAttribute("role", "radio");
    b.setAttribute("aria-checked", "true");
    $("characters").prepend(b);
  }

  const swatches = Object.entries(BLINK.THEMES).map(([id, t]) => [id, t.name, t.base]);
  if (shown.customColor) swatches.push(["custom", "From your photo", shown.customColor]);
  $("themes").replaceChildren(...swatches.map(([id, name, base]) => {
    const b = Object.assign(document.createElement("button"), { className: "swatch" + (shown.theme === id ? " on" : ""), title: name });
    const [a, z] = BLINK.palette(base).tile;
    b.style.background = `linear-gradient(135deg, ${a}, ${z})`;
    b.setAttribute("role", "radio");
    b.setAttribute("aria-checked", String(shown.theme === id));
    b.setAttribute("aria-label", name);
    b.addEventListener("click", () => save({ theme: id }));
    return b;
  }));
}

async function save(changes) {
  proposal = null;
  $("result").hidden = true;
  await chrome.storage.local.set(changes);
}

// ---------- photo ----------

// The photo's main colour: the most common saturated colour, ignoring near-white and near-black.
function mainColour(img) {
  const c = new OffscreenCanvas(48, 48);
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0, 48, 48);
  const px = ctx.getImageData(0, 0, 48, 48).data;
  const buckets = new Map();
  for (let i = 0; i < px.length; i += 4) {
    const [r, g, b] = [px[i], px[i + 1], px[i + 2]];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (max < 35 || min > 225) continue;
    const sat = max === 0 ? 0 : (max - min) / max;
    const key = (r >> 4) << 8 | (g >> 4) << 4 | (b >> 4);
    const e = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0, sat: 0 };
    e.n++; e.r += r; e.g += g; e.b += b; e.sat += sat;
    buckets.set(key, e);
  }
  let best = null, score = -1;
  for (const e of buckets.values()) {
    const s = e.n * (0.15 + e.sat / e.n);
    if (s > score) { score = s; best = e; }
  }
  if (!best) return BLINK.THEMES.graphite.base;
  const hex = (v) => Math.round(v / best.n).toString(16).padStart(2, "0");
  return "#" + hex(best.r) + hex(best.g) + hex(best.b);
}

// Ask Chrome's built-in Gemini Nano (on this computer) what the photo shows.
async function askOnDeviceAI(blob) {
  const LM = globalThis.LanguageModel;
  if (!LM) return { why: "this version of Chrome has no built-in AI" };
  const opts = { expectedInputs: [{ type: "image" }, { type: "text", languages: ["en"] }], expectedOutputs: [{ type: "text", languages: ["en"] }] };
  let availability;
  try { availability = await LM.availability(opts); } catch { availability = "unavailable"; }
  if (availability === "unavailable") return { why: "Chrome's built-in AI can't look at photos here yet (newer Chrome versions can)" };
  const session = await LM.create({
    ...opts,
    initialPrompts: [{ role: "system", content: "You choose a friendly mascot for an eye-break reminder app, based on a photo. Answer only with the requested JSON." }],
  });
  try {
    const schema = {
      type: "object",
      properties: {
        emoji: { type: "string", description: "One emoji that best matches the main subject of the photo" },
        label: { type: "string", description: "The main subject in 2 to 4 words, e.g. 'orange tabby cat'" },
        color: { type: "string", pattern: "^#[0-9a-fA-F]{6}$", description: "The main subject's colour" },
      },
      required: ["emoji", "label", "color"],
      additionalProperties: false,
    };
    const answer = await session.prompt([{
      role: "user",
      content: [
        { type: "text", value: "What is the main subject of this photo? Give one emoji that matches it as closely as possible, a short label, and its main colour as #rrggbb." },
        { type: "image", value: blob },
      ],
    }], { responseConstraint: schema });
    const r = JSON.parse(answer);
    return { emoji: BLINK.isEmoji(r.emoji) ? r.emoji.trim() : null, label: String(r.label ?? "").slice(0, 40), color: /^#[0-9a-f]{6}$/i.test(r.color) ? r.color : null };
  } finally {
    session.destroy?.();
  }
}

$("file").addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  e.target.value = "";
  if (!file) return;
  const url = URL.createObjectURL(file);
  $("photo").src = url;
  $("photo").hidden = false;
  $("result").hidden = true;
  $("status").textContent = "Looking at your photo on this computer…";
  try {
    const bitmap = await createImageBitmap(file);
    const colour = mainColour(bitmap);
    let ai;
    try { ai = await askOnDeviceAI(file); } catch (err) { ai = { why: "the built-in AI couldn't read this photo" }; }
    if (ai.emoji) {
      proposal = { character: ai.emoji, characterLabel: ai.label, theme: "custom", customColor: ai.color ?? colour };
      $("status").textContent = `Looks like ${ai.label || "this"}, so: ${ai.emoji} with matching colours.`;
    } else {
      proposal = { theme: "custom", customColor: colour };
      $("status").textContent = `Colours taken from your photo. Pick a character above (${ai.why}).`;
    }
    $("result").hidden = false;
    render();
  } catch {
    $("status").textContent = "That file couldn't be opened as an image.";
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
});

$("use").addEventListener("click", () => save(proposal ?? {}));
$("dismiss").addEventListener("click", () => {
  proposal = null;
  $("result").hidden = true;
  $("photo").hidden = true;
  $("status").textContent = "Upload a photo of your pet, plant or favourite mug. Blink Buddy picks a matching character and colours.";
  render();
});

chrome.storage.onChanged.addListener(render);
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", render);
render();
