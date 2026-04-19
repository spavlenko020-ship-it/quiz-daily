import { Match } from '../match.js';
import { saveMatch, loadMatch, clearMatch } from '../matchStore.js';
import { questions } from '../questions.js';

export async function runMatchDiag(platform) {
  try {
    if (!platform) throw new Error('platform not provided');

    console.log('[matchDiag] step 1: create fresh Match');
    const original = Match.create(
      { contextId: 'diag-ctx-' + Date.now(), opponent: { id: 'diag-opp', name: 'Diag Opponent' } },
      questions
    );
    const originalJson = original.serialize();
    console.log('[matchDiag] original:', originalJson);

    console.log('[matchDiag] step 2: saveMatch');
    const saveOk = await saveMatch(original, platform);
    console.log('[matchDiag] saveMatch result:', saveOk);

    console.log('[matchDiag] step 3: loadMatch');
    const loaded = await loadMatch(platform);
    if (!loaded) throw new Error('loadMatch returned null after save');
    const loadedJson = loaded.serialize();
    console.log('[matchDiag] loaded:', loadedJson);

    console.log('[matchDiag] step 4: equality check');
    if (loadedJson !== originalJson) {
      throw new Error('round-trip mismatch:\n  original=' + originalJson + '\n  loaded=' + loadedJson);
    }
    console.log('[matchDiag] round-trip OK');

    console.log('[matchDiag] step 5: clearMatch');
    const clearOk = await clearMatch(platform);
    console.log('[matchDiag] clearMatch result:', clearOk);

    console.log('[matchDiag] step 6: loadMatch after clear (expect null)');
    const afterClear = await loadMatch(platform);
    if (afterClear !== null) {
      throw new Error('loadMatch after clear returned non-null: ' + JSON.stringify(afterClear));
    }
    console.log('[matchDiag] cleared OK');

    console.log('[matchDiag] ALL CHECKS PASSED');
    return { ok: true };
  } catch (error) {
    console.error('[matchDiag] FAILED:', error);
    return { ok: false, error: error && error.message ? error.message : String(error) };
  }
}

if (typeof window !== 'undefined') {
  window.__matchDiag = runMatchDiag;
}
