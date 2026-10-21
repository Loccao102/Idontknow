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

The side captions are **original story captions**, not copyrighted song lyrics. The YouTube video the user supplied is a lyrics video, so its on-video lyrics remain available to the viewer. Later, replace `assets/captions.lrc` with a permitted timestamped LRC file for synchronized lines in the side panel. Multiple [mm:ss.xx] cues are supported.

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
- `assets/captions.lrc`: replaceable original captions.

The source repo is public. Do not place private information or surprises you don't want indexed into this repo, even though the HTML includes a noindex directive.

## Cinematic pacing and review
The camera is directed by the soundtrack playback time: pausing and seeking changes the shot rather than the scene silently continuing. Shots drift around the campfire, then move towards the boy, hold on the heartbeat, and widen before the finale. The last ~6.2 seconds have two different beats: first the camera approaches, then the boy gradually lifts his head to face the viewer, and then the envelope appears. Small glowing heart particles gradually appear during the middle act and fade before the final letter.

The boy is intentionally stylized and made of procedural 3D geometry, not a photorealistic human model. We still recommend visual QA in a desktop and mobile browser before sharing. GitHub Actions validates JavaScript syntax, caption parsing, camera interpolation, and continuity. YouTube may reject auto-play and/or embedding on some browsers; the viewer can use the embedded video controls, open the video on YouTube, or choose the manual letter reveal.

To tune camera direction see `src/cinematography.js`; for shaders and body acting see `src/scene.js`; for story chapters see `src/main.js`.
