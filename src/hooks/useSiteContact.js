import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_PHONE_NUMBER,
  DEFAULT_WHATSAPP_NUMBER,
  formatPhoneDisplay,
  getSiteContacts,
  telHref,
} from '../lib/siteSettings';
import { whatsappLink } from '../lib/config';

/**
 * Live store contact numbers (DB `app_settings`, public read).
 * Falls back to the bundled constants offline — every wa.me / tel: link
 * in the storefront should go through this so the owner can change the
 * numbers from Settings without a redeploy.
 */
export function useSiteContact() {
  const [contacts, setContacts] = useState({
    phone: DEFAULT_PHONE_NUMBER,
    whatsapp: DEFAULT_WHATSAPP_NUMBER,
  });

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
    phone: contacts.phone,
    whatsapp: contacts.whatsapp,
    phoneDisplay: formatPhoneDisplay(contacts.phone),
    phoneHref: telHref(contacts.phone),
    whatsappLink: waLink,
  };
}
