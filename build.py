"""Build the Chrome Web Store package: dist/blink-buddy-<version>.zip

Only the files the extension needs go in. Paths use forward slashes, which the store
expects (Windows' own zip tools can write backslashes, which breaks the icons folder).
"""
import json
import pathlib
import zipfile

ROOT = pathlib.Path(__file__).parent
FILES = [
    "manifest.json", "background.js", "theme.js", "art.js", "style.css",
    "popup.html", "popup.js", "options.html", "options.js",
    "reminder.html", "reminder.js", "overlay.js", "chime.html", "chime.js",
]
FILES += [f"icons/icon{size}.png" for size in (16, 32, 48, 128)]

version = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))["version"]
out = ROOT / "dist" / f"blink-buddy-{version}.zip"
out.parent.mkdir(exist_ok=True)

with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for name in FILES:
        z.write(ROOT / name, name)

with zipfile.ZipFile(out) as z:
    bad = z.testzip()
    assert bad is None, f"corrupt entry: {bad}"
    print(f"{out.relative_to(ROOT)}: {len(z.namelist())} files, {out.stat().st_size:,} bytes")
