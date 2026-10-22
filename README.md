# I don't know — From The Start ♡

An interactive, cinematic 3D mini-story: a boy sits by a campfire, his heart glows, a song plays, and the final camera movement reveals a letter. Made for GitHub Pages; no build pipeline required.

## Preview and publishing
1. GitHub → **Settings → Pages → Build and deployment → Deploy from a branch**.
2. Choose **main** and **/(root)**, then Save.
3. Public URL should be `https://loccao102.github.io/Idontknow/` once GitHub Pages publishes. (The URL is an expected Pages pattern, not proof that deployment is enabled.)
4. For local development, run `python -m http.server 8080` and open `http://localhost:8080/`. Do not use `file://`.

The stage uses Three.js 0.169.0 via a pinned jsDelivr import map. Fonts are from Google Fonts. Internet is required for these dependencies and the YouTube player.

## Music and lyrics
Current soundtrack: **Laufey — From The Start**, via YouTube IFrame Player API, video `rHvQakk1zMA`. Playback requires an intentional user action, and some browsers may also require clicking inside YouTube's player. YouTube provides timing and end events if embedding is permitted. A visible *Open on YouTube* fallback and manual *Open the letter early* button remain available if embedding fails.

The side captions currently contain **Vietnamese section-by-section interpretations of the song's meaning**, not a literal, line-by-line translation. They are labeled as such in the UI, and their timestamps are approximate. YouTube remains the audio source. For a line-faithful Vietnamese karaoke track, replace `assets/captions.lrc` with an English/Vietnamese translation file you provide or are authorized to use, using one timestamp and Vietnamese sentence per LRC line. The player already supports multiple `[mm:ss.xx]` cues, timestamps, seeking, and replay. Update `lyricsLabel` in `src/config.js` to `'Lời dịch tiếng Việt đồng bộ theo bài hát'` once the exact translation is installed.

### Replace YouTube with your own audio later
1. Put the audio at `assets/from-the-start.mp3`.
2. Update `src/config.js` from `mode: 'youtube'` to `mode: 'local'`.
3. Optionally edit `localAudioUrl`, `lyricsUrl`, and the letter text in `index.html`.
4. The music controller automatically reads local audio time and `ended`, so the scene and letter still stay synchronized.

## Cinematic controls
- **Bắt đầu câu chuyện**: enters the 3D story and asks YouTube to play.
- **▶ / ❚❚**: pauses/resumes the soundtrack.
- **↺**: restarts the soundtrack.
- **Mở lá thư sớm**: watches the finale without waiting for YouTube (useful when embedding is blocked).
- **⛶**: fullscreen mode.
- On song end, the camera dollies toward the boy; his head lifts and the envelope appears. Opening it reveals the confession. ESC closes the letter.
- Mobile and reduced-motion preferences are supported.

## Structure
- `index.html`: story UI, letter, YouTube panel.
- `src/styles.css`: responsive cinematic UI and animated envelope.
- `src/scene.js`: procedural forest, flowing shader campfire, blinking/breathing 3D boy, drifting hearts, heartbeat.
- `src/cinematography.js`: continuous audio-directed camera keyframes (mobile + desktop), delayed head-raise on the closing shot.
- `src/music.js`: YouTube / local audio timing and LRC rendering.
- `src/main.js`: narrative state, events and scene transitions.
- `src/config.js`: audio and lyrics configuration.
- `assets/captions.lrc`: replaceable Vietnamese thematic captions (approximate cue times, not literal translation).

The source repo is public. Do not place private information or surprises you don't want indexed into this repo, even though the HTML includes a noindex directive.

## Cinematic pacing and review
The camera is directed by the soundtrack playback time: pausing and seeking changes the shot rather than the scene silently continuing. The camera follows three deliberate beats, progressing slowly from a wide view towards the boy before a final close-up. The last ~5.8 seconds have two different beats: first the camera approaches, then the boy gradually lifts his head to face the viewer, and then the envelope appears. Excess background and floating-heart decorations have been removed in the cleaner cinematic pass.

The boy is intentionally stylized and made of procedural 3D geometry, not a photorealistic human model. We still recommend visual QA in a desktop and mobile browser before sharing. GitHub Actions validates JavaScript syntax, caption parsing, camera interpolation, and continuity. YouTube may reject auto-play and/or embedding on some browsers; the viewer can use the embedded video controls, open the video on YouTube, or choose the manual letter reveal.

To tune camera direction see `src/cinematography.js`; for shaders and body acting see `src/scene.js`; for story chapters see `src/main.js`.

## Supplying exact Vietnamese subtitles

Share the original lyrics as text, or provide your own translated `.lrc`. For time-synchronized karaoke subtitles, save the Vietnamese translation in `assets/captions.lrc`, UTF-8:

```lrc
[ti:From The Start — Vietnamese subtitles]
[00:00.00]Dòng lời dịch đầu tiên do bạn cung cấp
[00:05.20]Dòng lời dịch tiếp theo do bạn cung cấp
```

Do not place an MP3 or copyrighted text in this public repository unless you have the appropriate rights. The translation text is read directly from the LRC file and rendered with `textContent` for safety; the current file intentionally contains original section summaries rather than reproducing the song lyric lines.

## v1.4 — Controls, captions and motion

### Improved sound and subtitles
- The music timeline can now be dragged or used with the keyboard to seek YouTube (or local audio) without leaving the scene. The current shot and captions follow the same playback position.
- Open **Chỉnh phụ đề** below the captions to preview a timestamped .lrc or .txt file **only in your current browser session**. The selected file is not uploaded, stored on a server, or committed to the repository. It disappears on reload.
- Caption formats:
  - `[00:15.50]Bản dịch tiếng Việt`
  - `[00:15.50]Original line || Bản dịch tiếng Việt` — original line above the Vietnamese one.
- Adjust **Độ trễ phụ đề** between -5 and +5 seconds (positive means captions appear later), then **Khôi phục** to reset to the packaged thematic subtitles. This adjustment is also session-only.
- Until a translation is supplied, the bundled `assets/captions.lrc` remains an explicitly labeled **interpretation of the song by sections**, not a faithful full translation. To publish a permanent lyric track, replace that file and update `lyricsLabel` in `src/config.js`.

### Motion, performance and letter
- A right-forearm pivot enables a small acting gesture rather than fixed hands. The scene is still an intentionally stylized procedural 3D model, not motion capture or a production character rig.
- Resolved a runtime error when a mobile device is rotated or a desktop browser is resized; 3D animation also pauses in hidden tabs to save battery.
- The letter reopens at the top and keeps keyboard focus inside its dialog; Escape closes it.
- Keyboard shortcuts when the story is active: **K** toggles music; **Left/Right** seeks ±5 seconds (not while using inputs).
- The sparse three-beat camera approach, neutral face and reduced background particle count from the previous pass are kept.

### Useful local verification
Run `npm test` to execute the timestamp, subtitle import, camera continuity and UI structure tests. GitHub Actions checks syntax and runs all tests whenever you push.

