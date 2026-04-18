export function renderBackground() {
  const existing = document.getElementById('mesh-bg');
  if (existing) existing.remove();
  const existingStyle = document.getElementById('mesh-bg-styles');
  if (existingStyle) existingStyle.remove();

  const bg = document.createElement('div');
  bg.id = 'mesh-bg';
  bg.innerHTML = [
    '<div class="mesh-base"></div>',
    '<div class="aurora aurora-1"></div>',
    '<div class="aurora aurora-2"></div>',
    '<div class="aurora aurora-3"></div>',
    '<div class="aurora aurora-4"></div>',
    '<div class="stars"></div>',
    '<div class="grain"></div>',
    '<div class="vignette"></div>',
    '<div class="center-shield"></div>',
    '<div class="center-fade-left"></div>',
    '<div class="center-fade-right"></div>'
  ].join('');
  bg.style.cssText = 'position:fixed; inset:0; z-index:-1; overflow:hidden; pointer-events:none;';

  const style = document.createElement('style');
  style.id = 'mesh-bg-styles';
  style.textContent = `
    #mesh-bg .mesh-base {
      position: absolute; inset: 0;
      background: radial-gradient(ellipse 120% 80% at 50% 0%, #14102a 0%, #0a0818 55%, #050410 100%);
    }
    #mesh-bg .aurora {
      position: absolute; border-radius: 50%;
      filter: blur(90px);
      will-change: transform, opacity;
      mix-blend-mode: screen;
    }
    #mesh-bg .aurora-1 {
      width: 620px; height: 520px;
      top: -15%; left: -20%;
      background: radial-gradient(ellipse at 50% 50%,
        rgba(255,190,70,0.8) 0%,
        rgba(240,140,70,0.5) 25%,
        rgba(200,90,140,0.3) 55%,
        transparent 80%);
      animation: auroraDance1 22s ease-in-out infinite alternate;
    }
    #mesh-bg .aurora-2 {
      width: 680px; height: 560px;
      top: 25%; right: -25%;
      background: radial-gradient(ellipse at 50% 50%,
        rgba(170,100,240,0.75) 0%,
        rgba(100,80,220,0.5) 30%,
        rgba(60,120,230,0.3) 60%,
        transparent 85%);
      animation: auroraDance2 26s ease-in-out infinite alternate;
    }
    #mesh-bg .aurora-3 {
      width: 540px; height: 440px;
      bottom: -20%; left: 5%;
      background: radial-gradient(ellipse at 50% 50%,
        rgba(80,200,220,0.55) 0%,
        rgba(100,160,230,0.35) 40%,
        transparent 75%);
      animation: auroraDance3 30s ease-in-out infinite alternate;
    }
    #mesh-bg .aurora-4 {
      width: 460px; height: 400px;
      top: -10%; right: 0%;
      background: radial-gradient(ellipse at 50% 50%,
        rgba(240,90,170,0.55) 0%,
        rgba(180,70,200,0.35) 40%,
        transparent 75%);
      animation: auroraDance4 34s ease-in-out infinite alternate;
    }

    @keyframes auroraDance1 {
      0%   { transform: translate(0, 0) scale(1) rotate(0deg); opacity: 0.75; }
      33%  { transform: translate(120px, 80px) scale(1.15) rotate(15deg); opacity: 0.9; }
      66%  { transform: translate(60px, 140px) scale(0.95) rotate(-8deg); opacity: 0.8; }
      100% { transform: translate(180px, 60px) scale(1.2) rotate(20deg); opacity: 0.95; }
    }
    @keyframes auroraDance2 {
      0%   { transform: translate(0, 0) scale(1) rotate(0deg); opacity: 0.7; }
      33%  { transform: translate(-100px, -60px) scale(1.18) rotate(-12deg); opacity: 0.9; }
      66%  { transform: translate(-60px, -140px) scale(0.92) rotate(10deg); opacity: 0.75; }
      100% { transform: translate(-140px, -80px) scale(1.22) rotate(-20deg); opacity: 0.9; }
    }
    @keyframes auroraDance3 {
      0%   { transform: translate(0, 0) scale(1); opacity: 0.6; }
      50%  { transform: translate(80px, -60px) scale(1.15); opacity: 0.75; }
      100% { transform: translate(-40px, 80px) scale(0.95); opacity: 0.65; }
    }
    @keyframes auroraDance4 {
      0%   { transform: translate(0, 0) scale(1); opacity: 0.6; }
      50%  { transform: translate(-80px, 60px) scale(1.1); opacity: 0.8; }
      100% { transform: translate(40px, 100px) scale(0.9); opacity: 0.65; }
    }

    #mesh-bg .stars {
      position: absolute; inset: 0;
      background-image:
        radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.4), transparent 50%),
        radial-gradient(1px 1px at 60% 70%, rgba(255,255,255,0.3), transparent 50%),
        radial-gradient(1px 1px at 80% 20%, rgba(255,255,255,0.35), transparent 50%),
        radial-gradient(1.5px 1.5px at 40% 85%, rgba(255,255,255,0.4), transparent 50%),
        radial-gradient(1px 1px at 15% 60%, rgba(255,255,255,0.25), transparent 50%),
        radial-gradient(1px 1px at 75% 45%, rgba(255,255,255,0.3), transparent 50%),
        radial-gradient(1.5px 1.5px at 30% 15%, rgba(255,255,255,0.35), transparent 50%),
        radial-gradient(1px 1px at 90% 90%, rgba(255,255,255,0.3), transparent 50%);
      opacity: 0.6;
      animation: starTwinkle 8s ease-in-out infinite alternate;
    }
    @keyframes starTwinkle {
      0%,100% { opacity: 0.4; }
      50%     { opacity: 0.75; }
    }

    #mesh-bg .grain {
      position: absolute; inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='0.5'/%3E%3C/svg%3E");
      opacity: 0.06;
      mix-blend-mode: overlay;
    }
    #mesh-bg .vignette {
      position: absolute; inset: 0;
      background: radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%);
    }

    #mesh-bg .center-shield {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 50%;
      width: 480px;
      transform: translateX(-50%);
      background: #0a0818;
      z-index: 5;
      pointer-events: none;
    }
    #mesh-bg .center-fade-left,
    #mesh-bg .center-fade-right {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 80px;
      z-index: 5;
      pointer-events: none;
    }
    #mesh-bg .center-fade-left {
      left: 50%;
      margin-left: -320px;
      background: linear-gradient(to right, transparent 0%, #0a0818 100%);
    }
    #mesh-bg .center-fade-right {
      left: 50%;
      margin-left: 240px;
      background: linear-gradient(to left, transparent 0%, #0a0818 100%);
    }

    @media (max-width: 520px) {
      #mesh-bg .center-shield,
      #mesh-bg .center-fade-left,
      #mesh-bg .center-fade-right { display: none; }
    }

    @media (prefers-reduced-motion: reduce) {
      #mesh-bg .aurora, #mesh-bg .stars { animation: none; }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(bg);
  console.log('[bg] rendered — aurora + solid center shield (480px + 80px fade each side)');
}
