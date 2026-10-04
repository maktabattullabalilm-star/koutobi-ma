import BookCover from './BookCover';

export default function PackCover({ pack, alt, className = '', eager = false, fetchPriority }) {
  const books = (pack.books || []).slice(0, 3);
  const total = pack.books?.length || 0;
  const width = books.length === 2 ? 'w-[30%]' : 'w-[21%]';

  if (!books.length) {
    return <BookCover src={pack.cover_image} alt={alt} className={className} eager={eager} fetchPriority={fetchPriority} imgClassName="h-full w-full object-cover" />;
  }

  return (
    <div className={`relative flex h-full w-full items-end justify-center gap-[4%] overflow-hidden bg-[#f1ece2] px-[10%] pb-[12%] pt-[8%] ${className}`} aria-label={alt}>
      <div className="absolute inset-x-0 bottom-[10%] h-[4%] bg-[#5b4030] shadow-[0_3px_0_rgba(44,28,18,.25)]" />
      {books.map((item, index) => (
        <div key={item.book_id || index} className={`z-10 h-[78%] ${width} overflow-hidden rounded-sm border border-black/15 bg-white shadow-[2px_4px_8px_rgba(47,40,30,.22)]`}>
          <BookCover src={item.books?.cover_image} alt="" eager={eager && index === 0} fetchPriority={index === 0 ? fetchPriority : undefined} className="h-full w-full" imgClassName="h-full w-full object-cover" />
        </div>
      ))}
      {total > 3 && <span className="z-20 -ms-[8%] grid size-[20%] max-w-10 place-items-center rounded-full border-2 border-white bg-[#293c35] text-xs font-bold text-white shadow-md" dir="ltr">+{total - 3}</span>}
      <span className="absolute start-[6%] top-[10%] text-[10px] font-bold tracking-[.16em] text-[#5b4030]">مجموعة كتب</span>
    </div>
  );
}
