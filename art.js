// Draws the chosen character into a container. Built with DOM calls only (no HTML strings),
// so it also works inside the page overlay on strict websites.
// mount(...) returns { set(value) }: for the eye, value is how open it is (0 shut, 1 open);
// for other characters it is how full the ring around them is (0 empty, 1 full).
globalThis.BLINK_ART = (() => {
  const NS = "http://www.w3.org/2000/svg";
  const svgEl = (tag, attrs = {}) => {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    return n;
  };
  const EYE = "M6 72Q50 20 94 72Q50 124 6 72z";

  function eye(container) {
    const clipId = "blink-eye-" + Math.random().toString(36).slice(2);
    const svg = svgEl("svg", { viewBox: "0 0 100 140", class: "art", "aria-hidden": "true" });
    const clip = svgEl("clipPath", { id: clipId });
    clip.append(svgEl("path", { d: EYE }));
    const defs = svgEl("defs");
    defs.append(clip);
    const ball = svgEl("g", { "clip-path": `url(#${clipId})` });
    ball.append(
      svgEl("circle", { class: "iris", cx: 50, cy: 72, r: 21 }),
      svgEl("circle", { class: "pupil", cx: 50, cy: 72, r: 10 }),
      svgEl("circle", { class: "glint", cx: 57, cy: 65, r: 4 }),
    );
    const lid = svgEl("path", { class: "lid" });
    const lashes = svgEl("path", { class: "lashes" });
    svg.append(defs, svgEl("path", { class: "white", d: EYE }), ball, lid, svgEl("path", { class: "outline", d: EYE }), lashes);
    container.replaceChildren(svg);
    return {
      set(open) {
        const ctrl = 20 + (1 - open) * 104; // the lid edge sweeps from the top curve to the bottom one
        lid.setAttribute("d", `M6 72Q50 20 94 72Q50 ${ctrl} 6 72z`);
        lashes.setAttribute("d", [0.2, 0.35, 0.5, 0.65, 0.8].map((t) => {
          const x = 6 + 88 * t;
          const y = 72 + 2 * t * (1 - t) * (ctrl - 72);
          return `M${x} ${y}L${x + (t - 0.5) * 16} ${y + (1 - 2 * open) * 10}`;
        }).join(""));
      },
    };
  }

  // An emoji character inside a ring that drains or fills.
  function ringed(container, emoji) {
    const R = 44, C = 2 * Math.PI * R;
    const svg = svgEl("svg", { viewBox: "0 0 100 140", class: "art", "aria-hidden": "true" });
    const g = svgEl("g", { transform: "rotate(-90 50 72)" });
    const ring = svgEl("circle", { class: "ring", cx: 50, cy: 72, r: R, "stroke-dasharray": C });
    g.append(svgEl("circle", { class: "ring-track", cx: 50, cy: 72, r: R }), ring);
    const t = svgEl("text", { x: 50, y: 74, class: "emoji", "text-anchor": "middle", "dominant-baseline": "central" });
    t.textContent = emoji;
    svg.append(g, t);
    container.replaceChildren(svg);
    return { set(full) { ring.setAttribute("stroke-dashoffset", String(C * (1 - Math.max(0, Math.min(1, full))))); } };
  }

  function mount(container, s) {
    return s.character === "eye" ? eye(container) : ringed(container, s.character);
  }

  return { mount };
})();
