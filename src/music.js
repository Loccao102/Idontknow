export function parseLRC(raw) {
  const result = [];
  const text = String(raw || '').replace(/^\uFEFF/, '');
  let offset = 0;
  const offsetMatch = text.match(/^\[offset:([+-]?\d+)\]/im);
  if (offsetMatch) offset = Number(offsetMatch[1]) / 1000;
  for (const line of text.split(/\r?\n/)) {
    const tags = [...line.matchAll(/\[(\d{1,3}):(\d{2}(?:\.\d{1,3})?)\]/g)];
    const words = line.replace(/\[(\d{1,3}):(\d{2}(?:\.\d{1,3})?)\]/g, '').trim();
    if (!words) continue;
    for (const tag of tags) {
      result.push({ time: Math.max(0, Number(tag[1]) * 60 + Number(tag[2]) + offset), words });
    }
  }
  return result.sort((a, b) => a.time - b.time);
}
export function createMusic(config, handlers = {}) {
  const $ = id => document.getElementById(id);
  const el = {
    shell: $('youtube-shell'), fallback: $('video-fallback'), play: $('play-toggle'),
    now: $('current-time'), end: $('duration'), bar: $('track-fill'),
    before: $('lyric-prev'), current: $('lyric-current'), after: $('lyric-next'),
    caption: $('lyric-caption')
  };
  const local = config.mode === 'local';
  let player = null, audio = null, ready = false, playing = false, muted = false;
  let pendingPlay = false, finished = false, duration = config.initialDuration || 169;
  let position = 0, currentIndex = -999, lines = [];
  const fmt = value => {
    const n = Number.isFinite(value) ? Math.floor(Math.max(0, value)) : 0;
    return Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0');
  };
  const notify = (name, ...args) => { if (typeof handlers[name] === 'function') handlers[name](...args); };
  function onPlay() {
    if (!playing) { playing = true; document.getElementById('app').classList.add('is-playing'); notify('onPlay'); }
  }
  function onPause() {
    if (playing) { playing = false; document.getElementById('app').classList.remove('is-playing'); notify('onPause'); }
  }
  function onEnded() {
    if (finished) return;
    finished = true; onPause(); notify('onEnded');
  }
  function drawLyrics(time) {
    if (!lines.length) return;
    let i = -1;
    for (let j = 0; j < lines.length; j++) {
      if (lines[j].time > time + .08) break;
      i = j;
    }
    if (i === currentIndex) return;
    currentIndex = i;
    el.before.textContent = i > 0 ? lines[i - 1].words : '';
    el.current.textContent = i >= 0 ? lines[i].words : 'Có những tình cảm khó nói thành lời.';
    el.after.textContent = i + 1 < lines.length ? lines[i + 1].words : '';
    el.current.animate([
      { opacity: .2, transform: 'translateY(7px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ], { duration: 430, easing: 'ease-out' });
  }
  async function loadLyrics() {
    try {
      const response = await fetch(config.lyricsUrl, { cache: 'no-cache' });
      if (!response.ok) throw new Error('Cannot load the .lrc file');
      lines = parseLRC(await response.text());
      if (!lines.length) throw new Error('No timestamped lyric lines');
      el.caption.textContent = config.lyricsLabel || 'Phụ đề tiếng Việt đồng bộ cùng bài hát';
      drawLyrics(0);
    } catch (error) {
      el.caption.textContent = 'Chưa tải được phụ đề · nhạc vẫn phát bình thường';
    }
  }
  function draw() {
    if (local && audio) {
      position = Number.isFinite(audio.currentTime) ? audio.currentTime : position;
      if (Number.isFinite(audio.duration)) duration = audio.duration;
    } else if (player && ready) {
      try {
        const p = player.getCurrentTime();
        const d = player.getDuration();
        if (Number.isFinite(p)) position = p;
        if (Number.isFinite(d) && d > 0) duration = d;
      } catch (error) { /* YouTube is still initializing. */ }
    }
    el.now.textContent = fmt(position);
    el.end.textContent = fmt(duration);
    el.bar.style.width = Math.min(100, position / Math.max(1, duration) * 100) + '%';
    el.play.textContent = playing ? '❚❚' : '▶';
    el.play.setAttribute('aria-label', playing ? 'Tạm dừng nhạc' : 'Phát nhạc');
    drawLyrics(position);
    notify('onTick', position, duration, playing);
  }
  function createLocalPlayer() {
    audio = new Audio(config.localAudioUrl);
    audio.preload = 'metadata';
    audio.playsInline = true;
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('loadedmetadata', () => { duration = audio.duration; ready = true; notify('onReady'); });
    audio.addEventListener('error', () => notify('onError', 'Không tải được audio. Hãy kiểm tra đường dẫn trong src/config.js.'));
    el.shell.innerHTML = '<div class="local-audio-art"><span>♡</span><small>FROM THE START · LOCAL AUDIO</small></div>';
    el.shell.classList.add('is-ready', 'is-local');
  }
  function createYoutubePlayer() {
    const create = () => {
      if (!window.YT || !window.YT.Player || player) return;
      player = new window.YT.Player('yt-player', {
        videoId: config.youtubeId,
        width: '100%', height: '100%',
        playerVars: { playsinline: 1, controls: 1, rel: 0, modestbranding: 1, origin: location.origin },
        events: {
          onReady: () => {
            ready = true; el.shell.classList.add('is-ready'); notify('onReady');
            if (pendingPlay) { pendingPlay = false; try { player.playVideo(); } catch (e) { notify('onError', 'Hãy nhấn Play trên video YouTube.'); } }
          },
          onStateChange: event => {
            const S = window.YT.PlayerState;
            if (event.data === S.PLAYING) { finished = false; onPlay(); }
            if (event.data === S.PAUSED || event.data === S.CUED) onPause();
            if (event.data === S.ENDED) onEnded();
          },
          onError: () => {
            el.shell.classList.remove('is-ready');
            el.fallback.style.zIndex = '2';
            el.fallback.style.pointerEvents = 'auto';
            notify('onError', 'Video không cho phép phát nhúng. Có thể mở trên YouTube hoặc xem trước lá thư.');
          }
        }
      });
    };
    if (window.YT && window.YT.Player) { create(); return; }
    window.onYouTubeIframeAPIReady = create;
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.async = true;
    s.onerror = () => {
      el.fallback.style.zIndex = '2'; el.fallback.style.pointerEvents = 'auto';
      notify('onError', 'Không kết nối được tới YouTube. Bạn vẫn có thể mở thư sớm.');
    };
    document.head.append(s);
  }
  async function play() {
    finished = false;
    if (local) {
      try { await audio.play(); } catch (e) { notify('onError', 'Trình duyệt yêu cầu bạn nhấn Play để phát audio.'); }
    } else if (!ready) {
      pendingPlay = true;
      notify('onWait');
    } else {
      try { player.playVideo(); } catch (error) { notify('onError', 'Vui lòng bấm Play trong video YouTube.'); }
    }
  }
  function pause() {
    pendingPlay = false;
    if (local && audio) audio.pause();
    else if (player && ready) try { player.pauseVideo(); } catch (e) {}
  }
  function toggle() { if (playing) pause(); else play(); }
  function replay() {
    finished = false; position = 0; currentIndex = -999;
    if (local && audio) { audio.currentTime = 0; play(); }
    else if (player && ready) { player.seekTo(0, true); play(); }
    else play();
    draw();
  }
  function setMuted(value) {
    muted = !!value;
    if (local && audio) audio.muted = muted;
    else if (player && ready) try { muted ? player.mute() : player.unMute(); } catch (e) {}
    return muted;
  }
  loadLyrics();
  if (local) createLocalPlayer(); else createYoutubePlayer();
  const interval = setInterval(draw, 240);
  draw();
  return {
    play, pause, toggle, replay, setMuted,
    get playing() { return playing; },
    get ready() { return ready; },
    get muted() { return muted; },
    get currentTime() { return position; },
    get duration() { return duration; },
    dispose() {
      clearInterval(interval);
      if (audio) audio.pause();
      if (player && ready && !local) try { player.destroy(); } catch (e) {}
    }
  };
}