English | [日本語](README.ja.md) | [简体中文](README.zh-CN.md)

# Claude Desktop Splash · Dawn

A startup animation for the Claude desktop app on Windows. When you double-click the shortcut, the animation plays over the Claude window while Claude starts in the background, then fades out to reveal Claude.

> Unofficial personal project, not affiliated with Anthropic. Windows only; needs Microsoft Edge and the Microsoft Store version of the Claude desktop app. The on-screen text is in Chinese.

## Where it comes from and what changed

This project is a rewrite of [Firefade0329/claude-desktop-splash](https://github.com/Firefade0329/claude-desktop-splash) and its fork [Inanis404/claude-desktop-splash](https://github.com/Inanis404/claude-desktop-splash) (v1.2.0, MIT). The original projects are left untouched; this is a separate project.

- **Launcher** (`launcher\`): mostly the original. It covers the Claude window, follows it and fades out, and its authors have tested it on Windows. Only the default shortcut name changed, and `-Art` now falls back to `config.js` when it is not given.
- **Animation** (`splash.html`, `js\`): restaged around a "dawn" theme, borrowing ideas from the DeepSeek Harness boot suite and the Codex dragon-girl boot animation:
  1. **Prologue · star**: Claude's ✱ draws itself ray by ray, pulses and bursts into a ring.
  2. **Light ribbons**: kept from the original project.
  3. **01 Sketch**: several glowing pen tips draw the character along her lines, eyes last (the original used a radial reveal).
  4. **02 Ink**: colour spreads from the daisy brooch like watercolour while night turns to morning and light slants in from the top left.
  5. **03 Dawn**: a gust of wind blows a huge, very close petal across the lens, briefly hiding part of the picture; the camera pushes in slowly and she opens her eyes. By default she is animated with the original Live2D video (the quality can be chosen), from the moment the colour spreads to the very end as one continuous animation (from about 7 s it slows into slow motion): hair and ribbons move in the wind, and she blinks once, with no switch to a still picture. With Live2D turned off she is a still picture that opens her eyes and blinks (the tips of her hair can sway gently); this is the lightest mode.
  6. **04 Ready**: the `✱ Claude` wordmark is outlined, filled and swept by light; the welcome line types itself out.
  7. **Voice**: after the music settles, a gentle girl's voice says "Welcome back, my dear friend.", and the line appears under the title. She does not move her lips: lip sync was tried (the original lip lines opening like a Live2D mesh, with the jaw following), but her mouth in the original drawing is two separate strokes, and that is part of what makes her look good; any opening mouth looked like it came out of nowhere. If speaking without moving her lips feels odd to you, turn the voice off in the settings.
  8. **Hand-off**: as the line ends, a star lights up at the brooch and grows into warm light that fills the screen; the launcher then fades the window. About 13 seconds in all.
  - Throughout: a live clock (top left), a stage bar (01 Sketch / 02 Ink / 03 Dawn / 04 Ready) and a ticked progress line (bottom left).
  - Sound: synthesized live with Web Audio (`js\sound.js`), aligned to the timeline; no audio files.
  - Voice: made by `tools\make-voice.py` with a Microsoft neural voice (edge-tts); the voice, speed, pitch and line can be changed.
- **Settings page**: on the first run a settings page opens where you enter your name, listen to and pick the closing voice, set volumes, choose the artwork and preview the animation; open it again any time with `--settings`. Anyone can put their own name there.

## About the character art (important)

The character images, the Live2D eye-opening video and the icons belong to the original authors and are **not covered by the MIT license**, so they are not in this repository. `tools\get-art.ps1` downloads the original project into `third_party\`, and the animation reads the art from there. Using it on your own computer is fine; ask the original authors before using the art anywhere else.

## Installation

1. Put this repository in a permanent place (the desktop shortcut remembers the path, so don't move it later).
2. Fetch the character art:
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\get-art.ps1
   ```
3. Make the closing voice lines (needs internet; without this step there is no voice). It makes the 10 voices listed in `tools\voices.json` (default: Sonia, British); you listen to them and pick one on the settings page:
   ```powershell
   py -m pip install edge-tts
   py tools\make-voice.py
   ```
   To change the line: `py tools\make-voice.py --text "Welcome home, my dear friend."`; to add another voice, add a line to `tools\voices.json` (`--list` shows the available voices).
4. Make the quality levels of the eye-opening video (needs ffmpeg; without this step the eyes open frame by frame):
   ```powershell
   py tools\make-video-variants.py
   ```
   It converts the original 4K video into 8 quality levels (no B-frames, frequent keyframes, so integrated graphics decode them smoothly) and lengthens it from 5 s to about 8.5 s so it covers the whole animation: after her eyes have opened it eases into slow motion (0.36x) and keeps moving to the end, like time slowing down while she speaks. The slow part gets real in-between frames (motion-compensated interpolation), so it stays smooth. In the original the character is drawn at about 30 poses a second (only the leaves move on every frame), so the in-between frames are made from the frames where her pose changes, spaced evenly in time; otherwise every repeated pose becomes a short pause and she moves in small jerks. Interpolated frames half-way between two poses are slightly softer than frames right at a pose, which made the picture pulse sharp-soft about 10 times a second; each frame is now blurred slightly by how close it is to a pose, so all frames are equally sharp, and everything only moves forward (an earlier version played the end backwards, and the falling leaves visibly flew backwards). This takes a few minutes; the slow-motion master is kept as `assets\video\_master.mp4`.
5. Build the starter program. The first line finds Claude's app ID and extracts its icon; the second builds `Claude (Dawn).exe` with the C# compiler that ships with Windows:
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File .\launcher\make_shortcut.ps1
   powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\build-exe.ps1
   ```
6. Double-click `Claude (Dawn).exe`. **On the first run it opens the settings page first**: enter your name, listen to the voices and pick one, then click "保存并启动 Claude" (save and start Claude).
7. Right-click `Claude (Dawn).exe` → Send to → Desktop (create shortcut), and open Claude from there from now on. For the settings, make another shortcut and add ` --settings` at the end of its Target (for example, name it "Claude (Dawn) Settings").

If Claude is already running there is no animation; quit it completely (right-click the tray icon → Quit) to see it again.

> Why an .exe: the `.lnk` made by `make_shortcut.ps1` points to `conhost --headless powershell -ExecutionPolicy Bypass`, and some antivirus programs delete such shortcuts as malware. `Claude (Dawn).exe` does three things only: it runs `launcher\launch.ps1` without a window, serves the animation and the settings page from a small server on this computer (see below), and shows the settings page. Its source is `launcher\ClaudeDawn.cs` if you want to check it.

To watch the animation without starting Claude, click "预览动画" (preview) on the settings page, or double-click `preview.cmd` (it runs `Claude (Dawn).exe --preview`).

## Settings page

`Claude (Dawn).exe --settings` opens a settings window (it opens by itself on the first run). You can also **hold Shift while double-clicking** `Claude (Dawn).exe` or its shortcut.

- **Welcome line**: greeting and name, with a live preview of how it will look.
- **Closing voice**: 10 voices; click ▶ to listen and a card to choose; the voice can be turned off and its volume changed.
- **Background music**: on/off and volume. With both the music and the voice off, the animation is silent.
- **Visual effects**: Live2D off, or on with the video at 480p / 720p / 1080p / 2K × 30 / 60 fps (default 1080p 30); with Live2D off, the hair sway can be turned on or off; more or fewer petals. Turn these down on slower computers.
- **Artwork**: the new version or the original.
- **Preview**: plays the animation once with the unsaved choices (Claude is not started).

`Claude (Dawn).exe` runs a small web server on this computer only (`localhost`, random port), and both the animation and the settings page are loaded from it:

- A page opened straight from a file may not read the pixels of a local video, but a page from `localhost` may, so the blink can be drawn on the playing Live2D video. If you open `splash.html` directly, the Live2D video plays without the blink.
- A web page cannot write files, so the settings page asks the program (with a random token) to write your choices to `config.js` when you save.

The server stops when the animation or the settings window closes.

### By hand (`config.js`)

The settings page writes this file, and you can edit it in a text editor too. All options and defaults are in `config.example.js`:

| Key | Default | Meaning |
|---|---|---|
| `name` | empty | Name in the welcome line; empty shows the greeting alone |
| `greeting` | `欢迎回来` | Greeting |
| `voice` / `voiceId` / `voiceVolume` | `true` / `sonia` / `1.0` | Closing voice, which voice (an id from `tools\voices.json`), volume |
| `sound` / `volume` | `true` / `0.8` | Background music and its volume |
| `art` | `new` | `new` = Inanis404's artwork, `classic` = Firefade0329's original |
| `liveVideo` | `1080p30` | Live2D: `off` (a still picture; the eyes open frame by frame) or the video quality `480p30` … `1080p60`, `1440p30` / `1440p60` (2K) |
| `petals` / `hairSway` | `more` / `true` | More (`more`) or fewer (`less`) falling petals; hair tips swaying in the wind (Live2D off only) |
| `artRoot` | `third_party/claude-desktop-splash` | Where the original project was fetched |

The launcher switches are the same as in the original (`-NoSound`, `-NoClaude`, `-Fullscreen`, `-Art new|classic`, …) and can be added after `Claude (Dawn).exe`; see the header of `launcher\launch.ps1`.

Page parameters for debugging: `?t=5.2` freezes at a given second, `?speed=0.5` slows down, `?name=xxx` overrides the name, `?voice=emma` picks another voice, `?novideo` skips the eye video, `?novoice` skips the voice, `?nosfx` skips the sound, `?mute` silences everything, `?withvoice` plays the voice even when it is off in `config.js`. `?track` (from `localhost`) measures where the eyes are in each part of the video; the result is built into `js\splash.js`.

## What has been verified

- Each part was checked frame by frame in Edge screenshots.
- The full cold start (double-click after quitting Claude completely) still needs a real run; if something goes wrong, see `launcher\launcher.log`.
- `Claude (Dawn).exe` was run in splash-only mode (`-NoClaude`): the window covered the Claude window exactly and faded out normally.
- **Smoothness measured** (this computer: AMD Radeon 610M integrated graphics, 120 Hz screen, 2300×1200 window, loaded from `localhost`, every frame interval logged): the picture is capped at 60 fps. Measured with the voice playing. Share of frames taking longer than 25 ms: 1080p 60 about 2–3% (about 35% in the first version; it varies with how busy the computer is), Live2D off about 3.5%, 2K 60 about 6–7% (the 2K video is already playing during the busiest stretch). The camera keeps moving through the whole animation even in Live2D mode now; since the video is drawn in the WebGL layer this no longer causes stutter. Most of the time it holds a steady 60 fps, including the whole spoken line; the heaviest stretch (3.5–6.5 s, where line art, the ink wash and the video overlap) runs at about 50–53 fps. The ink wash is drawn inside the video layer instead of as a separate full-screen layer, which cut the slow frames there by about a third (measured in alternating runs). Almost all of the remaining slow frames are 25–29 ms (one missed screen refresh), around 4.5–6 s and 7.5 s. All 8 levels play to the end.
- **Not measured**: a real cold start, where Claude itself also uses the GPU; here only the animation was played, with CPU load to imitate Claude starting.
- **Continuity**: the real playback was screen-recorded and checked frame by frame at 18 fps, both idle and with 6 busy threads mimicking Claude's cold start. Fixed: the character looking frozen while the colour spreads (the video now starts with the ink wash, the camera keeps drifting in, and the glowing line art disappears wherever the colour has spread instead of lying still over the moving picture), the blink freezing the bangs and skin around the eyes (it now covers only the pixels that change in a blink, and follows the small head movements in the video), the falling leaves flying backwards near the end (now slow motion instead of reverse playback), the character moving in small jerks in that slow motion (now made from her real poses only), video frames being skipped or shown twice about 3 times a second on a 120 Hz screen (with the 60 fps videos the picture is now drawn whenever the video has a new frame, so every video frame is shown exactly once), the blink being too quick for the calm mood (it now closes over 0.3 s, stays closed for a moment and opens slowly over 0.5 s), petals freezing then jumping, the eyes opening late (after the voice line), ribbons vanishing abruptly, and the switch from the video to a still picture before the voice line (a colour shift, and the hair suddenly stopping); the video now plays to the end, and the blink is drawn on it. The real launcher path (`Claude (Dawn).exe -NoClaude`, page from `localhost`) was recorded the same way.
- Sound follows the animation clock: when the picture stalls, the music and the voice wait too.
- Settings page: opening it, the voice list, preview, saving to `config.js` and the program quitting after the window closes were tested.
- Whether the voice sounds gentle and natural is for human ears to judge; listen to each one on the settings page.

## License

The code is under the [MIT License](LICENSE), including the original project's copyright notice. The character art is not in this repository and is not covered by this license.
