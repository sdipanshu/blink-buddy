importScripts("theme.js");

const MINUTES = 20; // the 20-20-20 rule; keep in sync with popup.js
const SIZE = { width: 360, height: 480 };
const ALARM = "eye";

const isOn = async () => (await chrome.storage.local.get({ on: true })).on;

async function startTimer() {
  await chrome.alarms.clear(ALARM);
  if (await isOn()) await chrome.alarms.create(ALARM, { delayInMinutes: MINUTES, periodInMinutes: MINUTES });
  else await closeReminder();
}

// A timer that is switched on must always be running: recreate it if Chrome dropped it.
async function ensureTimer() {
  if (!(await chrome.alarms.get(ALARM))) await startTimer();
}

// --- The reminder is our own window: Windows can hide notifications without telling anyone. ---

const REMINDER = chrome.runtime.getURL("reminder.html");

async function findReminder() {
  const [page] = await chrome.runtime.getContexts({ contextTypes: ["TAB"], documentUrls: [REMINDER] });
  return page?.windowId;
}

async function closeReminder() {
  const id = await findReminder();
  if (id !== undefined) await chrome.windows.remove(id).catch(() => {});
}

// Centre on the browser window.
async function position() {
  try {
    const w = await chrome.windows.getLastFocused({ windowTypes: ["normal"] });
    if (w.state === "minimized" || w.left < -10000) return {};
    return {
      left: Math.max(0, Math.round(w.left + (w.width - SIZE.width) / 2)),
      top: Math.max(0, Math.round(w.top + (w.height - SIZE.height) / 2)),
    };
  } catch {
    return {};
  }
}

const PAGES = { origins: ["http://*/*", "https://*/*"] };

// Show the break on top of the page you're on, if you allowed it, Chrome is the app in front,
// and the page is a normal website. Returns false when it can't (then the window is used).
async function showOnPage() {
  const { overlay } = await chrome.storage.local.get({ overlay: false });
  if (!overlay || !(await chrome.permissions.contains(PAGES))) return false;
  try {
    const w = await chrome.windows.getLastFocused({ populate: true, windowTypes: ["normal"] });
    if (!w.focused || w.state === "minimized") return false; // you're in another app
    const tab = w.tabs.find((t) => t.active);
    if (!tab || !/^https?:/.test(tab.url ?? "")) return false; // e.g. new tab, settings, Web Store
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["theme.js", "art.js", "overlay.js"] });
    return true;
  } catch {
    return false; // a page Chrome won't let extensions touch
  }
}

async function showReminder() {
  if (await showOnPage()) return chime();
  let id = await findReminder();
  if (id === undefined) {
    const opts = { url: REMINDER, type: "popup", focused: true, ...SIZE };
    const win = await chrome.windows
      .create({ ...opts, ...(await position()) })
      .catch(() => chrome.windows.create(opts)); // off-screen position: let Chrome choose
    id = win.id;
  }
  await chrome.windows.update(id, { focused: true, drawAttention: true });
  await chime();
}

async function chime() {
  try {
    await chrome.offscreen.createDocument({
      url: "chime.html",
      reasons: ["AUDIO_PLAYBACK"],
      justification: "Play a short chime when an eye break starts and ends.",
    });
  } catch {
    // A chime is already playing.
  }
}

chrome.alarms.onAlarm.addListener(async ({ name }) => {
  if (name !== ALARM || !(await isOn())) return;
  // Nobody is at a locked screen. The timer itself keeps running.
  if ((await chrome.idle.queryState(60)) === "locked") return;
  await showReminder();
});

// Time away from a locked computer already rested your eyes: start a fresh interval.
chrome.idle.onStateChanged.addListener(async (state) => {
  if (state === "locked") return chrome.storage.session.set({ wasLocked: true });
  if (state !== "active") return;
  const { wasLocked } = await chrome.storage.session.get({ wasLocked: false });
  if (!wasLocked) return;
  await chrome.storage.session.set({ wasLocked: false });
  await startTimer();
});

chrome.runtime.onMessage.addListener((m, _sender, reply) => {
  if (m.type === "chime") chime().then(reply);
  else if (m.type === "breakNow") showReminder().then(startTimer).then(reply);
  else return;
  return true;
});

chrome.storage.onChanged.addListener((c, area) => {
  if (area === "local" && c.on) startTimer();
});

// --- Toolbar icon in your character and colours (the packaged icon is the default look) ---

function drawIcon(size, s) {
  const c = new OffscreenCanvas(size, size);
  const ctx = c.getContext("2d");
  const small = size <= 32;
  const pad = small ? 0 : size * 0.125, w = size - 2 * pad, r = w * (small ? 0.24 : 0.22);
  const [from, to] = BLINK.paletteOf(s).tile;
  const grad = ctx.createLinearGradient(pad, pad, pad + w, pad + w);
  grad.addColorStop(0, from);
  grad.addColorStop(1, to);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(pad, pad, w, w, r);
  ctx.fill();
  if (s.character === "eye") {
    const k = w / 96, cx = size / 2, cy = size / 2;
    ctx.fillStyle = "#fff8f0";
    ctx.beginPath();
    ctx.moveTo(cx - 40 * k, cy);
    ctx.quadraticCurveTo(cx, cy - (small ? 44 : 38) * k, cx + 40 * k, cy);
    ctx.quadraticCurveTo(cx, cy + (small ? 44 : 38) * k, cx - 40 * k, cy);
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,.55)";
    ctx.beginPath(); ctx.arc(cx, cy, (small ? 17 : 15) * k, 0, 7); ctx.fill();
    ctx.fillStyle = "#1b120c";
    ctx.beginPath(); ctx.arc(cx, cy, (small ? 9 : 7) * k, 0, 7); ctx.fill();
  } else {
    ctx.font = `${Math.round(w * 0.66)}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(s.character, size / 2, size / 2 + w * 0.04);
  }
  return ctx.getImageData(0, 0, size, size);
}

async function updateIcon() {
  const s = await BLINK.settings();
  if (s.character === BLINK.DEFAULTS.character && s.theme === BLINK.DEFAULTS.theme) {
    return chrome.action.setIcon({ path: { 16: "icons/icon16.png", 32: "icons/icon32.png", 48: "icons/icon48.png", 128: "icons/icon128.png" } });
  }
  const imageData = {};
  for (const size of [16, 32, 48, 128]) imageData[size] = drawIcon(size, s);
  await chrome.action.setIcon({ imageData });
}
chrome.storage.onChanged.addListener((c, area) => {
  if (area === "local" && (c.character || c.theme || c.customColor)) updateIcon();
});

chrome.runtime.onInstalled.addListener(() => { startTimer(); updateIcon(); });
// A fresh 20 minutes on browser launch, rather than an overdue reminder.
chrome.runtime.onStartup.addListener(() => { startTimer(); updateIcon(); });
ensureTimer();
updateIcon();
