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
let completionStarted = false;

function showScreen(name) {
  Object.values(screens).forEach(screen => screen.classList.remove('is-visible'));
  screens[name].classList.add('is-visible');
}

function stopAudio() {
  audio.pause();
  audio.loop = false;
  audio.muted = false;
  audio.volume = 1;
  try { audio.currentTime = 0; } catch (_) {}
}

async function primeAudio() {
  /*
    Start the real audio element during the user's click. It keeps playing
    silently in a loop during the intro. This avoids losing the browser's
    permission to play sound after the long cinematic sequence.
  */
  try {
    audio.loop = true;
    audio.muted = true;
    audio.volume = 0;
    audio.currentTime = 0;
    await audio.play();
    return true;
  } catch (error) {
    console.warn('Audio kon niet vooraf worden gestart:', error);
    return false;
  }
}

async function finishFragment() {
  if (completionStarted) return;
  completionStarted = true;
  await wait(1200);
  showScreen('complete');
  localStorage.setItem('de-onthulling-fragment-01', 'voltooid');
}

async function revealAudio() {
  completionStarted = false;
  audioStatus.textContent = 'Audiofragment wordt afgespeeld';

  try {
    audio.loop = false;
    audio.pause();
    audio.currentTime = 0;
    audio.muted = false;
    audio.volume = 1;
    await audio.play();
  } catch (error) {
    console.warn('Geluid kon niet automatisch starten:', error);
    audioStatus.textContent = 'Tik hieronder om het geluidsfragment te starten.';
    replayButton.textContent = 'START GELUID';
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
    await wait(1200);
  }

  await wait(900);
  await runCountdown();
}

async function runCountdown() {
  showScreen('countdown');

  for (const value of [3, 2, 1]) {
    countdownEl.textContent = value;
    countdownEl.style.animation = 'none';
    void countdownEl.offsetWidth;
    countdownEl.style.animation = '';
    await wait(1250);
  }

  await wait(300);
  showScreen('audio');
  await revealAudio();
}

startButton.addEventListener('click', async () => {
  startButton.disabled = true;
  startButton.textContent = 'FRAGMENT WORDT GEOPEND…';

  // Do not wait for a separate download/decode step. Start immediately.
  primeAudio();
  await runProtocol();

  startButton.disabled = false;
  startButton.textContent = 'OPEN FRAGMENT';
});

replayButton.addEventListener('click', async () => {
  replayButton.textContent = 'OPNIEUW AFSPELEN';
  completionStarted = false;
  audio.loop = false;
  audio.muted = false;
  audio.volume = 1;
  audio.currentTime = 0;
  try {
    await audio.play();
    audioStatus.textContent = 'Audiofragment wordt afgespeeld';
  } catch (error) {
    audioStatus.textContent = 'Het geluid kon niet starten. Controleer of deze pagina niet gedempt is.';
  }
});

restartButton.addEventListener('click', () => {
  stopAudio();
  completionStarted = false;
  showScreen('start');
});

audio.addEventListener('ended', finishFragment);
audio.addEventListener('error', () => {
  audioStatus.textContent = 'Het audiobestand kon niet worden geladen.';
  replayButton.textContent = 'PROBEER OPNIEUW';
});
