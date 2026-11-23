/* حصيلة — site logic. Plain JavaScript, no build step: GitHub Pages serves these files as they are. */
(function () {
  'use strict';

  // ---------- settings ----------
  // "Report an error" Google Form (optional). Leave REPORT_FORM empty to hide the button.
  // To use it: make a Google Form, open "Get pre-filled link", and copy the form URL (ending in /viewform) and each field's entry id.
  var REPORT_FORM = '';
  var REPORT_FIELDS = { course: 'entry.0', chapter: 'entry.0', section: 'entry.0', item: 'entry.0', link: 'entry.0' };
  // Course dropdown options exactly as written in the form (a value that does not match an option is ignored by Google Forms).
  var REPORT_COURSE_LABELS = {};
  // Arabic course names come from "name_ar" in data/courses.json (filled in by courses() below).
  var CNAME = {};
  function cname(code) { return CNAME[code] || code; }
  var STORE_KEY = 'haseela.v1';
  var SOURCES = { quiz: 'الكويزات', midterm: 'ميد', extra: 'أسئلة إضافية' };
  function srcKey(s) { return /^quiz/.test(s || '') ? 'quiz' : (s || 'extra'); }
  var STATUS = { 'new': 'ما بدأت', studying: 'أذاكر', mastered: 'أتقنت' };
  var REVIEW_DAYS = [0, 1, 3, 7, 14]; // spaced repetition: days until a question comes back, by box

  // ---------- helpers ----------
  function $(sel, root) { return (root || document).querySelector(sel); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function qs(name) { try { return new URLSearchParams(location.search).get(name); } catch (e) { return null; } }
  function today() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function addDays(iso, n) { var d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function countAr(n, one, two, few, many) { return n === 1 ? one : n === 2 ? two : (n >= 3 && n <= 10 ? n + ' ' + few : n + ' ' + many); }
  function getJSON(url) { return fetch(url, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(url + ' ' + r.status); return r.json(); }); }
  var ORD = ['', 'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر', 'الحادي عشر', 'الثاني عشر'];
  function chapterName(n) { return 'الشابتر ' + (ORD[n] || n); }
  var STAR = '<svg class="hs-star" viewBox="0 0 24 24" role="img" aria-label="تركيز الدكتورة"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z"/></svg>';
  var LOGO = '<svg width="32" height="32" viewBox="0 0 64 64" aria-hidden="true"><rect x="20" y="6" width="34" height="42" rx="7" fill="#c9a6d8"></rect><rect x="14" y="11" width="34" height="42" rx="7" fill="#8a5a9c"></rect><rect x="8" y="16" width="36" height="44" rx="7" fill="#5b3768"></rect><rect x="14" y="27" width="24" height="7" rx="2.5" fill="#f2dc8a"></rect><rect x="14" y="39" width="24" height="4" rx="2" fill="#fbf9f4"></rect><rect x="14" y="48" width="16" height="4" rx="2" fill="#fbf9f4"></rect></svg>';

  // ---------- progress store (this device only; export/import moves it between devices) ----------
  var store = (function () {
    var data = { v: 1, theme: '', status: {}, answers: {}, planner: {} };
    try { var raw = localStorage.getItem(STORE_KEY); if (raw) data = Object.assign(data, JSON.parse(raw)); } catch (e) {}
    function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (e) {} }
    return {
      data: data, save: save,
      status: function (key) { return data.status[key] || 'new'; },
      setStatus: function (key, s) { data.status[key] = s; save(); },
      answer: function (id) { return data.answers[id]; },
      record: function (id, ok) {
        var a = data.answers[id] || { box: 0 };
        a.box = ok ? Math.min((a.box || 0) + 1, REVIEW_DAYS.length - 1) : 0;
        a.last = ok ? 'right' : 'wrong';
        a.due = ok ? (a.everWrong ? addDays(today(), REVIEW_DAYS[a.box]) : null) : today();
        if (!ok) a.everWrong = true;
        a.at = Date.now();
        data.answers[id] = a; save();
      },
      due: function (id) { var a = data.answers[id]; return !!(a && a.due && a.due <= today()); },
      replace: function (obj) { Object.keys(data).forEach(function (k) { delete data[k]; }); Object.assign(data, { v: 1, theme: '', status: {}, answers: {}, planner: {} }, obj); save(); }
    };
  })();

  // ---------- theme ----------
  function applyTheme() {
    var t = store.data.theme;
    if (t !== 'light' && t !== 'dark') t = (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
    return t;
  }
  applyTheme();

  // ---------- data ----------
  var COURSES = null;
  function courses() {
    if (COURSES) return Promise.resolve(COURSES);
    // Course list in data/courses.json; each course's chapters in content/<code>/chapters.json (one file per course, so teams never overwrite each other).
    return getJSON('data/courses.json').then(function (d) {
      d.courses.forEach(function (c) { if (c.name_ar) CNAME[c.code] = c.name_ar; });
      return Promise.all(d.courses.map(function (c) {
        return getJSON('content/' + c.code + '/chapters.json').then(function (x) { c.chapters = x.chapters || []; }).catch(function () { c.chapters = c.chapters || []; });
      })).then(function () { COURSES = d.courses; return COURSES; });
    });
  }
  function chapterPath(code, n) { return 'content/' + code + '/ch' + pad(n) + '/'; }
  function chKey(code, n) { return code + '/' + n; }
  function allQuestions() {
    return courses().then(function (cs) {
      var jobs = [];
      cs.forEach(function (c) { c.chapters.forEach(function (ch) {
        if (ch.has.indexOf('questions') === -1) return;
        jobs.push(getJSON(chapterPath(c.code, ch.n) + 'questions.json').then(function (d) {
          return d.questions.map(function (q) { return Object.assign({}, q, { course: c.code, chapter: ch.n, chapterTitle: ch.title_en }); });
        }).catch(function () { return []; }));
      }); });
      return Promise.all(jobs).then(function (lists) { return [].concat.apply([], lists); });
    });
  }

  // ---------- shell: header, footer, dialogs ----------
  var NAV = [['today', 'index.html', 'اليوم'], ['courses', 'course.html', 'المواد'], ['bank', 'bank.html', 'بنك الأسئلة'], ['planner', 'planner.html', 'مخطط المذاكرة'], ['glossary', 'glossary.html', 'القاموس']];
  function shell(active) {
    var head = document.createElement('header');
    head.className = 'site-header';
    head.innerHTML = '<div class="site-header__in"><a class="brand" href="index.html">' + LOGO + 'حصيلة</a>' +
      '<nav class="site-nav" aria-label="القائمة الرئيسية">' + NAV.map(function (n) {
        return '<a href="' + n[1] + '"' + (n[0] === active ? ' aria-current="page"' : '') + '>' + n[2] + '</a>';
      }).join('') + '</nav>' +
      '<div class="site-tools"><button class="hs-btn hs-btn--secondary" id="btn-progress" type="button">حفظ التقدم</button>' +
      '<button class="hs-btn hs-btn--secondary" id="btn-theme" type="button" aria-label="تبديل الوضع الداكن"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg></button></div></div>';
    document.body.insertBefore(head, document.body.firstChild);
    var foot = document.createElement('footer');
    foot.className = 'site-footer';
    foot.innerHTML = '<p class="foot-note">تقدّمكم محفوظ في هذا الجهاز فقط، ولنقله إلى جهاز آخر استخدموا «حفظ التقدم». المحتوى اجتهاد من الطلاب، والمرجع الأول هو السلايدات وشرح الدكتور/ة.</p><div id="foot-team"></div>';
    document.body.appendChild(foot);
    renderTeam();
    $('#btn-theme').addEventListener('click', function () {
      var now = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      store.data.theme = now; store.save(); applyTheme();
      document.querySelectorAll('iframe.viz-frame').forEach(function (f) { f.src = f.src.replace(/theme=\w+/, 'theme=' + now); });
    });
    $('#btn-progress').addEventListener('click', openProgress);
  }

  var ICON_IN = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.5h4V21H3zM9.5 9.5h3.8v1.6h.1c.5-1 1.8-2 3.8-2 4 0 4.8 2.6 4.8 6V21h-4v-5.2c0-1.2 0-2.9-1.8-2.9s-2 1.4-2 2.8V21h-4z"/></svg>';
  var ICON_X = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.8 3h3.1l-6.8 7.8L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8zm-1.1 16.2h1.7L7.4 4.7H5.6z"/></svg>';
  function personHTML(m) {
    var li = /^https:\/\/([a-z]+\.)?linkedin\.com\//i.test(m.linkedin || '') ? m.linkedin : '';
    var x = /^https:\/\/(www\.)?(x|twitter)\.com\//i.test(m.x || '') ? m.x : '';
    var a = function (href, icon, label) { return '<a class="foot-icon" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer" aria-label="' + label + ': ' + esc(m.name) + '">' + icon + '</a>'; };
    return '<span class="foot-person">' + esc(m.name) + (li ? a(li, ICON_IN, 'LinkedIn') : '') + (x ? a(x, ICON_X, 'X') : '') + '</span>';
  }
  function renderTeam() {
    var host = document.getElementById('foot-team');
    if (!host) return;
    getJSON('data/team.json').then(function (t) {
      var members = (t.members || []).filter(function (m) { return m && m.name; });
      var year = new Date().getFullYear();
      host.innerHTML = (members.length ? '<p class="foot-title">شكر وتقدير</p><p class="foot-team">' + members.map(personHTML).join('<span class="foot-sep" aria-hidden="true">·</span>') + '</p>' : '') +
        '<p class="foot-rights">© ' + year + ' حصيلة. جميع الحقوق محفوظة.' + (t.owner && t.owner.name ? ' فكرة المنصة وإدارتها: ' + personHTML(t.owner) : '') + ' بُني على <a href="https://github.com/m000n-o00o/haseela-template" target="_blank" rel="noopener noreferrer">قالب حصيلة</a>.</p>';
    }).catch(function () {});
  }

  function dialog(html) {
    var d = document.createElement('dialog');
    d.innerHTML = html;
    document.body.appendChild(d);
    d.addEventListener('close', function () { d.remove(); });
    d.addEventListener('click', function (e) { if (e.target === d) d.close(); });
    if (d.showModal) d.showModal(); else d.setAttribute('open', '');
    return d;
  }

  function openProgress() {
    var d = dialog('<h2>حفظ التقدم</h2><p class="small muted" style="margin:0 0 16px">يُحفظ تقدّمكم تلقائيًا في هذا المتصفح. ولنقله إلى جهاز آخر نزّلوا ملف التقدم، ثم افتحوه من الجهاز الآخر.</p>' +
      '<div class="stack"><button class="hs-btn hs-btn--primary" id="p-export" type="button">تنزيل ملف التقدم</button>' +
      '<label class="hs-btn hs-btn--secondary" style="cursor:pointer">استرجاع من ملف<input type="file" id="p-import" accept="application/json,.json" class="sr-only"></label>' +
      '<p id="p-msg" class="small" role="status" style="margin:0"></p><button class="hs-btn hs-btn--quiet" type="button" id="p-close" style="color:var(--ink-muted)">إغلاق</button></div>');
    $('#p-close', d).onclick = function () { d.close(); };
    $('#p-export', d).onclick = function () {
      var blob = new Blob([JSON.stringify(store.data, null, 1)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'haseela-progress-' + today() + '.json';
      document.body.appendChild(a); a.click(); a.remove();
      $('#p-msg', d).textContent = 'نُزّل الملف.';
    };
    $('#p-import', d).onchange = function (e) {
      var f = e.target.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        try {
          var obj = JSON.parse(r.result);
          if (!obj || typeof obj !== 'object' || !obj.answers || !obj.status) throw new Error('bad');
          store.replace(obj); applyTheme();
          $('#p-msg', d).textContent = 'استُرجع التقدم. ستُحدَّث الصفحة.';
          setTimeout(function () { location.reload(); }, 900);
        } catch (err) { $('#p-msg', d).textContent = 'الملف غير صالح. اختاروا ملف تقدم نزّلتموه من حصيلة.'; }
      };
      r.readAsText(f);
    };
  }

  function reportUrl(ctx) {
    var params = ['usp=pp_url'];
    function add(k, v) { if (v != null && v !== '') params.push(REPORT_FIELDS[k] + '=' + encodeURIComponent(v)); }
    add('course', REPORT_COURSE_LABELS[ctx.course]);
    add('chapter', ctx.chapter);
    add('section', ctx.section);
    add('item', ctx.item);
    add('link', location.href);
    return REPORT_FORM + '?' + params.join('&');
  }
  function openReport(ctx) { window.open(reportUrl(ctx), '_blank', 'noopener'); }

  // ---------- page: today ----------
  function pageToday(root) {
    courses().then(function (cs) {
      return allQuestions().then(function (qsAll) {
        var due = qsAll.filter(function (q) { return store.due(q.id); });
        var weak = [];
        cs.forEach(function (c) { c.chapters.forEach(function (ch) { var s = store.status(chKey(c.code, ch.n)); if (s !== 'mastered') weak.push({ c: c, ch: ch, s: s }); }); });
        weak.sort(function (a, b) { return (a.s === 'studying' ? 0 : 1) - (b.s === 'studying' ? 0 : 1); });
        root.innerHTML =
          '<section class="stack" style="gap:8px"><h1>اليوم</h1><p class="muted" style="margin:0">تظهر مواعيد الفاينلات هنا فور إعلانها.</p></section>' +
          '<section aria-labelledby="finals" class="stack"><h2 id="finals">الفاينلات</h2><div class="grid-cards">' +
          cs.map(function (c) {
            var total = c.chapters.length, done = c.chapters.filter(function (ch) { return store.status(chKey(c.code, ch.n)) === 'mastered'; }).length;
            var pct = total ? Math.round(done / total * 100) : 0;
            return '<a href="course.html?c=' + c.code + '" class="hs-card hs-count" style="text-decoration:none;color:var(--ink);display:flex;flex-direction:column;gap:4px">' +
              '<span style="font:600 16px/24px var(--font-arabic)">' + cname(c.code) + '</span><span class="small muted ltr" style="text-align:right">' + esc(c.name) + '</span><span class="hs-count__days" style="color:var(--ink-muted)">—</span>' +
              '<span class="hs-count__label">لم يُعلن الموعد بعد</span><span class="hs-progress" style="margin-top:8px"><span style="width:' + pct + '%"></span></span>' +
              '<span class="hs-count__label">' + (total ? 'الشباتر المتقنة: ' + done + ' من ' + total : 'يُضاف محتواها قريبًا') + '</span></a>';
          }).join('') + '</div></section>' +
          '<div class="split"><section aria-labelledby="weak" class="hs-card main"><h2 id="weak" style="margin-bottom:4px">شباتر تحتاج إلى مذاكرة</h2>' +
          '<p class="small muted" style="margin:0 0 8px">الشباتر التي لم يُبدأ فيها بعد، أو التي ما زالت قيد المذاكرة.</p>' +
          (weak.length ? weak.slice(0, 6).map(function (w, i, arr) {
            return '<div class="hs-chapter"' + (i === arr.length - 1 ? ' style="border-bottom:none"' : '') + '><span class="hs-chapter__num" style="width:auto;min-width:0;white-space:nowrap;font-family:var(--font-arabic)">' + cname(w.c.code) + '</span><span class="hs-chapter__title">' + esc(w.ch.title_en) + '</span><span class="hs-chip hs-chip--' + w.s + '">' + STATUS[w.s] + '</span>' +
              '<a href="chapter.html?c=' + w.c.code + '&ch=' + w.ch.n + '" style="font-size:14px;font-weight:600">' + (w.s === 'new' ? 'بدء' : 'متابعة') + '</a></div>';
          }).join('') : '<p class="empty">أتقنتم كل الشباتر المتاحة حاليًا.</p>') + '</section>' +
          '<section aria-labelledby="review" class="hs-card side" style="gap:12px"><h2 id="review">أسئلة للمراجعة اليوم</h2>' +
          '<p style="margin:0;font:600 40px/48px var(--font-sans);color:var(--brand)">' + due.length + '</p>' +
          '<p class="small muted" style="margin:0">أسئلة سبق الخطأ فيها، تعود للمراجعة حتى تُتقَن.</p>' +
          (due.length ? '<a class="hs-btn hs-btn--primary" style="align-self:flex-start" href="bank.html?review=1">بدء المراجعة</a>' : '<p class="small muted" style="margin:0">لا توجد أسئلة مستحقة اليوم.</p>') + '</section></div>';
      });
    }).catch(fail(root));
  }

  // ---------- page: course(s) ----------
  function pageCourse(root) {
    courses().then(function (cs) {
      var code = qs('c'), c = cs.filter(function (x) { return x.code === code; })[0];
      if (!c) {
        document.title = 'حصيلة - المواد';
        root.innerHTML = '<section class="stack" style="gap:8px"><h1>المواد</h1><p class="muted" style="margin:0">اختاروا المادة لعرض شباترها.</p></section><div class="grid-cards">' +
          cs.map(function (x) {
            return '<a class="hs-card" href="course.html?c=' + x.code + '" style="text-decoration:none;color:var(--ink);display:flex;flex-direction:column;gap:4px"><span style="font:600 18px/26px var(--font-arabic)">' + cname(x.code) + '</span>' +
              '<span class="small muted ltr" style="text-align:right">' + esc([x.id, x.name].filter(Boolean).join(' · ')) + '</span>' +
              '<span class="small muted">' + (x.chapters.length ? countAr(x.chapters.length, 'شابتر واحد', 'شابتران', 'شباتر', 'شابترًا') : 'يُضاف محتواها قريبًا') + '</span></a>';
          }).join('') + '</div>';
        return;
      }
      document.title = 'حصيلة - ' + cname(c.code);
      var done = c.chapters.filter(function (ch) { return store.status(chKey(c.code, ch.n)) === 'mastered'; }).length, total = c.chapters.length;
      root.innerHTML = '<section class="stack" style="gap:8px"><p class="crumbs"><a href="course.html">المواد</a> / ' + cname(c.code) + '</p>' +
        '<h1>' + cname(c.code) + '</h1><p class="muted ltr" style="margin:0;text-align:right">' + esc(c.name) + '</p></section>' +
        '<div class="split"><section aria-labelledby="chapters" class="hs-card main"><div class="row" style="justify-content:space-between;margin-bottom:8px"><h2 id="chapters">الشباتر</h2>' +
        '<span class="small muted">الشباتر المتقنة: ' + done + ' من ' + total + '</span></div><div class="hs-progress" style="margin-bottom:8px"><span style="width:' + (total ? Math.round(done / total * 100) : 0) + '%"></span></div>' +
        c.chapters.map(function (ch) {
          var s = store.status(chKey(c.code, ch.n));
          return '<a href="chapter.html?c=' + c.code + '&ch=' + ch.n + '" class="hs-chapter" style="text-decoration:none;color:var(--ink)"><span class="hs-chapter__num">' + pad(ch.n) + '</span><span class="hs-chapter__title">' + esc(ch.title_en) + '</span><span class="hs-chip hs-chip--' + s + '">' + STATUS[s] + '</span></a>';
        }).join('') +
        '<div class="hs-chapter" style="border-bottom:none;color:var(--ink-muted)"><span class="hs-chapter__num">' + pad(total + 1) + '+</span><span style="flex:1;font-size:15px">بقية الشباتر تُضاف عند تجهيزها.</span></div></section>' +
        '<aside class="side"><section class="hs-card hs-count"><h2 style="font-size:16px">الفاينل</h2><p class="hs-count__days" style="margin:4px 0 0;color:var(--ink-muted)">—</p><p class="hs-count__label" style="margin:0">لم يُعلن الموعد بعد</p></section>' +
        '<section class="hs-card stack" style="gap:12px"><h2 style="font-size:16px">الملف الشامل</h2><p class="small muted" style="margin:0">ملخص الشباتر كلها مع أسئلتها في ملف واحد، يُجهَّز في نهاية المادة.</p><button class="hs-btn hs-btn--secondary" disabled style="align-self:flex-start;opacity:.6" type="button">تحميل PDF</button></section>' +
        '<section class="hs-card stack" style="gap:12px"><h2 style="font-size:16px">أسئلة المادة</h2><p class="small muted" style="margin:0">أسئلة الكويزات والميد والأسئلة الإضافية في هذه المادة.</p><a class="hs-btn hs-btn--primary" style="align-self:flex-start" href="bank.html?c=' + c.code + '">حل الأسئلة</a></section></aside></div>';
    }).catch(fail(root));
  }

  // ---------- question card (chapter tab and question bank) ----------
  function questionRunner(host, list, opts) {
    var i = 0, answered = {};
    function srcBadge(q) { return '<span class="hs-badge hs-badge--source">' + (SOURCES[srcKey(q.source)] || 'أسئلة إضافية') + '</span>'; }
    function explain(q) {
      return '<div class="hs-q__explain"><div class="hs-en rich">' + (q.explain_en_html || esc(q.explain_en)) + '</div>' +
        (q.explain_ar_html || q.explain_ar ? '<details class="hs-drawer"><summary>بالعربية</summary><div class="hs-drawer__body hs-ar rich">' + (q.explain_ar_html || esc(q.explain_ar)) + '</div></details>' : '') +
        (q.slides && q.slides.length && !opts.bank ? '<p class="small muted" style="margin:8px 0 0;direction:rtl;text-align:right">مرجعه في السلايدات: <span class="ltr">' + q.slides.join('، ') + '</span></p>' : '') + '</div>';
    }
    function render() {
      if (!list.length) { host.innerHTML = '<p class="empty">لا توجد أسئلة هنا بعد.</p>'; return; }
      var q = list[i], a = answered[q.id], body = '';
      var stem = a ? (q.q_html || esc(q.q)) : (q.q_plain_html || q.q_html || esc(q.q));
      if (q.type === 'mcq' || q.type === 'tf') {
        var choices = q.type === 'tf' ? ['True', 'False'] : (q.choices_html || q.choices.map(esc));
        var correct = q.type === 'tf' ? (q.answer ? 0 : 1) : q.answer;
        body = '<div class="hs-opts">' + choices.map(function (c, k) {
          var cls = 'hs-opt q-btn', verdict = '';
          if (a) { if (k === correct) { cls += ' hs-opt--correct'; verdict = '<span class="hs-opt__verdict">Correct</span>'; } else if (k === a.pick) { cls += ' hs-opt--wrong'; verdict = '<span class="hs-opt__verdict">Your answer</span>'; } }
          return '<button type="button" class="' + cls + '" data-k="' + k + '"' + (a ? ' disabled' : '') + '><span class="hs-opt__key">' + (q.type === 'tf' ? (k ? 'F' : 'T') : 'ABCDEF'[k]) + '</span><span class="rich">' + c + '</span>' + verdict + '</button>';
        }).join('') + '</div>';
      } else {
        body = a ? '<div class="q-answer hs-en"><strong>Answer:</strong> ' + esc(q.answer) + '</div>' +
          (a.self ? '' : '<div class="row" style="margin-top:12px;direction:rtl"><span class="small muted">هل كانت إجابتكم صحيحة؟</span><button type="button" class="hs-btn hs-btn--secondary" data-self="1">أصبت</button><button type="button" class="hs-btn hs-btn--secondary" data-self="0">أخطأت</button></div>')
          : '<textarea aria-label="إجابتكم" placeholder="اكتبوا إجابتكم هنا (اختياري)" class="ltr" style="text-align:left"></textarea><div style="margin-top:12px;direction:rtl"><button type="button" class="hs-btn hs-btn--primary" data-show="1">إظهار الإجابة</button></div>';
      }
      var prev = store.answer(q.id);
      host.innerHTML = '<div class="hs-card"><div class="hs-q__meta">' + srcBadge(q) +
        (opts.bank ? '<span class="hs-badge hs-badge--source">' + cname(q.course) + ' · الشابتر ' + q.chapter + '</span>' : '') +
        (prev && !a ? '<span class="small" style="color:' + (prev.last === 'right' ? 'var(--example)' : 'var(--warning)') + '">' + (prev.last === 'right' ? 'أصبتم فيه سابقًا' : 'أخطأتم فيه سابقًا') + '</span>' : '') +
        '<span class="small muted" style="margin-inline-start:auto">سؤال ' + (i + 1) + ' من ' + list.length + '</span></div>' +
        '<div dir="ltr"><div class="hs-q__stem hs-en rich">' + stem + '</div>' + body + (a ? explain(q) : '') + '</div>' +
        '<div class="row" style="justify-content:space-between;margin-top:16px"><button type="button" class="hs-btn hs-btn--secondary" data-nav="-1"' + (i === 0 ? ' disabled style="opacity:.5"' : '') + '>السابق</button>' +
        '<button type="button" class="hs-btn hs-btn--primary" data-nav="1">' + (i === list.length - 1 ? 'إنهاء' : 'السؤال التالي') + '</button></div></div>';
    }
    host.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || b.disabled) return;
      var q = list[i];
      if (b.dataset.k != null) {
        var k = +b.dataset.k, correct = q.type === 'tf' ? (q.answer ? 0 : 1) : q.answer;
        answered[q.id] = { pick: k }; store.record(q.id, k === correct); render();
      } else if (b.dataset.show) { answered[q.id] = {}; render(); }
      else if (b.dataset.self != null) { answered[q.id].self = true; store.record(q.id, b.dataset.self === '1'); render(); }
      else if (b.dataset.nav) {
        var n = i + (+b.dataset.nav);
        if (n >= list.length) { summary(); return; }
        i = Math.max(0, n); render(); host.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
    });
    function summary() {
      var ids = list.map(function (q) { return q.id; }), right = 0, wrong = 0;
      ids.forEach(function (id) { var a = store.answer(id); if (a && answered[id]) { if (a.last === 'right') right++; else wrong++; } });
      host.innerHTML = '<div class="hs-card stack" style="gap:12px"><h3 style="font-size:20px">انتهت الأسئلة</h3><p style="margin:0">صحيحة: <strong>' + right + '</strong> · خاطئة: <strong>' + wrong + '</strong> · بلا إجابة: <strong>' + (ids.length - right - wrong) + '</strong></p>' +
        (wrong ? '<p class="small muted" style="margin:0">الأسئلة الخاطئة تعود إليكم في «أسئلة للمراجعة اليوم» حتى تُتقَن.</p>' : '') +
        '<div class="row"><button type="button" class="hs-btn hs-btn--primary" id="q-again">إعادة الأسئلة</button>' + (opts.onDone ? '<button type="button" class="hs-btn hs-btn--secondary" id="q-back">رجوع</button>' : '') + '</div></div>';
      $('#q-again', host).onclick = function () { i = 0; answered = {}; render(); };
      if (opts.onDone) $('#q-back', host).onclick = opts.onDone;
    }
    render();
  }

  // ---------- page: chapter ----------
  var TABS = [['explain', 'الشرح'], ['slides', 'السلايدات'], ['interactive', 'العرض التفاعلي'], ['terms', 'التعاريف'], ['questions', 'الأسئلة'], ['files', 'الملفات']];
  function pageChapter(root) {
    courses().then(function (cs) {
      var code = qs('c'), n = +qs('ch');
      var c = cs.filter(function (x) { return x.code === code; })[0];
      var ch = c && c.chapters.filter(function (x) { return x.n === n; })[0];
      if (!ch) { root.innerHTML = '<p class="empty">هذا الشابتر غير موجود. <a href="course.html">العودة إلى المواد</a></p>'; return; }
      document.title = 'حصيلة - ' + cname(c.code) + ' ' + chapterName(n);
      var base = chapterPath(c.code, n), key = chKey(c.code, n), cache = {};
      var start = (location.hash || '').slice(1).split('-')[0];
      if (!TABS.some(function (t) { return t[0] === start; })) start = 'explain';
      root.innerHTML = '<section class="stack" style="gap:12px"><p class="crumbs"><a href="course.html?c=' + c.code + '">' + cname(c.code) + '</a> / ' + chapterName(n) + '</p>' +
        '<h1 class="ltr" style="font-family:var(--font-sans);text-align:right">' + esc(ch.title_en) + '</h1><p class="muted" style="margin:-8px 0 0">' + esc(ch.title_ar) + '</p>' +
        '<div class="row status-chips" role="group" aria-label="حالة الشابتر"><span class="small muted">الحالة:</span>' +
        ['new', 'studying', 'mastered'].map(function (s) { return '<button type="button" class="hs-chip hs-chip--' + s + '" data-status="' + s + '" aria-pressed="false">' + STATUS[s] + '</button>'; }).join('') + '</div>' +
        '<div class="tabs" role="tablist" aria-label="أقسام الشابتر">' + TABS.map(function (t) { return '<button type="button" role="tab" id="tab-' + t[0] + '" aria-controls="panel" data-tab="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div></section>' +
        '<section id="panel" role="tabpanel" class="stack"></section>' +
        (REPORT_FORM ? '<div><button type="button" class="hs-btn hs-btn--quiet" id="btn-report">الإبلاغ عن خطأ في هذا الشابتر</button></div>' : '');
      function paintStatus() { var s = store.status(key); root.querySelectorAll('[data-status]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.status === s ? 'true' : 'false'); }); }
      paintStatus();
      root.querySelector('.status-chips').addEventListener('click', function (e) { var b = e.target.closest('[data-status]'); if (b) { store.setStatus(key, b.dataset.status); paintStatus(); } });
      if ($('#btn-report')) $('#btn-report').onclick = function () {
        var t = root.querySelector('[aria-selected="true"]'), tab = t ? t.dataset.tab : '';
        var item = '';
        if (tab === 'slides') { var j = $('#s-jump'); if (j) item = 'Slide ' + (+j.value + 1); }
        if (tab === 'questions') { var m = (root.querySelector('.hs-q__meta .small.muted') || {}).textContent || ''; item = m.replace(/\D+/g, ' ').trim().split(' ')[0] ? 'سؤال ' + m.replace(/\D+/g, ' ').trim().split(' ')[0] : ''; }
        openReport({ course: c.code, chapter: n, section: t ? t.textContent : '', item: item });
      };
      var panel = $('#panel');
      function load(name) { return cache[name] || (cache[name] = getJSON(base + name + '.json')); }
      function show(tab, sub) {
        root.querySelectorAll('[role="tab"]').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.tab === tab ? 'true' : 'false'); });
        panel.setAttribute('aria-labelledby', 'tab-' + tab);
        try { history.replaceState(null, '', '#' + tab + (sub ? '-' + sub : '')); } catch (e) {}
        panel.innerHTML = '<p class="muted">جارٍ التحميل…</p>';
        var fn = { explain: tabExplain, slides: tabSlides, interactive: tabInteractive, terms: tabTerms, questions: tabQuestions, files: tabFiles }[tab];
        Promise.resolve(fn(panel, sub)).catch(fail(panel));
      }
      root.querySelector('.tabs').addEventListener('click', function (e) { var b = e.target.closest('[role="tab"]'); if (b) show(b.dataset.tab); });
      root.querySelector('.tabs').addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        var ids = TABS.map(function (t) { return t[0]; }), cur = ids.indexOf(e.target.dataset.tab);
        var nx = (cur + (e.key === 'ArrowLeft' ? 1 : -1) + ids.length) % ids.length;
        show(ids[nx]); $('#tab-' + ids[nx]).focus();
      });

      function tabExplain(p) {
        return load('explanation').then(function (d) {
          var LBL = { def: 'Definition', ex: 'Example', warn: 'Common mistake' };
          p.innerHTML = '<div class="row" style="justify-content:space-between"><h2>الشرح</h2><label class="ar-all"><input type="checkbox" id="ar-all"> إظهار العربي للكل</label></div>' +
            d.sections.map(function (s) {
              return '<section class="ex-section hs-card"><div class="ex-section__head"><h2>' + (s.title_html || esc(s.title)) + '</h2><span>' + esc(s.title_ar) + '</span></div>' +
                s.points.map(function (pt) {
                  var ar = pt.ar_html ? '<details class="hs-drawer"><summary>بالعربية</summary><div class="hs-drawer__body hs-ar rich">' + pt.ar_html + '</div></details>' : '';
                  var star = pt.star ? STAR : '';
                  if (pt.kind === 'table') return '<div dir="ltr"><div class="tbl rich hs-en">' + pt.en_html + '</div>' + ar + '</div>';
                  if (LBL[pt.kind]) return '<div class="hs-block hs-block--' + pt.kind + ' hs-en" dir="ltr"><p class="hs-block__label">' + LBL[pt.kind] + '</p><div class="rich">' + star + pt.en_html + '</div>' + ar + '</div>';
                  if (pt.kind === 'must') return '<div class="ex-must hs-en" dir="ltr"><div class="ex-label"><span class="hs-badge hs-badge--must">Must know</span>' + star + '</div><div class="rich">' + pt.en_html + '</div>' + ar + '</div>';
                  return '<div class="ex-plain hs-en" dir="ltr"><div class="rich">' + star + pt.en_html + '</div>' + ar + '</div>';
                }).join('') + '</section>';
            }).join('');
          $('#ar-all', p).onchange = function (e) { p.querySelectorAll('details.hs-drawer').forEach(function (x) { x.open = e.target.checked; }); };
        });
      }

      function tabSlides(p, sub) {
        return load('translation').then(function (d) {
          var total = d.slides.length, idx = Math.min(Math.max((+sub || 1) - 1, 0), total - 1);
          p.innerHTML = '<h2>السلايدات</h2><div class="hs-card"><div class="hs-slidepair" dir="ltr"><div class="hs-slidepair__slide" id="s-img"></div><div class="hs-slidepair__tr hs-ar rich" id="s-tr" aria-live="polite"></div></div>' +
            '<div class="slide-nav"><button type="button" class="hs-btn hs-btn--secondary" id="s-prev">السابق</button>' +
            '<label class="small muted ltr">Slide <select id="s-jump" aria-label="اختيار السلايد">' + d.slides.map(function (s, k) { return '<option value="' + k + '">' + (k + 1) + '</option>'; }).join('') + '</select> / ' + total + '</label>' +
            '<button type="button" class="hs-btn hs-btn--secondary" id="s-next">التالي</button></div></div>';
          function paint() {
            var s = d.slides[idx];
            $('#s-img', p).innerHTML = '<img class="slide-img" src="' + base + s.image + '" alt="السلايد ' + (idx + 1) + ' من ' + total + '" draggable="false" loading="eager">';
            var notes = (s.notes || []).filter(function (x) { return x.type === 'note'; });
            $('#s-tr', p).innerHTML = s.ar_html + notes.map(function (x) { return '<div class="note">ملاحظة: ' + x.html + '</div>'; }).join('');
            $('#s-jump', p).value = idx;
            $('#s-prev', p).disabled = idx === 0; $('#s-next', p).disabled = idx === total - 1;
            try { history.replaceState(null, '', '#slides-' + (idx + 1)); } catch (e) {}
            if (idx + 1 < total) { var pre = new Image(); pre.src = base + d.slides[idx + 1].image; }
          }
          $('#s-prev', p).onclick = function () { if (idx > 0) { idx--; paint(); } };
          $('#s-next', p).onclick = function () { if (idx < total - 1) { idx++; paint(); } };
          $('#s-jump', p).onchange = function (e) { idx = +e.target.value; paint(); };
          p.addEventListener('contextmenu', function (e) { if (e.target.closest('#s-img')) e.preventDefault(); });
          p.tabIndex = -1;
          p.onkeydown = function (e) {
            if (e.target.tagName === 'SELECT') return;
            if (e.key === 'ArrowLeft' && idx < total - 1) { idx++; paint(); }
            if (e.key === 'ArrowRight' && idx > 0) { idx--; paint(); }
          };
          paint();
        });
      }

      function tabInteractive(p, sub) {
        if (!ch.viz.length) { p.innerHTML = '<h2>العرض التفاعلي</h2><p class="empty">لا يوجد عرض تفاعلي لهذا الشابتر.</p>'; return; }
        var k = Math.min(Math.max(+sub || 0, 0), ch.viz.length - 1);
        var theme = document.documentElement.getAttribute('data-theme');
        p.innerHTML = '<h2>العرض التفاعلي</h2>' + (ch.viz.length > 1 ? '<div class="pills" role="group" aria-label="اختيار العرض">' + ch.viz.map(function (v, j) { return '<button type="button" data-v="' + j + '" aria-pressed="' + (j === k) + '" style="font-family:var(--font-arabic)">' + esc(v.title) + '</button>'; }).join('') + '</div>' : '') +
          '<iframe class="viz-frame" title="' + esc(ch.viz[k].title) + '" src="' + base + ch.viz[k].file + '?theme=' + theme + '"></iframe>';
        p.querySelectorAll('[data-v]').forEach(function (b) { b.onclick = function () { show('interactive', b.dataset.v); }; });
        var fr = $('iframe', p);
        fr.addEventListener('load', function fit() {
          try { var h = fr.contentDocument.documentElement.scrollHeight; if (h > 200) fr.style.height = (h + 8) + 'px'; } catch (e) {}
        });
      }

      function tabTerms(p) {
        return load('glossary').then(function (d) {
          p.innerHTML = '<h2>التعاريف والكلمات المفتاحية</h2><div class="hs-card" style="padding:0;overflow:hidden"><div class="tbl" style="border:none;border-radius:0" dir="ltr"><table class="hs-en"><thead><tr><th style="width:24%">Term</th><th style="width:48%">Definition</th><th>Keywords</th></tr></thead><tbody>' +
            d.terms.map(function (t) {
              return '<tr><td><strong>' + esc(t.term) + '</strong><span class="ar-sub">' + esc(t.ar) + '</span></td><td><div class="rich">' + (t.def_en_html || esc(t.def_en)) + '</div>' +
                '<details class="hs-drawer"><summary>بالعربية</summary><div class="hs-drawer__body hs-ar rich">' + (t.def_ar_html || esc(t.def_ar)) + '</div></details></td>' +
                '<td>' + (t.keywords || []).map(function (k) { return '<span class="hs-key">' + esc(k) + '</span>'; }).join(', ') + '</td></tr>';
            }).join('') + '</tbody></table></div></div>';
        });
      }

      function tabQuestions(p) {
        return load('questions').then(function (d) {
          p.innerHTML = '<h2>الأسئلة</h2><div id="q-host"></div>';
          questionRunner($('#q-host', p), d.questions.map(function (q) { return Object.assign({}, q, { course: c.code, chapter: n }); }), {});
        });
      }

      function tabFiles(p) {
        var F = [['summary', 'ملخص الشابتر', 'صفحتان: النص الإنجليزي وتحته العربي'], ['slides', 'السلايدات مع ترجمتها', 'السلايد الأصلي وبجانبه ترجمته كاملة'],
                 ['definitions', 'التعاريف والكلمات المفتاحية', 'كل تعريف مع كلماته المفتاحية'], ['questions', 'الأسئلة', 'الأسئلة نفسها في ملف، والإجابات في آخره']];
        p.innerHTML = '<h2>الملفات</h2><div class="grid-cards">' + F.map(function (f) {
          var file = ch.files[f[0]];
          return '<div class="hs-card stack" style="gap:8px"><p style="margin:0;font-weight:600">' + f[1] + '</p><p class="small muted" style="margin:0">' + f[2] + '</p>' +
            (file ? '<a class="hs-btn hs-btn--secondary" style="align-self:flex-start" href="' + base + encodeURIComponent(file) + '" download>تحميل PDF</a>' : '<button class="hs-btn hs-btn--secondary" disabled style="align-self:flex-start;opacity:.6" type="button">لم يُجهَّز بعد</button>') + '</div>';
        }).join('') + '</div>';
      }

      var sub = (location.hash || '').slice(1).split('-')[1];
      show(start, sub);
    }).catch(fail(root));
  }

  // ---------- page: question bank ----------
  function pageBank(root) {
    Promise.all([courses(), allQuestions()]).then(function (r) {
      var cs = r[0], all = r[1];
      var st = { course: qs('c') || 'all', chapter: 'all', source: 'all', state: qs('review') ? 'due' : 'all' };
      root.innerHTML = '<section class="row" style="justify-content:space-between;align-items:flex-end;gap:16px"><div><h1>بنك الأسئلة</h1><p class="muted" style="margin:0">أسئلة الكويزات والميد، والأسئلة الإضافية التي أعدّتها الدفعة، لجميع المواد في مكان واحد.</p></div>' +
        '<div class="row"><a class="hs-btn hs-btn--secondary" id="b-pdf" href="#" aria-disabled="true">تحميل أسئلة الشابتر PDF</a><button type="button" class="hs-btn hs-btn--primary" id="b-run">حل الأسئلة المختارة</button></div></section>' +
        '<section class="hs-card row" aria-label="فلترة الأسئلة" style="gap:20px;align-items:flex-end"><div class="field" style="flex:999 1 420px">المادة<div class="pills" id="b-courses"></div></div>' +
        '<label class="field">الشابتر<select id="b-ch"></select></label>' +
        '<label class="field">المصدر<select id="b-src"><option value="all">الكل</option>' + Object.keys(SOURCES).map(function (k) { return '<option value="' + k + '">' + SOURCES[k] + '</option>'; }).join('') + '</select></label>' +
        '<label class="field">الحالة<select id="b-state"><option value="all">الكل</option><option value="due">للمراجعة اليوم</option><option value="wrong">أخطأتُ فيها</option><option value="new">لم أحلّها</option></select></label></section>' +
        '<section class="hs-card stack" style="gap:12px" aria-labelledby="cover"><h2 id="cover" style="font-size:18px">تغطية الاختبارات</h2><p class="small muted" style="margin:0" id="b-cover"></p></section>' +
        '<div id="b-run-host"></div><section class="hs-card" style="padding:8px 24px" id="b-list-wrap" aria-label="الأسئلة"><p class="small muted" style="margin:12px 0 4px" id="b-count"></p><div id="b-list"></div></section>';
      var codes = ['all'].concat(cs.map(function (c) { return c.code; }));
      function filtered() {
        return all.filter(function (q) {
          if (st.course !== 'all' && q.course !== st.course) return false;
          if (st.chapter !== 'all' && q.chapter !== +st.chapter) return false;
          if (st.source !== 'all' && srcKey(q.source) !== st.source) return false;
          var a = store.answer(q.id);
          if (st.state === 'due' && !store.due(q.id)) return false;
          if (st.state === 'wrong' && !(a && a.last === 'wrong')) return false;
          if (st.state === 'new' && a) return false;
          return true;
        });
      }
      function paint() {
        $('#b-courses').innerHTML = codes.map(function (c) { return '<button type="button" data-c="' + c + '" aria-pressed="' + (c === st.course) + '">' + (c === 'all' ? 'الكل' : cname(c)) + '</button>'; }).join('');
        var course = cs.filter(function (c) { return c.code === st.course; })[0];
        $('#b-ch').innerHTML = '<option value="all">كل الشباتر</option>' + (course ? course.chapters.map(function (ch) { return '<option value="' + ch.n + '">' + ch.n + '. ' + esc(ch.title_en) + '</option>'; }).join('') : '');
        $('#b-ch').value = st.chapter; $('#b-ch').disabled = !course;
        $('#b-src').value = st.source; $('#b-state').value = st.state;
        $('#b-cover').textContent = st.course === 'all' ? 'عند اختيار مادة تظهر الشباتر التي غطّاها كل كويز وميد فيها.' : 'تُضاف تغطية الكويزات والميد في هذه المادة عند وصول أسئلتها.';
        var ch = course && course.chapters.filter(function (x) { return x.n === +st.chapter; })[0];
        var pdf = $('#b-pdf');
        if (ch && ch.files.questions) { pdf.href = chapterPath(course.code, ch.n) + encodeURIComponent(ch.files.questions); pdf.removeAttribute('aria-disabled'); pdf.style.opacity = 1; pdf.setAttribute('download', ''); }
        else { pdf.href = '#'; pdf.setAttribute('aria-disabled', 'true'); pdf.style.opacity = .55; pdf.removeAttribute('download'); pdf.title = 'اختاروا مادة وشابتر لتحميل ملف أسئلته'; }
        var list = filtered();
        $('#b-count').textContent = list.length ? countAr(list.length, 'سؤال واحد', 'سؤالان', 'أسئلة', 'سؤالًا') : 'لا توجد أسئلة بهذه الفلترة.';
        var colors = { wrong: 'var(--warning)', right: 'var(--example)' };
        $('#b-list').innerHTML = list.map(function (q) {
          var a = store.answer(q.id), stt = a ? a.last : 'new';
          return '<div class="q-list-row"><span class="code">' + cname(q.course) + '</span><div class="stem hs-en rich" dir="ltr">' + (q.q_plain_html || esc(q.q)) + '</div><span class="hs-badge hs-badge--source">' + (SOURCES[srcKey(q.source)] || '') + '</span>' +
            '<span style="font-size:13px;font-weight:600;width:84px;color:' + (colors[stt] || 'var(--ink-muted)') + '">' + (stt === 'wrong' ? 'أخطأتُ فيها' : stt === 'right' ? 'أصبتُ فيها' : 'لم أحلّها') + '</span></div>';
        }).join('');
      }
      $('#b-courses').addEventListener('click', function (e) { var b = e.target.closest('[data-c]'); if (b) { st.course = b.dataset.c; st.chapter = 'all'; paint(); } });
      $('#b-ch').onchange = function (e) { st.chapter = e.target.value; paint(); };
      $('#b-src').onchange = function (e) { st.source = e.target.value; paint(); };
      $('#b-state').onchange = function (e) { st.state = e.target.value; paint(); };
      $('#b-pdf').addEventListener('click', function (e) { if (this.getAttribute('aria-disabled')) e.preventDefault(); });
      $('#b-run').onclick = function () {
        var list = filtered(); if (!list.length) return;
        $('#b-list-wrap').hidden = true;
        questionRunner($('#b-run-host'), list, { bank: true, onDone: function () { $('#b-run-host').innerHTML = ''; $('#b-list-wrap').hidden = false; paint(); } });
        $('#b-run-host').scrollIntoView({ block: 'start' });
      };
      paint();
      if (qs('review') && filtered().length) $('#b-run').click();
    }).catch(fail(root));
  }

  // ---------- page: planner ----------
  function pagePlanner(root) {
    courses().then(function (cs) {
      var P = store.data.planner; P.hours = P.hours || 3; P.done = P.done || {};
      if (!Array.isArray(P.rest)) P.rest = { fri: [5], frisat: [5, 6] }[P.rest] || [];
      var DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      function hoursAr(h) { var w = Math.floor(h), half = h - w >= 0.5;
        if (w === 0) return 'نصف ساعة';
        var base = w === 1 ? 'ساعة' : w === 2 ? 'ساعتان' : countAr(w, '', '', 'ساعات', 'ساعة');
        return half ? base + ' ونصف' : (w === 1 ? 'ساعة واحدة' : base); }
      root.innerHTML = '<section><h1>مخطط المذاكرة</h1><p class="muted" style="margin:0">خطة يومية حتى الفاينل، تبدأ بالشباتر التي تحتاج إلى مذاكرة، وتوزّع البقية على الأيام.</p></section>' +
        '<div class="split"><aside class="hs-card side no-print" aria-labelledby="setup"><h2 id="setup" style="font-size:18px">إعداد الخطة</h2>' +
        '<div class="field"><span id="pl-hl">ساعات المذاكرة في اليوم</span><div class="stepper" role="group" aria-labelledby="pl-hl"><button type="button" id="pl-hm" aria-label="أنقص نصف ساعة">−</button><label class="step-val"><input id="pl-h" type="text" inputmode="decimal" dir="ltr" aria-labelledby="pl-hl"><span>ساعة</span></label><button type="button" id="pl-hp" aria-label="زد نصف ساعة">+</button></div><span class="small muted">من نصف ساعة إلى 12 ساعة</span></div>' +
        '<div class="field"><span id="pl-rl">أيام الراحة</span><details class="multi" id="pl-rd"><summary aria-labelledby="pl-rl" id="pl-rs"></summary><div id="pl-r" class="multi-list">' + DAYS.map(function (d, i) { return '<label><input type="checkbox" value="' + i + '">' + d + '</label>'; }).join('') + '</div></details><p id="pl-rn" class="small" style="margin:6px 0 0;color:var(--must-know)" hidden>لازم يبقى يوم واحد على الأقل للمذاكرة.</p></div>' +
        '<div class="small muted" style="background:var(--surface-sunken);border-radius:var(--radius-md);padding:12px 14px">تُوزَّع الخطة على مواعيد الفاينلات فور إعلانها، وإلى ذلك الحين تُرتَّب الشباتر حسب الأولوية: ما لم يُبدأ أولًا، ثم ما يُذاكَر، ثم مراجعة المتقَن.</div>' +
        '<button type="button" class="hs-btn hs-btn--primary" id="pl-make" style="align-self:flex-start">إنشاء الخطة</button></aside>' +
        '<section class="main stack" aria-labelledby="week"><div class="row" style="justify-content:space-between"><h2 id="week">الأيام القادمة</h2><button type="button" class="hs-btn hs-btn--secondary" id="pl-print" style="padding:8px 12px;font-size:14px">تحميل الخطة PDF</button></div><div id="pl-days" class="stack"></div></section></div><div id="pl-sheet" class="print-sheet" dir="rtl"></div>';
      function showH() { $('#pl-h').value = P.hours % 1 ? P.hours.toFixed(1) : String(P.hours); $('#pl-hm').disabled = P.hours <= 0.5; $('#pl-hp').disabled = P.hours >= 12; }
      function showR() { $('#pl-rs').textContent = P.rest.length ? P.rest.slice().sort().map(function (i) { return DAYS[i]; }).join('، ') : 'لا يوجد'; }
      showH(); showR();
      Array.prototype.slice.call(document.querySelectorAll('#pl-r input')).forEach(function (cb) { cb.checked = P.rest.indexOf(+cb.value) !== -1; });
      var KIND = { 'شرح': 'background:var(--brand-soft);color:var(--brand)', 'أسئلة': 'background:var(--must-know-soft);color:var(--must-know)', 'مراجعة': 'background:var(--example-soft);color:var(--example)' };
      function make() {
        var tasks = [], order = { 'new': 0, studying: 1, mastered: 2 }, items = [];
        cs.forEach(function (c) { c.chapters.forEach(function (ch) { items.push({ c: c.code, n: ch.n, t: ch.title_en, s: store.status(chKey(c.code, ch.n)) }); }); });
        items.sort(function (a, b) { return order[a.s] - order[b.s]; });
        items.forEach(function (it) {
          var mk = function (k) { return { c: it.c, n: it.n, t: it.t, k: k }; };
          if (it.s === 'new') tasks.push(mk('شرح'), mk('أسئلة'));
          else if (it.s === 'studying') tasks.push(mk('أسئلة'));
          else tasks.push(mk('مراجعة'));
        });
        var perDay = Math.max(1, Math.round(P.hours / 1.5)), days = [], d = today(), rest = P.rest.length >= 7 ? [] : P.rest;
        while (tasks.length) {
          var dow = new Date(d + 'T12:00:00').getDay();
          if (rest.indexOf(dow) === -1) days.push({ date: d, tasks: tasks.splice(0, perDay) });
          d = addDays(d, 1);
        }
        P.plan = days; P.done = {}; store.save(); paint();
      }
      function paint() {
        var host = $('#pl-days');
        if (!P.plan || !P.plan.length) { host.innerHTML = '<div class="hs-card empty">اختاروا الإعدادات ثم «إنشاء الخطة».</div>'; return; }
        var fmt = function (iso) { try { return new Date(iso + 'T12:00:00').toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { weekday: 'long', day: 'numeric', month: 'long' }); } catch (e) { return iso; } };
        host.innerHTML = P.plan.map(function (day, di) {
          return '<div class="hs-card" style="padding:16px 20px"><div class="row" style="justify-content:space-between;margin-bottom:8px"><p style="margin:0;font-weight:600">' + fmt(day.date) + '</p><p class="small muted" style="margin:0">' + hoursAr(P.hours) + '</p></div>' +
            day.tasks.map(function (t, ti) {
              var id = di + '-' + ti;
              return '<label style="display:flex;align-items:center;gap:12px;padding:10px 0;border-top:1px solid var(--line);cursor:pointer"><input type="checkbox" data-id="' + id + '"' + (P.done[id] ? ' checked' : '') + ' style="width:18px;height:18px;accent-color:var(--brand)">' +
                '<span style="font:600 13px/20px var(--font-arabic);color:var(--ink-muted);white-space:nowrap">' + cname(t.c) + '</span><a dir="ltr" class="hs-en" style="flex:1;text-align:right;color:var(--ink);text-decoration:none" href="chapter.html?c=' + t.c + '&ch=' + t.n + (t.k === 'أسئلة' ? '#questions' : '') + '">' + esc(t.t) + '</a>' +
                '<span style="font-size:13px;font-weight:600;padding:2px 10px;border-radius:999px;' + KIND[t.k] + '">' + t.k + '</span></label>';
            }).join('') + '</div>';
        }).join('');
        sheet(fmt);
      }
      function sheet(fmt) {
        var LOGO = '<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="20" y="6" width="34" height="42" rx="7" fill="#c9a6d8"/><rect x="14" y="11" width="34" height="42" rx="7" fill="#8a5a9c"/><rect x="8" y="16" width="36" height="44" rx="7" fill="#5b3768"/><rect x="14" y="27" width="24" height="7" rx="2.5" fill="#f2dc8a"/><rect x="14" y="39" width="24" height="4" rx="2" fill="#fbf9f4"/><rect x="14" y="48" width="16" height="4" rx="2" fill="#fbf9f4"/></svg>';
        var plan = P.plan, first = plan[0].date, last = plan[plan.length - 1].date;
        var restTxt = P.rest.length ? P.rest.slice().sort().map(function (i) { return DAYS[i]; }).join('، ') : 'لا يوجد';
        var nTasks = plan.reduce(function (a, d) { return a + d.tasks.length; }, 0);
        var EN = { 'شرح': 'Explanation', 'أسئلة': 'Questions', 'مراجعة': 'Review' }, CLS = { 'شرح': 'k-a', 'أسئلة': 'k-b', 'مراجعة': 'k-c' };
        var html = '<div class="ps-cover">' + LOGO + '<div class="t"><p class="kind">مخطط المذاكرة · خطة يومية حتى الفاينل</p><h1>Study Plan</h1></div>' +
          '<div class="meta"><b>' + plan.length + '</b>أيام المذاكرة<br>' + countAr(nTasks, 'مهمة واحدة', 'مهمتان', 'مهام', 'مهمة') + '</div></div>' +
          '<div class="ps-how"><p>من ' + fmt(first) + ' إلى ' + fmt(last) + ' · ' + hoursAr(P.hours) + ' يوميًا · أيام الراحة: ' + restTxt + '</p>' +
          '<p class="ps-legend"><span><i style="background:#5b3768"></i>شرح: اقرأ شرح الشابتر وملخصه</span><span><i style="background:#c46a1b"></i>أسئلة: حلّ أسئلة الشابتر</span><span><i style="background:#4a6626"></i>مراجعة: راجع الملخص والتعاريف</span></p></div>' +
          '<h2>الأيام</h2>';
        plan.forEach(function (day, di) {
          html += '<div class="ps-day"><div class="ps-head"><span class="num">' + (di + 1) + '</span><span class="src">' + fmt(day.date) + '</span><span class="hrs">' + hoursAr(P.hours) + '</span></div><ul class="ps-tasks">' +
            day.tasks.map(function (t, ti) {
              return '<li><span class="box' + (P.done[di + '-' + ti] ? ' on' : '') + '"></span><span class="code">' + cname(t.c) + '</span><span class="en"><b>Ch ' + t.n + '</b> · ' + esc(t.t) + '</span><span class="kind ' + CLS[t.k] + '">' + t.k + ' <i>' + EN[t.k] + '</i></span></li>';
            }).join('') + '</ul></div>';
        });
        html += '<div class="ps-notice"><p>المحتوى اجتهاد من الطلاب، والمرجع الأول هو السلايدات وشرح الدكتور/ة.</p><p>حصيلة · مخطط المذاكرة</p></div>' +
          '<style>@media print{@page{size:A4;margin:20mm 16mm 22mm;@top-right{content:"حصيلة";font:600 8.5pt "IBM Plex Sans Arabic";color:#5b3768}@top-left{content:"Study Plan";font:400 8.5pt "IBM Plex Sans";color:#566064}@bottom-center{content:"صفحة " counter(page) " من " counter(pages);font:400 8.5pt "IBM Plex Sans Arabic";color:#566064}}@page :first{@top-right{content:none}@top-left{content:none}}}</style>';
        $('#pl-sheet').innerHTML = html;
      }
      $('#pl-days').addEventListener('change', function (e) { if (e.target.dataset.id) { P.done[e.target.dataset.id] = e.target.checked; store.save(); paint(); } });
      $('#pl-hm').onclick = function () { P.hours = Math.max(0.5, P.hours - 0.5); showH(); store.save(); };
      $('#pl-hp').onclick = function () { P.hours = Math.min(12, P.hours + 0.5); showH(); store.save(); };
      $('#pl-h').onchange = function (e) { var v = parseFloat(String(e.target.value).replace('٫', '.').replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); }));
        if (!isFinite(v)) v = P.hours; P.hours = Math.min(12, Math.max(0.5, Math.round(v * 2) / 2)); showH(); store.save(); };
      $('#pl-h').onkeydown = function (e) { if (e.key === 'Enter') e.target.blur(); };
      $('#pl-h').onfocus = function (e) { e.target.select(); };
      document.addEventListener('click', function (e) { var d = $('#pl-rd'); if (d && d.open && !d.contains(e.target)) d.open = false; });
      $('#pl-r').onchange = function (e) { var sel = Array.prototype.slice.call(document.querySelectorAll('#pl-r input')).filter(function (cb) { return cb.checked; }).map(function (cb) { return +cb.value; });
        if (sel.length >= 7) { e.target.checked = false; $('#pl-rn').hidden = false; return; }
        $('#pl-rn').hidden = true; P.rest = sel; showR(); store.save(); };
      $('#pl-make').onclick = make;
      $('#pl-print').onclick = function () { window.print(); };
      paint();
    }).catch(fail(root));
  }

  // ---------- page: glossary ----------
  function pageGlossary(root) {
    courses().then(function (cs) {
      var jobs = [];
      cs.forEach(function (c) { c.chapters.forEach(function (ch) {
        if (ch.has.indexOf('glossary') !== -1) jobs.push(getJSON(chapterPath(c.code, ch.n) + 'glossary.json').then(function (d) { return d.terms.map(function (t) { return Object.assign({ course: c.code, n: ch.n }, t); }); }).catch(function () { return []; }));
      }); });
      return Promise.all(jobs).then(function (l) { return [].concat.apply([], l); });
    }).then(function (terms) {
      terms.sort(function (a, b) { return a.term.localeCompare(b.term, 'en'); });
      root.innerHTML = '<section class="row" style="justify-content:space-between;align-items:flex-end;gap:16px"><div><h1>القاموس</h1><p class="muted" style="margin:0">المصطلحات الصعبة في جميع المواد، مع ترجمتها ومعناها.</p></div>' +
        '<label class="field" style="flex:1 1 260px;max-width:360px">البحث بالإنجليزية أو بالعربية<input type="search" id="g-q" placeholder="مثال: Perceptron أو الانحياز"></label></section>' +
        '<section class="hs-card" aria-label="المصطلحات" style="padding:0;overflow:hidden"><div dir="ltr"><div class="gl-row gl-head"><span>Term</span><span style="font-family:var(--font-arabic);text-align:right">الترجمة</span><span>Meaning</span><span>Course</span></div><div id="g-list"></div></div></section>';
      var norm = function (s) { return String(s || '').toLowerCase().replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي'); };
      function paint() {
        var q = norm($('#g-q').value.trim());
        var list = terms.filter(function (t) { return !q || norm(t.term + ' ' + t.ar + ' ' + t.def_en + ' ' + (t.keywords || []).join(' ')).indexOf(q) !== -1; });
        $('#g-list').innerHTML = list.length ? list.map(function (t) {
          return '<div class="gl-row"><span class="hs-en" style="font-weight:600">' + esc(t.term) + '</span><span class="hs-ar">' + esc(t.ar) + '</span>' +
            '<span class="hs-en gl-meaning rich" style="color:var(--ink-muted);font-size:15px">' + (t.def_en_html || esc(t.def_en)) + '</span>' +
            '<a href="chapter.html?c=' + t.course + '&ch=' + t.n + '#terms" style="font:600 13px/20px var(--font-arabic);color:var(--ink-muted)">' + cname(t.course) + ' · الشابتر ' + t.n + '</a></div>';
        }).join('') : '<p class="empty">لا توجد نتائج.</p>';
      }
      $('#g-q').oninput = paint; paint();
    }).catch(fail(root));
  }

  function fail(host) {
    return function (err) {
      if (window.console) console.error(err);
      host.innerHTML = '<div class="hs-card empty">تعذّر تحميل المحتوى. تأكدوا من الاتصال بالإنترنت ثم حدّثوا الصفحة.</div>';
    };
  }

  // ---------- boot ----------
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
  function pageNotFound(root) {
    root.innerHTML = '<div class="hs-card stack" style="gap:12px;align-items:flex-start"><h1>الصفحة غير موجودة</h1><p class="muted" style="margin:0">ربما تغيّر الرابط أو حُذفت الصفحة.</p><a class="hs-btn hs-btn--primary" href="index.html">العودة إلى اليوم</a></div>';
  }
  var page = document.body.getAttribute('data-page');
  var active = { today: 'today', course: 'courses', chapter: 'courses', bank: 'bank', planner: 'planner', glossary: 'glossary' }[page];
  shell(active);
  var root = document.getElementById('app');
  ({ notfound: pageNotFound, today: pageToday, course: pageCourse, chapter: pageChapter, bank: pageBank, planner: pagePlanner, glossary: pageGlossary }[page] || pageToday)(root);
})();
