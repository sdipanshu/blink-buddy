const MINUTES = 20; // keep in sync with background.js
const $ = (id) => document.getElementById(id);
let art = null;
let look = "";

function clock(ms) {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

async function render() {
  const s = await BLINK.settings();
  const key = s.character + s.theme + s.customColor;
  if (key !== look) { // character or theme changed
    look = key;
    BLINK.applyTheme(document.documentElement, s);
    art = BLINK_ART.mount($("art"), s);
  }
  const { on } = await chrome.storage.local.get({ on: true });
  const full = MINUTES * 60_000;
  const alarm = on ? await chrome.alarms.get("eye") : null;
  const ms = alarm ? Math.min(full, Math.max(0, alarm.scheduledTime - Date.now())) : full;
  $("on").checked = on;
  $("panel").classList.toggle("off", !on);
  $("time").textContent = on ? clock(ms) : "Off";
  $("label").textContent = on ? "until your next eye break" : "Turn on for a break every 20 minutes";
  $("now").hidden = !on;
  $("overlayRow").hidden = !on;
  art.set(on ? ms / full : 0); // the eye slowly closes (or the ring drains) as the next break nears
}

$("on").addEventListener("change", (e) => chrome.storage.local.set({ on: e.target.checked }));

// Showing the break over the page needs access to websites, so ask only when it's switched on.
const PAGES = { origins: ["http://*/*", "https://*/*"] };
async function renderOverlay() {
  const { overlay } = await chrome.storage.local.get({ overlay: false });
  $("overlay").checked = overlay && (await chrome.permissions.contains(PAGES));
}
$("overlay").addEventListener("change", async (e) => {
  if (e.target.checked) {
    const granted = await chrome.permissions.request(PAGES);
    await chrome.storage.local.set({ overlay: granted });
  } else {
    await chrome.storage.local.set({ overlay: false });
    await chrome.permissions.remove(PAGES).catch(() => {});
  }
  renderOverlay();
});
renderOverlay();

$("now").addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "breakNow" });
  window.close();
});
$("customize").addEventListener("click", () => chrome.runtime.openOptionsPage());
chrome.storage.onChanged.addListener(() => { render(); renderOverlay(); });

document.body.classList.add("still");
render().then(() => setTimeout(() => document.body.classList.remove("still"), 100));
setInterval(render, 500);
