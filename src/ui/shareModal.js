import { t, getLanguage } from '../i18n/i18n.js';
import { formatStreakDays } from '../i18n/plural.js';

function buildShareText(score, correct, total, history, streak, lang) {
  const EPOCH = new Date(2026, 0, 1).getTime();
  const today = new Date();
  const todayMs = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const quizNumber = Math.floor((todayMs - EPOCH) / (1000 * 60 * 60 * 24)) + 1;

  const grid = history.map(h => h.isCorrect ? '🟩' : '🟥').join('');
  const accuracy = Math.round((correct / total) * 100);
  const url = window.location.href.split('?')[0];

  const texts = {
    en: { title: `📚 Daily Quiz #${quizNumber} — ${correct}/${total}`, points: `⭐ ${score} points · ${accuracy}% accuracy`, streak: streak > 0 ? `🔥 ${streak} day streak` : '' },
    uk: { title: `📚 Щоденний Квіз #${quizNumber} — ${correct}/${total}`, points: `⭐ ${score} очок · ${accuracy}% точність`, streak: streak > 0 ? `🔥 Серія ${formatStreakDays(streak, 'uk')}` : '' },
    no: { title: `📚 Daglig Quiz #${quizNumber} — ${correct}/${total}`, points: `⭐ ${score} poeng · ${accuracy}% nøyaktighet`, streak: streak > 0 ? `🔥 ${streak} dagers streak` : '' }
  };
  const tx = texts[lang] || texts.en;
  const lines = [tx.title, '', grid, '', tx.points];
  if (tx.streak) lines.push(tx.streak);
  lines.push('');
  lines.push(url);
  return lines.join('\n');
}

export function openShareModal({ score, correct, total, history }) {
  const lang = getLanguage();
  const streakRaw = localStorage.getItem('quiz_daily_streak');
  const streak = streakRaw ? parseInt(streakRaw, 10) : 0;
  const text = buildShareText(score, correct, total, history, streak, lang);
  const encodedText = encodeURIComponent(text);

  const existing = document.getElementById('share-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'share-modal';
  modal.style.cssText = `
    position: fixed; inset: 0; z-index: 10000;
    background: rgba(0,0,0,0.8); backdrop-filter: blur(12px);
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
    animation: modalFadeIn 0.25s ease-out;
  `;

  const pageUrl = window.location.href.split('?')[0];
  const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(pageUrl)}&text=${encodedText}`;
  const waUrl = `https://wa.me/?text=${encodedText}`;
  const viberUrl = `viber://forward?text=${encodedText}`;

  modal.innerHTML = `
    <div style="background:#14121c; border-radius:24px; padding:24px 20px; max-width:420px; width:100%; border:1px solid rgba(255,255,255,0.1); box-shadow:0 24px 64px rgba(0,0,0,0.6);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <h3 style="color:#fff; font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:1.25rem; margin:0;">${t('chooseMessenger')}</h3>
        <button id="smc" style="background:none; border:none; color:#a8a4c7; font-size:1.6rem; cursor:pointer; padding:0 4px; line-height:1;">×</button>
      </div>
      <p style="color:#8a8598; font-size:0.85rem; margin:0 0 18px 0;">${t('shareHint')}</p>

      <div id="sm-preview" style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:14px; margin-bottom:18px; font-family:monospace; font-size:0.95rem; line-height:1.5; color:#d8d5e8; white-space:pre-wrap; word-break:break-word;"></div>

      <div style="display:flex; flex-direction:column; gap:10px;">
        <a href="${tgUrl}" target="_blank" rel="noopener" style="display:flex; align-items:center; gap:12px; background:linear-gradient(135deg,#2aabee 0%,#229ed9 100%); color:#fff; text-decoration:none; padding:14px 18px; border-radius:14px; font-weight:700; font-family:'Inter',sans-serif; font-size:1rem; box-shadow:0 6px 16px rgba(42,171,238,0.3);">
          <svg width="28" height="28" viewBox="0 0 240 240" fill="#fff"><path d="M120 0C53.726 0 0 53.726 0 120s53.726 120 120 120 120-53.726 120-120S186.274 0 120 0zm55.498 79.978l-18.534 87.293c-1.401 6.2-5.076 7.707-10.291 4.8l-28.4-20.937-13.71 13.19c-1.516 1.516-2.787 2.787-5.715 2.787l2.046-28.986 52.741-47.665c2.29-2.046-.498-3.18-3.557-1.134l-65.175 41.043-28.076-8.772c-6.104-1.905-6.221-6.104 1.273-9.03l109.669-42.3c5.075-1.904 9.516 1.134 7.729 8.711z"/></svg>
          ${t('shareTelegram')}
        </a>
        <a href="${waUrl}" target="_blank" rel="noopener" style="display:flex; align-items:center; gap:12px; background:linear-gradient(135deg,#25d366 0%,#128c7e 100%); color:#fff; text-decoration:none; padding:14px 18px; border-radius:14px; font-weight:700; font-family:'Inter',sans-serif; font-size:1rem; box-shadow:0 6px 16px rgba(37,211,102,0.3);">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/></svg>
          ${t('shareWhatsapp')}
        </a>
        <a href="${viberUrl}" style="display:flex; align-items:center; gap:12px; background:linear-gradient(135deg,#7360f2 0%,#665cac 100%); color:#fff; text-decoration:none; padding:14px 18px; border-radius:14px; font-weight:700; font-family:'Inter',sans-serif; font-size:1rem; box-shadow:0 6px 16px rgba(115,96,242,0.3);">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff"><path d="M11.398.002C9.473.028 5.331.344 3.014 2.467 1.293 4.187.69 6.7.633 9.82c-.055 3.12-.122 8.947 5.5 10.527v2.405s-.038.973.602 1.172c.78.244 1.24-.5 1.982-1.304l1.363-1.538c3.844.324 6.8-.416 7.14-.526.772-.252 5.146-.814 5.858-6.62.735-5.977-.348-9.746-2.29-11.449l-.011-.004c-.585-.54-2.935-2.25-8.17-2.265 0 0-.386-.025-1.209-.016zm.068 1.694c.7-.005 1.03.017 1.03.017 4.43.013 6.548 1.347 7.054 1.77 1.644 1.413 2.489 4.81 1.867 9.805-.595 4.847-4.128 5.153-4.78 5.364-.277.09-2.89.737-6.166.522 0 0-2.442 2.944-3.206 3.711-.12.127-.264.168-.36.144-.133-.04-.173-.208-.17-.455l.023-4.005c-4.76-1.322-4.482-6.286-4.433-8.892.05-2.607.54-4.738 2-6.173 1.947-1.75 5.463-2.009 7.09-2.007z"/></svg>
          ${t('shareViber')}
        </a>
        <button id="smcopy" style="display:flex; align-items:center; justify-content:center; gap:8px; background:rgba(245,180,60,0.12); border:1.5px solid rgba(245,180,60,0.4); color:#f5b43c; padding:13px 18px; border-radius:14px; font-weight:700; font-family:'Inter',sans-serif; font-size:0.95rem; cursor:pointer; margin-top:4px;">
          📋 ${t('shareCopy')}
        </button>
      </div>
    </div>
  `;

  if (!document.getElementById('share-modal-keyframes')) {
    const s = document.createElement('style');
    s.id = 'share-modal-keyframes';
    s.textContent = '@keyframes modalFadeIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}';
    document.head.appendChild(s);
  }

  document.body.appendChild(modal);
  document.getElementById('sm-preview').textContent = text;

  document.getElementById('smc').onclick = () => modal.remove();
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  document.getElementById('smcopy').onclick = async () => {
    try {
      await navigator.clipboard.writeText(text);
      const btn = document.getElementById('smcopy');
      btn.textContent = '✓ ' + (t('scoreCopied') || 'Copied');
      setTimeout(() => modal.remove(), 1000);
    } catch (e) {}
  };
}
