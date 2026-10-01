import { useEffect, useState } from 'react';
import { getStorefrontContent } from '../lib/storefrontContent';

export function useStorefrontContent() {
  const [sections, setSections] = useState(null);
  useEffect(() => { let alive = true; getStorefrontContent().then((data) => { if (alive) setSections(data); }); return () => { alive = false; }; }, []);
  return sections;
}
