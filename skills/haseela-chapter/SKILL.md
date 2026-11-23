---
name: haseela-chapter
description: Prepare chapters for a Haseela (حصيلة) study site: translation, 2-page summary, terms, MCQ questions, explanation and interactive visual, built and checked with the repo tools.
---

# Haseela chapter workflow

Use this when asked to prepare, fix or add chapters for a site built from the Haseela template. The repo is the single source of truth: read `docs/RULES.md` first and follow it exactly. PDF templates are in `docs/approved-templates.md`; team steps are in `docs/CONTRIBUTING.md`. `work/DEMO/` is a complete example chapter to copy from.

## Before starting
1. Get the repo one of two ways:
   - **Without GitHub:** the person attaches `haseela-starter.zip` (the repo without chapter content). Unzip it into its own folder and work there.
   - **With GitHub:** attach the person's own site repo (push access for a pull request), clone it, and work on a branch like `dm-ch1-3`, never on `main`.
2. Confirm with the person: course code, chapter numbers, the slide files, solved quiz/midterm models, and what is excluded from the syllabus. Do not write excluded content.
3. A new course needs one line in `data/courses.json` (`code`, `name`, `name_ar`).
4. Install tools once: `cd tools && npm install && npx playwright install chromium`; Python needs `pyyaml`, `Pillow` and `playwright`, plus poppler, and LibreOffice for .pptx.

## For each chapter (batches of about 3)
1. `python3 tools/prep_slides.py <COURSE> <N> <slides.pdf|pptx>`.
2. Read `.build/src/<COURSE>/txtN/*.txt`; open slide images only where there are diagrams, formulas or tables.
3. Write in `work/<COURSE>/`: `chN_translation.md`, `chN_summary.md`, `chN_explain.md`, the chapter's entries in `glossary.yaml` and `questions.yaml`, and 1-2 visuals in `viz/chN/` (copy an existing visual, such as `work/DEMO/viz/ch1/outlier.html`, as the starting point).
4. Compute every worked number with code before writing it. Flag slide errors with `!ملاحظة:`.
5. Build: `COURSE=<COURSE> node tools/build.js N,N,N`. The summary must be exactly 2 pages; shorten it if not.
6. Check: `python3 tools/check.py <COURSE> N N N` must print OK. Fix every listed problem.
7. Sync: `python3 tools/site_content.py <COURSE>` (updates `content/<COURSE>/chapters.json`). Test the chapter page and its visuals in a browser for JS errors (light and dark).

## Hand-off
- **Without GitHub:** run `python3 tools/pack.py <COURSE> N N N` and give the person the resulting `haseela-<COURSE>-N-N-N.zip` to send to the site owner. It holds only `work/<COURSE>/` and those chapters in `content/<COURSE>/`.
- **With GitHub:** commit only `work/<COURSE>/` and `content/<COURSE>/`, with an English commit summary, and open a pull request for the site owner to review. Never merge into `main`.
- Report to the person in their language, briefly: chapters done, slide counts, visuals added, and any slide errors flagged.

## Rules that are easy to miss
- Questions are MCQ with exactly 4 choices, each with `source` (quiz1, quiz2, midterm, extra) and `keyword`.
- Write `<EOS>`-style text as `&lt;EOS&gt;` in markdown; quote YAML values that contain `: `.
- Natural, gender-neutral Arabic; keep the batch's own words (شابتر، سلايدات، كويز، ميد، فاينل).
- Never edit or delete files other people uploaded to a shared folder; only add new files.
- Slides and exam models belong to their authors: keep them out of public repos unless the authors allow it.
