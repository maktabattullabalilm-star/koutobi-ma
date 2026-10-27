import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { getCategories } from '../lib/api';
import { buildCategoryTree } from '../lib/catalog';
import { getVisibleStorePages } from '../lib/storePages';
import { useSiteContact } from '../hooks/useSiteContact';
import { useStorefrontContent } from '../hooks/useStorefrontContent';
import { generalInquiryLink } from '../lib/whatsapp';
import HashLink from './HashLink';
import { mailtoHref, verifyEmail } from '../lib/email';
import { openCookiePreferences } from '../lib/cookies';
import { APP_VERSION } from '../lib/version';
import { IconWhatsApp, IconPhone, IconMail, IconTelegram } from './icons';
import StoreBrand from './StoreBrand';
import { Button } from '@/components/ui/button';

function SocialIcon({ network }) {
  const name = network.trim().toLowerCase();
  const common = { viewBox: '0 0 24 24', width: 17, height: 17, fill: 'currentColor', 'aria-hidden': true };
  if (name === 'facebook')
    return (
      <svg {...common}>
        <path d="M13.5 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.5 1.6-1.5H16.8V3.9c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1V10H7.7v3h2.7v8h3.1Z" />
      </svg>
    );
  if (name === 'instagram')
    return (
      <svg {...common}>
        <path d="M7.4 2h9.2A5.4 5.4 0 0 1 22 7.4v9.2a5.4 5.4 0 0 1-5.4 5.4H7.4A5.4 5.4 0 0 1 2 16.6V7.4A5.4 5.4 0 0 1 7.4 2Zm-.2 2A3.2 3.2 0 0 0 4 7.2v9.6A3.2 3.2 0 0 0 7.2 20h9.6a3.2 3.2 0 0 0 3.2-3.2V7.2A3.2 3.2 0 0 0 16.8 4H7.2Zm9.9 1.5a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6ZM12 6.8a5.2 5.2 0 1 1 0 10.4 5.2 5.2 0 0 1 0-10.4Zm0 2a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4Z" />
      </svg>
    );
  if (name === 'tiktok')
    return (
      <svg {...common}>
        <path d="M16.7 3c.3 2.2 1.6 3.5 3.8 3.7v3.1c-1.4 0-2.7-.4-3.8-1.1v6.8a5.8 5.8 0 1 1-5-5.8v3.1a2.7 2.7 0 1 0 1.9 2.6V3h3.1Z" />
      </svg>
    );
  if (name === 'x' || name === 'twitter')
    return (
      <svg {...common}>
        <path d="M18.9 2H22l-6.8 7.8L23 22h-6.1l-4.8-6.3L6.6 22H3.5l7.3-8.4L3.3 2h6.2l4.3 5.7L18.9 2Zm-1.1 18h1.7L8.6 3.9H6.8L17.8 20Z" />
      </svg>
    );
  if (name === 'youtube')
    return (
      <svg {...common}>
        <path d="M22.5 6.2a3 3 0 0 0-2.1-2.1C18.5 3.6 12 3.6 12 3.6s-6.5 0-8.4.5a3 3 0 0 0-2.1 2.1C1 8.1 1 12 1 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 8.4.5 8.4.5s6.5 0 8.4-.5a3 3 0 0 0 2.1-2.1C23 15.9 23 12 23 12s0-3.9-.5-5.8ZM9.9 15.6V8.4l6.3 3.6-6.3 3.6Z" />
      </svg>
    );
  if (name === 'telegram') return <IconTelegram width={17} height={17} />;
  return <span className="text-[10px] font-bold uppercase">{network.slice(0, 2)}</span>;
}

function socialHoverColor(network) {
  const name = network.trim().toLowerCase();
  if (name === 'facebook') return '#1877F2';
  if (name === 'instagram') return '#C13584';
  if (name === 'tiktok') return '#111111';
  if (name === 'x' || name === 'twitter') return '#000000';
  if (name === 'youtube') return '#FF0000';
  if (name === 'telegram') return '#229ED9';
  return 'var(--color-brand)';
}

function FooterCategoryList({ nodes = [], depth = 0 }) {
  return (
    <ul
      className={
        depth ? 'mt-1 space-y-1 border-s border-line/70 ps-3 text-[13px]' : 'space-y-2 text-sm text-soft'
      }
    >
      {nodes.map((node) => (
        <li key={node.id || node.name}>
          <Link
            to={`/catalog?category=${encodeURIComponent(node.name)}`}
            dir="auto"
            className={`hover:text-brand ${depth ? 'text-[13px]' : ''}`}
          >
            {node.name}
          </Link>
          {node.children?.length > 0 && <FooterCategoryList nodes={node.children} depth={depth + 1} />}
        </li>
      ))}
    </ul>
  );
}

export default function Footer() {
  const [categories, setCategories] = useState([]);
  const [pages, setPages] = useState([]);
  const tree = useMemo(() => buildCategoryTree(categories), [categories]);
  const { phoneDisplay, phoneHref, whatsapp } = useSiteContact();
  const content = useStorefrontContent()?.footer;
  const brand = useStorefrontContent()?.brand?.content;
  const socials = (brand?.socials || []).filter((social) => social.url);
  const contactEmailHref = mailtoHref(brand?.contact_email);
  const storeName = [brand?.logo_name, brand?.logo_suffix]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(' ');
  const hasContact = Boolean(whatsapp || phoneHref || contactEmailHref);
  const contactStrip =
    content?.visible && (content.content.contact_title || content.content.contact_description || hasContact);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);
  useEffect(() => {
    getVisibleStorePages().then(setPages);
  }, []);
  return (
    <footer className="mt-16 border-t border-line bg-gray-50">
      {/* contact strip */}
      {contactStrip && (
        <div className="border-b border-line bg-brand-pale">
          <div className="container-x flex flex-col items-center gap-4 py-6 text-center sm:flex-row sm:justify-between sm:text-start">
            <div>
              {content.content.contact_title && (
                <h3 dir="auto" className="text-lg font-bold text-ink">
                  {content.content.contact_title}
                </h3>
              )}
              {content.content.contact_description && (
                <p dir="auto" className="text-sm text-soft">
                  {content.content.contact_description}
                </p>
              )}
            </div>
            {hasContact && (
              <div className="flex flex-wrap items-center justify-center gap-3">
                {whatsapp && (
                  <Button asChild className="bg-brand">
                    <a href={generalInquiryLink('order', whatsapp)} target="_blank" rel="noreferrer noopener">
                      <IconWhatsApp /> واتساب
                    </a>
                  </Button>
                )}
                {phoneHref && (
                  <Button asChild variant="outline">
                    <a href={phoneHref}>
                      <IconPhone />{' '}
                      <span
                        dir="ltr"
                        className="inline-block tabular-nums"
                        style={{ unicodeBidi: 'isolate' }}
                      >
                        {phoneDisplay}
                      </span>
                    </a>
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="container-x grid grid-cols-1 gap-8 py-10 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <StoreBrand compact />
          {content?.visible && content.content.about && (
            <p className="mt-3 text-sm leading-6 text-soft">
              <span dir="auto">{content.content.about}</span>
            </p>
          )}
          {socials.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-xs font-bold text-ink">تابعنا</p>
              <div className="flex items-center gap-1.5">
                {socials.map((social) => (
                  <a
                    key={`${social.network}-${social.url}`}
                    href={social.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    style={{ '--social-hover': socialHoverColor(social.network) }}
                    className="flex h-9 min-w-0 flex-1 items-center justify-center rounded-md border border-line bg-white text-soft transition-colors hover:border-[var(--social-hover)] hover:bg-[var(--social-hover)] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                    aria-label={`تابعنا على ${social.network}`}
                    title={social.network}
                  >
                    <SocialIcon network={social.network} />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <h4 className="mb-3 text-sm font-bold text-ink">التصنيفات</h4>
          <FooterCategoryList nodes={tree} />
        </div>

        <div>
          <h4 className="mb-3 text-sm font-bold text-ink">روابط مهمة</h4>
          <ul className="space-y-2 text-sm text-soft">
            <li>
              <Link to="/catalog" className="hover:text-brand">
                كل الكتب
              </Link>
            </li>
            <li>
              <Link to="/cart" className="hover:text-brand">
                سلة التسوق
              </Link>
            </li>
            <li>
              <HashLink to="/#how" className="hover:text-brand">
                كيف أطلب؟
              </HashLink>
            </li>
          </ul>
        </div>

        {pages.length > 0 && (
          <div>
            <h4 className="mb-3 text-sm font-bold text-ink">معلومات</h4>
            <ul className="space-y-2 text-sm text-soft">
              {pages.map((page) => (
                <li key={page.id || page.slug}>
                  <Link to={`/${page.slug}`} dir="auto" className="hover:text-brand">
                    {page.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {hasContact && (
          <div>
            <h4 className="mb-3 text-sm font-bold text-ink">تواصل معنا</h4>
            <ul className="space-y-2.5 text-sm text-soft">
              {whatsapp && (
                <li>
                  <a
                    href={generalInquiryLink('question', whatsapp)}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-center gap-2 hover:text-brand"
                  >
                    <IconWhatsApp width={16} height={16} /> واتساب
                  </a>
                </li>
              )}
              {phoneHref && (
                <li>
                  <a href={phoneHref} className="flex items-center gap-2 hover:text-brand">
                    <IconPhone width={16} height={16} />{' '}
                    <span dir="ltr" className="inline-block tabular-nums" style={{ unicodeBidi: 'isolate' }}>
                      {phoneDisplay}
                    </span>
                  </a>
                </li>
              )}
              {contactEmailHref && (
                <li>
                  <a href={contactEmailHref} className="flex items-center gap-2 hover:text-brand">
                    <IconMail width={16} height={16} />{' '}
                    <bdi dir="ltr">{verifyEmail(brand?.contact_email).email}</bdi>
                  </a>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      <div className="border-t border-line">
        <div className="container-x flex flex-col items-center justify-between gap-3 py-5 text-center text-xs text-gray-500 sm:flex-row">
          <span>
            © {new Date().getFullYear()}
            {storeName ? ` ${storeName}` : ''} — جميع الحقوق محفوظة
          </span>
          <span className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <button
              type="button"
              onClick={openCookiePreferences}
              className="underline decoration-dotted underline-offset-2 hover:text-brand"
            >
              إعدادات ملفات الارتباط
            </button>
          </span>
          <span className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <span dir="ltr" className="tabular-nums">
              v{APP_VERSION}
            </span>
            <a
              href="https://www.instagram.com/minerva.guides/"
              target="_blank"
              rel="noreferrer noopener"
              className="hover:text-brand"
            >
              © Minerva | DIGITAL Agency
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
