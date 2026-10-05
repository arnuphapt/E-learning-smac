// One-off data migration: public R2 URLs -> R2 object keys.
//   lessons.video_url, lessons.documents[].url, lessons.ai_documents[].url, submissions.file
//
// DRY RUN by default (reads only, prints what would change).
//   node scripts/migrate-r2-urls-to-keys.mjs            # dry run
//   node scripts/migrate-r2-urls-to-keys.mjs --apply    # writes
//
// Needs .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (server-only, never commit it).
// Idempotent: values that are already keys (or not R2 URLs) are left alone.
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { toKey } from '../lib/r2.js';

dotenv.config({ path: '.env.local' });

const apply = process.argv.includes('--apply');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const dbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !dbKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const supabase = createClient(url, dbKey, { auth: { persistSession: false, autoRefreshToken: false } });

const isUrl = (v) => typeof v === 'string' && (/^https?:\/\//.test(v) || v.startsWith('/mock-uploads/'));
const skipped = []; // URLs we could not map to an R2 key (e.g. Supabase storage) - reported, untouched

// Returns the key for a stored URL, or the value unchanged if it is not a convertible URL.
function convert(v, where) {
  if (!isUrl(v)) return v;
  const key = toKey(v);
  if (!key) {
    skipped.push(`${where}: ${v}`);
    return v;
  }
  return key;
}

const convertDocs = (docs, where) =>
  Array.isArray(docs) ? docs.map((d) => (d && d.url ? { ...d, url: convert(d.url, where) } : d)) : docs;

async function write(table, id, patch) {
  console.log(`${apply ? 'UPDATE' : 'would update'} ${table} ${id}:`, JSON.stringify(patch));
  if (!apply) return;
  const { data, error } = await supabase.from(table).update(patch).eq('id', id).select('id');
  if (error) throw new Error(`${table} ${id}: ${error.message}`);
  if (!data || data.length === 0) throw new Error(`${table} ${id}: 0 rows updated (RLS?)`);
}

let changed = 0;

const { data: lessons, error: lErr } = await supabase.from('lessons').select('id, video_url, documents, ai_documents');
if (lErr) throw lErr;
for (const l of lessons) {
  const patch = {};
  const v = convert(l.video_url, `lessons ${l.id} video_url`);
  if (v !== l.video_url) patch.video_url = v;
  for (const col of ['documents', 'ai_documents']) {
    const next = convertDocs(l[col], `lessons ${l.id} ${col}`);
    if (JSON.stringify(next) !== JSON.stringify(l[col])) patch[col] = next;
  }
  if (Object.keys(patch).length) {
    await write('lessons', l.id, patch);
    changed++;
  }
}

const { data: subs, error: sErr } = await supabase.from('submissions').select('id, file');
if (sErr) throw sErr;
for (const s of subs) {
  const f = convert(s.file, `submissions ${s.id} file`);
  if (f !== s.file) {
    await write('submissions', s.id, { file: f });
    changed++;
  }
}

console.log(`\n${apply ? 'Updated' : 'Would update'} ${changed} row(s).`);
if (skipped.length) {
  console.log(`\n${skipped.length} URL(s) not recognised as R2 and left untouched:`);
  skipped.forEach((s) => console.log('  ' + s));
}
if (!apply) console.log('\nDry run only. Re-run with --apply to write.');
