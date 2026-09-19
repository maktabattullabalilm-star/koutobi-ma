# Overview & "Best of Both Worlds" Blueprint

Goal: build a new Islamic-book e-commerce site (koutobi-ma) that combines the strongest features of
**SifatuSafwa** (sifatusafwa.com) and **Dar Ibn al-Jawzi** (ibnaljawzi.com).

| | SifatuSafwa | Dar Ibn al-Jawzi |
|---|---|---|
| Focus | Sell Arabic Islamic books worldwide (reseller) | Publish & distribute own editions (publisher) |
| Platform | PrestaShop | Salla |
| Languages | EN / FR / AR | AR (primary) |
| Currencies | EUR / GBP / USD | SAR |
| Strong suits | Deep faceted search, edition variants, international shipping/country targeting, GDPR-grade cookie consent, Trustpilot trust signals | Direct add-to-cart, quick buy, gift ordering, rich reviews/verified purchases, WhatsApp-first customer service, publisher brand trust, Salla app storefront |

## 1. Must-have features (from SifatuSafwa)

1. **Faceted filters on listing pages** — filter by category-topic AND book-characteristics (harakat percentage, edition type, print quality, academic research), each with product counts. This is the most differentiated feature.
2. **Edition / variant selector on product page** — one book, multiple editions with per-edition price, description, and spec table (author, volumes, format, cover, harakat, tahqiq, publisher, print quality).
3. **Rich SKU / data-sheet block** per product (reference code, ISBN, specs) — boosts trust and SEO.
4. **Multi-language + multi-currency** out of the box.
5. **Author hub** — clickable author links with author pages, authors sorted chronologically by century (educational navigation).
6. **"Quick view"** on product cards + wishlist with header counter + cart drawer.
7. **Newsletter capture** with GDPR-compliant cookie consent banner (granular categories).
8. **Trust signals** — store stats (years, books sold, countries, rating), Trustpilot/social badges, reviews.
9. **Cross-sell blocks** — "You might also like" and "Frequently purchased together".
10. **Curated curricurriculum collections** — themed study hubs (matn + explanation bundles per classical text) plus a clear **Deals/Clearance** and **Gift card** category.
11. **Complete policy pages** — shipping info, returns & refunds, FAQ, about, terms, sitemap.

## 2. Must-have features (from Dar Ibn al-Jawzi)

1. **Direct purchase UX** — "Add to cart" on every product card, plus **Buy Now** and **Send as a Gift** options on the product page.
2. **Stock status** shown on the product page (available / out of stock) and **branch/warehouse availability selector**.
3. **Built-in ratings & reviews** with:
   - overall summary + "% recommend",
   - sort by newest / oldest / **verified purchases only**,
   - "verified purchase" badges,
   - reviews translation + "show original text" toggle.
4. **Q&A (questions) on products**, plus inline **FAQ accordion** in the description tab.
5. **Publication/edition data sheet** (author, muhaqqiq, publisher, edition number + date, volumes, pages, paper, binding, size, ISBN).
6. **WhatsApp-first customer service** — floating WhatsApp widget, WhatsApp/Telegram/phone/email contact block in footer.
7. **Publisher/brand trust** — tax number displayed, "إصدارات الدار" (own-publisher catalog section), brand page per publisher.
8. **Homepage merchandising blocks** — latest releases, best sellers, translated books, discounted books, store-features strip, customer testimonials.
9. **Announcement slider** for rotating promos/free-shipping campaigns.
10. **SEO/structured data** — per-page title/description, schema.org JSON-LD (Organization, WebPage, Product).

## 3. Recommended final stack (best of both)

- **Frontend**: fast modern e-commerce (e.g., Next.js/Shopify/Medusa/Vue storefront) with RTL + LTR, i18n (AR, EN, FR), multi-currency.
- **Backend**: headless commerce or a solid platform (PrestaShop/Shopify/Medusa) that allows:
  - product variants per book edition,
  - facet filters on category pages,
  - built-in reviews/ratings with verified-purchase badges,
  - gift ordering, buy-now, and branch inventory.
- **Extras**: WhatsApp widget, newsletter/GDPR cookie manager, Trustpilot-style reviews, image-heavy CDN, SEO + schema.org product markup.

## 4. Feature priority matrix for the new site

| Priority | Feature | Source |
|---|---|---|
| P0 | Edition/variant selector with per-edition price & specs | SifatuSafwa |
| P0 | Faceted category filters with counts | SifatuSafwa |
| P0 | Add-to-cart on cards + wishlist + quick view | Both |
| P0 | Buy Now + Send as a Gift | Ibn al-Jawzi |
| P0 | Stock status + branch availability | Ibn al-Jawzi |
| P0 | Reviews & ratings with verified purchase filter | Ibn al-Jawzi |
| P1 | Multi-language / multi-currency | SifatuSafwa |
| P1 | Author hub + author pages (chronological) | SifatuSafwa |
| P1 | Rich product data sheet + ISBN/SKU | Both |
| P1 | WhatsApp-first support & contact | Ibn al-Jawzi |
| P1 | Publication data (publisher catalog section) | Ibn al-Jawzi |
| P1 | Cross-sell blocks (also like / bought together) | SifatuSafwa |
| P1 | GDPA cookie consent + newsletter | SifatuSafwa |
| P1 | Deals/Clearance + Gift cards + Curated study collections | Both |
| P2 | Trust stats, testimonials, Trustpilot/social | Both |
| P2 | Announcement/promo slider | Ibn al-Jawzi |
| P2 | Q&A per product + product FAQ accordion | Ibn al-Jawzi |
| P2 | Shipping/returns/FAQ/policies pages | SifatuSafwa |
| P2 | SEO + schema.org structured data | Ibn al-Jawzi |

## 5. Suggested information architecture (merged categories)

- Home
- New Releases (new products / new editions / gift cards)
- Authors (A–Z + by century)
- Catalog by subject:
  - Quran & Tafsir
  - Aqeedah (with matn & explanations hubs)
  - Fiqh (4 madhhabs, matn, usool)
  - Hadeeth
  - Reminders & Spirituality
  - History & Biography (Sirah)
  - Muslim Family / Women & Children
  - Student's Corner / Arabic language (Nahw, Sarf, Mutoon)
  - Reading Corner (general literature)
- Publisher / Dar catalog (e.g., "Dar Ibn al-Jawzi editions")
- Translated books
- Stationery
- Deals / Clearance
- Gift cards

## 6. Sources & date of capture

- Captured live by browser automation on: 2026-09-11.
- sifatusafwa.com — homepage, Fiqh category, product page (Majmu' al-Fataawa).
- ibnaljawzi.com — homepage, Offers page, "إصدارات الدار" category, product page (الداء والدواء).