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
// A bilingual .lrc cue can use "Original || Tiếng Việt" on the same timestamp.
// Without a delimiter, the single line is treated as the displayed Vietnamese caption.
export function splitCaption(words) {
  const text = String(words || '');
  const separator = text.indexOf(' || ');
  return separator === -1
    ? { original: '', translation: text.trim() }
    : { original: text.slice(0, separator).trim(), translation: text.slice(separator + 4).trim() };
}
export function cueIndexAt(lines, time, delay = 0) {
  const target = Number(time) - Number(delay || 0) + .08;
  let low = 0, high = lines.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (lines[mid].time <= target) low = mid + 1;
    else high = mid;
  }
  return low - 1;
}
export function createMusic(config, handlers = {}) {
  const $ = id => document.getElementById(id);
  const el = {
    shell: $('youtube-shell'), fallback: $('video-fallback'), play: $('play-toggle'),
    now: $('current-time'), end: $('duration'), bar: $('track-fill'), seek: $('seek-slider'),
    before: $('lyric-prev'), original: $('lyric-original'),
    current: $('lyric-current'), after: $('lyric-next'), caption: $('lyric-caption'),
    upload: $('lrc-upload'), offset: $('subtitle-offset'),
    offsetValue: $('subtitle-offset-value'), reset: $('lyrics-reset')
  };
  const local = config.mode === 'local';
  let player = null, audio = null, ready = false, playing = false, muted = false;
  let pendingPlay = false, finished = false, duration = config.initialDuration || 169;
  let position = 0, currentIndex = -999, lines = [], defaultLyrics = '';
  let subtitleDelay = 0, scrubbing = false, pendingSeek = null;
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
    const i = cueIndexAt(lines, time, subtitleDelay);
    if (i === currentIndex) return;
    currentIndex = i;
    const previous = i > 0 ? splitCaption(lines[i - 1].words) : null;
    const current = i >= 0 ? splitCaption(lines[i].words) : null;
    const next = i + 1 < lines.length ? splitCaption(lines[i + 1].words) : null;
    el.before.textContent = previous ? previous.translation : '';
    el.original.textContent = current ? current.original : '';
    el.current.textContent = current ? current.translation : 'Có những tình cảm khó nói thành lời.';
    el.after.textContent = next ? next.translation : '';
    // Only animate when the spoken line changes; avoid flicker during a seek.
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches && typeof el.current.animate === 'function') {
      el.current.animate([
        { opacity: .35, transform: 'translateY(5px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: 300, easing: 'ease-out' });
    }
  }
  function installLyrics(raw, label) {
    if (typeof raw !== 'string' || raw.length > 300000) throw new Error('File phụ đề quá lớn.');
    const parsed = parseLRC(raw);
    if (!parsed.length) throw new Error('Không tìm thấy dòng có timestamp [mm:ss.xx] trong file LRC.');
    lines = parsed.slice(0, 2000);
    currentIndex = -999;
    el.caption.textContent = label;
    drawLyrics(position);
    return lines.length;
  }
  async function loadLyrics() {
    try {
      const response = await fetch(config.lyricsUrl, { cache: 'no-cache' });
      if (!response.ok) throw new Error('Cannot load .lrc');
      defaultLyrics = await response.text();
      installLyrics(defaultLyrics, config.lyricsLabel || 'Phụ đề tiếng Việt đồng bộ cùng bài hát');
    } catch (error) {
      el.caption.textContent = 'Chưa tải được phụ đề · nhạc vẫn phát bình thường';
    }
  }
  function setSubtitleDelay(seconds) {
    subtitleDelay = Math.max(-5, Math.min(5, Number(seconds) || 0));
    el.offset.value = String(subtitleDelay);
    el.offsetValue.textContent = (subtitleDelay > 0 ? '+' : '') + subtitleDelay.toFixed(1) + ' giây';
    currentIndex = -999;
    drawLyrics(position);
  }
  el.upload.addEventListener('change', async () => {
    const file = el.upload.files && el.upload.files[0];
    if (!file) return;
    try {
      if (file.size > 300000) throw new Error('Chỉ hỗ trợ file LRC dưới 300 KB.');
      const count = installLyrics(await file.text(), 'Đang xem thử: ' + file.name + ' · ' + 'phụ đề cục bộ');
      notify('onCaptionLoaded', count);
    } catch (error) {
      notify('onError', error.message || 'Không đọc được file LRC.');
    }
    el.upload.value = '';
  });
  el.offset.addEventListener('input', () => setSubtitleDelay(el.offset.value));
  el.reset.addEventListener('click', () => {
    if (defaultLyrics) installLyrics(defaultLyrics, config.lyricsLabel || 'Phụ đề mặc định');
    setSubtitleDelay(0);
    notify('onCaptionReset');
  });
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
    if (!scrubbing) {
      const fraction = Math.min(1, Math.max(0, position / Math.max(1, duration)));
      el.bar.style.width = (fraction * 100) + '%';
      el.seek.value = String(Math.round(fraction * 1000));
    }
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
    audio.addEventListener('loadedmetadata', () => {
      duration = audio.duration; ready = true;
      if (pendingSeek !== null) { audio.currentTime = pendingSeek; pendingSeek = null; }
      notify('onReady');
    });
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
            if (pendingSeek !== null) { try { player.seekTo(pendingSeek, true); } catch (e) {} pendingSeek = null; }
            if (muted) { try { player.mute(); } catch (e) {} }
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
  function seek(seconds) {
    if (!Number.isFinite(seconds)) return;
    const next = Math.max(0, Math.min(seconds, duration));
    position = next;
    currentIndex = -999;
    if (local && audio) {
      try { audio.currentTime = next; } catch (error) { notify('onError', 'Không thể tua audio.'); }
    } else if (player && ready) {
      try { player.seekTo(next, true); } catch (error) { notify('onError', 'Không thể tua YouTube.'); }
    } else pendingSeek = next;
    drawLyrics(next);
    notify('onTick', next, duration, playing);
  }
  function toggle() { if (playing) pause(); else play(); }
  el.seek.addEventListener('input', () => {
    scrubbing = true;
    const seconds = Number(el.seek.value) / 1000 * duration;
    el.now.textContent = fmt(seconds);
    el.bar.style.width = (Number(el.seek.value) / 10) + '%';
  });
  el.seek.addEventListener('change', () => {
    const seconds = Number(el.seek.value) / 1000 * duration;
    scrubbing = false;
    seek(seconds);
  });
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
    play, pause, toggle, replay, seek, setMuted, setSubtitleDelay, installLyrics,
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