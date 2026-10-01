import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Scaffolded .env files ship with placeholder values (YOUR_...).
// Treat those as "not configured" so the app falls back to DEMO_MODE
// instead of querying a dead host.
const looksPlaceholder = (v) => !v || /your_|example|placeholder|changeme|xxx+/i.test(v);

export const SUPABASE_ENABLED = Boolean(
  url && anonKey && url.startsWith('http') && !looksPlaceholder(url) && !looksPlaceholder(anonKey)
);

export const supabase = SUPABASE_ENABLED ? createClient(url, anonKey) : null;

export function supabaseErrorHint() {
  return 'لم تُضبط بيانات Supabase بعد. انسخ ملف .env.example إلى .env وأدخل قيم مشروعك، أو راجع لوحة Netlify لبيئة الإنتاج.';
}
