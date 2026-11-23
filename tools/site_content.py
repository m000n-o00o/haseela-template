"""Copy built chapters (.build/out/<COURSE>/chNN) into content/<COURSE>/chNN and update content/<COURSE>/chapters.json.

Usage (repo root): python3 tools/site_content.py [COURSE ...]   (default: every course that has built output)
Each course has its own chapters.json, so people working on different courses never overwrite each other.
"""
import glob, json, os, re, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data", "courses.json")
SKIP = {"مراجعة الترجمة.html"}
FILES = [("summary", "Summary"), ("slides", "Slides-Translation"), ("definitions", "Definitions"), ("questions", "Questions")]

data = json.load(open(DATA, encoding="utf-8"))
wanted = set(sys.argv[1:])
for c in data["courses"]:
    out = os.path.join(ROOT, ".build", "out", c["code"])
    if (wanted and c["code"] not in wanted) or not os.path.isdir(out):
        continue
    idx = os.path.join(ROOT, "content", c["code"], "chapters.json")
    chapters = {ch["n"]: ch for ch in (json.load(open(idx, encoding="utf-8"))["chapters"] if os.path.exists(idx) else [])}
    for d in sorted(glob.glob(f"{out}/ch[0-9][0-9]")):
        n = int(d[-2:]); dst = os.path.join(ROOT, "content", c["code"], f"ch{n:02d}")
        if os.path.exists(dst): shutil.rmtree(dst)
        shutil.copytree(d, dst, ignore=lambda p, names: [x for x in names if x in SKIP or x.endswith("-Explanation.pdf")])
        tr = json.load(open(f"{dst}/translation.json", encoding="utf-8"))
        viz = []
        for v in sorted(glob.glob(f"{dst}/viz/*.html")):
            t = re.search(r"<title>(.*?)</title>", open(v, encoding="utf-8").read(), re.S)
            viz.append({"file": "viz/" + os.path.basename(v), "title": t.group(1).strip() if t else os.path.basename(v)})
        files = {}
        for k, s in FILES:
            hit = glob.glob(f"{dst}/*-{s}.pdf")
            if hit: files[k] = os.path.basename(hit[0])
        has = sorted(f[:-5] for f in os.listdir(dst) if f.endswith(".json"))
        chapters[n] = {"n": n, "title_en": tr["title_en"], "title_ar": tr["title_ar"], "slides": tr["slide_count"], "viz": viz, "files": files, "has": has}
    os.makedirs(os.path.dirname(idx), exist_ok=True)
    json.dump({"chapters": [chapters[k] for k in sorted(chapters)]}, open(idx, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(c["code"], len(chapters), "chapters")
