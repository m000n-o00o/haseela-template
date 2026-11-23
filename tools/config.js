// Shared paths. Run tools from the repo root: COURSE=DM node tools/build.js 1,2,3
const path = require('path');
const ROOT = process.env.HASEELA_ROOT || path.resolve(__dirname, '..');
const COURSE = process.env.COURSE || 'DEMO';
module.exports = {
  ROOT, COURSE,
  WORK: path.join(ROOT, 'work', COURSE),            // translation/summary/explain md, glossary.yaml, questions.yaml, viz/chN/*.html
  SHARED: path.join(ROOT, 'work', '_shared'),       // print tokens, viz style
  SRC: path.join(ROOT, '.build', 'src', COURSE),    // prepared slides: chN.pdf, txtN/, webpN/, jpgN/ (not committed)
  OUT: path.join(ROOT, '.build', 'out', COURSE),    // built chapter folders chNN/ (not committed)
};
