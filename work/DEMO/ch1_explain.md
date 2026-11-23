# Chapter 1 — Descriptive Statistics: Center and Spread
## الإحصاء الوصفي: مقاييس النزعة المركزية والتشتت

### Why Summarize Data? | لماذا نلخص البيانات؟

[def] Descriptive statistics describe a dataset with a ==few numbers==: where the values are centered, and how far they spread.
ع: لو عندك درجات 200 طالب، فقراءة الأرقام واحدًا واحدًا لا تعطيك صورة واضحة. أما رقم للمركز ورقم للتشتت فيعطيانك الصورة بسرعة.

### Measures of Center | مقاييس النزعة المركزية

[must] **Mean:** add all values and divide by their count. For 4, 7, 7, 9, 13: (4 + 7 + 7 + 9 + 13) / 5 = 40 / 5 = ==8==.
ع: المتوسط يستخدم كل القيم، وهذه ميزته وعيبه في الوقت نفسه: كل قيمة تؤثر فيه، حتى القيمة الشاذة.

[must] **Median:** sort first, then take the middle. The values are already sorted, and the 3rd of 5 is ==7==. For an even count, such as 4, 7, 9, 13, the median is (7 + 9) / 2 = 8.
ع: الوسيط لا يهتم بحجم القيم الطرفية، بل بترتيبها فقط. ولهذا لا يتغير إذا كبرت أكبر قيمة.

[def] **Mode:** the most frequent value. Here 7 appears twice, so the mode is ==7==.
ع: المنوال مفيد أيضًا مع البيانات غير الرقمية، مثل اللون الأكثر اختيارًا في استبيان.

### Outliers | القيم الشاذة

[must] Replace 13 with 53. The sum becomes 80, so the mean becomes 80 / 5 = ==16==. The sorted middle value is still ==7==.
ع: جرّب هذا بنفسك في العرض التفاعلي: حرّك القيمة الأخيرة وراقب المتوسط والوسيط.

[ex] House prices, salaries and waiting times are often ==skewed==, so reports usually give the median.
ع: مثال إضافي: لهذا تذكر تقارير أسعار المنازل غالبًا «الوسيط» بدل المتوسط.

### Measures of Spread | مقاييس التشتت

[def] **Range:** 13 − 4 = ==9==. Quick to compute, but one extreme value changes it completely.
ع: مع القيمة 53 يصبح المدى 49، أي أن قيمة واحدة غيّرته بالكامل.

[must] **Variance step by step:** deviations from the mean 8 are −4, −1, −1, 1, 5. Their squares are 16, 1, 1, 1, 25, and the sum is ==44==. Population: 44 / 5 = ==8.8==. Sample: 44 / 4 = ==11==.
ع: نربّع الانحرافات حتى لا تلغي الموجبة السالبة. فمجموع الانحرافات بدون تربيع يساوي صفرًا دائمًا.

[def] **Standard deviation:** √8.8 ≈ ==2.97== (population) and √11 ≈ ==3.32== (sample).
ع: الانحراف المعياري يرجع بنا إلى وحدة البيانات الأصلية، فنقول: القيم تبعد عن المتوسط نحو 3 وحدات في المعتاد.

[warn] Use ==n − 1== when the data is a sample from a larger population.
ع: القسمة على n − 1 تعوّض أن العينة تميل إلى إظهار تشتت أقل من تشتت المجتمع الحقيقي.
