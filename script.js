const screens = {
  start: document.getElementById('start-screen'),
  protocol: document.getElementById('protocol-screen'),
  countdown: document.getElementById('countdown-screen'),
  audio: document.getElementById('audio-screen'),
  complete: document.getElementById('complete-screen')
};

const audio = document.getElementById('crowd-audio');
const startButton = document.getElementById('start-button');
const replayButton = document.getElementById('replay-button');
const restartButton = document.getElementById('restart-button');
const protocolLog = document.getElementById('protocol-log');
const progressBar = document.getElementById('progress-bar');
const countdownEl = document.getElementById('countdown');
const audioStatus = document.querySelector('.audio-status');

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

let audioContext = null;
let audioBuffer = null;
let currentSource = null;
let completionTimer = null;

function showScreen(name) {
  Object.values(screens).forEach(screen => screen.classList.remove('is-visible'));
  screens[name].classList.add('is-visible');
}

async function prepareAudio() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return false;

    audioContext = audioContext || new AudioContextClass();
    await audioContext.resume();

    if (!audioBuffer) {
      const response = await fetch('assets/fragment-01-applaus.mp3', { cache: 'force-cache' });
      if (!response.ok) throw new Error('Audiobestand kon niet worden geladen.');
      const arrayBuffer = await response.arrayBuffer();
      audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    }

    return true;
  } catch (error) {
    console.warn('Web Audio voorbereiding mislukt:', error);
    return false;
  }
}

function stopAudio() {
  clearTimeout(completionTimer);
  completionTimer = null;

  if (currentSource) {
    try { currentSource.stop(); } catch (_) {}
    currentSource.disconnect();
    currentSource = null;
  }

  audio.pause();
  audio.currentTime = 0;
}

async function finishFragment() {
  await wait(1300);
  showScreen('complete');
  localStorage.setItem('de-onthulling-fragment-01', 'voltooid');
}

async function playAudio() {
  stopAudio();
  audioStatus.textContent = 'Audiofragment wordt afgespeeld';

  if (audioContext && audioBuffer) {
    await audioContext.resume();
    currentSource = audioContext.createBufferSource();
    currentSource.buffer = audioBuffer;
    currentSource.connect(audioContext.destination);
    currentSource.onended = () => {
      currentSource = null;
      finishFragment();
    };
    currentSource.start(0);
    return;
  }

  try {
    audio.currentTime = 0;
    await audio.play();
  } catch (error) {
    console.warn('HTML-audio kon niet starten:', error);
    audioStatus.textContent = 'Tik op “Opnieuw afspelen” om het geluid te starten.';
  }
}

async function runProtocol() {
  showScreen('protocol');
  protocolLog.innerHTML = '';
  progressBar.style.width = '0%';

  const entries = [
    ['Protocol gestart...', 18],
    ['Beveiligde verbinding...', 42],
    ['Authenticatie voltooid.', 68],
    ['Nieuw fragment gedetecteerd.', 86],
    ['<strong>Fragment 01 wordt vrijgegeven...</strong>', 100]
  ];

  for (const [text, progress] of entries) {
    const line = document.createElement('div');
    line.className = 'protocol-entry';
    line.innerHTML = text;
    protocolLog.appendChild(line);
    progressBar.style.width = `${progress}%`;
    await wait(1450);
  }

  await wait(1500);
  await runCountdown();
}

async function runCountdown() {
  showScreen('countdown');

  for (const value of [3, 2, 1]) {
    countdownEl.textContent = value;
    countdownEl.style.animation = 'none';
    void countdownEl.offsetWidth;
    countdownEl.style.animation = '';
    await wait(1500);
  }

  await wait(450);
  showScreen('audio');
  await playAudio();
}

startButton.addEventListener('click', async () => {
  startButton.disabled = true;
  startButton.textContent = 'FRAGMENT WORDT GELADEN…';

  const prepared = await prepareAudio();
  if (!prepared) {
    // Deze korte start/pauze geeft de gewone audiospeler toestemming in strengere browsers.
    try {
      audio.muted = true;
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
      audio.muted = false;
    } catch (_) {
      audio.muted = false;
    }
  }

  await runProtocol();
  startButton.disabled = false;
  startButton.textContent = 'OPEN FRAGMENT';
});

replayButton.addEventListener('click', async () => {
  await prepareAudio();
  await playAudio();
});

restartButton.addEventListener('click', () => {
  stopAudio();
  showScreen('start');
});

audio.addEventListener('ended', finishFragment);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopAudio();
});
