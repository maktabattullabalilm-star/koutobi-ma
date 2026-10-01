import { supabase } from '../supabase';

const AUTHOR_TITLES = /^(?:(?:الشيخ|شيخ|الإمام|امام|العالم|العلامة|علامة|الدكتور|الأستاذ|استاذ)\s+)+/;

function cleanName(value) {
  return String(value || '').normalize('NFKC').replace(/\s+/g, ' ').trim();
}

export function canonicalAuthorName(value) {
  return cleanName(value).replace(AUTHOR_TITLES, '').trim();
}

export function canonicalPublisherName(value) {
  return cleanName(value);
}

export function directoryKey(value) {
  return cleanName(value)
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

async function getDirectoryNames(table) {
  const { data, error } = await supabase.from(table).select('name_ar').order('name_ar', { ascending: true });
  if (error) return [];
  return (data || []).map((row) => row.name_ar);
}

async function ensureDirectoryName(table, rawName, canonicalize) {
  const name_ar = canonicalize(rawName);
  if (!name_ar) return '';
  const normalized_name = directoryKey(name_ar);
  const { data: existing, error: existingError } = await supabase
    .from(table)
    .select('name_ar')
    .eq('normalized_name', normalized_name)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing) return existing.name_ar;

  const { data, error } = await supabase
    .from(table)
    .insert({ name_ar, normalized_name })
    .select('name_ar')
    .single();
  if (error) {
    // A concurrent admin may have added the same normalized name.
    const { data: concurrent, error: concurrentError } = await supabase
      .from(table)
      .select('name_ar')
      .eq('normalized_name', normalized_name)
      .maybeSingle();
    if (!concurrentError && concurrent) return concurrent.name_ar;
    throw new Error(error.message);
  }
  return data.name_ar;
}

export const getAuthorsForForm = () => getDirectoryNames('authors');
export const getPublishersForForm = () => getDirectoryNames('publishers');
export const ensureAuthor = (name) => ensureDirectoryName('authors', name, canonicalAuthorName);
export const ensurePublisher = (name) => ensureDirectoryName('publishers', name, canonicalPublisherName);
