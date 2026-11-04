// Default settings for the Dawn splash. Your own choices go into config.js, which the settings page
// ("Claude (Dawn).exe --settings", opened automatically on first run) writes for you; config.js is not tracked by git.
// 默认设置。你自己的选择写在 config.js 里：设置页面（第一次运行时自动打开，或 “Claude (Dawn).exe --settings”）会替你写好。
window.SPLASH_CONFIG = Object.assign({
  // Welcome line: "<greeting>，<name>". Leave name empty to show the greeting alone.
  greeting: '欢迎回来',
  name: '',
  // Character art: 'new' (Inanis404 version, Live2D eye opening) or 'classic' (Firefade0329 original).
  // The launcher's -Art switch and the page parameter ?art= override this.
  art: 'new',
  // Live2D: 'off' (a still picture; the eyes open frame by frame) or the video quality 480p30 / 480p60 / 720p30 / 720p60 /
  // 1080p30 / 1080p60 / 1440p30 / 1440p60 (2K) (made by tools/make-video-variants.py). Falls back to 'off' when the
  // file is missing. The default 1080p30 plays smoothly on most computers.
  liveVideo: '1080p30',
  // Falling petals: 'more' or 'less'. Hair tips swaying in the wind (WebGL, Live2D off only): true / false.
  petals: 'more',
  hairSway: true,
  // Where the original splash repository was cloned (the art is read from <artRoot>/assets/).
  artRoot: 'third_party/claude-desktop-splash',
  // Startup sound (synthesized in code). volume: 0..1
  sound: true,
  volume: 0.8,
  // Closing voice line after the music (made by tools/make-voice.py into assets/voices/). voiceId: an id from
  // tools/voices.json (sonia, ava-multi, emma-multi, ava, jenny, emma, michelle, libby, emily, natasha). voiceVolume: 0..1.5
  voice: true,
  voiceId: 'sonia',
  voiceVolume: 1.0
}, window.SPLASH_CONFIG || {});
