"""Pack one course's work for the site owner: work/<COURSE>/ and content/<COURSE>/ into one zip (no Git needed).

Usage (repo root): python3 tools/pack.py <COURSE> [chapter ...] [--with <file> ...]
Writes haseela-<COURSE>-<chapters>.zip in the repo root. The site owner extracts it into the repo (Replace) and commits.
With chapter numbers, only those chapters' content folders are included (plus the course's chapters.json and all work files).
--with adds other repo files (e.g. a changed tool such as tools/pack.py) at the same relative paths.
"""
import os, re, sys, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = sys.argv[1:]
extra = args[args.index("--with") + 1:] if "--with" in args else []
args = args[:args.index("--with")] if "--with" in args else args
course, chs = args[0], [int(x) for x in args[1:]]
name = os.path.join(ROOT, f"haseela-{course}-{'-'.join(map(str, chs)) or 'all'}.zip")
CH_DIR = re.compile(rf"content/{re.escape(course)}/ch(\d+)/")  # chapter folders only, so chapters.json is always kept

def keep(rel):
    m = CH_DIR.match(rel)
    return not chs or not m or int(m.group(1)) in chs

n = 0
with zipfile.ZipFile(name, "w", zipfile.ZIP_DEFLATED) as z:
    for top in (f"work/{course}", f"content/{course}"):
        for d, _, files in os.walk(os.path.join(ROOT, top)):
            for f in files:
                rel = os.path.relpath(os.path.join(d, f), ROOT).replace(os.sep, "/")
                if f.startswith("flags_ch") or f in ("desktop.ini", "Thumbs.db") or not keep(rel): continue
                z.write(os.path.join(ROOT, rel), rel); n += 1
    for rel in extra:
        rel = rel.replace(os.sep, "/")
        z.write(os.path.join(ROOT, rel), rel); n += 1
    if f"content/{course}/chapters.json" not in z.namelist() and os.path.exists(os.path.join(ROOT, "content", course, "chapters.json")):
        raise SystemExit(f"content/{course}/chapters.json is missing from the zip")
print(f"{name}: {n} files")
