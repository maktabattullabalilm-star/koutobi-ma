import BookCover from './BookCover';
import { useEffect, useState } from 'react';

export default function PackCover({ pack, alt, className = '', eager = false, fetchPriority }) {
  const books = pack.books || [];
  const total = books.length;
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (total < 2) return undefined;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % total), 1000);
    return () => window.clearInterval(timer);
  }, [total]);

  if (!books.length) {
    return <BookCover src={pack.cover_image} alt={alt} className={className} eager={eager} fetchPriority={fetchPriority} imgClassName="h-full w-full object-cover" />;
  }

  return (
    <div className={`relative h-full w-full overflow-hidden bg-[#f6f3ed] ${className}`} aria-label={alt}>
      {books.map((item, index) => {
        const slot = (index - active + total) % total;
        const layout = total === 1
          ? 'start-1/2 top-[6%] z-20 -translate-x-1/2 rotate-0 opacity-100'
          : total === 2
            ? slot === 0
              ? 'start-[-12%] top-[9%] z-10 -rotate-[8deg] opacity-100'
              : 'end-[-12%] top-[9%] z-20 rotate-[8deg] opacity-100'
            : slot === 0
              ? 'start-[-21%] top-[12%] z-10 -rotate-[11deg] opacity-100'
              : slot === 1
                ? 'start-1/2 top-[6%] z-20 -translate-x-1/2 rotate-0 opacity-100'
                : slot === 2
                  ? 'end-[-21%] top-[12%] z-10 rotate-[11deg] opacity-100'
                  : 'start-1/2 top-[10%] -translate-x-1/2 scale-75 opacity-0';
        return <div key={item.book_id || index} className={`absolute aspect-[17/24] h-[86%] overflow-hidden rounded-sm border border-black/15 bg-white shadow-[0_5px_14px_rgba(0,0,0,.24)] transition-[inset,transform,opacity] duration-500 ease-in-out motion-reduce:transition-none ${layout}`}>
          <BookCover src={item.books?.cover_image} alt="" eager={eager && index === 0} fetchPriority={index === 0 ? fetchPriority : undefined} className="h-full w-full" imgClassName="h-full w-full object-contain" />
        </div>;
      })}
      {total > 3 && <span className="absolute bottom-[7%] start-[7%] z-30 grid size-8 place-items-center rounded-full bg-ink text-xs font-bold text-white shadow-md" dir="ltr">+{total - 3}</span>}
    </div>
  );
}
