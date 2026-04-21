// Apple-premium dark neutral background — no center glow, no color blobs, no radial light.
// Single deep near-black with imperceptible noise for material feel.
// Matches the visual language of iOS 18 and macOS Sequoia system wallpapers.

export function renderBackground() {
  const existing = document.getElementById('mesh-bg');
  if (existing) existing.remove();
  const existingStyle = document.getElementById('mesh-bg-styles');
  if (existingStyle) existingStyle.remove();

  const bg = document.createElement('div');
  bg.id = 'mesh-bg';
  bg.innerHTML = '<div class="premium-base"></div><div class="premium-noise"></div>';
  bg.style.cssText = 'position:fixed; inset:0; z-index:-1; overflow:hidden; pointer-events:none;';

  const style = document.createElement('style');
  style.id = 'mesh-bg-styles';
  style.textContent = `
    html, body { background: #08080c !important; }
    #mesh-bg .premium-base {
      position: absolute; inset: 0;
      background: #08080c;
    }
    #mesh-bg .premium-noise {
      position: absolute; inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.45'/%3E%3C/svg%3E");
      opacity: 0.025;
      mix-blend-mode: overlay;
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(bg);
}
