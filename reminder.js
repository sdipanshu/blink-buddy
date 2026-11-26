const REST_S = 20;
const $ = (id) => document.getElementById(id);

$("skip").addEventListener("click", () => window.close(), { once: true });

BLINK.settings().then((s) => {
  BLINK.applyTheme(document.documentElement, s);
  const art = BLINK_ART.mount($("art"), s);
  const end = Date.now() + REST_S * 1000;
  const timer = setInterval(tick, 250);
  tick();

  function tick() {
    const left = Math.max(0, end - Date.now());
    $("count").textContent = Math.ceil(left / 1000);
    art.set(1 - left / (REST_S * 1000)); // the eye opens (or the ring fills) as you rest
    if (left > 0) return;
    clearInterval(timer);
    $("title").textContent = "Done";
    $("text").textContent = "Your eyes are rested.";
    $("actions").replaceChildren();
    chrome.runtime.sendMessage({ type: "chime" });
    setTimeout(() => window.close(), 1800);
  }
});
