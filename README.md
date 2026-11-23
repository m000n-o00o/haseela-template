# حصيلة

حصيلة قالبٌ لموقع مذاكرة تفاعلي يستعد به الطلاب للاختبارات النهائية، وتبنيه الدفعة لنفسها. ويضم كل فصل في الموقع:
- ترجمة كل شريحة بجانب صورتها الأصلية.
- ملخصًا في صفحتين.
- شرحًا مفصلًا.
- عرضًا تفاعليًا.
- قاموسًا للمصطلحات.
- أسئلة اختيار من متعدد تُراجَع بالتكرار المتباعد.

والموقع ثابت، مبني بلغات HTML وCSS وJavaScript فقط، ويُنشر على GitHub Pages دون أي خطوة بناء. ويتضمن أيضًا بنكًا للأسئلة، ومخططًا للمذاكرة، ووضعًا داكنًا، ويعمل دون اتصال بالإنترنت في الصفحات التي فُتحت من قبل.

ويحتوي القالب على مادة تجريبية واحدة (`DEMO`) كُتب محتواها خصيصًا له، لتوضيح شكل الموقع ولتكون نموذجًا يُنسخ منه.

## البدء

1. **نسخ المستودع:** من زر **Use this template** في GitHub، أو بتنزيله ملفًا مضغوطًا. وإذا كان موقعكم سيتضمن شرائح مقرراتكم أو أسئلة اختباراتها، فاجعلوا مستودعه **خاصًا (Private)**، لأن هذا المحتوى ملك أصحابه.
2. **المواد:** عدّلوا الملف `data/courses.json`، ولكل مادة فيه: `code` رمز قصير، و`name` اسمها بالإنجليزية، و`name_ar` اسمها بالعربية. واحذفوا مادة `DEMO` ومجلداتها عند إضافة موادكم.
3. **الفريق:** عدّلوا الملف `data/team.json`، ففيه `owner` صاحب فكرة الموقع، و`members` أعضاء الفريق، وتظهر أسماؤهم أسفل كل صفحة.
4. **الفصول:** أضيفوا المهارة `skills/haseela-chapter.zip` إلى حساباتكم في Claude، وافتحوا محادثة لكل مجموعة من الفصول وأرفقوا شرائحها. والتفاصيل في `docs/CONTRIBUTING.md`.
5. **النشر:** افتحوا إعدادات المستودع في GitHub، ثم صفحة Pages، واختاروا الفرع `main` والمجلد الرئيسي (root).

## الأدوات

لتشغيل أدوات البناء على أجهزتكم:

```
cd tools
npm install
npx playwright install chromium
pip install pyyaml Pillow playwright
```

وتحتاجون أيضًا إلى poppler-utils، وإلى LibreOffice إذا كانت الشرائح بصيغة pptx. ولاستخدام متصفح Chrome المثبّت على أجهزتكم، ضعوا مساره في المتغير `CHROME`.

ويمكن تجربة الأدوات على المادة التجريبية:

```
python3 tools/prep_slides.py DEMO 1 examples/demo-slides.pdf
COURSE=DEMO node tools/build.js 1
python3 tools/check.py DEMO
python3 tools/site_content.py DEMO
```

## هيكل الملفات

| المسار | المحتوى |
|---|---|
| `index.html` | صفحة «اليوم» |
| `course.html` | قائمة المواد، وصفحة كل مادة (`?c=DEMO`) |
| `chapter.html` | صفحة الفصل (`?c=DEMO&ch=1`) وتبويباتها |
| `bank.html` | بنك الأسئلة |
| `planner.html` | مخطط المذاكرة |
| `glossary.html` | القاموس |
| `assets/` | التصميم (`tokens.css` و`components.css` و`site.css`)، والمنطق البرمجي (`app.js`)، ومكتبة KaTeX |
| `data/` | المواد (`courses.json`) والفريق (`team.json`) |
| `content/<المادة>/` | ما يعرضه الموقع: فهرس الفصول `chapters.json`، ومجلد `chNN/` لكل فصل |
| `work/<المادة>/` | الملفات المكتوبة التي تُبنى منها الفصول |
| `tools/` | أدوات التجهيز والبناء والفحص |
| `docs/` | القواعد (`RULES.md`)، وطريقة العمل (`CONTRIBUTING.md`)، وقوالب ملفات PDF (`approved-templates.md`) |
| `skills/` | مهارة haseela-chapter الخاصة بـ Claude |
| `examples/` | شرائح المادة التجريبية |

## الإعدادات

- **زر الإبلاغ عن خطأ:** يُخفى إذا كان المتغير `REPORT_FORM` فارغًا في أعلى الملف `assets/app.js`. ولتفعيله أنشئوا نموذج Google، وضعوا رابطه ورقم كل حقل (entry) من خيار «الرابط المعبأ مسبقًا». ويعبّئ الزر تلقائيًا المادة والفصل والقسم ورقم الشريحة ورابط الصفحة.
- **التقدم:** يُحفظ في متصفح كل مستخدم (localStorage) ولا يُرسل إلى أي جهة، ويستطيع المستخدم نقله بين أجهزته من زر «حفظ التقدم».
- **العمل دون اتصال:** يحفظ الملف `sw.js` الصفحات التي فُتحت. وعند استبدال صورة أو ملف PDF بالاسم نفسه، ارفعوا قيمة `VERSION` في `sw.js`.

## التحديثات

تُنشر كل نسخة جديدة في صفحة [Releases](https://github.com/m000n-o00o/haseela-template/releases)، وتُوثَّق تغييراتها في `CHANGELOG.md`. ولتحديث موقعكم، انسخوا من النسخة الجديدة المجلدات `assets/` و`tools/` و`docs/` و`skills/`، وأبقوا مجلداتكم `data/` و`content/` و`work/` كما هي.

## الرخصة

حصيلة مجانية، وستبقى مجانية. ورخصتها [PolyForm Noncommercial 1.0.0](LICENSE)، وهي تتيح استخدامها وتعديلها ومشاركتها لأي غرض غير تجاري، كالدراسة والتعليم، وتمنع **بيعها واستخدامها تجاريًا**. ويجب أن يرافق أي نسخة تُشارَك الملفُ `LICENSE` والسطرُ `Required Notice` الوارد فيه.

ويُقدَّم القالب كما هو، دون أي ضمان. أما محتوى المواد الذي تضيفونه، من شرائح وأسئلة اختبارات، فأنتم مسؤولون عنه، وحقوقه محفوظة لأصحابه.

---

## English

Haseela is a template for an interactive, bilingual (English/Arabic) final-exam study site that a student batch builds for itself. Each chapter page shows slide-by-slide translation, a 2-page summary, a detailed explanation, an interactive visual, a glossary and MCQs with spaced repetition. It's a static site for GitHub Pages, with Node/Python tools to prepare, build and check chapters, and a Claude skill (`skills/haseela-chapter.zip`) that runs the workflow. A demo course (`DEMO`) with original sample content is included.

Licensed under [PolyForm Noncommercial 1.0.0](LICENSE): free for any noncommercial use. Selling it, or using it commercially, isn't allowed. Keep your course slides and exam material in a private repo unless their authors allow publishing them.

Copyright (c) 2026 Sarah Al-Ghamdi
