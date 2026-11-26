# المرحلة الأولى — لوحة المتابعة اللحظية لمشاركات المستفيدين

مشروع لوحة تشغيلية واحدة باللغة العربية يعمل على **ASP.NET MVC 5 / .NET Framework 4.8 / Microsoft SQL Server**. راجع [مطابقة متطلبات الأعمال](docs/requirements-traceability.md) و[نتائج المراجعة الأمنية](docs/security-review.md) قبل التشغيل.

## ملفات المصدر الرئيسية

| الملف | الوظيفة |
|---|---|
| `BeneficiaryDashboards.sln` | الحل البرمجي للفتح في Visual Studio 2022 على Windows |
| `BeneficiaryDashboards/Views/Dashboard/Index.cshtml` | تصميم الصفحة RTL والفلاتر والرسوم والجدول |
| `BeneficiaryDashboards/Content/dashboard.css` | هوية التركوازي والكحلي والخلفيات والبطاقات والاستجابة للأجهزة |
| `BeneficiaryDashboards/Scripts/dashboard.js` | استدعاء البيانات وعرض المخططات دون مكتبات JavaScript خارجية |
| `BeneficiaryDashboards/Controllers/DashboardController.cs` | ثلاث نقاط وصول: الصفحة، الخيارات، بيانات اللوحة |
| `BeneficiaryDashboards/Services/DashboardRepository.cs` | ADO.NET، تجميع المؤشرات، تحديث الحالة، ومنطق الحسابات |
| `BeneficiaryDashboards/App_Data/Queries/TicketRows.sql` | الاستعلام الفعلي الذي يجلب صفوف التذاكر للفترة وفق الفلاتر |
| `BeneficiaryDashboards/App_Data/Queries/Options.sql` | جلب أحدث شهر والقنوات والمناطق والخدمات مباشرة من الجداول |
| `Verification/schema_fixture.sql` | تعريف مصغّر للحقول اللازمة للفحص الثابت |
| `Verification/verify_schema.py` | تحقق ثابت لأسماء الجداول والحقول والملفات وعدم استخدام بيانات شخصية |
| `Verification/SSMS_ReadOnly_HealthCheck.sql` | فحص قراءة فقط داخل SSMS، بدون DDL/DML |

## تشغيل المشروع

1. استخدام **Windows + Visual Studio 2022** مع حزمة **ASP.NET and web development** و **.NET Framework 4.8 Developer Pack** و IIS Express/IIS.
2. استنسخ المستودع وافتح `BeneficiaryDashboards.sln`.
3. استعادة حزم NuGet المدرجة في `packages.config` (MVC 5.3.0 وRazor/WebPages 3.3.0 ومكون Web.Infrastructure). لم تُرفق مجلدات الحزم أو ملفات DLL؛ يستعيدها Visual Studio من NuGet.
4. اضبط `YOUR_SQL_SERVER` و`YOUR_TICKET_DATABASE` في نسخة الإعداد المخصصة لبيئة التشغيل. التزم بالمصادقة المتكاملة وبشهادة موثوقة لـ SQL Server عبر `Encrypt=True;TrustServerCertificate=False`.
5. فعّل Windows Authentication وعطّل Anonymous Authentication في IIS/IIS Express. استبدل `YOUR_DOMAIN\BeneficiaryDashboardReaders` في نسخة التشغيل بمجموعة Windows المعتمدة. فوض هوية تطبيق IIS للقراءة بأقل صلاحية على الحقول المطلوبة، واستخدم HTTPS. تحفظ إعدادات البيئة الفعلية خارج سجل Git.
6. تشغيل الحل وفتح `/Dashboard/Index`. ستظهر الفترة الافتراضية من **أحدث شهر يحتوي بيانات Ticket فعلية**، وليس من أرقام أو تواريخ مفترضة.
7. من الصفحة: تغيير الشهر/القناة/المنطقة/الخدمة ثم «تطبيق». التحديث التلقائي كل 60 ثانية طالما الصفحة ظاهرة، ويمكن الضغط على «تحديث البيانات الآن».

### نقاط الوصول

- `GET /Dashboard/Index` — واجهة المستخدم، تتطلب Windows Authentication.
- `GET /Dashboard/Options` — أحدث شهر والقنوات والمناطق والخدمات المسجلة.
- `GET /Dashboard/Snapshot?month=YYYY-MM&channelId=&regionId=&serviceId=` — بيانات الصفحة الفعلية في JSON. `month` إلزامي، بينما المرشحات الأخرى اختيارية ومعرّفاتها تستمد من قاعدة البيانات؛ لا توجد أرقام IDs ثابتة في المصدر.

## الجداول والحقول المستعملة حرفيًا

- `dbo.Ticket`: `ID`, `CreateDate`, `ClosedDate`, `ExpectDate`, `RatingValue`, `ChannelID`, `ActionStatusID`, `LevelID`, `RegionID`, `ServiceID`, `FlagDel`.
- `dbo.Ticket_Channel`: `ID`, `Name`.
- `dbo.Ticket_Status`: `ID`, `Name`.
- `dbo.Ticket_Level`: `ID`, `Name`.
- `dbo.Region`: `ID`, `Name`.
- `dbo.Sup_GroupService`: `ID`, `ServiceName`.

تعمل `LEFT JOIN` على جداول التوصيف باستخدام مفاتيحها في مخطط المصدر. تُحتفظ بالتذكرة عند غياب وصف للقناة أو الحالة أو المنطقة أو النوع، ويظهر الوصف البديل في الواجهة. تعرض اللوحة رقم التذكرة والحقول التشغيلية المبينة أعلاه.

### سياسة الفترة

- سياق الصفحة هو **شهر ميلادي واحد**، والشرط: `CreateDate >= @StartDate AND CreateDate < @EndDate`؛ الحد العلوي هو بداية الشهر التالي.
- يُستبعد من المقاييس فقط `Ticket.FlagDel <> 0` أو `NULL`، لأن الاستعلام يشترط `FlagDel = 0` كما هو مخزن؛ يجب التحقق من سياسة `FlagDel` مع مالك البيانات إذا كانت حقول NULL تمثل مشاركات صالحة.
- القنوات والحالات والأنواع كلها مسميات من الجداول الأصلية؛ لا نربط ID بأي نوع أو اسم غير موثق.
- `Ticket.CreateDate` في المصدر نوعه `datetime` بلا منطقة زمنية؛ **لا يُحوَّل توقيته ضمن التطبيق** حتى لا يُفترض نظام توقيت لم يرد في المخطط.

## تعريف كل مؤشر ومعادلته

| المؤشر | الحقل والمعادلة |
|---|---|
| إجمالي المشاركات | عدد الصفوف المميزة في نتيجة `dbo.Ticket` للشهر مع `FlagDel=0` والفلاتر؛ المفتاح `Ticket.ID` PK يضمن عدم التكرار، والاستعلام لا يضم جداول One-to-Many |
| عدد كل قناة | `COUNT(Ticket.ID)` حسب `Ticket.ChannelID` مع الاسم من `Ticket_Channel.Name` |
| نسبة الإغلاق | `100 × COUNT(ClosedDate IS NOT NULL) / COUNT(Ticket.ID)`؛ لا يفترض أن رقم الحالة «مغلق» |
| الالتزام بـ SLA | `100 × COUNT(ClosedDate <= ExpectDate) / COUNT(ClosedDate IS NOT NULL AND ExpectDate IS NOT NULL AND ClosedDate >= CreateDate AND ExpectDate >= CreateDate)`؛ التذاكر المغلقة غير المؤهلة مستبعدة ومذكورة في `SlaExcluded`، والنسبة غير متاحة إن كان المقام صفرًا |
| متوسط التقييم | مجموع قيم `Ticket.RatingValue` غير الفارغة ÷ عددها؛ **لا يُفترض مقياس 5** لعدم وجود قيد نطاق في DDL |
| المشاركات اليومية | عدد التذاكر حسب `DAY(CreateDate)` ضمن الشهر؛ الأيام الخالية تعرض صفرًا محسوبًا، لا بيانات مختلقة |
| المتوسط اليومي | إجمالي الشهر ÷ عدد أيام الشهر الميلادي، بما فيها الأيام الصفرية |
| أعلى/أدنى يوم | أكبر/أصغر عدد يومي خلال الشهر؛ في حالة التعادل يُختار اليوم الأصغر رقمًا؛ إن كان الشهر بلا مشاركات يظهر «—» |
| حالات المشاركات | `COUNT(Ticket.ID)` مجمَّع حسب `Ticket.ActionStatusID` مع الاسم المباشر من `Ticket_Status.Name`، دون فرض مجموعات «جديد/تحت المعالجة/مغلق» |
| آخر المشاركات | أول 10 صفوف بترتيب `CreateDate DESC, ID DESC`، مع رقم التذكرة ووقت إنشائها والقناة والنوع والمنطقة والحالة فقط |

**لم يتم استخدام الحد الثابت 10 أيام بدل `ExpectDate`**؛ لأن `ExpectDate` موجود أصلًا في المصدر. إذا لم يوجد موعد لبعض المغلقة فلا تدخل في نسبة الالتزام المعروضة. لا تُحتسب هذه الحالات ملتزمة ولا مخالفة بطريقة مفترضة.

## التحقق من الاتساق

**الميزة الأساسية:** صفحة البداية تستدعي `TicketRows.sql` مرة واحدة في كل تحديث؛ يجمع C# القنوات والحالات والأيام والمقاييس على **مجموعة الصفوف نفسها**. وبالتالي، دون أخطاء برمجية، يجب أن تتحقق المعادلات التالية دائمًا:

- `Total = SUM(Channels[].Count)`
- `Total = SUM(Statuses[].Count)`
- `Total = SUM(Daily[].Count)`
- `Closed + (Total - Closed) = Total`
- `SlaMet <= SlaEligible <= Closed`
- `RatingsCount <= Total`

يمكن اختبار أسماء الجداول/الحقول دون SQL Server بتنفيذ `python Verification/verify_schema.py`. ثم اختبار الاتصال الفعلي وحسابات SQL على **قاعدة مصرح بالاطلاع عليها** عبر `Verification/SSMS_ReadOnly_HealthCheck.sql` ومعاينة JSON في المتصفح.

## حدود ما تم التحقق منه

- يتحقق الفحص الثابت من أعمدة الاستعلام وترتيبها، وسلامة XML، ووجود ملفات المشروع، واستخدام SQL للقراءة فقط.
- يضبط GitHub Actions عملية بناء Windows. تتطلب المصادقة الفعلية، واتصال SQL Server، واختبارات القبول بيئة IIS وبيانات اختبار مصرحًا بها.
- اسم `Ticket_Level` مستخدم في `V_Ticket` من مخطط المصدر لتسمية `LevelName`، واستُخدم في تفاصيل آخر المشاركات باسم «النوع»، لكن **دلالة القيم الموجودة فعليًا** تتحقق من نتيجة `SELECT ID,Name FROM dbo.Ticket_Level`.

## اختبارات قبول المرحلة الأولى

1. استعادة NuGet، ثم نجاح بناء الحل في `Debug` و`Release`.
2. نجاح استدعاء `/Dashboard/Options` تحت حساب المستخدم المصرّح له، وظهور آخر شهر فعلي.
3. نجاح استدعاء `/Dashboard/Snapshot` لنفس الشهر، وتطابق المجموع الكلي مع الاستعلام المباشر في SQL Server.
4. تغيير كل فلتر على حدة والتأكد من تطابق إجمالي القنوات والحالات والأيام مع إجمالي التذاكر.
5. التأكد من أن نسبة الإغلاق ناتجة عن `ClosedDate`، وSLA ناتجة عن `ExpectDate`، ومن ظهور «—» إذا انعدم مقام النسبة.
6. التأكد من عدم ظهور أسماء أو هويات أو جوالات المستفيدين في HTML أو JSON أو سجل التطبيق.
7. اختبار مستخدم غير مصرح له وعدم وصوله إلى JSON (Windows Authentication).
8. فتح الصفحة على شاشة كبيرة وهاتف، والتأكد من سلامة RTL والفلاتر والجداول.

**خطة التراجع:** نشر مشروع مستقل وقاعدة البيانات للقراءة فقط؛ عند الرغبة في الإيقاف يكفي إيقاف موقع IIS الخاص باللوحة دون أي تغييرات في مخطط القاعدة أو بياناتها.
