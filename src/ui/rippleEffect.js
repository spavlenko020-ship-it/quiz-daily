// Stage 7.9b — material-style ripple wave from tap point on premium buttons.
// Applies to any element matching the selectors below. Ripple is a radial
// expanding circle that fades out over 500ms. Low cost (single DOM node per
// tap, auto-removed after animation).

export function injectRippleStyles() {
  if (document.getElementById('qd-ripple-styles')) return;
  const style = document.createElement('style');
  style.id = 'qd-ripple-styles';
  style.textContent = `
    .qd-ripple-host {
      position: relative !important;
      overflow: hidden !important;
    }
    .qd-ripple {
      position: absolute;
      border-radius: 50%;
      transform: scale(0);
      animation: qdRippleExpand 600ms cubic-bezier(0.2, 0.8, 0.4, 1);
      background: radial-gradient(circle, rgba(255,232,154,0.55) 0%, rgba(255,232,154,0.2) 50%, rgba(255,232,154,0) 80%);
      pointer-events: none;
      z-index: 2;
    }
    @keyframes qdRippleExpand {
      0%   { transform: scale(0);   opacity: 1; }
      60%  { opacity: 0.9; }
      100% { transform: scale(4);   opacity: 0; }
    }
    @media (prefers-reduced-motion: reduce) {
      .qd-ripple { animation: none; display: none; }
    }
  `;
  document.head.appendChild(style);
}

const RIPPLE_SELECTORS = [
  '.qd-btn-viral-primary',
  '.qd-btn-primary-hero',
  '.qd-btn-secondary',
  '.qd-home-play-friend',
  '.qd-matchresult-primary',
  '.qd-matchresult-secondary',
  '.qd-premium-btn'
];

function createRipple(e) {
  const btn = e.currentTarget;
  if (!btn.classList.contains('qd-ripple-host')) {
    btn.classList.add('qd-ripple-host');
  }
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = (e.clientX || (e.touches && e.touches[0] && e.touches[0].clientX) || rect.left + rect.width/2) - rect.left;
  const y = (e.clientY || (e.touches && e.touches[0] && e.touches[0].clientY) || rect.top + rect.height/2) - rect.top;
  const ripple = document.createElement('span');
  ripple.className = 'qd-ripple';
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = (x - size/2) + 'px';
  ripple.style.top = (y - size/2) + 'px';
  btn.appendChild(ripple);
  setTimeout(() => { ripple.remove(); }, 650);
}

function attachRippleTo(el) {
  if (el.dataset.qdRipple === '1') return;
  el.dataset.qdRipple = '1';
  el.addEventListener('pointerdown', createRipple, { passive: true });
}

function scanAndAttach() {
  const selector = RIPPLE_SELECTORS.join(',');
  document.querySelectorAll(selector).forEach(attachRippleTo);
}

export function startRippleObserver() {
  injectRippleStyles();
  scanAndAttach();
  const target = document.getElementById('app') || document.body;
  const obs = new MutationObserver(() => scanAndAttach());
  obs.observe(target, { childList: true, subtree: true });
}
