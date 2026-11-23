"""Prepare one chapter's slides for the build: PDF (or PPTX via LibreOffice) -> chN.pdf, per-slide text, images.

Usage (repo root): python3 tools/prep_slides.py <COURSE> <chapter> <path to .pdf or .pptx>
Writes .build/src/<COURSE>/: chN.pdf, txtN/<page>.txt, hiresN/s-NN.png, webpN/sNN.webp (1600px q82), jpgN/sNN.jpg (1280px q72).
Needs: poppler-utils (pdftotext, pdftoppm, pdfinfo), Pillow, and libreoffice for .pptx.
"""
import os, shutil, subprocess, sys, tempfile
from PIL import Image

course, ch, src = sys.argv[1], int(sys.argv[2]), sys.argv[3]
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
base = os.path.join(root, ".build", "src", course)
os.makedirs(base, exist_ok=True)
pdf = os.path.join(base, f"ch{ch}.pdf")

if src.lower().endswith((".pptx", ".ppt")):
    tmp = tempfile.mkdtemp()
    subprocess.run(["soffice", "--headless", "--convert-to", "pdf", "--outdir", tmp, src], check=True, capture_output=True)
    shutil.move(os.path.join(tmp, os.listdir(tmp)[0]), pdf)
else:
    shutil.copyfile(src, pdf)

pages = int([l for l in subprocess.run(["pdfinfo", pdf], capture_output=True, text=True).stdout.splitlines() if l.startswith("Pages:")][0].split()[1])
dirs = {k: os.path.join(base, f"{k}{ch}") for k in ("txt", "hires", "webp", "jpg")}
for d in dirs.values():
    shutil.rmtree(d, ignore_errors=True); os.makedirs(d)
for i in range(1, pages + 1):
    with open(os.path.join(dirs["txt"], f"{i}.txt"), "w") as f:
        f.write(subprocess.run(["pdftotext", "-layout", "-f", str(i), "-l", str(i), pdf, "-"], capture_output=True, text=True).stdout)
subprocess.run(["pdftoppm", "-r", "150", "-png", pdf, os.path.join(dirs["hires"], "s")], check=True)
for f in sorted(os.listdir(dirs["hires"])):
    n = int("".join(c for c in f.split("-")[-1] if c.isdigit()))
    im = Image.open(os.path.join(dirs["hires"], f)).convert("RGB")
    for key, w, q, ext, fmt in (("webp", 1600, 82, "webp", "WEBP"), ("jpg", 1280, 72, "jpg", "JPEG")):
        out = im if im.width <= w else im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        out.save(os.path.join(dirs[key], f"s{n:02d}.{ext}"), fmt, quality=q)
print(f"{course} ch{ch}: {pages} slides ready in {base}")
