import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import BookCover from './BookCover';
import HashLink from './HashLink';
import { isSoldOut } from '../lib/format';
import { heroTheme, resolveHeroBooks, visibleHeroSlides } from '../lib/hero';
import { IconChevronLeft, IconChevronRight } from './icons';
import { Button } from '@/components/ui/button';

const AUTOPLAY_MS = 7000;
const SWIPE_THRESHOLD = 40;

function HeroBooks({ books }) {
  if (!books.length) return null;
  const count = books.length;
  const gridClass =
    count === 1
      ? 'mx-auto grid w-full max-w-[220px] grid-cols-1 gap-4'
      : count === 2
        ? 'mx-auto grid w-full max-w-[430px] grid-cols-2 gap-4'
        : count === 3
          ? 'grid w-full grid-cols-3 gap-3 sm:gap-4'
          : 'mx-auto grid w-full max-w-[470px] grid-cols-3 gap-2.5 sm:gap-3';

  return (
    <div className={gridClass}>
      {books.map((book, index) => (
        <Link
          key={book.id}
          to={`/book/${book.id}`}
          aria-label={book.title_ar}
          className="group overflow-hidden rounded-card shadow-xl ring-1 ring-black/10 transition hover:-translate-y-1"
        >
          <BookCover
            src={book.cover_image}
            alt={book.title_ar}
            eager={index === 0}
            fetchPriority={index === 0 ? 'high' : undefined}
            className="w-full"
            imgClassName="h-full w-full object-cover"
            soldOut={isSoldOut(book)}
          />
        </Link>
      ))}
    </div>
  );
}

export default function HeroCarousel({ slides = [], books = [] }) {
  const activeSlides = useMemo(() => visibleHeroSlides(slides), [slides]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStart = useRef(null);

  useEffect(() => {
    setIndex((current) => Math.min(current, Math.max(0, activeSlides.length - 1)));
  }, [activeSlides.length]);

  useEffect(() => {
    if (activeSlides.length < 2 || paused) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return undefined;
    const timer = window.setInterval(() => {
      if (!document.hidden) setIndex((current) => (current + 1) % activeSlides.length);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [activeSlides.length, paused]);

  if (!activeSlides.length) return null;

  const currentIndex = Math.min(index, activeSlides.length - 1);
  const slide = activeSlides[currentIndex];
  const theme = heroTheme(slide);
  const slideBooks = resolveHeroBooks(slide, books);
  const go = (direction) =>
    setIndex((current) => (current + direction + activeSlides.length) % activeSlides.length);

  const onTouchStart = (event) => {
    touchStart.current = event.touches?.[0]?.clientX ?? null;
  };
  const onTouchEnd = (event) => {
    if (touchStart.current == null) return;
    const end = event.changedTouches?.[0]?.clientX ?? touchStart.current;
    const delta = end - touchStart.current;
    touchStart.current = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD) return;
    // RTL: swiping left advances to the next slide.
    go(delta < 0 ? 1 : -1);
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label="عروض الصفحة الرئيسية"
      className={`relative overflow-hidden ${activeSlides.length > 1 ? 'pb-16' : ''}`}
      style={{ backgroundColor: theme.background, color: theme.text }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div
        key={slide.id}
        className="container-x grid gap-8 py-12 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 sm:py-16 lg:grid-cols-2 lg:items-center"
      >
        <div>
          {slide.badge && (
            <span
              dir="auto"
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium"
              style={{ backgroundColor: theme.badgeBg, color: theme.text }}
            >
              {slide.badge}
            </span>
          )}
          {slide.title && (
            <h1 dir="auto" className="mt-4 text-3xl font-bold leading-tight sm:text-4xl lg:text-[42px]">
              {slide.title.split('\n').map((line, lineIndex) => (
                <span key={`${line}-${lineIndex}`}>
                  {lineIndex > 0 && <br />}
                  {line}
                </span>
              ))}
            </h1>
          )}
          {slide.description && (
            <p
              dir="auto"
              className="mt-4 max-w-xl whitespace-pre-line text-sm leading-7 sm:text-base"
              style={{ color: theme.muted }}
            >
              {slide.description}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            {slide.shop_label && (
              <Button
                asChild
                size="lg"
                className="px-6 py-3 text-sm font-bold shadow-sm hover:brightness-105"
                style={{ backgroundColor: theme.button, color: theme.buttonText }}
              >
                <Link to="/catalog">
                  {slide.shop_label} <span aria-hidden>←</span>
                </Link>
              </Button>
            )}
            {slide.how_label && (
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border bg-transparent px-6 py-3 text-sm font-semibold hover:bg-transparent hover:brightness-105"
                style={{ borderColor: theme.border, color: theme.text }}
              >
                <HashLink to="/#how">{slide.how_label}</HashLink>
              </Button>
            )}
          </div>

          {slide.stats.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-6 text-center">
              {slide.stats.map((stat, statIndex) => (
                <div
                  key={`${stat.value}-${statIndex}`}
                  className="border-e pe-6 last:border-0 last:pe-0"
                  style={{ borderColor: theme.border }}
                >
                  <div className="text-xl font-bold" style={{ color: theme.accent }}>
                    <bdi dir="ltr">{stat.value}</bdi>
                  </div>
                  <div dir="auto" className="mt-0.5 text-xs" style={{ color: theme.muted }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <HeroBooks books={slideBooks} />
      </div>

      {activeSlides.length > 1 && (
        <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="الشريحة السابقة"
            className="grid size-9 place-items-center rounded-full border transition hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ borderColor: theme.border, backgroundColor: theme.badgeBg, color: theme.text }}
          >
            <IconChevronRight width={18} height={18} />
          </button>
          <div className="flex items-center gap-1.5" role="tablist" aria-label="شرائح الواجهة">
            {activeSlides.map((item, dotIndex) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={dotIndex === currentIndex}
                aria-label={`الشريحة ${dotIndex + 1}: ${item.title || item.badge}`}
                onClick={() => setIndex(dotIndex)}
                className={`h-2.5 rounded-full transition-all ${dotIndex === currentIndex ? 'w-6' : 'w-2.5'}`}
                style={{
                  backgroundColor: dotIndex === currentIndex ? theme.accent : theme.border,
                }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="الشريحة التالية"
            className="grid size-9 place-items-center rounded-full border transition hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ borderColor: theme.border, backgroundColor: theme.badgeBg, color: theme.text }}
          >
            <IconChevronLeft width={18} height={18} />
          </button>
        </div>
      )}

      {activeSlides.length > 1 && (
        <p className="sr-only" aria-live="polite">
          الشريحة {currentIndex + 1} من {activeSlides.length}: {slide.title || slide.badge}
        </p>
      )}
    </section>
  );
}
