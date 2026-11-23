// Render a chapter summary source (.md) into print-ready HTML (Haseela file template, bilingual layout).
// Format: "# EN title", "## AR title", "### Section EN | Section AR", then blocks:
//   [def|ex|warn|must] [*] English point line(s)   (kind tag optional; [*] = doctor's focus star)
//   ع: Arabic explanation
//   | markdown | table |   (comparison tables; Arabic under cells with <ar>..</ar>)
const fs = require('fs');
const { md, page, band, DISCLAIMER, TEMPLATE_CSS, STAR } = require('./lib');

const KIND = { def: 'Definition', ex: 'Example', warn: 'Common mistake', must: 'Must know' };

function parse(src) {
  const out = { en: '', ar: '', sections: [] };
  let cur = null, block = null;
  for (const raw of src.split('\n')) {
    const l = raw.trimEnd();
    if (l.startsWith('### ')) {
      const [en, ar] = l.slice(4).split(' | ');
      cur = { title: en.trim(), title_ar: (ar || '').trim(), blocks: [] }; out.sections.push(cur); block = null; continue;
    }
    if (l.startsWith('## ')) { out.ar = l.slice(3); continue; }
    if (l.startsWith('# ')) { out.en = l.slice(2); continue; }
    if (!l.trim()) { block = null; continue; }
    if (l.startsWith('|')) {
      if (!block || block.kind !== 'table') { block = { kind: 'table', en: '', ar: '' }; cur.blocks.push(block); }
      block.en += l + '\n'; continue;
    }
    if (l.startsWith('ع:')) { (block || cur.blocks[cur.blocks.length - 1]).ar = l.slice(2).trim(); continue; }
    if (!block) {
      const m = l.match(/^(?:\[(def|ex|warn|must)\]\s*)?(\[\*\]\s*)?/);
      block = { kind: m[1] || null, star: !!m[2], en: l.slice(m[0].length), ar: '' };
      cur.blocks.push(block);
      continue;
    }
    block.en += ' ' + l;
  }
  return out;
}

const css = TEMPLATE_CSS + `
@page{size:A4;margin:10mm 12mm 13mm}
body{font-size:10pt;line-height:1.36}
.sec{display:flex;justify-content:space-between;gap:10px;align-items:baseline;background:var(--brand-soft);border-radius:var(--radius-md);padding:1.2mm 3mm;margin:3.5mm 0 2mm;break-after:avoid}
.sec h3{margin:0;font:600 11pt var(--font-sans);color:var(--brand)}
.sec .ar{font:600 10.5pt var(--font-arabic);color:var(--brand)}
.pt{margin:0 0 2.2mm;padding:1.2mm 2.5mm;break-inside:avoid;border-left:3px solid transparent;border-radius:var(--radius-md)}
.pt .en p{margin:0}
.pt.def{background:var(--brand-soft);border-left-color:var(--brand)}
.pt.ex{background:var(--example-soft);border-left-color:var(--example)}
.pt.warn{background:var(--warning-soft);border-left-color:var(--warning)}
.lab{font:600 6.5pt/1 var(--font-sans);letter-spacing:.06em;text-transform:uppercase;margin-right:5px;vertical-align:1px}
.def .lab{color:var(--brand)}.ex .lab{color:var(--example)}.warn .lab{color:var(--warning)}
.lab.must{background:var(--must-know-soft);color:var(--must-know);border-radius:var(--radius-sm);padding:1px 4px}
.pt .arx{margin:.8mm 0 0;padding-top:.8mm;border-top:1px dashed var(--line);font-size:9.6pt;line-height:1.5;direction:rtl;text-align:right}
.pt .arx p{margin:0}
.katex-display{margin:2px 0}
.tbl{margin:0 0 2.5mm;break-inside:avoid}
.tbl .arx{margin:1mm 0 0;font-size:9.6pt;line-height:1.5;direction:rtl;text-align:right}.tbl .arx p{margin:0}
.tbl table{width:100%;border-collapse:collapse;font-size:9pt;background:var(--surface-raised)}
.tbl th{background:var(--surface-sunken);text-align:left;font-weight:600;padding:1.2mm 2mm;border-bottom:1px solid var(--line)}
.tbl td{padding:1.2mm 2mm;border-bottom:1px solid var(--line);vertical-align:top}
.tbl tr:last-child td{border-bottom:none}
`;

function render(srcPath, outPath, meta) {
  const s = parse(fs.readFileSync(srcPath, 'utf8'));
  let body = band({ course: meta.course, chapter: meta.chapter, kind: meta.kind || 'Summary', kindAr: meta.kindAr || 'الملخص', titleEn: s.en.replace(/^Chapter \d+ — /, ''), titleAr: s.ar, legend: true });
  for (const sec of s.sections) {
    body += `<div class="sec"><h3>${md(sec.title, { inline: true })}</h3><span class="ar" dir="rtl">${sec.title_ar}</span></div>`;
    for (const b of sec.blocks) {
      if (b.kind === 'table') { body += `<div class="tbl">${md(b.en)}${b.ar ? `<div class="arx ar" dir="rtl">${md(b.ar)}</div>` : ''}</div>`; continue; }
      const lab = b.kind ? `<span class="lab ${b.kind === 'must' ? 'must' : ''}">${KIND[b.kind]}</span>` : '';
      const cls = b.kind && b.kind !== 'must' ? b.kind : '';
      body += `<div class="pt ${cls}"><div class="en">${md((b.star ? STAR + ' ' : '') + lab + b.en)}</div>${b.ar ? `<div class="arx ar" dir="rtl">${md(b.ar)}</div>` : ''}</div>`;
    }
  }
  body += DISCLAIMER;
  fs.writeFileSync(outPath, page({ title: `${meta.course} Ch${meta.chapter} ${meta.kind || 'Summary'}`, body, extraCss: css }));
  return s;
}

module.exports = { parse, render, KIND };
