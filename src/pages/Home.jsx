import { Link } from 'react-router-dom';
import { useBooks, useCategories } from '../hooks/useCatalog';
import { useHead } from '../hooks/useHead';
import BookCover from '../components/BookCover';
import { generalInquiryLink } from '../lib/whatsapp';
import { useSiteContact } from '../hooks/useSiteContact';
import { useStorefrontContent } from '../hooks/useStorefrontContent';
import { CONTENT_DEFAULTS } from '../lib/storefrontContent';
import { isSoldOut } from '../lib/format';
import ProductCard from '../components/ProductCard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  IconBook,
  IconCart,
  IconCash,
  IconHeadset,
  IconHeart,
  IconShield,
  IconStar,
  IconTruck,
  IconWhatsApp,
} from '../components/icons';

const CATEGORY_STYLE = {
  'العقيدة والتوحيد': 'bg-emerald-100 text-emerald-700',
  'التفسير وعلوم القرآن': 'bg-teal-100 text-teal-700',
  'الفقه وأصوله': 'bg-indigo-100 text-indigo-700',
  'الحديث وعلومه': 'bg-amber-100 text-amber-700',
  'الرقائق والأخلاق': 'bg-rose-100 text-rose-700',
  'الأذكار والأدعية': 'bg-sky-100 text-sky-700',
};
const CATEGORY_ICON = {
  'العقيدة والتوحيد': IconShield,
  'التفسير وعلوم القرآن': IconBook,
  'الفقه وأصوله': IconCash,
  'الحديث وعلومه': IconStar,
  'الرقائق والأخلاق': IconHeart,
  'الأذكار والأدعية': IconHeadset,
};

export default function Home() {
  useHead({ path: '/' });
  const { whatsapp } = useSiteContact();
  const savedContent = useStorefrontContent();
  const section = (key) => savedContent?.[key] || { content: CONTENT_DEFAULTS[key], visible: true };
  const hero = section('home_hero');
  const categoriesCopy = section('home_categories');
  const newestCopy = section('home_newest');
  const featuredCopy = section('home_featured');
  const how = section('home_how');
  const features = section('home_features');
  const testimonials = section('home_testimonials');
  const cta = section('home_cta');
  const { books, error: booksError } = useBooks();
  const { categories: rawCategories, error: catsError } = useCategories();
  const categories = rawCategories.length ? rawCategories : [];
  const error = booksError || catsError;

  const featured = books.filter((b) => b.is_featured).slice(0, 8);
  const newest = [...books].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 4);

  return (
    <div>
      {/* ================= HERO ================= */}
      {hero.visible && <section className="bg-linear-to-bl from-brand-dark via-brand to-brand-dark text-white">
        <div className="container-x grid gap-8 py-12 sm:py-16 lg:grid-cols-2 lg:items-center">
          <div>
            <span dir="auto" className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
              {hero.content.badge}
            </span>
            <h1 dir="auto" className="mt-4 text-3xl font-bold leading-tight sm:text-4xl lg:text-[42px]">
              {hero.content.title.split('\n').map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}
            </h1>
            <p dir="auto" className="mt-4 max-w-xl text-sm leading-7 text-white/85 sm:text-base">
              {hero.content.description}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="bg-amber-400 px-6 py-3 text-sm font-bold text-brand-dark shadow-sm hover:bg-amber-300"
              >
                <Link to="/catalog">
                  {hero.content.shop_label} <span aria-hidden>←</span>
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/30 bg-transparent px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 hover:text-white"
              >
                <Link to="/#how">{hero.content.how_label}</Link>
              </Button>
            </div>

            <div className="mt-8 flex gap-6 text-center">
              {hero.content.stats.map((s) => (
                <div key={s.value} className="border-e border-white/20 pe-6 last:border-0 last:pe-0">
                  <div className="text-xl font-bold text-amber-300"><bdi dir="ltr">{s.value}</bdi></div>
                  <div dir="auto" className="mt-0.5 text-xs text-white/75">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* hero books collage (desktop only — lazy covers never fetch on mobile) */}
          <div className="hidden lg:grid grid-cols-3 gap-4">
            {books.slice(0, 3).map((b, ix) => (
              <Link
                key={b.id}
                to={`/book/${b.id}`}
                className={`overflow-hidden rounded-card shadow-xl ring-1 ring-white/20 transition hover:-translate-y-1 ${b.is_out_of_stock ? 'opacity-95' : ''}`}
              >
                <BookCover
                  src={b.cover_image}
                  alt={b.title_ar}
                  eager={ix === 0}
                  fetchPriority={ix === 0 ? 'high' : undefined}
                  className="w-full"
                  imgClassName="h-full w-full object-cover"
                  soldOut={isSoldOut(b)}
                />
              </Link>
            ))}
          </div>
        </div>
      </section>}

      {error && (
        <div className="container-x mt-4 rounded-md bg-rose-50 px-4 py-2 text-sm text-danger">{error}</div>
      )}

      {/* ================= CATEGORIES ================= */}
      {categoriesCopy.visible && <section className="container-x py-12">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 dir="auto" className="section-title mb-1!">{categoriesCopy.content.title}</h2>
            <p dir="auto" className="text-sm text-soft">{categoriesCopy.content.description}</p>
          </div>
          <Link
            to="/catalog"
            className="hidden text-sm font-semibold text-brand hover:text-brand-dark sm:block"
          >
            {categoriesCopy.content.link_label}
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map((c) => {
            const Icon = CATEGORY_ICON[c.name] || IconBook;
            const style = CATEGORY_STYLE[c.name] || 'bg-brand-pale text-brand';
            return (
              <Link key={c.name} to={`/catalog?category=${encodeURIComponent(c.name)}`} className="group">
                <Card className="flex flex-col items-center gap-3 border-line/60 p-5 text-center transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lift">
                  <span className={`flex h-12 w-12 items-center justify-center rounded-full ${style}`}>
                    <Icon width={24} height={24} />
                  </span>
                  <bdi dir="auto" className="text-sm font-semibold text-ink group-hover:text-brand">{c.name}</bdi>
                  <span className="text-xs text-soft"><bdi dir="ltr" className="tabular-nums">{c.count}</bdi> كتب</span>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>}

      {/* ================= NEW RELEASES ================= */}
      {newestCopy.visible && <section className="bg-brand-pale py-12">
        <div className="container-x">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 dir="auto" className="section-title mb-1!">{newestCopy.content.title}</h2>
              <p dir="auto" className="text-sm text-soft">{newestCopy.content.description}</p>
            </div>
            <Link to="/catalog" className="text-sm font-semibold text-brand hover:text-brand-dark">
              {newestCopy.content.link_label}
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {newest.map((b) => (
              <ProductCard key={b.id} book={b} />
            ))}
          </div>
        </div>
      </section>}

      {/* ================= FEATURED ================= */}
      {featuredCopy.visible && <section className="container-x py-12">
        <div className="mb-6 flex items-end justify-between">
          <div>
              <h2 dir="auto" className="section-title mb-1!">{featuredCopy.content.title}</h2>
              <p dir="auto" className="text-sm text-soft">{featuredCopy.content.description}</p>
          </div>
          <Link to="/catalog" className="text-sm font-semibold text-brand hover:text-brand-dark">
              {featuredCopy.content.link_label}
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {featured.map((b) => (
            <ProductCard key={b.id} book={b} />
          ))}
        </div>
      </section>}

      {/* ================= HOW IT WORKS ================= */}
      {how.visible && <section id="how" className="container-x scroll-mt-24 pb-4">
        <div className="rounded-2xl border border-line/70 bg-white p-8 shadow-card sm:p-10">
          <div className="text-center">
            <h2 dir="auto" className="text-2xl font-bold text-ink sm:text-3xl">{how.content.title}</h2>
            <p dir="auto" className="mx-auto mt-2 max-w-lg text-sm text-soft">
              {how.content.description}
            </p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {how.content.items.map((s, i) => {
              const StepIcon = [IconCart, IconHeadset, IconTruck][i % 3];
              return <Card key={`${s.title}-${i}`} className="relative border-line p-6 text-center">
                {i < 2 && (
                  <span className="absolute -end-3 top-1/2 hidden -translate-y-1/2 text-2xl text-line sm:block">
                    ←
                  </span>
                )}
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-light text-brand">
                  <StepIcon width={24} height={24} />
                </span>
                <span className="mt-3 block text-xs font-bold text-brand">الخطوة {i + 1}</span>
                <h3 dir="auto" className="mt-1 text-lg font-bold text-ink">{s.title}</h3>
                <p dir="auto" className="mt-1.5 text-sm leading-6 text-soft">{s.description}</p>
              </Card>
            })}
          </div>
        </div>
      </section>}

      {/* ================= FEATURES ================= */}
      {features.visible && <section className="container-x py-12">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {features.content.items.map((f, index) => {
            const FeatureIcon = [IconCash, IconTruck, IconHeart, IconHeadset][index % 4];
            return <Card key={`${f.title}-${index}`} className="flex-row items-center gap-3 border-line/60 p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-light text-brand">
                <FeatureIcon width={24} height={24} />
              </span>
              <div>
                <div dir="auto" className="text-sm font-bold text-ink">{f.title}</div>
                <div dir="auto" className="text-xs text-soft">{f.description}</div>
              </div>
            </Card>
          })}
        </div>
      </section>}

      {/* ================= TESTIMONIALS ================= */}
      {testimonials.visible && <section className="bg-brand-pale py-12">
        <div className="container-x">
          <h2 className="section-title text-center">{testimonials.content.title}</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {testimonials.content.items.map((t) => (
              <Card key={t.name} className="border-line/60 p-5">
                <div className="flex gap-0.5 text-amber-400" aria-label="5 من 5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <IconStar key={i} filled width={15} height={15} />
                  ))}
                </div>
                <blockquote dir="auto" className="mt-3 flex-1 text-sm leading-7 text-ink">«{t.text}»</blockquote>
                <figcaption className="mt-4 border-t border-line pt-3 text-sm">
                   <span dir="auto" className="font-bold text-brand">{t.name}</span>
                   <span dir="auto" className="ms-2 text-xs text-soft">— طلب: {t.book}</span>
                </figcaption>
              </Card>
            ))}
          </div>
        </div>
      </section>}

      {/* ================= BOTTOM CTA ================= */}
      {cta.visible && <section className="container-x py-14">
        <div className="rounded-2xl bg-linear-to-bl from-brand-dark to-brand p-8 text-center text-white sm:p-12">
          <h2 dir="auto" className="text-2xl font-bold sm:text-3xl">{cta.content.title}</h2>
          <p dir="auto" className="mx-auto mt-2 max-w-md text-sm text-white/85">
            {cta.content.description}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="bg-amber-400 px-6 py-3 text-sm font-bold text-brand-dark hover:bg-amber-300"
            >
              <Link to="/catalog">{cta.content.shop_label}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/30 bg-transparent px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 hover:text-white"
            >
              <a href={generalInquiryLink('book', whatsapp)} target="_blank" rel="noreferrer noopener">
                <IconWhatsApp /> {cta.content.whatsapp_label}
              </a>
            </Button>
          </div>
          <p className="mt-5 text-xs text-white/70">{cta.content.note}</p>
        </div>
      </section>}
    </div>
  );
}
