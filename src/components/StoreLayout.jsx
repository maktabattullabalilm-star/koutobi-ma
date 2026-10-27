import { Outlet } from 'react-router-dom';
import AnnouncementBar from './AnnouncementBar';
import Header from './Header';
import Footer from './Footer';
import WhatsAppFloat from './WhatsAppFloat';
import CookieConsent from './CookieConsent';
import { useStorefrontContent } from '../hooks/useStorefrontContent';

export default function StoreLayout() {
  const brand = useStorefrontContent()?.brand?.content;
  // CSS declares the neutral palette; only DB-provided colours override it.
  const theme = {};
  if (brand?.primary_color) theme['--color-brand'] = brand.primary_color;
  if (brand?.primary_dark) theme['--color-brand-dark'] = brand.primary_dark;
  if (brand?.primary_darker) theme['--color-brand-darker'] = brand.primary_darker;
  if (brand?.primary_light) theme['--color-brand-light'] = brand.primary_light;
  if (brand?.primary_pale) theme['--color-brand-pale'] = brand.primary_pale;
  return (
    <div className="flex min-h-screen flex-col" style={theme}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
      >
        تخطَّ إلى المحتوى
      </a>
      <AnnouncementBar />
      <Header />
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet />
      </main>
      <Footer />
      <WhatsAppFloat />
      <CookieConsent />
    </div>
  );
}
