# Features & Functionalities — Dar Ibn al-Jawzi Library (ibnaljawzi.com)

> Saudi Islamic book publisher & distributor (مكتبة دار ابن الجوزي للنشر والتوزيع).
> Built on the **Salla** e-commerce platform.
> Sells the Dar's own publications plus books in Arabic (ships across the Arab world, free shipping promos).
> Primary language: Arabic. Currency: SAR.

## 1. Store platform & branding

- Salla-hosted store (mobile-app style storefront with its own mobile app).
- Clean book-focus: publisher identity "مكتبة دار ابن الجوزي للنشر والتوزيع".
- Display **tax number** (الرقم الضريبي) in the footer.
- Currency selector (SAR); language toggle.

## 2. Top area

- **Announcement slider** with rotating promo banners (limited-time offers, free-shipping-for-a-city promos, etc.).
- Header: mobile menu, store logo, language button, search, user/login menu, cart link with item count.
- Category quick-nav grouped as a menu (تخفيضات، صدر حديثًا، أحدث إصدارات، إصدارات الدار، مصاحف ومستلزمات القراءة، اختياراتنا من المعارض الدولية للكتاب).
- Hero banner + CTA "تفاصيل المنشورات هنا".

## 3. Homepage blocks

- Hall-of-sections: **تصنيفات شائعة** (popular categories grid).
- **أحدث إصدارتنا / أحدث إصداراتنا** — latest publications carousels.
- **الكتب الأكثر مبيعًا** — best sellers grid with sales-driving titles.
- **الكتب المترجمة** — translated books section (translations of Quran meanings & Islamic works into Swahili, English, Malayalam, Bengali, Indonesian; kids learning books; English classics).
- **كتب مخفضة** — discounted books carousel.
- **مميزات المتجر** — store features strip: 24/7 customer service, high quality & attention to detail, strong customer trust.
- **آراء العملاء** — customer testimonials slider with names + feedback (trust marketing).

## 4. Category / listing pages

- Category title (h1) + SEO description.
- **Sorting dropdown**: مقترحاتنا (our suggestions), الأكثر مبيعًا (best-selling), الأعلى تقييمًا (top-rated), الأعلى سعرًا (price high→low), الأقل سعرًا (price low→high).
- Product grid with pagination / "load more".
- Product cards include:
  - Cover image
  - Quick-view button
  - Wishlist / "Add to wishlist" toggle
  - "Add to cart" (أضف للسلة) button directly on the card
  - Inline product spec hint (e.g., "مجلد * 367 صفحة ورق شمواه")
  - Link text for variant/format when multiple exists
  - Badges: **جديد** (new), **صدر حديثًا** (just released), **discount**
  - Price (in SAR), incl. promo/discounted price styling
  - Rating stars

## 5. Product detail page

- Breadcrumb + brand/marka line with "المؤلف" (sometimes publisher as brand) link.
- Image gallery / lightbox.
- Title Arabic, rating summary "(32 تقييم)", description snippet.
- Stock status indicators: **متوفر** (available) / **نفدت الكمية** (out of stock).
- Price block with two lines (original + discounted).
- **رقم الموديل** (model/ISBN), **تصنيف المنتج** (hashtag product tags/categories for SEO).
- **التوفر في الفروع** — branch/warehouse availability selector.
- Variant/format selector when a book comes in multiple bindings/sizes.
- Actions:
  - **أضف للسلة** (add to cart)
  - **اشتري الآن** (buy now → instant checkout)
  - **أرسلها كهدية** / إهداء — **gift option** ("gift to a friend" with ordering flow)
- Tabs: **التفاصيل** (details) and **التقييمات** (ratings & reviews).
- Details tab includes:
  - Full editorial description
  - **بيانات الطبعة** (edition data): المؤلف، المحقق، الناشر، الطبعة، عدد المجلدات، عدد الصفحات، الورق، التجليد، المقاس، ISBN.
  - **Frequently Asked Questions (أسئلة شائعة)** rendered inline as Q&A accordion.
- Related products blocks (e.g., "إصدارات دار ابن الجوزي" — other works of the same author/publisher).

## 6. Ratings & reviews (built-in)

- **التقييم العام** (overall rating summary): % الذين أوصوا بالمنتج (recommendation %).
- Count of ratings & questions (سؤال).
- Sort by: الأحدث (newest) / الأقدم (oldest) / **عمليات شراء موثقة** (verified purchases only).
- Review cards with:
  - Reviewer name, date, rating stars
  - **"شراء موثّق"** (verified purchase) badge
  - **"ترجمة جميع التعليقات إلى العربية"** / show-original-text toggle (machine translation of reviews)
- Users can ask questions (Q&A) on products.

## 7. Customer service & contact (strong social/IM presence)

- Floating **WhatsApp chat widget** (GetButton.io) with custom message.
- Customer service block in footer:
  - WhatsApp, iPhone (2 phone links), email, **Telegram** (t.me/eljawzi)
- Social links: Instagram, Twitter/X, Facebook.
- Info pages ("روابط تهمك"): About Dar Ibn al-Jawzi, Privacy Policy, Returns & Exchange Policy.
- Salla-era page links (`/p/…`) for back-office/static content.
- "ما الذي تبحث عنه؟" search utility in mobile wrapper.

## 8. Store features & trust marketing

- Store features claim strip (customer service, quality, trust).
- Customer testimonials with names.
- Limited-time offers & per-brand/publisher promotions.
- Free-shipping city campaigns (promo banners).
- VAT/tax registration number displayed (trust + B2B credibility).

## 9. Technical notes (as observed)

- Platform: **Salla** (Salla App storefront), with WhatsApp/getbutton widgets and WebMCP hooks.
- Announcement slider markup duplicated for desktop/mobile (rotator).
- SEO: per-page title/description meta (e.g., "متجر اون لاين - مكتبة دار ابن الجوزي…"), schema.org Organization + WebPage JSON-LD.
- Currency: SAR; RTL Arabic layout; CDN-hosted assets.