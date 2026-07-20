const screens={start:document.getElementById('start-screen'),protocol:document.getElementById('protocol-screen'),countdown:document.getElementById('countdown-screen'),audio:document.getElementById('audio-screen'),complete:document.getElementById('complete-screen')};
const audio=document.getElementById('crowd-audio');
const startButton=document.getElementById('start-button');
const replayButton=document.getElementById('replay-button');
const restartButton=document.getElementById('restart-button');
const protocolLog=document.getElementById('protocol-log');
const progressBar=document.getElementById('progress-bar');
const countdownEl=document.getElementById('countdown');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function showScreen(name){Object.values(screens).forEach(screen=>screen.classList.remove('is-visible'));screens[name].classList.add('is-visible')}
async function runProtocol(){showScreen('protocol');protocolLog.innerHTML='';progressBar.style.width='0%';const entries=[['Protocol gestart...',18],['Beveiligde verbinding...',42],['Authenticatie voltooid.',68],['Nieuw fragment gedetecteerd.',86],['<strong>Fragment 01 wordt vrijgegeven...</strong>',100]];for(const [text,progress] of entries){const line=document.createElement('div');line.className='protocol-entry';line.innerHTML=text;protocolLog.appendChild(line);progressBar.style.width=`${progress}%`;await wait(760)}await wait(650);await runCountdown()}
async function runCountdown(){showScreen('countdown');for(const value of [3,2,1]){countdownEl.textContent=value;countdownEl.style.animation='none';void countdownEl.offsetWidth;countdownEl.style.animation='';await wait(1000)}showScreen('audio');await playAudio()}
async function playAudio(){try{audio.currentTime=0;await audio.play()}catch(error){document.querySelector('.audio-status').textContent='Tik op “Opnieuw afspelen” om het geluidsfragment te starten.'}}
audio.addEventListener('ended',async()=>{await wait(700);showScreen('complete');localStorage.setItem('de-onthulling-fragment-01','voltooid')});
startButton.addEventListener('click',async()=>{startButton.disabled=true;await runProtocol();startButton.disabled=false});
replayButton.addEventListener('click',playAudio);
restartButton.addEventListener('click',()=>{audio.pause();audio.currentTime=0;showScreen('start')});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&!audio.paused)audio.pause()});
