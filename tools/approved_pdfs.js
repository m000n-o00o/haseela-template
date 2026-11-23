// Approved Haseela PDF templates (docs/approved-templates.md), used by tools/build.js.
// The CSS and HTML below are copied unchanged from the approved make-pdfs.js; only the data reading is adapted
// to this repo's build (a job file written by build.js instead of content/site.json and content/courses.json).
// Usage: node tools/approved_pdfs.js <job.json>
// job.json: { "code", "num", "title", "notice": [..], "out": { "summary", "questions", "terms" },
//             "summary": {...}, "questions": [...], "terms": [...] }   (field names as in the approved template)
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const job = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const site = { notice: job.notice };
const meta = { code: job.code };
const entry = { num: job.num };
const ch = { title: job.title, summary: job.summary, questions: job.questions, terms: job.terms };
const logo = fs.readFileSync(path.join(__dirname, '..', 'assets/img/favicon.svg'), 'utf8').replace(/<title>.*?<\/title>/, '');

const fontDir = path.dirname(path.dirname(require.resolve('@fontsource/ibm-plex-sans/package.json')));
const font = (pkg, file) => `data:font/woff2;base64,${fs.readFileSync(path.join(fontDir, pkg, 'files', file)).toString('base64')}`;
const faces = [
  ['IBM Plex Sans Arabic', 'ibm-plex-sans-arabic', 'ibm-plex-sans-arabic-arabic', [400, 600, 700]],
  ['IBM Plex Sans', 'ibm-plex-sans', 'ibm-plex-sans-latin', [400, 600, 700]],
  ['IBM Plex Mono', 'ibm-plex-mono', 'ibm-plex-mono-latin', [400, 600]]
].flatMap(([family, pkg, prefix, weights]) => weights.map((w) =>
  `@font-face{font-family:"${family}";font-weight:${w};src:url(${font(pkg, `${prefix}-${w}-normal.woff2`)}) format("woff2");}`)).join('\n');

const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const inline = (t) => esc(t).replace(/==(.+?)==/g, '<mark>$1</mark>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`(.+?)`/g, '<code>$1</code>');
const mark = (t, k) => {
  const s = esc(t);
  if (!k) return s;
  return s.replace(new RegExp(esc(k).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), (m) => `<mark>${m}</mark>`);
};
const L = ['A', 'B', 'C', 'D', 'E', 'F'];
const countQ = (n) => (n === 1 ? 'سؤال واحد' : n === 2 ? 'سؤالان' : n <= 10 ? `${n} أسئلة` : `${n} سؤالًا`);
const countT = (n) => (n === 1 ? 'مصطلح واحد' : n === 2 ? 'مصطلحان' : n <= 10 ? `${n} مصطلحات` : `${n} مصطلحًا`);

const CSS = `
${faces}
@page {
  size: A4; margin: 20mm 16mm 22mm;
  @top-right { content: "حصيلة"; font: 600 8.5pt "IBM Plex Sans Arabic"; color: #5b3768; }
  @top-left { content: "${esc(meta.code)} · Chapter ${entry.num}"; font: 400 8.5pt "IBM Plex Sans"; color: #566064; }
  @bottom-center { content: "صفحة " counter(page) " من " counter(pages); font: 400 8.5pt "IBM Plex Sans Arabic"; color: #566064; }
}
@page :first { @top-right { content: none; } @top-left { content: none; } }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font: 400 10.5pt/1.7 "IBM Plex Sans Arabic", "IBM Plex Sans", sans-serif; color: #1e2629; }
.en { font-family: "IBM Plex Sans", "IBM Plex Sans Arabic", sans-serif; direction: ltr; text-align: left; }
.ar { direction: rtl; text-align: right; }
mark { background: #f2dc8a; color: inherit; padding: 0 2px; border-radius: 2px; }

.cover { background: #5b3768; color: #fbf9f4; border-radius: 10px; padding: 18px 22px; display: flex; align-items: center; gap: 16px; margin-bottom: 18px; }
.cover svg { width: 46px; height: 46px; flex: none; background: #fbf9f4; border-radius: 10px; padding: 4px; }
.cover .t { flex: 1; }
.cover .kind { font: 600 9pt "IBM Plex Sans Arabic"; opacity: .85; margin: 0; }
.cover h1 { margin: 2px 0 0; font: 700 18pt/1.3 "IBM Plex Sans"; direction: ltr; text-align: right; }
.cover .meta { text-align: left; font: 400 9pt/1.6 "IBM Plex Sans Arabic"; opacity: .9; }
.cover .meta b { font: 600 13pt "IBM Plex Mono"; display: block; opacity: 1; }

.how { background: #ede3f0; border-radius: 8px; padding: 10px 14px; margin: 0 0 16px; font-size: 9.5pt; color: #3d2547; }
h2 { font: 700 13pt "IBM Plex Sans Arabic"; color: #5b3768; margin: 0 0 10px; padding-bottom: 6px; border-bottom: 2px solid #ede3f0; }
.section-break { break-before: page; }

.q { break-inside: avoid; border: 1px solid #d9d2c2; border-radius: 8px; padding: 12px 14px; margin-bottom: 10px; }
.q-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.num { width: 24px; height: 24px; border-radius: 50%; background: #5b3768; color: #fbf9f4; font: 600 9.5pt/24px "IBM Plex Sans"; text-align: center; flex: none; }
.src { font: 600 8pt "IBM Plex Sans Arabic"; background: #ece7db; color: #566064; padding: 1px 8px; border-radius: 99px; }
.stem { margin: 0 0 8px; font-weight: 600; font-size: 10.5pt; }
.opts { display: grid; grid-template-columns: 1fr 1fr; gap: 5px 18px; margin: 0; padding: 0; list-style: none; }
.opts li { display: flex; gap: 8px; align-items: baseline; }
.bubble { width: 16px; height: 16px; border: 1.5px solid #8a5a9c; border-radius: 50%; font: 600 7.5pt/13px "IBM Plex Sans"; color: #5b3768; text-align: center; flex: none; }

.key { display: grid; grid-template-columns: repeat(auto-fill, minmax(70px, 1fr)); gap: 6px; direction: ltr; margin-bottom: 16px; }
.key div { border: 1px solid #d9d2c2; border-radius: 6px; padding: 4px 8px; font: 600 10pt "IBM Plex Sans"; }
.key span { color: #566064; font-weight: 400; margin-right: 6px; }
.a { direction: ltr; break-inside: avoid; border-inline-start: 3px solid #4a6626; padding: 6px 12px; margin-bottom: 12px; }
.a .ans { font: 600 9.5pt "IBM Plex Sans"; color: #4a6626; }
.a p { margin: 3px 0; }
.a .ar { color: #3a4448; font-size: 10pt; }

.terms { width: 100%; border-collapse: collapse; direction: ltr; }
.terms th { background: #5b3768; color: #fbf9f4; font: 600 9pt "IBM Plex Sans"; padding: 7px 10px; text-align: left; }
.terms th.ar { text-align: right; font-family: "IBM Plex Sans Arabic"; }
.terms td { border-bottom: 1px solid #e3ddd0; padding: 8px 10px; vertical-align: top; }
.terms tr { break-inside: avoid; }
.terms tr:nth-child(even) td { background: #f8f5ef; }
.terms .term { font: 600 10pt "IBM Plex Sans"; width: 24%; }
.terms .tr { width: 18%; font-weight: 600; color: #5b3768; }
.terms .def { width: 38%; font-size: 9.5pt; }
.terms .kw { width: 20%; }
.terms .kw mark { display: inline-block; margin: 0 2px 3px 0; font-size: 8.5pt; }

.notice { margin-top: 18px; padding-top: 8px; border-top: 1px solid #d9d2c2; font-size: 8pt; color: #566064; text-align: center; line-height: 1.6; break-inside: avoid; }
.notice p { margin: 0; }
`;

const cover = (kind, extra) => `
<div class="cover">
  ${logo}
  <div class="t"><p class="kind">${kind}</p><h1>${esc(ch.title)}</h1></div>
  <div class="meta"><b>${esc(meta.code)}</b>الشابتر ${entry.num}<br>${extra}</div>
</div>`;
const notice = `<div class="notice">${[].concat(site.notice || []).map((l) => `<p>${esc(l)}</p>`).join('')}</div>`;
const page = (body) => `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>${CSS}</style></head><body>${body}${notice}</body></html>`;

function questionsHTML() {
  const qs = ch.questions || [];
  const sources = [...new Set(qs.map((q) => q.source))].join('، ');
  return page(`
    ${cover('ملف الأسئلة', countQ(qs.length))}
    <p class="how">المصادر: ${esc(sources)}. الإجابات وشرحها في آخر الملف، وتُظلَّل فيها الكلمة التي تدل على الإجابة في نص السؤال.</p>
    <h2>الأسئلة</h2>
    ${qs.map((q, n) => `
      <div class="q">
        <div class="q-head"><span class="num">${n + 1}</span><span class="src">${esc(q.source)}</span></div>
        <div class="en">
          <p class="stem">${esc(q.stem)}</p>
          <ul class="opts">${q.options.map((o, k) => `<li><span class="bubble">${L[k]}</span><span>${esc(o)}</span></li>`).join('')}</ul>
        </div>
      </div>`).join('')}
    <div class="section-break"></div>
    <h2>الإجابات</h2>
    <div class="key">${qs.map((q, n) => `<div><span>${n + 1}</span>${L[q.answer]}</div>`).join('')}</div>
    ${qs.map((q, n) => `
      <div class="a">
        <p class="en ans">${n + 1}. Answer: ${L[q.answer]}. ${esc(q.options[q.answer])}</p>
        <p class="en">${mark(q.stem, q.keyword)}</p>
        <p class="en">${mark(q.explain, q.keyword)}</p>
        ${q.explain_ar ? `<p class="ar">${inline(q.explain_ar)}</p>` : ''}
      </div>`).join('')}`);
}

function termsHTML() {
  const ts = ch.terms || [];
  return page(`
    ${cover('ملف التعاريف والكلمات المفتاحية', countT(ts.length))}
    <p class="how">الكلمات المفتاحية هي التي ترد غالبًا في نص السؤال وتدل على المصطلح المقصود.</p>
    <table class="terms">
      <thead><tr><th>Term</th><th class="ar">الترجمة</th><th>Definition</th><th>Keywords</th></tr></thead>
      <tbody>${ts.map((t) => `<tr>
        <td class="term">${esc(t.term)}</td>
        <td class="tr ar">${esc(t.ar)}</td>
        <td class="def en">${inline(t.meaning)}</td>
        <td class="kw en">${(t.keywords || []).map((k) => `<mark>${esc(k)}</mark>`).join(' ')}</td>
      </tr>`).join('')}</tbody>
    </table>`);
}


/* ---------- Chapter summary: two pages, bilingual layout ---------- */
const SUMMARY_CSS = (size) => `
${faces}
@page {
  size: A4; margin: 14mm 12mm 14mm;
  @top-right { content: "حصيلة"; font: 600 7.5pt "IBM Plex Sans Arabic"; color: #5b3768; }
  @top-left { content: "${esc(meta.code)} · Chapter ${entry.num}"; font: 400 7.5pt "IBM Plex Sans"; color: #566064; }
  @bottom-left { content: "${esc(meta.code)} · Chapter ${entry.num} · Summary"; font: 400 7.5pt "IBM Plex Sans"; color: #566064; }
  @bottom-right { content: "صفحة " counter(page) " من " counter(pages); font: 400 7.5pt "IBM Plex Sans Arabic"; color: #566064; }
}
@page :first { @top-right { content: none; } @top-left { content: none; } }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font: 400 ${size}pt/1.55 "IBM Plex Sans Arabic", "IBM Plex Sans", sans-serif; color: #1e2629; }
strong { font-weight: 700; }
code { direction: ltr; unicode-bidi: isolate; font: 500 0.92em "IBM Plex Mono"; background: rgba(0,0,0,.06); padding: 0 3px; border-radius: 3px; }
.en { font-family: "IBM Plex Sans", "IBM Plex Sans Arabic", sans-serif; direction: ltr; text-align: left; }
.ar { direction: rtl; text-align: right; }

.cover { background: #5b3768; color: #fbf9f4; border-radius: 10px; padding: 16px 22px; display: flex; align-items: center; gap: 16px; margin-bottom: 8px; }
.cover svg { width: 46px; height: 46px; flex: none; background: #fbf9f4; border-radius: 10px; padding: 4px; }
.cover .t { flex: 1; }
.cover .kind { font: 600 9pt "IBM Plex Sans Arabic"; opacity: .85; margin: 0; }
.cover h1 { margin: 2px 0 0; font: 700 18pt/1.3 "IBM Plex Sans"; direction: ltr; text-align: right; }
.cover .meta { text-align: left; font: 400 9pt/1.6 "IBM Plex Sans Arabic"; opacity: .9; }
.cover .meta b { font: 600 13pt "IBM Plex Mono"; display: block; opacity: 1; }
.how { background: #ede3f0; border-radius: 8px; padding: 7px 14px; margin: 0 0 6px; color: #3d2547; }
.legend { display: flex; flex-wrap: wrap; gap: 4px 18px; font-size: ${size - 1.5}pt; margin: 0; }
.legend > span { display: inline-flex; align-items: center; gap: 6px; }
.legend i { display: inline-block; width: 9px; height: 9px; border-radius: 2px; flex: none; }

.ch-band { background: #3d2547; color: #fbf9f4; border-radius: 6px; padding: 7px 14px; display: flex; justify-content: space-between; align-items: center; margin: 10px 0 8px; }
.ch-band .en { font: 700 ${size + 3}pt "IBM Plex Sans"; }
.ch-band .ar { font: 700 ${size + 3}pt "IBM Plex Sans Arabic"; }
.sec { background: #5b3768; color: #fbf9f4; border-radius: 5px; padding: 5px 12px; display: flex; justify-content: space-between; align-items: center; margin: 10px 0 6px; break-after: avoid; }
.sec .en { font: 600 ${size + 1.5}pt "IBM Plex Sans"; }
.sec .ar { font: 600 ${size + 1.5}pt "IBM Plex Sans Arabic"; }
.star { color: #f2b84b; margin-inline-end: 5px; }

.pair { break-inside: avoid; margin-bottom: 6px; }
.p-en { direction: ltr; background: #eef2f8; border-left: 3px solid #3f63a8; padding: 5px 10px; border-radius: 0 4px 4px 0; }
.p-ar { direction: rtl; background: #eef4e6; border-right: 3px solid #4a6626; padding: 5px 10px; border-radius: 4px 0 0 4px; margin-top: 3px; }
.p-en p, .p-ar p { margin: 0; }
.pair.must .p-en { background: #fbf0dc; border-left-color: #c46a1b; }
.must-tag { font: 700 ${size - 2}pt "IBM Plex Sans"; color: #fff; background: #c46a1b; border-radius: 99px; padding: 1px 7px; margin-right: 5px; vertical-align: 1px; letter-spacing: .03em; }

.tbl { break-inside: avoid; margin: 6px 0 8px; }
.tbl-cap { font: 600 ${size - 0.5}pt "IBM Plex Sans"; color: #c46a1b; margin: 0 0 3px; direction: ltr; text-align: left; }
.tbl-cap .ar-cap { font-family: "IBM Plex Sans Arabic"; }
table { width: 100%; border-collapse: collapse; direction: ltr; }
th { background: #c46a1b; color: #fff; font: 600 ${size - 0.5}pt "IBM Plex Sans"; padding: 4px 8px; text-align: left; }
th .a, td .a { display: block; direction: rtl; text-align: right; font: 400 ${size - 1.5}pt "IBM Plex Sans Arabic"; }
th .a { color: #fde9d4; }
td { border: 1px solid #e3ddd0; padding: 4px 8px; vertical-align: top; }
td .a { color: #3a4448; }
td:first-child { font-weight: 600; background: #faf7f1; width: 22%; }

.flow { direction: ltr; display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin: 4px 0 8px; }
.flow span.s { border: 1.5px solid #3f63a8; color: #2b4a85; border-radius: 4px; padding: 1px 9px; font: 600 ${size - 0.5}pt "IBM Plex Sans"; }
.flow span.arr { color: #566064; }

.notice { margin-top: 10px; padding-top: 5px; border-top: 1px solid #d9d2c2; font-size: ${size - 2}pt; color: #566064; text-align: center; line-height: 1.5; break-inside: avoid; }
.notice p { margin: 0; }
`;

function summaryHTML(size) {
  const sm = ch.summary;
  const tag = '<span class="must-tag">MUST KNOW</span>';
  const block = (b) => {
    if (b.type === 'pair') {
      return `<div class="pair${b.must ? ' must' : ''}">
        <div class="p-en en"><p>${b.must ? tag : ''}${inline(b.en)}</p></div>
        <div class="p-ar ar"><p>${inline(b.ar)}</p></div>
      </div>`;
    }
    if (b.type === 'table') {
      const cell = (c, t) => `<${t}>${inline(c.en)}${c.ar ? `<span class="a">${inline(c.ar)}</span>` : ''}</${t}>`;
      return `<div class="tbl">
        <p class="tbl-cap">${b.must ? tag : ''}${esc(b.title || '')}${b.title_ar ? ` · <span class="ar-cap">${esc(b.title_ar)}</span>` : ''}</p>
        <table><thead><tr>${b.head.map((c) => cell(c, 'th')).join('')}</tr></thead>
        <tbody>${b.rows.map((r) => `<tr>${r.map((c) => cell(c, 'td')).join('')}</tr>`).join('')}</tbody></table>
      </div>`;
    }
    if (b.type === 'flow') {
      return `<div class="flow">${b.items.map((x) => `<span class="s">${esc(x)}</span>`).join('<span class="arr">→</span>')}</div>`;
    }
    return '';
  };
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>${SUMMARY_CSS(size)}</style></head><body>
    ${cover('ملخص الشابتر · نسخة ثنائية اللغة للمراجعة', sm.title_ar ? esc(sm.title_ar.replace(/^الشابتر [^:]+:\s*/, '')) : '')}
    <div class="how">
      <p class="legend">
        <span><i style="background:#3f63a8"></i>الشرح بالإنجليزية</span>
        <span><i style="background:#4a6626"></i>الشرح بالعربية</span>
        <span><i style="background:#c46a1b"></i>مهم جدًا (MUST KNOW) أو مقارنة متوقعة في الاختبار</span>
        <span><span class="star" style="margin:0">★</span>ركزت عليه الدكتورة</span>
      </p>
    </div>
    ${sm.sections.map((sec) => `
      <div class="sec"><span class="en">${esc(sec.title)}</span><span class="ar">${sec.star ? '<span class="star">★</span>' : ''}${esc(sec.title_ar || '')}</span></div>
      ${sec.blocks.map(block).join('')}`).join('')}
    ${notice}
  </body></html>`;
}

// Renders the summary, stepping the text size down until it fits in two pages.
async function renderSummary(p, file) {
  let last;
  for (let size = 9.5; size >= 7.5; size -= 0.25) {
    await p.setContent(summaryHTML(size), { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    const buf = await p.pdf({ preferCSSPageSize: true, printBackground: true });
    const pages = (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
    last = { buf, pages, size };
    if (pages <= 2) break;
  }
  fs.writeFileSync(file, last.buf);
  if (last.pages > 2) console.warn(`summary is ${last.pages} pages even at ${last.size}pt: shorten it`);
  else console.log(`summary: ${last.pages} pages at ${last.size}pt`);
  return last.pages;
}

(async () => {
  const browser = await chromium.launch({ ...(process.env.CHROME ? { executablePath: process.env.CHROME } : {}), args: ['--no-sandbox'] });
  const p = await browser.newPage();
  let summaryPages = 0;
  if (ch.summary && job.out.summary) summaryPages = await renderSummary(p, job.out.summary);
  const outputs = [];
  if ((ch.questions || []).length && job.out.questions) outputs.push([job.out.questions, questionsHTML()]);
  if ((ch.terms || []).length && job.out.terms) outputs.push([job.out.terms, termsHTML()]);
  for (const [file, html] of outputs) {
    await p.setContent(html, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    await p.pdf({ path: file, preferCSSPageSize: true, printBackground: true });
    console.log('wrote', path.basename(file));
  }
  await browser.close();
})();
