// Injected into the page you're on when an eye break starts (only if you allowed it in the popup).
// Lives in its own shadow root, so the page's styles can't change it and it can't change the page.
(() => {
  if (document.getElementById("blink-eye-break")) return; // already showing
  const REST_S = 20;

  const el = (tag, props = {}, ...kids) => {
    const n = Object.assign(document.createElement(tag), props);
    n.append(...kids);
    return n;
  };
  const artBox = el("div");
  const title = el("h1", { textContent: "Rest your eyes" });
  const text = el("p", { textContent: "Look at something 20 feet (6 m) away." });
  const count = el("div", { className: "time", textContent: String(REST_S) });
  count.setAttribute("role", "timer");
  const skip = el("button", { textContent: "Skip", type: "button" });
  const actions = el("div", { className: "actions" }, skip);
  const card = el("div", { className: "card" }, artBox, title, text, count, actions);
  const dialog = el("dialog", {}, card);
  dialog.setAttribute("aria-label", "Eye break");

  const host = el("div", { id: "blink-eye-break" });
  host.style.cssText = "all: initial; position: fixed; inset: 0; z-index: 2147483647; pointer-events: none;";
  const root = host.attachShadow({ mode: "open" });
  const sheet = new CSSStyleSheet(); // constructed sheet: not blocked by the page's security rules
  sheet.replaceSync(`
    :host { color-scheme: light dark; --white: #fffdfa; }
    @media (prefers-color-scheme: dark) { :host { --white: #f5efe8; } }
    dialog { pointer-events: auto; border: 0; padding: 0; background: transparent; max-width: none; max-height: none; overflow: visible; }
    dialog::backdrop { background: rgba(20, 12, 6, .55); backdrop-filter: blur(6px); }
    .card { width: 340px; padding: 28px 24px 24px; border-radius: 20px; background: var(--bg); color: var(--fg); box-shadow: 0 30px 80px rgba(0,0,0,.35);
      display: flex; flex-direction: column; align-items: center; text-align: center; font: 15px/1.35 system-ui, "Segoe UI", sans-serif; animation: in .25s ease-out; }
    @keyframes in { from { opacity: 0; transform: scale(.96); } }
    .art { width: 112px; height: 156px; overflow: visible; display: block; }
    .outline { fill: none; stroke: var(--line); stroke-width: 2.5; stroke-linejoin: round; }
    .white { fill: var(--white); } .iris { fill: var(--accent); } .pupil { fill: #21160e; } .glint { fill: #fff; }
    .lid { fill: var(--lid); stroke: var(--line); stroke-width: 2.5; stroke-linejoin: round; transition: d 1s cubic-bezier(.3,.7,.3,1); }
    .lashes { fill: none; stroke: var(--line); stroke-width: 2.5; stroke-linecap: round; transition: d 1s cubic-bezier(.3,.7,.3,1); }
    .ring-track { fill: none; stroke: var(--off); stroke-width: 7; opacity: .6; }
    .ring { fill: none; stroke: var(--accent); stroke-width: 7; stroke-linecap: round; transition: stroke-dashoffset 1s linear; }
    .emoji { font-size: 50px; font-family: "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif; }
    h1 { margin: 10px 0 4px; font-size: 22px; line-height: 1.2; font-weight: 700; }
    p { margin: 0; }
    .time { margin: 12px 0 0; font-size: 48px; line-height: 1; font-weight: 600; font-variant-numeric: tabular-nums; }
    .actions { display: flex; gap: 10px; margin-top: 18px; min-height: 38px; }
    button { font: inherit; padding: 8px 18px; border-radius: 8px; border: 1.5px solid var(--line); background: transparent; color: var(--fg); cursor: pointer; }
    button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    @media (prefers-reduced-motion: reduce) { .card { animation: none; } .lid, .lashes { transition: none; } }
  `);
  root.adoptedStyleSheets = [sheet];
  root.append(dialog);

  let art = { set() {} };
  BLINK.settings().then((s) => {
    BLINK.applyTheme(card, s);
    art = BLINK_ART.mount(artBox, s);
    art.set(0);
  });

  // In fullscreen only the fullscreen element is on screen, so join it there. A <video> (or any
  // element that can't show children) can't hold us; then the modal dialog's top layer still
  // puts the break above it.
  const fs = document.fullscreenElement;
  const holder = fs && !/^(VIDEO|IMG|CANVAS|IFRAME|OBJECT|EMBED|AUDIO)$/.test(fs.tagName) ? fs : document.documentElement;
  holder.append(host);
  dialog.showModal();
  skip.focus();

  // Pause videos playing on the page, and resume the same ones afterwards.
  const paused = [...document.querySelectorAll("video")].filter((v) => !v.paused);
  paused.forEach((v) => v.pause());

  const end = Date.now() + REST_S * 1000;
  const timer = setInterval(tick, 250);

  function close() {
    clearInterval(timer);
    dialog.close();
    host.remove();
    paused.forEach((v) => v.play().catch(() => {}));
  }
  function tick() {
    const left = Math.max(0, end - Date.now());
    count.textContent = String(Math.ceil(left / 1000));
    art.set(1 - left / (REST_S * 1000)); // the eye opens (or the ring fills) as you rest
    if (left > 0) return;
    clearInterval(timer);
    title.textContent = "Done";
    text.textContent = "Your eyes are rested.";
    actions.replaceChildren();
    try { chrome.runtime.sendMessage({ type: "chime" }); } catch {}
    setTimeout(close, 1800);
  }
  skip.addEventListener("click", close);
  dialog.addEventListener("cancel", (e) => { e.preventDefault(); close(); }); // Esc
})();
