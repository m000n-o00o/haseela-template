# حصيلة

قالب لموقع مذاكرة تفاعلي للفاينل، تبنيه الدفعة لنفسها. لكل شابتر في الموقع:
- ترجمة كل سلايد بجانب صورته.
- ملخص في صفحتين.
- شرح مفصل.
- عرض تفاعلي.
- قاموس مصطلحات.
- أسئلة اختيار من متعدد مع تكرار متباعد.

والموقع ثابت (HTML وCSS وJavaScript فقط)، ويُنشر على GitHub Pages بدون أي خطوة بناء. وفيه بعد بنك أسئلة، ومخطط مذاكرة، ووضع داكن، ويشتغل بدون نت للصفحات اللي انفتحت قبل.

القالب فيه مادة تجريبية واحدة (`DEMO`) محتواها مكتوب خصيصًا له، عشان تشوفون شكل الموقع وتنسخون منها.

## البداية

1. **انسخوا الريبو:** من زر **Use this template** في GitHub، أو حمّلوه zip. وإذا بتضيفون سلايدات مقرراتكم أو أسئلة اختباراتها، خلّوا ريبو موقعكم **خاص (Private)**: هذا المحتوى ملك أصحابه.
2. **المواد:** عدّلوا `data/courses.json`. لكل مادة: `code` رمز قصير، و`name` الاسم بالإنجليزي، و`name_ar` الاسم بالعربي. واحذفوا مادة `DEMO` ومجلداتها لما تضيفون موادكم.
3. **الفريق:** عدّلوا `data/team.json`. `owner` صاحب أو صاحبة الفكرة، و`members` الفريق. ويظهرون أسفل كل صفحة.
4. **الشباتر:** أضيفوا مهارة `skills/haseela-chapter.zip` لحسابكم في Claude، وافتحوا محادثة لكل دفعة شباتر وأرفقوا السلايدات. التفاصيل في `docs/CONTRIBUTING.md`.
5. **النشر:** من إعدادات الريبو في GitHub، افتحوا Pages واختاروا الفرع `main` والمجلد الرئيسي (root).

## الأدوات

للبناء على جهازكم:

```
cd tools
npm install
npx playwright install chromium
pip install pyyaml Pillow playwright
```

وتحتاجون بعد poppler-utils، وLibreOffice إذا سلايداتكم pptx. وإذا تبون تستخدمون متصفح Chrome الموجود عندكم، حطوا مساره في المتغير `CHROME`.

جرّبوا الأدوات على المادة التجريبية:

```
python3 tools/prep_slides.py DEMO 1 examples/demo-slides.pdf
COURSE=DEMO node tools/build.js 1
python3 tools/check.py DEMO
python3 tools/site_content.py DEMO
```

## هيكل الملفات

| المسار | المحتوى |
|---|---|
| `index.html` | اليوم |
| `course.html` | المواد، وصفحة كل مادة (`?c=DEMO`) |
| `chapter.html` | صفحة الشابتر (`?c=DEMO&ch=1`) وتبويباتها |
| `bank.html` | بنك الأسئلة |
| `planner.html` | مخطط المذاكرة |
| `glossary.html` | القاموس |
| `assets/` | التصميم (`tokens.css` و`components.css` و`site.css`)، والمنطق (`app.js`)، وKaTeX |
| `data/` | المواد (`courses.json`) والفريق (`team.json`) |
| `content/<المادة>/` | ما يعرضه الموقع: فهرس الشباتر `chapters.json`، ومجلد `chNN/` لكل شابتر |
| `work/<المادة>/` | ملفات الكتابة اللي تُبنى منها الشباتر |
| `tools/` | أدوات التجهيز والبناء والفحص |
| `docs/` | القواعد (`RULES.md`)، وطريقة العمل (`CONTRIBUTING.md`)، وقوالب ملفات PDF (`approved-templates.md`) |
| `skills/` | مهارة haseela-chapter لـ Claude |
| `examples/` | سلايدات المادة التجريبية |

## الإعدادات

- **زر الإبلاغ عن خطأ:** مخفي إذا كان `REPORT_FORM` فاضي أعلى `assets/app.js`. ولتفعيله سووا نموذج Google، وحطوا رابطه ورقم كل حقل (entry) من «الرابط المعبأ مسبقًا». والزر يعبّي المادة والشابتر والقسم ورقم السلايد ورابط الصفحة تلقائيًا.
- **التقدم:** يُحفظ في متصفح كل مستخدم (localStorage) ولا يُرسل لأي مكان، وينقله المستخدم بين أجهزته من زر «حفظ التقدم».
- **الشغل بدون نت:** `sw.js` يحفظ الصفحات اللي انفتحت. وإذا استبدلتوا صورة أو ملف PDF بنفس الاسم، ارفعوا `VERSION` في `sw.js`.

## التحديثات

كل إصدار جديد ينزل في [Releases](https://github.com/m000n-o00o/haseela-template/releases)، وتفاصيل التغييرات في `CHANGELOG.md`. ولتحديث موقعكم، انسخوا من الإصدار الجديد مجلدات `assets/` و`tools/` و`docs/` و`skills/`، وخلوا `data/` و`content/` و`work/` حقتكم زي ما هي.

## الرخصة

حصيلة مجانية، وتبقى مجانية. الرخصة [PolyForm Noncommercial 1.0.0](LICENSE): تقدرون تستخدمونها وتعدّلونها وتشاركونها لأي غرض غير تجاري، مثل الدراسة والتعليم. أما **البيع والاستخدام التجاري فممنوعان**. وأي نسخة تشاركونها لازم يكون معها ملف `LICENSE` وسطر `Required Notice` اللي فيه.

والقالب يُقدَّم كما هو، بدون أي ضمان. ومحتوى المواد اللي تضيفونه، من سلايدات وأسئلة اختبارات، مسؤوليتكم، وحقوقه لأصحابه.

---

## English

Haseela is a template for an interactive, bilingual (English/Arabic) final-exam study site that a student batch builds for itself. Each chapter page shows slide-by-slide translation, a 2-page summary, a detailed explanation, an interactive visual, a glossary and MCQs with spaced repetition. It's a static site for GitHub Pages, with Node/Python tools to prepare, build and check chapters, and a Claude skill (`skills/haseela-chapter.zip`) that runs the workflow. A demo course (`DEMO`) with original sample content is included.

Licensed under [PolyForm Noncommercial 1.0.0](LICENSE): free for any noncommercial use. Selling it, or using it commercially, isn't allowed. Keep your course slides and exam material in a private repo unless their authors allow publishing them.

Copyright (c) 2026 Sarah Al-Ghamdi
