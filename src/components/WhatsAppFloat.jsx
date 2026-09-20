import { whatsappLink } from '../lib/config';
import { IconWhatsApp } from './icons';

export default function WhatsAppFloat() {
  return (
    <a
      href={whatsappLink('السلام عليكم، لديّ سؤال حول متجر كُتُبِي 🌱')}
      target="_blank"
      rel="noreferrer"
      aria-label="تواصل عبر واتساب"
      className="fixed bottom-5 left-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lift transition hover:scale-105"
    >
      <IconWhatsApp width={28} height={28} />
      <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-[#25D366]/40" />
    </a>
  );
}