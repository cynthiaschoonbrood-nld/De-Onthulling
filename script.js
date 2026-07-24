(() => {
  'use strict';

  const IMAGE_FILES = Array.from({ length: 8 }, (_, i) => `assets/images/rotterdam-${String(i + 1).padStart(2, '0')}.jpeg`);
  const MUSIC_DURATION_FALLBACK = 40.853333;
  const CROSSFADE = 1.15;

  const loader = document.getElementById('loader');
  const countdown = document.getElementById('countdown');
  const rotterdam = document.getElementById('rotterdam');
  const blackout = document.getElementById('blackout');
  const finale = document.getElementById('finale');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const startButton = document.getElementById('startButton');
  const countNumber = document.getElementById('countNumber');
  const boomText = document.getElementById('boomText');
  const slidesRoot = document.getElementById('slides');
  const music = document.getElementById('music');
  const finalText = document.getElementById('finalText');

  let audioContext;
  let started = false;
  let slideNodes = [];
  let rafId = 0;

  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

  function activate(scene) {
    [loader, countdown, rotterdam, blackout, finale].forEach(node => {
      const on = node === scene;
      node.classList.toggle('active', on);
      node.setAttribute('aria-hidden', String(!on));
    });
  }

  function preloadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = resolve;
      img.onerror = reject;
      img.src = src;
    });
  }

  async function preloadAll() {
    const tasks = IMAGE_FILES.map(preloadImage);
    tasks.push(new Promise(resolve => {
      if (music.readyState >= 3) return resolve();
      music.addEventListener('canplaythrough', resolve, { once: true });
      music.addEventListener('error', resolve, { once: true });
      music.load();
    }));

    let complete = 0;
    await Promise.all(tasks.map(task => task.catch(() => {}).then(() => {
      complete += 1;
      const value = Math.round((complete / tasks.length) * 100);
      progressBar.style.width = `${value}%`;
      progressText.textContent = `${value}%`;
    })));

    await wait(300);
    startButton.disabled = false;
    startButton.classList.add('ready');
  }

  function buildSlides() {
    const motions = ['motion-a', 'motion-b', 'motion-c'];
    slideNodes = IMAGE_FILES.map((src, index) => {
      const node = document.createElement('div');
      node.className = `slide ${motions[index % motions.length]}`;
      node.style.backgroundImage = `url("${src}")`;
      slidesRoot.appendChild(node);
      return node;
    });
  }

  function getAudioContext() {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    return audioContext;
  }

  function playBoom(intensity = 1) {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.9 * intensity, now + 0.012);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 1.25);
    master.connect(ctx.destination);

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(92, now);
    osc.frequency.exponentialRampToValueAtTime(34, now + 0.55);
    oscGain.gain.setValueAtTime(0.9, now);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
    osc.connect(oscGain).connect(master);
    osc.start(now);
    osc.stop(now + 1.2);

    const buffer = ctx.createBuffer(1, ctx.sampleRate * 1.1, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2.8);
    const noise = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const noiseGain = ctx.createGain();
    noise.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(850, now);
    filter.frequency.exponentialRampToValueAtTime(90, now + .85);
    noiseGain.gain.setValueAtTime(.8, now);
    noiseGain.gain.exponentialRampToValueAtTime(.0001, now + 1.05);
    noise.connect(filter).connect(noiseGain).connect(master);
    noise.start(now);
  }

  async function runCountdown() {
    activate(countdown);
    for (const n of [3, 2, 1]) {
      countNumber.textContent = n;
      countNumber.classList.remove('pulse');
      void countNumber.offsetWidth;
      countNumber.classList.add('pulse');
      await wait(930);
    }
    countNumber.textContent = '';
    countdown.classList.add('flash');
    boomText.classList.add('hit');
    playBoom(1);
    await wait(900);
    countdown.classList.remove('flash');
  }

  function updateSlides() {
    const duration = Number.isFinite(music.duration) && music.duration > 1 ? music.duration : MUSIC_DURATION_FALLBACK;
    const segment = duration / slideNodes.length;
    const t = Math.min(music.currentTime, duration - 0.001);
    const current = Math.min(slideNodes.length - 1, Math.floor(t / segment));
    const local = t - current * segment;

    slideNodes.forEach((node, index) => {
      let opacity = 0;
      if (index === current) opacity = 1;
      if (index === current - 1 && local < CROSSFADE) opacity = 1 - local / CROSSFADE;
      if (index === current && current > 0 && local < CROSSFADE) opacity = local / CROSSFADE;
      node.style.opacity = opacity.toFixed(3);
      node.style.zIndex = String(index);
    });

    if (!music.ended && !music.paused) rafId = requestAnimationFrame(updateSlides);
  }

  async function runRotterdam() {
    activate(rotterdam);
    const duration = Number.isFinite(music.duration) && music.duration > 1 ? music.duration : MUSIC_DURATION_FALLBACK;
    const segment = duration / slideNodes.length;
    slideNodes.forEach(node => node.style.setProperty('--duration', `${segment + CROSSFADE}s`));
    slideNodes[0].style.opacity = '1';
    music.currentTime = 0;
    await music.play();
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(updateSlides);
    await new Promise(resolve => music.addEventListener('ended', resolve, { once: true }));
    cancelAnimationFrame(rafId);
  }

  async function runFinale() {
    activate(blackout);
    await wait(900);
    activate(finale);
    startFireworks();
    await wait(950);
    playBoom(1.18);
    await wait(180);
    finalText.classList.add('show');
  }

  async function startExperience() {
    if (started) return;
    started = true;
    startButton.disabled = true;
    try { await getAudioContext().resume(); } catch (_) {}
    await runCountdown();
    await runRotterdam();
    await runFinale();
  }

  function startFireworks() {
    const canvas = document.getElementById('fireworks');
    const ctx = canvas.getContext('2d');
    let w, h, particles = [], rockets = [], lastLaunch = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function explode(x, y, power = 1) {
      const count = Math.floor(85 * power);
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = (1.5 + Math.random() * 5.4) * power;
        particles.push({ x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s, life: 1, decay: .008 + Math.random()*.012, size: .8 + Math.random()*2.1, hue: 40 + Math.random()*13 });
      }
    }

    function launch(now) {
      const x = w * (.16 + Math.random() * .68);
      const targetY = h * (.13 + Math.random() * .34);
      rockets.push({ x, y: h + 15, vx: (Math.random()-.5)*.5, vy: -(7.5 + Math.random()*3), targetY, trail: [] });
      lastLaunch = now;
    }

    function frame(now) {
      ctx.fillStyle = 'rgba(3,3,3,.20)';
      ctx.fillRect(0,0,w,h);
      if (now - lastLaunch > 420 + Math.random()*520) launch(now);

      rockets = rockets.filter(r => {
        r.trail.push({x:r.x,y:r.y}); if (r.trail.length > 10) r.trail.shift();
        r.x += r.vx; r.y += r.vy; r.vy += .025;
        ctx.beginPath(); ctx.moveTo(r.x,r.y+12); ctx.lineTo(r.x,r.y);
        ctx.strokeStyle='rgba(255,218,112,.9)'; ctx.lineWidth=2; ctx.stroke();
        if (r.y <= r.targetY || r.vy >= -1) { explode(r.x,r.y,.85+Math.random()*.55); return false; }
        return true;
      });

      particles = particles.filter(p => {
        p.x += p.vx; p.y += p.vy; p.vx *= .992; p.vy = p.vy*.992 + .035; p.life -= p.decay;
        if (p.life <= 0) return false;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.size*Math.max(.25,p.life),0,Math.PI*2);
        ctx.fillStyle=`hsla(${p.hue},100%,${64 + p.life*25}%,${p.life})`;
        ctx.shadowBlur=12; ctx.shadowColor='rgba(255,205,70,.9)'; ctx.fill(); ctx.shadowBlur=0;
        return true;
      });
      requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener('resize', resize, { passive: true });
    explode(w*.5,h*.34,1.4);
    requestAnimationFrame(frame);
  }

  buildSlides();
  preloadAll();
  startButton.addEventListener('click', startExperience);
})();
