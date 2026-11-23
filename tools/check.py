"""Check a course's work files before a pull request.

Usage (repo root): python3 tools/check.py <COURSE> [chapter ...]
Exits with code 1 and lists every problem found. Run it after tools/build.js so the summary page count is checked too.
"""
import glob, os, re, subprocess, sys
import yaml

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
course = sys.argv[1]
work = os.path.join(ROOT, "work", course)
legacy = bool(os.environ.get("LEGACY_QUESTIONS"))  # default: 4-option MCQ only; LEGACY_QUESTIONS=1 also allows tf/short
problems = []
err = lambda ch, msg: problems.append(f"ch{ch}: {msg}")

def load(name):
    try:
        return yaml.safe_load(open(os.path.join(work, name), encoding="utf-8")) or {}
    except Exception as e:
        problems.append(f"{name}: does not parse ({e})"); return {}

gloss, ques = load("glossary.yaml"), load("questions.yaml")
chapters = sorted(int(re.search(r"ch(\d+)_", f).group(1)) for f in glob.glob(f"{work}/ch*_translation.md"))
if len(sys.argv) > 2: chapters = [int(x) for x in sys.argv[2:]]
ALLOWED_TAGS = {"ar", "/ar", "br", "sub", "/sub", "sup", "/sup"}

for ch in chapters:
    for kind in ("translation", "summary", "explain"):
        p = os.path.join(work, f"ch{ch}_{kind}.md")
        if not os.path.exists(p): err(ch, f"missing ch{ch}_{kind}.md"); continue
        text = open(p, encoding="utf-8").read()
        for tag in set(re.findall(r"<\s*(/?[A-Za-z]+)", text)):
            if tag not in ALLOWED_TAGS: err(ch, f"{kind}: raw <{tag}> would vanish on the site; write &lt;{tag.strip('/')}&gt;")
        if kind != "translation" and "ع:" not in text: err(ch, f"{kind}: no Arabic lines (ع:)")
    tp = os.path.join(work, f"ch{ch}_translation.md")
    pdf = os.path.join(ROOT, ".build", "src", course, f"ch{ch}.pdf")
    if os.path.exists(tp) and os.path.exists(pdf):
        n_md = len(re.findall(r"^## \d+ \|", open(tp, encoding="utf-8").read(), re.M))
        n_pdf = int([l for l in subprocess.run(["pdfinfo", pdf], capture_output=True, text=True).stdout.splitlines() if l.startswith("Pages:")][0].split()[1])
        if n_md != n_pdf: err(ch, f"translation has {n_md} slides, the PDF has {n_pdf}")
    g = gloss.get(ch)
    if not g: err(ch, "no glossary entry")
    else:
        for t in g.get("terms", []):
            miss = [k for k in ("term", "ar", "def_en", "def_ar", "keywords") if not t.get(k)]
            if miss: err(ch, f"term '{t.get('term')}' missing {', '.join(miss)}")
    qs = ques.get(ch)
    if not qs: err(ch, "no questions")
    for q in qs or []:
        qid = q.get("id", "?")
        miss = [k for k in ("id", "type", "q", "explain_en", "explain_ar", "slides") if not q.get(k) and q.get(k) != 0]
        if miss: err(ch, f"question {qid} missing {', '.join(miss)}")
        if q.get("type") == "mcq":
            ch_ = q.get("choices") or []
            if not isinstance(q.get("answer"), int) or not 0 <= q["answer"] < len(ch_): err(ch, f"question {qid}: answer index out of range")
        if not legacy:
            if q.get("type") != "mcq" or len(q.get("choices") or []) != 4: err(ch, f"question {qid}: new courses use MCQ with exactly 4 choices")
            if not q.get("keyword"): err(ch, f"question {qid}: missing keyword (highlighted in the answers)")
        if q.get("source") and not re.fullmatch(r"quiz\d*|midterm|extra", q["source"]): err(ch, f"question {qid}: unknown source '{q['source']}'")
    built = glob.glob(os.path.join(ROOT, ".build", "out", course, f"ch{ch:02d}", "*-Summary.pdf"))
    if built:
        pages = int([l for l in subprocess.run(["pdfinfo", built[0]], capture_output=True, text=True).stdout.splitlines() if l.startswith("Pages:")][0].split()[1])
        if pages != 2: err(ch, f"summary PDF is {pages} pages, must be 2")

print("\n".join(problems) if problems else f"{course}: {len(chapters)} chapters OK")
sys.exit(1 if problems else 0)
