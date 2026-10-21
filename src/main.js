import { createScene } from './scene.js';
import { createMusic } from './music.js';
import { STORY_CONFIG } from './config.js';

const $ = id => document.getElementById(id);
const app = $('app');
const intro = $('intro');
const finale = $('finale');
const letter = $('letter-overlay');
const thought = $('thought');
const skip = $('skip-btn');
const chapters = [
  {
    at: 0, number: '01', progress: 15,
    eyebrow: 'CHAPTER 01 / A QUIET NIGHT',
    title: 'Đêm nay,<br><em>tớ có điều muốn nói.</em>',
    description: 'Có những đêm ta ngồi rất yên, nhưng trong lòng lại có thật nhiều điều đang diễn ra.'
  },
  {
    at: 36, number: '02', progress: 41,
    eyebrow: 'CHAPTER 02 / THE THINGS WE FEEL',
    title: 'Tớ cứ nghĩ<br><em>về một người.</em>',
    description: 'Và kỳ lạ là, đôi khi người đó chỉ cần xuất hiện cũng đủ khiến một ngày khác đi.'
  },
  {
    at: 91, number: '02', progress: 67,
    eyebrow: 'CHAPTER 02 / A BRAVE LITTLE HEART',
    title: 'Có lẽ trái tim<br><em>biết trước tớ rồi.</em>',
    description: 'Tớ đã định giấu thật kỹ. Nhưng có những nhịp đập chẳng nghe lời ai.'
  },
  {
    at: 143, number: '03', progress: 87,
    eyebrow: 'CHAPTER 03 / ALMOST THERE',
    title: 'Chỉ một câu thôi.<br><em>Can đảm lên nào.</em>',
    description: 'Vì có một người thật sự xứng đáng được nghe điều ấy.'
  }
];
const thoughts = [
  { at: 10, text: 'Sao tự dưng lại nhớ đến cậu nhỉ…' },
  { at: 29, text: '' },
  { at: 47, text: 'Chỉ là một tin nhắn thôi mà…' },
  { at: 66, text: '' },
  { at: 83, text: 'Hình như có gì đó lạ lắm.' },
  { at: 101, text: '' },
  { at: 118, text: 'Ừm… chắc mình biết rồi.' },
  { at: 136, text: '' },
  { at: 149, text: 'Nói ra nhé?' },
  { at: 161, text: '' }
];
let world = null, music = null, started = false, finalizing = false, letterOpen = false;
let chapterIndex = -1, thoughtIndex = -1, toastTimeout = null, finaleTimeout = null;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

function toast(message, ms = 5000) {
  $('toast').textContent = message;
  $('toast').classList.add('visible');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => $('toast').classList.remove('visible'), ms);
}
function begin(requestMusic = true) {
  if (finalizing) return;
  if (!started) {
    started = true;
    app.classList.add('is-started');
    intro.setAttribute('aria-hidden', 'true');
    $('bottom-message').textContent = 'THE NIGHT IS QUIET. THE HEART, NOT SO MUCH.';
    updateNarration(0, true);
  }
  if (requestMusic && music) music.play();
}
function updateNarration(t, force = false) {
  if (!started || finalizing) return;
  let j = 0;
  for (let i = 0; i < chapters.length; i++) if (t >= chapters[i].at) j = i;
  if (j !== chapterIndex || force) {
    chapterIndex = j;
    const stage = chapters[j];
    $('chapter-number').textContent = stage.number;
    $('rail-progress').style.height = stage.progress + '%';
    $('scene-eyebrow').textContent = stage.eyebrow;
    $('scene-title').innerHTML = stage.title;
    $('scene-subtitle').textContent = stage.description;
    if (!reduced) $('scene-title').animate([{ opacity: .2, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 900, easing: 'ease-out' });
  }
  let k = -1;
  for (let i = 0; i < thoughts.length; i++) if (t >= thoughts[i].at) k = i;
  if (k !== thoughtIndex) {
    thoughtIndex = k;
    thought.classList.remove('is-visible');
    if (k >= 0 && thoughts[k].text) {
      thought.textContent = thoughts[k].text;
      requestAnimationFrame(() => requestAnimationFrame(() => thought.classList.add('is-visible')));
    }
  }
}
function showFinale() {
  if (!finalizing) return;
  clearTimeout(finaleTimeout);
  finale.classList.add('is-active');
  finale.setAttribute('aria-hidden', 'false');
  $('bottom-message').textContent = 'SOME THINGS ARE WORTH SAYING.';
}
function endStory() {
  if (finalizing) return;
  if (!started) begin(false);
  finalizing = true;
  app.classList.add('is-finalizing');
  $('chapter-number').textContent = '03';
  $('rail-progress').style.height = '100%';
  if (music) music.pause();
  if (world) {
    world.setPlaying(false);
    world.finale();
    finaleTimeout = setTimeout(showFinale, 7400);
  } else {
    showFinale();
  }
}
function openLetter() {
  if (!finalizing) return;
  letterOpen = true;
  letter.classList.add('is-open');
  letter.setAttribute('aria-hidden', 'false');
  $('letter-close').focus();
}
function closeLetter() {
  if (!letterOpen) return;
  letterOpen = false;
  letter.classList.remove('is-open');
  letter.setAttribute('aria-hidden', 'true');
  $('envelope-btn').focus();
}

try {
  world = createScene($('world'), { onFinaleReady: showFinale });
  $('loading').classList.add('is-done');
} catch (error) {
  console.error('3D rendering failed:', error);
  $('loading').classList.add('is-done');
  app.classList.add('no-webgl');
  toast('Trình duyệt không hỗ trợ WebGL. Nội dung và lá thư vẫn có thể xem được.', 7500);
}

music = createMusic(STORY_CONFIG, {
  onPlay: () => { begin(false); if (world) world.setPlaying(true); },
  onPause: () => { if (world) world.setPlaying(false); },
  onEnded: endStory,
  onTick: (time, duration, playing) => {
    if (world) world.setMusicTime(time);
    updateNarration(time);
  },
  onError: message => toast(message, 7000),
  onWait: () => toast('Đang kết nối YouTube. Nếu nhạc chưa phát, nhấn ▶ trên video hoặc trong khung nhạc.')
});

$('start-btn').addEventListener('click', () => begin(true));
$('play-toggle').addEventListener('click', () => {
  if (!started) begin(false);
  if (finalizing) { toast('Đêm đã sang chương cuối. Nhấn xem lại từ đầu nếu muốn nghe lại nhé.'); return; }
  music.toggle();
});
$('replay-song').addEventListener('click', () => {
  if (finalizing) { location.reload(); return; }
  begin(false); music.replay();
});
$('sound-toggle').addEventListener('click', () => {
  const mute = music.setMuted(!music.muted);
  $('sound-icon').textContent = mute ? '♩' : '♫';
  $('sound-label').textContent = mute ? 'ÂM THANH TẮT' : 'ÂM THANH BẬT';
  $('sound-toggle').setAttribute('aria-label', mute ? 'Bật âm thanh' : 'Tắt âm thanh');
});
skip.addEventListener('click', endStory);
$('envelope-btn').addEventListener('click', openLetter);
$('letter-close').addEventListener('click', closeLetter);
letter.addEventListener('click', event => { if (event.target === letter) closeLetter(); });
$('restart-btn').addEventListener('click', () => location.reload());
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && letterOpen) closeLetter();
});
$('fullscreen-btn').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch (error) {
    toast('Trình duyệt của bạn chưa hỗ trợ chế độ toàn màn hình.');
  }
});
window.addEventListener('beforeunload', () => { if (music) music.dispose(); if (world) world.dispose(); });
