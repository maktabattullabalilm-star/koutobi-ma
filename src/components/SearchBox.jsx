import { useRef } from 'react';
import { IconClose, IconSearch } from './icons';

/** Shared search input used by the header and the catalogue page. */
export default function SearchBox({
  value,
  onChange,
  placeholder = 'ابحث عن كتاب، مؤلف، تصنيف…',
  ariaLabel = 'البحث في المكتبة',
  className = '',
  inputClassName = '',
}) {
  const inputRef = useRef(null);

  const clear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div
      className={`flex items-center gap-2 rounded-md bg-gray-50 px-3 ring-1 ring-inset ring-line focus-within:ring-brand ${className}`}
    >
      <IconSearch className="shrink-0 text-soft" width={18} height={18} />
      <input
        ref={inputRef}
        dir="rtl"
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={`w-full bg-transparent py-2.5 text-sm text-ink outline-hidden placeholder:text-gray-500 ${inputClassName}`}
      />
      {value ? (
        <button
          type="button"
          onClick={clear}
          aria-label="مسح البحث"
          className="shrink-0 rounded-full p-1 text-soft transition hover:bg-gray-200 hover:text-ink"
        >
          <IconClose width={14} height={14} />
        </button>
      ) : null}
    </div>
  );
}
