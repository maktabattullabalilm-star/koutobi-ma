import { generalInquiryLink } from '../lib/whatsapp';
import { useSiteContact } from '../hooks/useSiteContact';
import { IconWhatsApp } from './icons';

export default function WhatsAppFloat() {
  const { whatsapp } = useSiteContact();
  return (
    <a
      href={generalInquiryLink('question', whatsapp)}
      target="_blank"
      rel="noreferrer noopener"
      aria-label="تواصل عبر واتساب"
      className="fixed bottom-5 end-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lift transition hover:scale-105"
    >
      <IconWhatsApp width={28} height={28} />
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 animate-ping rounded-full bg-[#25D366]/40 motion-reduce:animate-none"
      />
    </a>
  );
}
