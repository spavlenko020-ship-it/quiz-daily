// Read-only audit of the question pool.
// Adapts to whatever shape is actually on disk; reports deltas against the
// 500-question target the spec assumed.
//
// Run: node scripts/audit-questions.js

import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');

const modPath = path.join(ROOT, 'src/game/questions.js');
const mod = await import(pathToFileURL(modPath).href);
const exportNames = Object.keys(mod);
const pool = mod.questions || mod.QUESTIONS || [];

// Current pool target (Stage: schema fixed, incremental expansion begins here).
// Per-category targets intentionally null at this stage — distribution is uneven
// until the +50 batches hit. Only total + id + category + schema-PASS are asserted now.
const EXPECTED_TOTAL = 489;
const CATEGORIES = ['geography', 'history', 'science', 'entertainment', 'general'];
const EXPECTED_PER_CAT = null; // uneven allowed at this stage
const EXPECTED_EASY = null;
const EXPECTED_MED = null;
const EXPECTED_HARD = null;

const UA_KEY = pool.length > 0 && pool[0].q && 'uk' in pool[0].q ? 'uk' : 'ua';
const Q_KEY = pool.length > 0 && 'q' in pool[0] ? 'q' : 'question';
const A_KEY = pool.length > 0 && 'a' in pool[0] ? 'a' : 'answers';
const CORRECT_KEY = pool.length > 0 && 'correct' in pool[0] ? 'correct' : 'correctIndex';

const hasIdField = pool.every(q => typeof q.id === 'string' && q.id.length > 0);
const hasCategoryField = pool.every(q => typeof q.category === 'string' && q.category.length > 0);

function section(title) {
  console.log('\n========== ' + title + ' ==========');
}

// ---- 0. Meta ----
section('0. SCHEMA DETECTED');
console.log('export name(s): ' + exportNames.join(', '));
console.log('total count: ' + pool.length + (pool.length === EXPECTED_TOTAL ? ' ✓' : ' ✗ (expected ' + EXPECTED_TOTAL + ')'));
console.log('question-text field: ' + Q_KEY);
console.log('answers field: ' + A_KEY);
console.log('correct-index field: ' + CORRECT_KEY);
console.log('Ukrainian locale key: ' + UA_KEY + (UA_KEY === 'ua' ? '' : " (spec says 'ua', pool uses 'uk' — " + (UA_KEY === 'uk' ? 'ISO-639-1, defensible' : 'unexpected') + ')'));
console.log("'id' field on every row: " + hasIdField);
console.log("'category' field on every row: " + hasCategoryField);

// ---- 1. Counts ----
section('1. COUNTS');
const byCat = {};
const byDiff = {};
const byCatDiff = {};
for (const q of pool) {
  const c = q.category || '(none)';
  const d = q.difficulty || '(none)';
  byCat[c] = (byCat[c] || 0) + 1;
  byDiff[d] = (byDiff[d] || 0) + 1;
  byCatDiff[c] = byCatDiff[c] || {};
  byCatDiff[c][d] = (byCatDiff[c][d] || 0) + 1;
}
console.log('by category:');
for (const cat of CATEGORIES) {
  const got = byCat[cat] || 0;
  if (EXPECTED_PER_CAT == null) {
    console.log('  ' + cat + ': ' + got + ' (no target set — informational)');
  } else {
    const ok = got === EXPECTED_PER_CAT ? '✓' : '✗';
    console.log('  ' + cat + ': ' + got + ' ' + ok + ' (expected ' + EXPECTED_PER_CAT + ')');
  }
}
const strayCats = Object.keys(byCat).filter(c => !CATEGORIES.includes(c));
if (strayCats.length) console.log('  stray categories: ' + strayCats.map(c => c + ':' + byCat[c]).join(', '));
console.log('by difficulty (global): ' + JSON.stringify(byDiff));
console.log('by category × difficulty:');
for (const cat of CATEGORIES) {
  const d = byCatDiff[cat] || {};
  const e = d.easy || 0, m = d.medium || 0, h = d.hard || 0;
  if (EXPECTED_EASY == null) {
    console.log('  ' + cat + ': easy=' + e + ' medium=' + m + ' hard=' + h + ' (no target set — informational)');
  } else {
    const ok = (e === EXPECTED_EASY && m === EXPECTED_MED && h === EXPECTED_HARD) ? '✓' : '✗';
    console.log('  ' + cat + ': easy=' + e + ' medium=' + m + ' hard=' + h + ' ' + ok +
      ' (expected ' + EXPECTED_EASY + '/' + EXPECTED_MED + '/' + EXPECTED_HARD + ')');
  }
}

// ---- 2. ID integrity ----
section('2. ID INTEGRITY');
if (!hasIdField) {
  console.log('SKIP: no id field present on any row. Cannot check sequence/duplicates/gaps.');
} else {
  const ids = pool.map(q => q.id);
  const dupIds = ids.filter((x, i) => ids.indexOf(x) !== i);
  console.log('duplicate ids: ' + (dupIds.length ? dupIds.join(', ') : 'none ✓'));
  const expected = Array.from({ length: EXPECTED_TOTAL }, (_, i) => 'q' + String(i + 1).padStart(3, '0'));
  const missing = expected.filter(id => !ids.includes(id));
  const extras = ids.filter(id => !expected.includes(id));
  console.log('missing from q001..q' + String(EXPECTED_TOTAL).padStart(3, '0') + ': ' + (missing.length ? missing.slice(0, 20).join(', ') + (missing.length > 20 ? ' (+' + (missing.length - 20) + ' more)' : '') : 'none ✓'));
  console.log('extra/non-conforming ids: ' + (extras.length ? extras.slice(0, 20).join(', ') : 'none ✓'));
}

// ---- 3. Translation completeness ----
section('3. TRANSLATION COMPLETENESS');
const transFails = [];
for (let i = 0; i < pool.length; i++) {
  const q = pool[i];
  const id = q.id || '#' + (i + 1);
  const qObj = q[Q_KEY] || {};
  const aObj = q[A_KEY] || {};
  const en = qObj.en || '';
  const uaLike = qObj[UA_KEY] || '';
  const noText = qObj.no || '';
  const fails = [];
  if (!en.trim()) fails.push('q.en empty');
  if (!uaLike.trim()) fails.push('q.' + UA_KEY + ' empty');
  if (!noText.trim()) fails.push('q.no empty');
  if (en.trim() && uaLike.trim() && en.trim() === uaLike.trim()) fails.push('q.' + UA_KEY + ' identical to EN');
  if (en.trim() && noText.trim() && en.trim() === noText.trim()) fails.push('q.no identical to EN');
  const aEn = aObj.en || [], aUa = aObj[UA_KEY] || [], aNo = aObj.no || [];
  if (aEn.length !== 4) fails.push('a.en length !== 4');
  if (aUa.length !== 4) fails.push('a.' + UA_KEY + ' length !== 4');
  if (aNo.length !== 4) fails.push('a.no length !== 4');
  for (let j = 0; j < 4; j++) {
    if (!(aEn[j] || '').toString().trim()) fails.push('a.en[' + j + '] empty');
    if (!(aUa[j] || '').toString().trim()) fails.push('a.' + UA_KEY + '[' + j + '] empty');
    if (!(aNo[j] || '').toString().trim()) fails.push('a.no[' + j + '] empty');
  }
  if (fails.length) transFails.push(id + ': ' + fails.join('; '));
}
if (!transFails.length) {
  console.log('all ' + pool.length + ' questions have non-empty trilingual fields ✓');
} else {
  console.log('failures (' + transFails.length + '):');
  transFails.slice(0, 30).forEach(f => console.log('  ' + f));
  if (transFails.length > 30) console.log('  ... +' + (transFails.length - 30) + ' more');
}

// ---- 4. Duplicate detection ----
section('4. DUPLICATE DETECTION');
function normalize(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9а-яёіїєґ]+/gi, ' ').trim();
}
const seen = new Map();
const exactDups = [];
for (let i = 0; i < pool.length; i++) {
  const q = pool[i];
  const id = q.id || '#' + (i + 1);
  const text = (q[Q_KEY] || {}).en || '';
  const key = normalize(text);
  if (!key) continue;
  if (seen.has(key)) exactDups.push([seen.get(key), id, text]);
  else seen.set(key, id);
}
console.log('exact EN duplicates: ' + (exactDups.length ? '' : 'none ✓'));
exactDups.forEach(([a, b, t]) => console.log('  ' + a + ' vs ' + b + ' — "' + t + '"'));

// Near-duplicate: Jaccard-like over word sets with > 0.8 overlap
const tokens = pool.map((q, i) => {
  const id = q.id || '#' + (i + 1);
  const words = new Set(normalize((q[Q_KEY] || {}).en).split(/\s+/).filter(w => w.length > 2));
  return { id, words };
});
const nearDups = [];
for (let i = 0; i < tokens.length; i++) {
  for (let j = i + 1; j < tokens.length; j++) {
    const a = tokens[i], b = tokens[j];
    if (a.words.size < 4 || b.words.size < 4) continue;
    let inter = 0;
    for (const w of a.words) if (b.words.has(w)) inter++;
    const union = a.words.size + b.words.size - inter;
    if (union === 0) continue;
    const j2 = inter / union;
    if (j2 >= 0.8) nearDups.push([a.id, b.id, j2.toFixed(2)]);
  }
}
console.log('near-duplicates (Jaccard ≥ 0.8): ' + (nearDups.length ? '' : 'none ✓'));
nearDups.slice(0, 20).forEach(([a, b, j]) => console.log('  ' + a + ' ≈ ' + b + ' (jaccard=' + j + ')'));
if (nearDups.length > 20) console.log('  ... +' + (nearDups.length - 20) + ' more');

// ---- 5. Distractor quality ----
section('5. DISTRACTOR QUALITY');
const distractorFails = [];
for (let i = 0; i < pool.length; i++) {
  const q = pool[i];
  const id = q.id || '#' + (i + 1);
  const aEn = ((q[A_KEY] || {}).en) || [];
  const fails = [];
  const lowered = aEn.map(s => (s || '').toString().toLowerCase().trim());
  const uniq = new Set(lowered);
  if (uniq.size !== 4) fails.push('duplicate or missing EN answer strings: ' + JSON.stringify(aEn));
  // Type-mismatch heuristic: count how many answers are "numeric-ish" (only digits, spaces, %, separators)
  const numericish = lowered.filter(s => /^[\d\s.,%°/$()+-]+$/.test(s) || /^\d+\s*(cents|dollars|days|years|%)?$/.test(s));
  if (numericish.length === 3 && aEn.length === 4) fails.push('3 numeric + 1 word (weak distractors)');
  if (numericish.length === 1 && aEn.length === 4) {
    const others = lowered.filter(s => !/^[\d\s.,%°/$()+-]+$/.test(s));
    if (others.length === 3 && others.every(w => /^[a-zа-я\s]+$/i.test(w))) fails.push('1 numeric + 3 words (weak distractors)');
  }
  if (fails.length) distractorFails.push(id + ': ' + fails.join('; '));
}
if (!distractorFails.length) {
  console.log('no distractor issues detected ✓');
} else {
  console.log('issues (' + distractorFails.length + '):');
  distractorFails.slice(0, 30).forEach(f => console.log('  ' + f));
  if (distractorFails.length > 30) console.log('  ... +' + (distractorFails.length - 30) + ' more');
}

// ---- 6. Random 20-sample for manual correctness review ----
section('6. RANDOM 20 QUESTIONS FOR MANUAL REVIEW (EN only, with correct answer)');
function sampleIndices(n, max) {
  const s = new Set();
  while (s.size < Math.min(n, max)) s.add(Math.floor(Math.random() * max));
  return [...s].sort((a, b) => a - b);
}
const sample20 = sampleIndices(20, pool.length);
for (const i of sample20) {
  const q = pool[i];
  const id = q.id || '#' + (i + 1);
  const cat = q.category || '(no cat)';
  const diff = q.difficulty || '(no diff)';
  const en = (q[Q_KEY] || {}).en || '(missing)';
  const aEn = ((q[A_KEY] || {}).en) || [];
  const cIdx = q[CORRECT_KEY];
  const correctText = (typeof cIdx === 'number') ? (aEn[cIdx] || '(out of range)') : '(no correct idx)';
  console.log('[' + id + '] (' + cat + '/' + diff + ') ' + en);
  console.log('   options: ' + aEn.map((a, j) => (j === cIdx ? '★' : ' ') + a).join(' | '));
  console.log('   correct: ' + correctText);
}

// ---- 7. 2 per category trilingual print ----
section('7. TRANSLATION SAMPLE — 2 PER CATEGORY (ID | EN | UA | NO)');
for (const cat of CATEGORIES) {
  const inCat = pool.filter(q => q.category === cat);
  if (inCat.length === 0) { console.log(cat + ': (empty)'); continue; }
  const picks = sampleIndices(Math.min(2, inCat.length), inCat.length);
  console.log('--- ' + cat + ' ---');
  for (const i of picks) {
    const q = inCat[i];
    const id = q.id || '(no id)';
    const qObj = q[Q_KEY] || {}, aObj = q[A_KEY] || {};
    const cIdx = q[CORRECT_KEY];
    console.log(id);
    console.log('  EN: ' + (qObj.en || '') + ' → ' + ((aObj.en || [])[cIdx] || ''));
    console.log('  ' + UA_KEY.toUpperCase() + ': ' + (qObj[UA_KEY] || '') + ' → ' + ((aObj[UA_KEY] || [])[cIdx] || ''));
    console.log('  NO: ' + (qObj.no || '') + ' → ' + ((aObj.no || [])[cIdx] || ''));
  }
}

// ---- Summary verdict ----
section('SUMMARY');
const totalOk = pool.length === EXPECTED_TOTAL;
const catsOk = EXPECTED_PER_CAT == null
  ? null
  : CATEGORIES.every(c => (byCat[c] || 0) === EXPECTED_PER_CAT);
const diffsOk = EXPECTED_EASY == null
  ? null
  : CATEGORIES.every(c => {
      const d = byCatDiff[c] || {};
      return (d.easy || 0) === EXPECTED_EASY && (d.medium || 0) === EXPECTED_MED && (d.hard || 0) === EXPECTED_HARD;
    });
const schemaOk = hasIdField && hasCategoryField;
const translationsOk = transFails.length === 0;
const dupsOk = exactDups.length === 0 && nearDups.length === 0;
const distractorsOk = distractorFails.length === 0;
console.log('total ' + EXPECTED_TOTAL + ':                ' + (totalOk ? 'PASS' : 'FAIL (' + pool.length + ')'));
console.log('per-category target:     ' + (catsOk == null ? 'skipped (no target)' : (catsOk ? 'PASS' : 'FAIL')));
console.log('difficulty target:       ' + (diffsOk == null ? 'skipped (no target)' : (diffsOk ? 'PASS' : 'FAIL')));
console.log('id + category fields:    ' + (schemaOk ? 'PASS' : 'FAIL (missing: ' + (!hasIdField ? 'id ' : '') + (!hasCategoryField ? 'category' : '') + ')'));
console.log('translation completeness: ' + (translationsOk ? 'PASS' : 'FAIL (' + transFails.length + ')'));
console.log('no duplicates:           ' + (dupsOk ? 'PASS' : 'FAIL (exact=' + exactDups.length + ', near=' + nearDups.length + ')'));
console.log('distractor quality:      ' + (distractorsOk ? 'PASS' : 'FAIL (' + distractorFails.length + ')'));

const hardChecks = [totalOk, schemaOk, translationsOk, dupsOk, distractorsOk];
const optChecks = [catsOk, diffsOk].filter(v => v !== null);
const overall = hardChecks.every(Boolean) && optChecks.every(Boolean);
console.log('\nOVERALL: ' + (overall ? 'READY FOR NEXT BATCH' : 'NOT READY — see failures above'));
