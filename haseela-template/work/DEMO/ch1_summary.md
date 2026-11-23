# Chapter 1 — Descriptive Statistics: Center and Spread
## الإحصاء الوصفي: مقاييس النزعة المركزية والتشتت

### Measures of Center | مقاييس النزعة المركزية

[def] **Mean:** the ==sum of the values divided by their count==. It uses every value in the data.
ع: المتوسط الحسابي مجموع القيم مقسومًا على عددها، ويدخل في حسابه كل القيم.

[def] **Median:** the ==middle value after sorting==; with an even count, the ==average of the two middle values==.
ع: الوسيط القيمة التي في المنتصف بعد الترتيب، وإذا كان العدد زوجيًا نأخذ متوسط القيمتين اللتين في المنتصف.

[def] **Mode:** the value that ==appears most often==. A dataset can have ==no mode or more than one==.
ع: المنوال القيمة الأكثر تكرارًا، وقد لا يوجد، وقد يوجد أكثر من منوال واحد.

[warn] Sort the data ==before== taking the median. The middle of the unsorted list is not the median.
ع: خطأ شائع: أخذ القيمة الوسطى قبل الترتيب.

### Worked Example | مثال محلول

| Measure | Data 4, 7, 7, 9, 13 |
|---|---|
| Mean <ar>المتوسط</ar> | 40 / 5 = ==8== <ar>8</ar> |
| Median <ar>الوسيط</ar> | 3rd of 5 sorted values = ==7== <ar>7</ar> |
| Mode <ar>المنوال</ar> | 7 appears twice = ==7== <ar>7</ar> |
| Range <ar>المدى</ar> | 13 − 4 = ==9== <ar>9</ar> |
ع: هذه الأرقام كلها محسوبة من البيانات نفسها في السلايد 3، والمدى من السلايد 5.

### Outliers | القيم الشاذة

[must] Changing 13 to 53 moves the ==mean from 8 to 16==, while the ==median stays 7==. The median is ==robust== to outliers.
ع: قيمة شاذة واحدة ضاعفت المتوسط، والوسيط لم يتغير. لذلك يُفضَّل الوسيط مع البيانات الملتوية.

[ex] Salaries in a small company: one very high salary raises the mean, so the ==median== describes a typical employee better.
ع: مثال إضافي: راتب مرتفع جدًا واحد يرفع المتوسط، والوسيط يصف الموظف المعتاد بدقة أكبر.

### Measures of Spread | مقاييس التشتت

[def] **Range** = ==max − min==. It depends only on the two extreme values.
ع: المدى الفرق بين أكبر قيمة وأصغر قيمة، ويتأثر بالقيم الطرفية فقط.

[def] **Variance:** the ==average squared distance from the mean==. Squared deviations here: 16, 1, 1, 1, 25 (sum ==44==).
ع: التباين متوسط مربعات الانحرافات عن المتوسط، ومجموع المربعات هنا 44.

[must] **Population** variance divides by ==n== (44 / 5 = 8.8); **sample** variance divides by ==n − 1== (44 / 4 = 11).
ع: الفرق بين التباينين في المقام فقط: n للمجتمع، وn − 1 للعينة.

[def] **Standard deviation** = ==√variance==: 2.97 (population) and 3.32 (sample), in the ==data's own units==.
ع: الانحراف المعياري جذر التباين، ووحدته وحدة البيانات نفسها، فيسهل تفسيره أكثر من التباين.

[warn] Variance is in ==squared units==. If the data is in cm, the variance is in cm².
ع: خطأ شائع: كتابة وحدة التباين بوحدة البيانات نفسها.

### Key Points | النقاط الرئيسية

[must] Center: ==mean, median, mode==. Spread: ==range, variance, standard deviation==.
ع: ثلاثة مقاييس للمركز، وثلاثة للتشتت.

[must] One outlier can pull the ==mean== far away; the ==median== resists it.
ع: المتوسط حساس للقيم الشاذة، والوسيط متين أمامها.

[*] Always ==look at the data==, not only at one summary number.
ع: الرقم الواحد يلخص البيانات لكنه قد يخفي شكلها.
