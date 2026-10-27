import { useCallback, useEffect, useState } from 'react';
import { formatPhoneDisplay, getSiteContacts, telHref } from '../lib/siteSettings';
import { whatsappLink } from '../lib/config';

/**
 * Live store contact numbers (DB `app_settings`, public read).
 * No bundled fallback: while the DB value is missing, `whatsapp`/`phoneHref`
 * are null and callers must not render the contact links.
 */
export function useSiteContact() {
  const [contacts, setContacts] = useState({ phone: '', whatsapp: '' });

  useEffect(() => {
    let alive = true;
    getSiteContacts().then((c) => {
      if (alive) setContacts(c);
    });
    return () => {
      alive = false;
    };
  }, []);

  const waLink = useCallback((message = '') => whatsappLink(message, contacts.whatsapp), [contacts.whatsapp]);

  return {
    phone: contacts.phone || null,
    whatsapp: contacts.whatsapp || null,
    phoneDisplay: formatPhoneDisplay(contacts.phone) || null,
    phoneHref: telHref(contacts.phone),
    whatsappLink: waLink,
  };
}
