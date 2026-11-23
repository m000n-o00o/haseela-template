// Shared helpers: math rendering, markdown, keyword marker, page shell (Haseela tokens).
const katex = require('katex');
const { marked } = require('marked');
const fs = require('fs');
const path = require('path');

const FONT_DIR = pkg => path.join(path.dirname(require.resolve(`@fontsource/${pkg}/package.json`)), 'files');
const KATEX_CSS = require.resolve('katex/dist/katex.min.css');
const TOKENS = fs.readFileSync(path.join(require('./config').SHARED, 'print-tokens.css'), 'utf8');

// $$..$$ and $..$ → KaTeX; ==word== → keyword marker (.hs-key). Math is protected first.
function md(text, { inline = false } = {}) {
  const store = [];
  let t = String(text).replace(/\$\$([\s\S]+?)\$\$/g, (_, m) => {
    store.push(katex.renderToString(m.trim(), { displayMode: true, throwOnError: true }));
    return `@@M${store.length - 1}@@`;
  });
  t = t.replace(/\$([^$\n]+?)\$/g, (_, m) => {
    store.push(katex.renderToString(m.trim(), { displayMode: false, throwOnError: true }));
    return `@@M${store.length - 1}@@`;
  });
  t = t.replace(/==([^=\n]+?)==/g, '<span class="hs-key">$1</span>');
  t = t.replace(/<ar>([\s\S]+?)<\/ar>/g, '<span class="ar-sub" dir="rtl">$1</span>');
  // Text made only of numbers/operators (no letters) stays left-to-right in any context.
  if (!/[A-Za-z\u0600-\u06FF@]/.test(t) && /\d/.test(t)) t = `<span dir="ltr" class="num">${t}</span>`;
  // In Arabic text, keep plain arithmetic (e.g. "(1 − 0.8) × 0.8 = 0.16") left-to-right.
  if (/[\u0600-\u06FF]/.test(t)) {
    t = t.replace(/[(\d−-][\d\s().,×+−\-=/≈]*[\d)]/g, m =>
      /[×+=/≈]|\d\s*[−-]\s*\d|\(|^[−-]\d/.test(m) && /\d/.test(m) && (m.split('(').length === m.split(')').length) ? `<span dir="ltr" class="num">${m.trim()}</span>${/\s$/.test(m) ? ' ' : ''}` : m);
  }
  let html = inline ? marked.parseInline(t) : marked.parse(t);
  html = html.replace(/@@M(\d+)@@/g, (_, i) => `<span class="math" dir="ltr">${store[+i]}</span>`);
  return html;
}
// Plain text without the marker syntax (for places that do not render HTML).
const plain = s => String(s).replace(/==([^=\n]+?)==/g, '$1');

function fontFaces() {
  const ar = `${FONT_DIR('ibm-plex-sans-arabic')}/ibm-plex-sans-arabic-arabic`;
  const la = `${FONT_DIR('ibm-plex-sans')}/ibm-plex-sans-latin`;
  const f = (fam, file, w) =>
    `@font-face{font-family:'${fam}';src:url('file://${file}-${w}-normal.woff2') format('woff2');font-weight:${w};font-display:swap}`;
  return [400, 600].map(w => f('IBM Plex Sans Arabic', ar, w)).join('\n') + '\n' +
    [400, 600].map(w => f('IBM Plex Sans', la, w)).join('\n');
}

// Print shell: light theme tokens, Plex faces, KaTeX. For PDFs and local review pages.
function page({ title, body, extraCss = '', dir = 'ltr', katexHref }) {
  return `<!DOCTYPE html><html lang="${dir === 'rtl' ? 'ar' : 'en'}" dir="${dir}" data-theme="light"><head><meta charset="utf-8"><title>${title}</title>
<link rel="stylesheet" href="${katexHref || 'file://' + KATEX_CSS}">
<style>${fontFaces()}
${TOKENS}
*{box-sizing:border-box}
html,body{margin:0;background:var(--surface);color:var(--ink);font-family:var(--font-sans);-webkit-print-color-adjust:exact;print-color-adjust:exact}
.ar,[dir=rtl]{font-family:var(--font-arabic)}
.math,.num{unicode-bidi:isolate}
.katex{font-size:1.02em}
.katex .katex-mathml{display:none}
.hs-key{background:var(--highlight);color:var(--ink);border-radius:var(--radius-sm);padding:0 2px}
table{border-collapse:collapse}
${extraCss}</style></head><body>${body}</body></html>`;
}

module.exports = { md, plain, page, fontFaces, TOKENS };

// ---------- Haseela file template (summary, definitions, questions, slides) ----------
const LOGO = `<svg width="30" height="30" viewBox="0 0 64 64" aria-hidden="true"><rect x="20" y="6" width="34" height="42" rx="7" fill="#c9a6d8"/><rect x="14" y="11" width="34" height="42" rx="7" fill="#8a5a9c"/><rect x="8" y="16" width="36" height="44" rx="7" fill="#5b3768"/><rect x="14" y="27" width="24" height="7" rx="2.5" fill="#f2dc8a"/><rect x="14" y="39" width="24" height="4" rx="2" fill="#fbf9f4"/><rect x="14" y="48" width="16" height="4" rx="2" fill="#fbf9f4"/></svg>`;
const STAR = `<svg class="star" viewBox="0 0 24 24" width="11" height="11" aria-label="Doctor's focus"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z" fill="var(--focus-star)"/></svg>`;

function band({ course, chapter, kind, kindAr, titleEn, titleAr, legend }) {
  const leg = legend ? `<div class="legend">
<span><i class="sw" style="background:var(--brand-soft);border-left:3px solid var(--brand)"></i>Definition · تعريف</span>
<span><i class="sw" style="background:var(--example-soft);border-left:3px solid var(--example)"></i>Example · مثال</span>
<span><i class="sw" style="background:var(--warning-soft);border-left:3px solid var(--warning)"></i>Common mistake · خطأ شائع</span>
<span><b class="mk">MUST KNOW</b> مهم جدًا</span>
<span><span class="hs-key">keyword</span> كلمة مفتاحية</span>
<span>${STAR} ركّزت عليه الدكتورة</span>
<span><span class="ar-demo" dir="rtl">الشرح العربي</span> تحت كل نقطة</span></div>` : '';
  return `<div class="band"><div class="b1"><div class="brand">${LOGO}<span>حصيلة</span></div><div class="kind">${course} · Chapter ${chapter} · ${kind} <span dir="rtl">· ${kindAr}</span></div></div>
<div class="b2"><h1>${titleEn}</h1><h2 dir="rtl">${titleAr}</h2></div>${leg}</div>`;
}
const DISCLAIMER = `<div class="disc" dir="rtl"><p>هذا العمل اجتهادٌ شخصي، فما أصبنا فيه فمن الله، وما أخطأنا فمن أنفسنا والشيطان.</p><p>للاستخدام الدراسي فقط، ولا يُغني عن الشباتر الأصلية. يُمنع البيع والاستخدام التجاري.</p></div>`;
const TEMPLATE_CSS = `
.band{background:var(--brand);color:var(--on-brand);border-radius:var(--radius-lg);padding:4mm 5mm;margin-bottom:4mm}
.band .b1{display:flex;justify-content:space-between;align-items:center;font-size:8pt;opacity:.92}
.band .brand{display:flex;align-items:center;gap:6px;font:600 12pt var(--font-arabic)}
.band .brand svg rect:nth-child(3){fill:#fbf9f4}
.band .b2{display:flex;justify-content:space-between;align-items:flex-end;gap:10px;margin-top:2mm}
.band h1{margin:0;font:600 13pt/1.25 var(--font-sans);color:var(--on-brand)}
.band h2{margin:0;font:600 12pt/1.4 var(--font-arabic);color:var(--on-brand);text-align:right}
.legend{display:flex;flex-wrap:wrap;gap:3px 12px;margin-top:3mm;padding:2mm 3mm;background:var(--surface-raised);color:var(--ink);border-radius:var(--radius-md);font-size:7.2pt;align-items:center}
.legend .sw{display:inline-block;width:12px;height:9px;border-radius:2px;margin-right:4px;vertical-align:-1px}
.legend .mk{background:var(--must-know-soft);color:var(--must-know);font:600 6.5pt var(--font-sans);padding:1px 4px;border-radius:var(--radius-sm);letter-spacing:.05em;margin-right:3px}
.legend .ar-demo{font-family:var(--font-arabic);color:var(--ink);border-bottom:1.5px solid var(--line)}
.star{vertical-align:-1px}
.disc{margin-top:5mm;padding-top:2mm;border-top:1px solid var(--line);font-size:7.5pt;color:var(--ink-muted);text-align:center;break-inside:avoid}
.disc p{margin:0}
.ar-sub{display:block;font-family:var(--font-arabic);direction:rtl;text-align:right;font-size:.92em;margin-top:1px}
`;
module.exports.band = band; module.exports.DISCLAIMER = DISCLAIMER; module.exports.TEMPLATE_CSS = TEMPLATE_CSS; module.exports.STAR = STAR; module.exports.LOGO = LOGO;
