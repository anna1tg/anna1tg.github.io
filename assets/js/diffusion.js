(() => {
  const cv = document.getElementById('diffusion');
  const ctx = cv.getContext('2d');
  const N = cv.width;
  const STEPS = 30;
  const stepEl = document.getElementById('step');
  const seedEl = document.getElementById('seed');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const hex = h => { h = h.trim().replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
  const colors = () => {
    const s = getComputedStyle(document.documentElement);
    return { bg: hex(s.getPropertyValue('--surface')), glow: hex(s.getPropertyValue('--glow')), acc: hex(s.getPropertyValue('--accent')) };
  };

  // target: four-point star density with a soft violet haze
  const target = new Float32Array(N * N), haze = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = (x + 0.5) / N * 2 - 1, v = (y + 0.5) / N * 2 - 1;
    const ax = Math.abs(u), ay = Math.abs(v);
    const star = Math.pow(ax, 0.5) + Math.pow(ay, 0.5);
    target[y * N + x] = Math.max(0, Math.min(1, (0.95 - star) * 6));
    haze[y * N + x] = Math.max(0, 1 - Math.hypot(u, v) / 1.15);
  }

  let noise, seed;
  const reseed = () => {
    seed = Math.floor(Math.random() * 9999);
    let s = seed + 1;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    noise = Array.from({ length: N * N }, () => [rnd(), rnd()]);
    seedEl.textContent = 'seed ' + String(seed).padStart(4, '0');
  };

  const img = ctx.createImageData(N, N);
  const draw = step => {
    const { bg, glow, acc } = colors();
    const t = step / STEPS;
    const k = t * t * (3 - 2 * t);
    for (let i = 0; i < N * N; i++) {
      const [n1, n2] = noise[i];
      const h = haze[i] * 0.55 * k + n1 * 0.55 * (1 - k);
      const a = target[i] * k + (n2 > 0.72 ? n2 : 0) * (1 - k) * 0.9;
      const p = i * 4;
      for (let c = 0; c < 3; c++) {
        let v = bg[c] + (glow[c] - bg[c]) * h;
        v += (acc[c] - v) * Math.min(1, a);
        img.data[p + c] = v;
      }
      img.data[p + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    stepEl.textContent = 'step ' + String(step).padStart(2, '0') + ' / ' + STEPS;
  };

  reseed();
  if (reduce) { draw(STEPS); return; }

  let step = 0, last = 0, hold = 0;
  const tick = now => {
    if (now - last > 90) {
      last = now;
      if (step < STEPS) draw(++step);
      else if (++hold > 45) { hold = 0; step = 0; reseed(); draw(0); }
    }
    requestAnimationFrame(tick);
  };
  draw(0);
  requestAnimationFrame(tick);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => draw(step));
})();
