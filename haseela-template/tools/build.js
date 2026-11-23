// Build all site-ready files for one course's chapters into .build/out/<COURSE>/chNN/.
// Usage (repo root): COURSE=DM node tools/build.js 1,2,3   (ONLY=explain rebuilds just the explanation)
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { execFileSync } = require('child_process');
const { md, plain, page, fontFaces, band, DISCLAIMER, TEMPLATE_CSS } = require('./lib');
const summary = require('./summary');

const { WORK, SRC, OUT, COURSE, SHARED } = require('./config');
const pad = n => String(n).padStart(2, '0');

function pdf(htmlPath, pdfPath, header = '') {
  const job = `/tmp/pdfjob-${process.pid}.json`;
  fs.writeFileSync(job, JSON.stringify([{ html: htmlPath, pdf: pdfPath, header }]));
  execFileSync('python3', [path.join(__dirname, 'pdf.py'), job], { stdio: 'inherit' });
}


// ---------- approved PDF templates (docs/approved-templates.md) ----------
// Set LEGACY_PDF=1 to use the older lib.js PDF layout instead.
const APPROVED = !process.env.LEGACY_PDF;
const SOURCE_AR = { quiz1: 'كويز 1', quiz2: 'كويز 2', midterm: 'ميد', extra: 'أسئلة إضافية' };
const NOTICE = ['هذا العمل اجتهادٌ شخصي، فما أصبنا فيه فمن الله، وما أخطأنا فمن أنفسنا والشيطان.', 'للاستخدام الدراسي فقط، ولا يُغني عن الشباتر الأصلية. يُمنع البيع والاستخدام التجاري.'];
// Markdown table rows -> [{en, ar}] cells ("English <ar>Arabic</ar>").
function tableCells(src) {
  const rows = src.trim().split('\n').filter(r => !/^\|\s*:?-{2,}/.test(r));
  return rows.map(r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => {
    const m = c.match(/<ar>([\s\S]*?)<\/ar>/);
    return { en: c.replace(/<ar>[\s\S]*?<\/ar>/, '').trim(), ar: m ? m[1].trim() : '' };
  }));
}
// Summary source (.md) -> approved summary data: pair / table / flow blocks.
function approvedSummary(s) {
  return { title_ar: s.ar, sections: s.sections.map(sec => ({ title: sec.title, title_ar: sec.title_ar, star: sec.blocks.some(b => b.star),
    blocks: sec.blocks.map(b => {
      if (b.kind === 'table') { const [head, ...rows] = tableCells(b.en); return { type: 'table', title: sec.title, title_ar: b.ar, must: true, head, rows }; }
      if (!b.ar && / → /.test(b.en)) return { type: 'flow', items: b.en.split(' → ').map(x => x.trim()) };
      return { type: 'pair', en: b.en.trim(), ar: b.ar, must: b.kind === 'must' };
    }) })) };
}
function approvedPdfs(ch, dir, data) {
  const job = `/tmp/approved-${process.pid}.json`;
  fs.writeFileSync(job, JSON.stringify({ code: COURSE, num: ch, notice: NOTICE, ...data }));
  execFileSync('node', [path.join(__dirname, 'approved_pdfs.js'), job], { stdio: 'inherit' });
}

// ---------- translation ----------
function parseTranslation(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n/);
  const meta = yaml.load(m[1]);
  const body = src.slice(m[0].length);
  const parts = body.split(/^## /m).filter(s => s.trim());
  const slides = parts.map(p => {
    const nl = p.indexOf('\n');
    const head = p.slice(0, nl);
    const [num, ...t] = head.split('|');
    const lines = p.slice(nl + 1).split('\n');
    const notes = [];
    const keep = [];
    for (const l of lines) {
      const r = l.match(/^!(راجع|ملاحظة):\s*(.*)$/);
      if (r) notes.push({ type: r[1] === 'راجع' ? 'review' : 'note', text_ar: r[2], html: md(r[2], { inline: true }) });
      else keep.push(l);
    }
    const ar = keep.join('\n').trim();
    return { slide: +num.trim(), title_en: t.join('|').trim(), ar_md: ar, ar_html: md(ar), notes };
  });
  return { meta, slides };
}

const reviewCss = `
body{font-size:15px;line-height:1.7;padding:24px;max-width:1500px;margin:auto}
h1{color:var(--brand);font-weight:600;margin:0 0 4px}
.legend{color:var(--ink-muted);font-size:13px;margin-bottom:20px}
.row{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:20px;padding:18px 0;border-top:1px solid var(--line)}
.row img{width:100%;border:1px solid var(--line);border-radius:6px;background:#fff}
.num{font-size:12px;color:var(--ink-muted);margin-bottom:4px}
.tr{direction:rtl;text-align:right}
.tr table{border-collapse:collapse;margin:6px 0}
.tr td,.tr th{border:1px solid var(--line);padding:3px 8px}
.tr th{background:var(--surface-sunken)}
.n{margin-top:8px;padding:6px 10px;border-radius:6px;font-size:13.5px}
.n.review{background:#FFF1E0;border-right:4px solid #D9822B}
.n.note{background:var(--brand-soft);border-right:4px solid var(--brand)}
@media(max-width:800px){.row{grid-template-columns:1fr}}
`;

function buildTranslation(ch, dir) {
  const t = parseTranslation(fs.readFileSync(`${WORK}/ch${ch}_translation.md`, 'utf8'));
  // Slide images as WebP (site + review page).
  const imgDir = path.join(dir, 'slides');
  fs.mkdirSync(imgDir, { recursive: true });
  const pngs = fs.readdirSync(`${SRC}/webp${ch}`).filter(f => f.endsWith('.webp')).sort();
  if (pngs.length !== t.slides.length) throw new Error(`ch${ch}: ${pngs.length} images vs ${t.slides.length} translated slides`);
  pngs.forEach((f, i) => fs.copyFileSync(`${SRC}/webp${ch}/${f}`, `${imgDir}/s${pad(i + 1)}.webp`));
  t.slides.forEach((s, i) => {
    if (s.slide !== i + 1) throw new Error(`ch${ch}: slide numbering gap at ${i + 1}`);
    s.image = `slides/s${pad(s.slide)}.webp`;
  });
  const json = { course: COURSE, course_code: t.meta.course_code, chapter: ch, title_en: t.meta.title_en, title_ar: t.meta.title_ar,
    source_file: t.meta.source_file, slide_count: t.slides.length, slides: t.slides };
  fs.writeFileSync(path.join(dir, 'translation.json'), JSON.stringify(json, null, 1));

  // Review page: original slide beside its translation.
  let body = `<h1 dir="rtl">${t.meta.title_ar}</h1><div class="legend" dir="rtl">صفحة مراجعة الترجمة · الشابتر ${ch} · ${t.slides.length} سلايد · البرتقالي = يحتاج مراجعتك، البنفسجي = ملاحظة توضيحية مضافة</div>`;
  for (const s of t.slides) {
    body += `<div class="row"><div><div class="num">Slide ${s.slide} · ${s.title_en}</div><img loading="lazy" src="${s.image}" alt="Slide ${s.slide}"></div>
<div class="tr ar">${s.ar_html}${s.notes.map(n => `<div class="n ${n.type}">${n.type === 'review' ? 'راجع: ' : 'ملاحظة: '}${n.html}</div>`).join('')}</div></div>`;
  }
  const html = page({ title: `${COURSE} Ch${ch} – مراجعة الترجمة`, body, extraCss: reviewCss })
    .replace(/file:\/\/[^'"]*?\/katex\.min\.css/, '../assets/katex/katex.min.css')
    .replace(fontFaces(), '')
    .replace('<style>', '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600&family=IBM+Plex+Sans+Arabic:wght@400;600&display=swap"><style>');
  fs.writeFileSync(path.join(dir, 'مراجعة الترجمة.html'), html);
  return json;
}

// ---------- glossary ----------
const glossCss = `
@page{size:A4;margin:10mm 12mm 13mm}
body{font-size:10pt;line-height:1.45}
h1{font-size:13pt;color:var(--brand);margin:0 0 2px;font-weight:600}
.sub{font-size:8pt;color:var(--ink-muted);margin-bottom:8px}
table{width:100%;border-collapse:collapse}
th{background:var(--surface-sunken);text-align:left;font-weight:600;font-size:9pt;padding:5px 6px;border-bottom:2px solid var(--brand)}
td{vertical-align:top;padding:5px 6px;border-bottom:1px solid var(--line)}
tr{break-inside:avoid}
td.t{width:22%;font-weight:600}
td.k{width:20%;font-size:8.5pt;line-height:1.9}
td.t .ar{display:block;font-weight:400;font-size:9.5pt}
td.d .ar{display:block;margin-top:2px;direction:rtl;text-align:right}
.kw{margin-top:10px;padding:8px 10px;background:var(--brand-soft);border-radius:var(--radius-md);font-size:9pt}
.kw b{color:var(--brand)}
`;
function buildGlossary(ch, dir, title, titleAr) {
  const g = yaml.load(fs.readFileSync(`${WORK}/glossary.yaml`, 'utf8'))[ch];
  const json = { course: COURSE, chapter: ch, keywords: g.keywords,
    terms: g.terms.map(t => ({ ...t, def_en_html: md(t.def_en, { inline: true }), def_ar_html: md(t.def_ar, { inline: true }) })) };
  for (const t of json.terms) if (!t.keywords || !t.keywords.length) throw new Error(`no keywords: ${t.term}`);
  fs.writeFileSync(path.join(dir, 'glossary.json'), JSON.stringify(json, null, 1));
  let body = band({ course: COURSE, chapter: ch, kind: 'Definitions & Keywords', kindAr: 'التعاريف والكلمات المفتاحية', titleEn: title, titleAr: titleAr }) + `
<table><tr><th>Term</th><th>Definition</th><th>Keywords</th></tr>`;
  for (const t of json.terms) body += `<tr><td class="t">${t.term}<span class="ar" dir="rtl">${t.ar}</span></td><td class="d">${t.def_en_html}<span class="ar" dir="rtl">${t.def_ar_html}</span></td><td class="k">${t.keywords.map(k => `<span class="hs-key">${k}</span>`).join(' ')}</td></tr>`;
  body += `</table><div class="kw"><b>Chapter keywords:</b> ${g.keywords.join(' · ')}</div>` + DISCLAIMER;
  const h = path.join(dir, '_glossary.html');
  fs.writeFileSync(h, page({ title: `${COURSE} Ch${ch} Glossary`, body, extraCss: TEMPLATE_CSS + glossCss }));
  if (APPROVED) approvedPdfs(ch, dir, { title, terms: json.terms.map(t => ({ term: t.term, ar: t.ar, meaning: t.def_en, keywords: t.keywords })), out: { terms: path.join(dir, `${COURSE}-Ch${pad(ch)}-Definitions.pdf`) } });
  else pdf(h, path.join(dir, `${COURSE}-Ch${pad(ch)}-Definitions.pdf`), `Haseela · ${COURSE} · Chapter ${ch} · Definitions`);
  fs.unlinkSync(h);
  return json;
}

// ---------- questions ----------
const SOURCE_LABEL = { extra: { en: 'Extra', ar: 'أسئلة إضافية' }, quiz1: { en: 'Quiz 1', ar: 'كويز 1' }, quiz2: { en: 'Quiz 2', ar: 'كويز 2' }, midterm: { en: 'Midterm', ar: 'ميد' } };
const qCss = `
@page{size:A4;margin:10mm 12mm 13mm}
body{font-size:10pt;line-height:1.5}
h1{font-size:13pt;color:var(--brand);margin:0 0 2px;font-weight:600}
.sub{font-size:8.5pt;color:var(--ink-muted);margin-bottom:10px}
.q{break-inside:avoid;margin:0 0 10px;padding:0 0 8px;border-bottom:1px solid var(--line)}
.q .h{font-size:8pt;color:var(--ink-muted);margin-bottom:2px}
.q .tag{display:inline-block;background:var(--surface-sunken);color:var(--ink-muted);border-radius:var(--radius-sm);padding:0 6px;margin-left:6px}
.q p{margin:0}
ol.c{margin:4px 0 0;padding-left:22px;list-style:upper-alpha}
.blank{margin-top:6px;border-bottom:1px dotted #aaa;height:16px;width:60%}
.key{break-before:page}
.key h2{font-size:13pt;color:var(--brand);margin:0 0 8px}
.k{break-inside:avoid;margin-bottom:7px;font-size:10pt}
.k .en{display:block;margin-top:1px}
.k .ar{display:block;direction:rtl;text-align:right;margin-top:1px}
`;
function buildQuestions(ch, dir, title, titleAr) {
  const qs = yaml.load(fs.readFileSync(`${WORK}/questions.yaml`, 'utf8'))[ch];
  const items = qs.map(q => ({
    ...q, source: q.source || 'extra',
    q_html: md(q.q, { inline: true }),
    q_plain_html: md(plain(q.q), { inline: true }),
    choices_html: q.choices ? q.choices.map(c => md(String(c), { inline: true })) : undefined,
    explain_en_html: md(q.explain_en, { inline: true }),
    explain_ar_html: md(q.explain_ar, { inline: true }),
  }));
  for (const q of items) {
    if (q.type === 'mcq' && !(q.answer >= 0 && q.answer < q.choices.length)) throw new Error(`bad answer ${q.id}`);
    if (!q.explain_en || !q.explain_ar) throw new Error(`missing explanation ${q.id}`);
  }
  fs.writeFileSync(path.join(dir, 'questions.json'), JSON.stringify({ course: COURSE, chapter: ch, source_labels: SOURCE_LABEL, questions: items }, null, 1));
  let body = band({ course: COURSE, chapter: ch, kind: `Questions (${items.length})`, kindAr: 'الأسئلة', titleEn: title, titleAr: titleAr }) + `<p class="sub">Questions first; answers with explanations at the end. <span dir="rtl">الأسئلة أولًا، والإجابات مع الشرح في الآخر.</span></p>`;
  items.forEach((q, i) => {
    const lab = SOURCE_LABEL[q.source];
    body += `<div class="q"><div class="h">Q${i + 1}<span class="tag">${lab.en} · <span dir="rtl">${lab.ar}</span></span> Slides ${q.slides.join(', ')}</div><p>${q.type === 'tf' ? 'True or False: ' : ''}${q.q_plain_html}</p>`;
    if (q.type === 'mcq') body += `<ol class="c">${q.choices_html.map(c => `<li>${c}</li>`).join('')}</ol>`;
    if (q.type === 'short') body += `<div class="blank"></div>`;
    body += `</div>`;
  });
  body += `<div class="key"><h2>Answer Key · <span dir="rtl">الإجابات</span></h2>`;
  items.forEach((q, i) => {
    const a = q.type === 'mcq' ? `${'ABCD'[q.answer]}) ${q.choices_html[q.answer]}` : q.type === 'tf' ? (q.answer ? 'True' : 'False') : md(String(q.answer), { inline: true });
    body += `<div class="k"><b>Q${i + 1}.</b> ${a}<span class="en">${q.explain_en_html}</span><span class="ar" dir="rtl">${q.explain_ar_html}</span></div>`;
  });
  body += `</div>` + DISCLAIMER;
  const h = path.join(dir, '_q.html');
  fs.writeFileSync(h, page({ title: `${COURSE} Ch${ch} Questions`, body, extraCss: TEMPLATE_CSS + qCss }));
  if (APPROVED) approvedPdfs(ch, dir, { title, questions: items.map(q => ({ id: q.id, source: SOURCE_AR[q.source] || q.source, stem: plain(q.q), options: q.choices.map(c => plain(String(c))),
    answer: q.answer, keyword: q.keyword, explain: plain(q.explain_en), explain_ar: q.explain_ar })), out: { questions: path.join(dir, `${COURSE}-Ch${pad(ch)}-Questions.pdf`) } });
  else pdf(h, path.join(dir, `${COURSE}-Ch${pad(ch)}-Questions.pdf`), `Haseela · ${COURSE} · Chapter ${ch} · Questions`);
  fs.unlinkSync(h);
  return items.length;
}


// ---------- slides + translation PDF ----------
const slidesCss = `
@page{size:A4 landscape;margin:9mm 10mm 12mm}
body{font-size:9.6pt;line-height:1.55}
.sp{display:grid;grid-template-columns:minmax(0,62fr) minmax(0,38fr);gap:6mm;align-items:start;break-after:page;width:100%}
.sp>div{min-width:0}
.tr .katex-display{overflow:hidden}
.sp:last-child{break-after:auto}
.sp img{width:100%;border:1px solid var(--line);border-radius:var(--radius-lg);background:#fff}
.cap{font-size:7.5pt;color:var(--ink-muted);margin-top:2mm}
.tr{background:var(--brand-soft);border-radius:var(--radius-lg);padding:4mm 5mm;direction:rtl;text-align:right}
.tr p{margin:0 0 4px}.tr ul,.tr ol{margin:2px 0 4px;padding-inline-start:16px}
.tr table{border-collapse:collapse;margin:4px 0;font-size:7.6pt;line-height:1.35;width:100%}
.tr td,.tr th{border:1px solid var(--line);padding:1px 4px}
.tr th{background:var(--surface-sunken)}
.tr .katex-display{margin:3px 0;direction:ltr}
.nt{margin-top:4px;padding:3px 7px;border-radius:var(--radius-md);font-size:8.6pt;background:var(--surface-raised);border-right:3px solid var(--brand)}
.cover{height:170mm;display:flex;flex-direction:column;justify-content:center;gap:4mm;break-after:page}
.cover p{margin:0;color:var(--ink-muted)}
`;
function buildSlidesPdf(ch, dir, tr) {
  let body = `<section class="cover">` + band({ course: COURSE, chapter: ch, kind: `Slides with translation (${tr.slide_count})`, kindAr: 'السلايدات مع ترجمتها', titleEn: tr.title_en, titleAr: tr.title_ar }) + `<p dir="rtl">كل سلايد في صفحة: السلايد الأصلي كما هو، وبجانبه ترجمته العربية الكاملة.</p>` + DISCLAIMER + `</section>`;
  for (const sl of tr.slides) {
    const notes = sl.notes.filter(n => n.type === 'note').map(n => `<div class="nt">ملاحظة: ${n.html}</div>`).join('');
    body += `<section class="sp"><div><img src="file://${SRC}/jpg${ch}/s${pad(sl.slide)}.jpg"><div class="cap">Slide ${sl.slide} / ${tr.slide_count} · ${sl.title_en}</div></div><div class="tr ar">${sl.ar_html}${notes}</div></section>`;
  }
  const h = path.join(dir, '_slides.html');
  fs.writeFileSync(h, page({ title: `${COURSE} Ch${ch} Slides`, body, extraCss: TEMPLATE_CSS + slidesCss }));
  pdf(h, path.join(dir, `${COURSE}-Ch${pad(ch)}-Slides-Translation.pdf`), `Haseela · ${COURSE} · Chapter ${ch} · Slides`);
  if (!process.env.KEEP) fs.unlinkSync(h);
}

// ---------- summary ----------
function buildSummary(ch, dir, tr) {
  const h = path.join(dir, '_summary.html');
  const s = summary.render(`${WORK}/ch${ch}_summary.md`, h, { course: COURSE, chapter: ch });
  if (APPROVED) approvedPdfs(ch, dir, { title: tr.title_en, summary: approvedSummary(s), out: { summary: path.join(dir, `${COURSE}-Ch${pad(ch)}-Summary.pdf`) } });
  else pdf(h, path.join(dir, `${COURSE}-Ch${pad(ch)}-Summary.pdf`), `Haseela · ${COURSE} · Chapter ${ch} · Summary`);
  fs.unlinkSync(h);
  const json = { course: COURSE, chapter: ch, title_en: s.en, title_ar: s.ar,
    sections: s.sections.map(sec => ({ title: sec.title, title_ar: sec.title_ar, title_html: md(sec.title, { inline: true }), points: sec.blocks.map(b => ({ kind: b.kind, star: !!b.star, en_md: b.en, ar_md: b.ar, en_html: md(b.en), ar_html: md(b.ar) })) })) };
  fs.writeFileSync(path.join(dir, 'summary.json'), JSON.stringify(json, null, 1));
}

// ---------- explanation (الشرح): same source format as the summary, full depth ----------
function buildViz(ch, dir) {
  const src = path.join(WORK, 'viz', `ch${ch}`);
  if (!fs.existsSync(src)) return 0;
  const css = fs.readFileSync(path.join(SHARED, 'viz-style.css'), 'utf8');
  fs.mkdirSync(path.join(dir, 'viz'), { recursive: true });
  const files = fs.readdirSync(src).filter(f => f.endsWith('.html'));
  files.forEach(f => fs.writeFileSync(path.join(dir, 'viz', f), fs.readFileSync(path.join(src, f), 'utf8').replace('/*STYLE*/', css)));
  return files.length;
}

function buildExplanation(ch, dir) {
  const src = `${WORK}/ch${ch}_explain.md`;
  if (!fs.existsSync(src)) return 0;
  // Site-only content (no PDF): the explanation lives in the site's الشرح tab.
  const s = summary.parse(fs.readFileSync(src, 'utf8'));
  const json = { course: COURSE, chapter: ch, title_en: s.en, title_ar: s.ar,
    sections: s.sections.map(sec => ({ title: sec.title, title_ar: sec.title_ar, title_html: md(sec.title, { inline: true }), points: sec.blocks.map(b => ({ kind: b.kind, star: !!b.star, en_md: b.en, ar_md: b.ar, en_html: md(b.en), ar_html: md(b.ar) })) })) };
  fs.writeFileSync(path.join(dir, 'explanation.json'), JSON.stringify(json, null, 1));
  return json.sections.reduce((n, x) => n + x.points.length, 0);
}

const ONLY = process.env.ONLY;  // e.g. ONLY=explain to rebuild just the explanation
const report = [];
for (const ch of (process.argv[2] || '1').split(',').map(Number)) {
  const dir = path.join(OUT, `ch${pad(ch)}`);
  fs.mkdirSync(dir, { recursive: true });
  if (ONLY === 'explain') { report.push({ ch, explain_points: buildExplanation(ch, dir) }); continue; }
  const tr = buildTranslation(ch, dir);
  buildSlidesPdf(ch, dir, tr);
  buildExplanation(ch, dir);
  buildSummary(ch, dir, tr);
  const g = buildGlossary(ch, dir, tr.title_en, tr.title_ar);
  const nq = buildQuestions(ch, dir, tr.title_en, tr.title_ar);
  const nv = buildViz(ch, dir);
  const flags = tr.slides.flatMap(s => s.notes.filter(n => n.type === 'review').map(n => `ch${ch} slide ${s.slide}: ${n.text_ar}`));
  report.push({ ch, slides: tr.slide_count, terms: g.terms.length, questions: nq, viz: nv, review: flags.length });
  fs.writeFileSync(path.join(WORK, `flags_ch${ch}.txt`), flags.join('\n'));
}
console.table(report);
