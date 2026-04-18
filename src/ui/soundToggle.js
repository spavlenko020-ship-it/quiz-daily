import { toggleMute, isMuted } from './sounds.js';

export function renderSoundToggle() {
  const existing = document.getElementById('sound-toggle');
  if (existing) existing.remove();
  const btn = document.createElement('button');
  btn.id = 'sound-toggle';
  const update = () => { btn.textContent = isMuted() ? '🔇' : '🔊'; };
  update();
  btn.style.cssText = `
    position: fixed; top: 12px; left: 12px; z-index: 1000;
    background: rgba(26,26,46,0.85); backdrop-filter: blur(10px);
    color: white; border: 1px solid rgba(255,255,255,0.08);
    width: 44px; height: 44px; border-radius: 50%;
    font-size: 1.2rem; cursor: pointer; transition: transform 0.15s;
  `;
  btn.addEventListener('click', () => { toggleMute(); update(); });
  btn.addEventListener('mouseenter', () => btn.style.transform = 'scale(1.1)');
  btn.addEventListener('mouseleave', () => btn.style.transform = 'scale(1)');
  document.body.appendChild(btn);
}
