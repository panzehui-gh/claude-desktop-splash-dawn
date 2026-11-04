// Dawn splash — the animation itself. 开屏动画本体。
// Based on claude-desktop-splash by Firefade0329 and its fork by Inanis404 (both MIT). Blocks marked
// [inherited] are taken from there (eye opening + optical flow, light ribbons); everything else is new.
(() => {
  'use strict';
  const CONF = window.SPLASH_CONFIG || {};
  const q = new URLSearchParams(location.search);
  const ART = window.SPLASH_ART, ART_ROOT = window.SPLASH_ART_ROOT;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const easeOut = t => 1 - Math.pow(1 - clamp(t), 2.4);
  const easeIn = t => Math.pow(clamp(t), 2.2);
  const easeInOut = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  const bump = (a, b, x) => Math.sin(Math.PI * clamp((x - a) / (b - a)));

  // ================= 时间轴（秒）：想调节奏就改这里 =================
  //   序 · 星芒 → 流光 → 01 勾勒 → 02 晕染 → 03 醒来 → 04 就绪 → 交接
  const T = {
    starIn: .2, starRays: 10, starStep: .07,       // 星芒：一根根光芒画出来
    starPulse: 1.05, starOut: 1.3, starEnd: 1.9,   //       脉动、炸开、淡去
    ribbons: .65,                                  // 流光：原项目丝带时间整体后移这么多
    sketch: 2.0, sketchEnd: 4.25,                  // 01 勾勒：笔尖沿线条画出线稿
    eyesIn: 3.95, eyesInEnd: 4.5,                  //    眼睑最后亮起
    washStart: 4.4, washEnd: 6.1,                  // 02 晕染：颜色从胸前花饰晕开
    linesOut: 5.2, linesOutEnd: 6.2,               //    线稿退下（和晕染一起结束：线稿是好几层全屏发光图，越早退越省显卡）
    dawn: 4.6, dawnEnd: 6.6,                       //    夜转晨：星星淡去、晨光斜射
    awake: 6.3,                                    // 03 醒来
    open: 6.5, openEnd: 7.5, openSnd: 6.6,         //    睁眼（逐帧合成；视频版由视频本身决定，约 6.0~6.8 秒）
    gust: 6.1,                                     //    一阵风：一片很近的大花瓣从镜头前掠过
    text: 7.5, welcome: 8.3, typeStep: .075,       // 04 就绪：字标、欢迎语
    blink: 10.6,                                   //    醒来之后再眨一次眼（说话的时候）
    musicEnd: 9.7,                                 //    音乐在这里收住
    voice: 9.85,                                   //    语音（“Welcome back, my dear friend.”）从这里开始；有语音时交接等语音快说完再开始
    handoff: 9.4, done: 10.0, total: 10.8,         // 交接：星芒化作暖光盖满画面；done 时通知启动器淡出窗口（有语音时在载入后重新计算）
    welcomeChars: 0
  };
  const STAGE_AT = [T.sketch, T.washStart, T.awake, T.text, Infinity];
  const FACE = { x: 42, y: 32 };                    // 脸的位置（图的百分比），星芒和线稿从这里开始
  const BROOCH = { x: 600, y: 636 };                // 胸前雏菊花饰（新图底图像素），晕染和交接从这里开始
  const BROOCH_CLASSIC = { x: 600, y: 640 };

  // ---------- [inherited] eye rig data of the two artworks (from Inanis404/claude-desktop-splash, MIT) ----------
  const RIG = {
    L: { win: [365, 282, 220, 124], xa: 423, xb: 537, tops: [
      [[423,351.3],[429,352],[435,353],[441,348],[447,347.7],[453,349],[459,349],[465,349],[471,347.7],[477,346],[483,343.7],[489,343],[495,341],[501,339.3],[507,337.7],[513,336],[519,338],[525,338],[531,339],[537,339]],
      [[423,347],[429,348],[435,348],[441,343.7],[447,340],[453,340],[459,337.3],[465,335.3],[471,334],[477,333.7],[483,331],[489,330],[495,328.7],[501,327.3],[507,327],[513,325.3],[519,328.7],[525,330.7],[531,333.3],[537,334]],
      [[423,349],[429,341],[435,341],[441,338.7],[447,332],[453,332.3],[459,330.3],[465,327.7],[471,326],[477,324.3],[483,322],[489,322],[495,322],[501,321],[507,321],[513,321],[519,326],[525,329.3],[531,332],[537,332]],
      [[423,342.3],[429,340],[435,339.3],[441,333],[447,332],[453,331],[459,329],[465,327],[471,325.3],[477,324],[483,322],[489,322],[495,321],[501,321],[507,321],[513,321.7],[519,325],[525,326.7],[531,332],[537,332]] ] },
    R: { win: [585, 244, 220, 124], xa: 634, xb: 736, tops: [
      [[634,319],[640,313],[646,308.3],[652,307],[658,305.3],[664,304.3],[670,304],[676,303.7],[682,303],[688,301.3],[694,300],[700,297.3],[706,297],[712,294.3],[718,289.3],[724,292],[730,289],[736,287.7]],
      [[634,309.7],[640,303.7],[646,298.3],[652,295.3],[658,293],[664,291],[670,289.3],[676,288],[682,286.7],[688,285.3],[694,284],[700,282.3],[706,283],[712,283],[718,280.7],[724,283],[730,282.7],[736,279.3]],
      [[634,309.3],[640,300.3],[646,296.7],[652,293.3],[658,290.7],[664,287.7],[670,286.3],[676,285],[682,283.7],[688,283],[694,282],[700,280.3],[706,282],[712,282],[718,279],[724,283],[730,281.3],[736,278.3]],
      [[634,304.3],[640,297],[646,293.3],[652,291],[658,288.7],[664,287],[670,285.7],[676,284],[682,283],[688,282],[694,281],[700,280],[706,281],[712,280.3],[718,277.3],[724,281],[730,280.3],[736,278]] ] }
  };
  const BAND = [18, 14, 14, 14];     // 各张里“上睫毛带”的厚度（像素）；闭眼那张含向下的睫毛尖，所以更厚
  // 睁眼进度曲线：时间进度 u(0~1) -> 画面进度 p(0=闭眼, 1=01, 2=02, 3=03)。开头慢、中间快、结尾缓
  const OPEN_KEYS = [[0, 0], [.14, .12], [.50, 1], [.75, 1.95], [1, 3]];
  // 眼睛在【底图】里的位置：lash = 闭眼睫毛带（用来把线稿拆成“脸”和“眼睛”两层）
  // 新图 (默认)
  const EYES_NEW = [
    { lash: { c: [462, 345], rx: 73, ry: 30, th: -0.24 } },
    { lash: { c: [701, 301], rx: 71, ry: 30, th: -0.11 } }
  ];
  // 原作者的图 (?art=classic)
  const EYES_CLASSIC = [
    { lash: { c: [476, 352], rx: 74, ry: 32, th: -.18 } },
    { lash: { c: [697, 305], rx: 84, ry: 30, th: -.23 } }
  ];
  const EYES = window.SPLASH_ART === 'classic' ? EYES_CLASSIC : EYES_NEW;
  // 视频第 0 帧里的眼睛位置（视频取景比底图近约 2%）
  const EYES_VIDEO = [
    { lash: { c: [454, 343], rx: 75, ry: 31, th: -0.24 } },
    { lash: { c: [698, 298], rx: 72, ry: 31, th: -0.11 } }
  ];

  const FREEZE = q.has('t') ? parseFloat(q.get('t')) : null;     // ?t=3.2 定格某一帧（调试）
  const RENDER = q.has('render');   // ?render：逐帧渲染（录演示视频）——不自己播放，由外部依次调用 window.__renderAt(秒) 再截图，见 renderAt
  const FORCE_P = q.has('p') ? parseFloat(q.get('p')) : null;    // ?p=1.5 固定睁眼进度（调试）
  const ZOOM = q.has('zoom') ? parseFloat(q.get('zoom')) : null; // ?zoom=2.6 放大（调试）；?zoomAt=35,46 以画面上这一点（百分比）为中心放大
  const SPEED = q.has('speed') ? clamp(parseFloat(q.get('speed')) || 1, .1, 4) : 1;   // ?speed=0.5 慢放（调试）
  const AUTOCLOSE = q.has('autoclose');
  // ?launcher：由启动脚本打开。播放状态通过窗口标题告诉启动器：READY -> PLAYING -> DONE（协议和原项目一致）
  const LAUNCHER = q.has('launcher'); let doneSet = false;
  const DBG = q.has('dbg'), gaps = [];
  // 调试：?prof 逐帧计时。按动画时间每 0.5 秒一段，记录帧数、慢帧（间隔 > 25 ms）、最长间隔，以及每帧各部分的脚本耗时；结束时写进窗口标题
  const PROF = q.has('prof'), pfB = [], pfSec = {}, pfUp = [], pfJud = [0, 0, 0, 0, 0]; let pfMark = 0, vidMT = 0, upMT = -1;   // pfJud：7 秒以后每次画面更新时视频前进了 0 / 1 / 2 / 3+ 帧，以及画面没换视频帧的次数   // pfUp：每 0.5 秒上传了几帧视频（检查视频画面有没有按时更新）
  const pfLap = k => { if (!PROF) return; const n = performance.now(); pfSec[k] = (pfSec[k] || 0) + n - pfMark; pfMark = n; };
  // 调试：主线程上超过 50 ms 的任务，记成 L<动画时间>:<毫秒>（和帧间隔 gaps 一起出现在窗口标题里）
  if (DBG) addEventListener('error', e => { gaps.push('ERR:' + String(e.message).slice(0, 80).replace(/[;|]/g, ',')); setState('PLAYING'); });
  if (DBG && window.PerformanceObserver) try { new PerformanceObserver(l => { for (const e of l.getEntries()) gaps.push('L' + (typeof clock === 'number' ? clock.toFixed(1) : '?') + ':' + Math.round(e.duration)); }).observe({ entryTypes: ['longtask'] }); } catch (e) {}
  const setState = s => { document.title = 'CLAUDE_SPLASH_' + s + (s === 'PLAYING' || s === 'READY' ? '|nc=' + Math.max(0, Math.round((outerHeight - innerHeight) * devicePixelRatio)) : '') + (DBG ? '|gaps=' + gaps.join(';') + ' v=' + (document.documentElement.dataset.video || '-') + ',' + (document.documentElement.dataset.vplay || '-') + ',' + (document.documentElement.dataset.vt || '-') + ' clk=' + (typeof clock === 'number' ? clock.toFixed(1) : '-') : ''); };

  // ---------- 欢迎语：“<greeting>，<name>”，名字在 config.js 里改（?name= 可临时覆盖） ----------
  const NAME = String(q.has('name') ? q.get('name') : (CONF.name || '')).trim();
  const GREET = String(q.has('greeting') ? q.get('greeting') : (CONF.greeting || '欢迎回来'));
  const WELCOME = NAME ? [GREET + '，', NAME] : [GREET, ''];
  T.welcomeChars = [...(WELCOME[0] + WELCOME[1])].length;

  // ---------- 音效（js/sound.js 现场合成）：?mute 静音，?vol=0.5 调音量；config.js 里 sound / volume ----------
  const VOL = q.has('vol') ? clamp(+q.get('vol') || 0) : clamp(CONF.volume == null ? .8 : +CONF.volume);
  // 音效（音乐）和语音分开开关：sound=false 只关音乐，语音仍可单独播放；?mute 全部静音，?nosfx 只关音乐
  const MUSIC_ON = CONF.sound !== false && !q.has('nosfx') && VOL > 0;
  // ?withvoice：不管 config.js 里语音开没开，都放语音（调试 / 预览用）
  const VOICE_WANT = (CONF.voice !== false || q.has('withvoice')) && !q.has('novoice');
  const SOUND_ON = !q.has('mute') && !!window.DawnSound && (MUSIC_ON || VOICE_WANT);
  // 结尾语音：assets/voices/<id>.js（tools/make-voice.py 生成，config.js 的 voiceId 选择）；voice: false 或 ?novoice 关掉
  const VOICE_ON = VOICE_WANT && typeof window.SPLASH_VOICE === 'string';
  const VOICE_TEXT = String(window.SPLASH_VOICE_TEXT || 'Welcome back, my dear friend.');
  let VOICE_DUR = 0;
  let sound = null;

  // ---------- 睁眼视频（只用于新图，adapted from Inanis404）：按屏幕大小选 4K60 / 1080p60，载入失败就用逐帧合成的睁眼 ----------
  //   视频的取景比底图近约 2%：线稿按 VIDEO_FRAMING 把底图放大、平移后再提取，和视频第 0 帧对齐
  const VIDEO_FRAMING = { sx: 1.0210, sy: 1.0207, dx: -17.55, dy: -9.36 };
  // 视频和晕染同时开始播：视频一开头头发、花瓣就在动，晕开的那一刻人物已经是活的（以前到 5 秒才开始播，晕染时人物是静止的一帧）。
  // 视频里约 1.6~2.4 秒处睁眼 → 画面约 6.0~6.8 秒（晕染刚完成、那阵风吹过的时候）
  const VIDEO_START = T.washStart;
  const vid = document.getElementById('vid'); let vidOK = false, vidStarted = false, vidSeekAt = 0;
  // Live2D 睁眼视频的画质：config.js 的 liveVideo（设置页面里选），'off' 或 480p30 … 1080p60、1440p30 / 1440p60（2K）；
  // ?livevideo=720p30 可临时指定。这些文件由 tools/make-video-variants.py 从原项目的 4K 视频转出（不带 B 帧、关键帧密，好解码）。
  // 原项目的视频（High profile + B 帧）在集成显卡上会播到一半停住，所以默认不用视频，改用和动画时钟同步、逐帧合成的睁眼。
  // 画面效果（设置页面里可选）：落叶多 / 少，发梢飘动开 / 关
  const PETALS = (q.get('petals') || CONF.petals) === 'less' ? 'less' : 'more';
  const HAIR = !q.has('nohair') && CONF.hairSway !== false;
  const LEVELS = ['480p30', '480p60', '720p30', '720p60', '1080p30', '1080p60', '1440p30', '1440p60'];
  const LIVE = (() => { const v = q.has('livevideo') ? q.get('livevideo') : CONF.liveVideo; return v === true ? '1080p30' : LEVELS.includes(v) ? v : null; })();
  const VID60 = !!LIVE && LIVE.endsWith('60');   // 60 帧的视频：视频播放时画面节拍跟着视频走（见 loop）
  async function initVideo() {
    if (ART === 'classic' || q.has('novideo') || !LIVE) return;
    vid.src = q.get('video') || 'assets/video/' + LIVE + '.mp4';
    await new Promise(res => { vid.addEventListener('canplaythrough', res, { once: true }); vid.addEventListener('error', res, { once: true }); setTimeout(res, 4000); vid.load(); });
    if (vid.error || vid.readyState < 3) { document.documentElement.dataset.video = 'fallback:' + (vid.error ? 'error' : 'state' + vid.readyState); vid.removeAttribute('src'); vid.load(); return; }
    // 先静音播放 0.3 秒再倒回开头：让解码器提前热身，正式开始播放时第一帧不卡
    try { await vid.play(); await new Promise(r => setTimeout(r, 300)); } catch (e) {}
    vid.pause(); vid.currentTime = 0; vidOK = true; document.documentElement.dataset.video = 'ok';
    vid.addEventListener('seeked', () => { if (FREEZE !== null) { washLast = -1; render(FREEZE); } });   // 定格调试：视频跳到位后重画一次
  }
  function syncVideo(tt) {
    if (!vidOK || RENDER) return;
    const vt = tt - VIDEO_START;
    if (FREEZE !== null) { if (!vidStarted) { vidStarted = true; vid.currentTime = clamp(vt, 0, (vid.duration || 5) - .02); } return; }   // 定格：只跳一次（否则 seeked → 重画 → 再跳 会死循环）
    if (vt < 0) { if (vidStarted || vid.currentTime > .001) { vid.pause(); vid.currentTime = 0; vidStarted = false; } return; }
    // 从头开始播（不先跳转：跳转会让视频重新缓冲，第一帧一卡，后面就一直追不上）
    if (!vidStarted) { vidStarted = true; vidSeekAt = performance.now(); vid.playbackRate = SPEED; vid.play().then(() => { document.documentElement.dataset.vplay = 'playing'; }, e => { document.documentElement.dataset.vplay = 'blocked:' + e.name; }); return; }
    // 和动画时钟对齐：小偏差用播放速度慢慢追，偏差很大（> 1 秒）时才跳转；视频落后时，动画时钟会在 loop() 里等它。
    // 以前每帧都在偏差 > 0.15 秒时跳转：页面一卡，视频就不停地重新跳转、永远停在第 0 秒，看起来就是“一直没睁眼”。
    // 播放中不再改播放速度、也不跳转：每帧改 playbackRate 或跳转都会让解码器重新缓冲，视频反而一直卡住。
    // 视频按自己的速度播，动画时钟在 loop() 里跟着视频走（视频是这一段的“主时钟”）。
    if (DBG) document.documentElement.dataset.vt = vid.currentTime.toFixed(2) + '@' + tt.toFixed(2) + ' rs' + vid.readyState + ' ns' + vid.networkState + (vid.paused ? ' P' : '') + (vid.seeking ? ' S' : '') + ' buf' + (vid.buffered.length ? vid.buffered.end(vid.buffered.length - 1).toFixed(1) : '-') + ' vis=' + getComputedStyle(vid).visibility;
  }
  const TUNE = { lo: +(q.get('lo') || 48), hi: +(q.get('hi') || 150), blur: +(q.get('blur') || 1.5) };

  const $ = id => document.getElementById(id);
  const rib = $('rib'), fx = $('fx'), rays = $('rays'), flash = $('flash');
  const line = $('line'), lineDraw = $('lineDraw'), lineEyes = $('lineEyes'), pen = $('pen'), rim = $('rim'), color = $('color'), wash = $('wash');
  // 流光丝带直接画在前景特效画布上（以前单独一张全屏画布，多一层合成）
  const fc = fx.getContext('2d'), rc = fc, cc = color.getContext('2d'), yc = rays.getContext('2d'), hc = flash.getContext('2d');
  let W = 0, H = 0, DPR = 1, RW = 0, RH = 0, oldW = 0, oldH = 0;
  function resize() {
    // 光效都是柔和的光晕，不需要物理像素精度：画布宽度限制在 ~1400px 以内（沿用原项目的做法）
    DPR = Math.max(.6, Math.min(devicePixelRatio || 1, 1400 / innerWidth, 1.5));
    W = Math.round(innerWidth * DPR); H = Math.round(innerHeight * DPR);
    if (typeof RIBBONS !== 'undefined') for (const R of RIBBONS) R.spl = null;
    rib.width = fx.width = flash.width = W; rib.height = fx.height = flash.height = H;
    RW = Math.round(W / 2); RH = Math.round(H / 2); rays.width = RW; rays.height = RH;
    // 启动器会让窗口跟着 Claude 的窗口变大小：只按比例挪动已有的星星和花瓣，不重新撒（以前重新撒，花瓣会突然瞬移）
    if (!stars.length) seedStars();
    else if (oldW && oldH) { const kx = W / oldW, ky = H / oldH; for (const a of [stars, petals, fgPetals, sparks, dust]) for (const p of a) { p.x *= kx; p.y *= ky; } }
    oldW = W; oldH = H;
  }

  // ---------- [inherited] eye opening + optical flow (from Firefade0329/claude-desktop-splash and Inanis404, MIT) ----------
  // ================= 睁眼：上睫毛带随眼睑整体上滑，下方露出后一张的眼珠 =================
  let baseImg = null;
  const rigs = {};          // 每只眼：{ win, frames: [ImageData ×4], top: [Float32Array ×4], wx: Float32Array, out: ImageData, cv, g }
  const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('load ' + src.slice(0, 40))); i.src = src; });
  const scratch = document.createElement('canvas'), sg = scratch.getContext('2d', { willReadFrequently: true });
  const winData = (img, srcRect, w, h) => { scratch.width = w; scratch.height = h; sg.clearRect(0, 0, w, h); if (srcRect) sg.drawImage(img, srcRect[0], srcRect[1], w, h, 0, 0, w, h); else sg.drawImage(img, 0, 0); return sg.getImageData(0, 0, w, h); };
  // 把稀疏的曲线点按 x 线性插值成“每列一个值”，范围外取端点
  function colCurve(pts, x0, n) {
    const a = new Float32Array(n); let j = 0;
    for (let i = 0; i < n; i++) {
      const x = x0 + i; while (j < pts.length - 2 && x > pts[j + 1][0]) j++;
      const p = pts[j], q2 = pts[j + 1], t = clamp((x - p[0]) / (q2[0] - p[0]), 0, 1); a[i] = lerp(p[1], q2[1], t);
    }
    return a;
  }
  // ---- 光流（Horn–Schunck + 金字塔 + 逐层 warp）：用来让 01→02→03 里眼珠、下眼睑的位置变化变成平滑移动，而不是重影后突变 ----
  const fgray = (d, n) => { const g = new Float32Array(n); for (let i = 0, p = 0; i < n; i++, p += 4) g[i] = .3 * d[p] + .59 * d[p + 1] + .11 * d[p + 2]; return g; };
  const fdown = (g, w, h) => { const w2 = w >> 1, h2 = h >> 1, o = new Float32Array(w2 * h2); for (let y = 0; y < h2; y++) for (let x = 0; x < w2; x++) o[y * w2 + x] = (g[2*y*w+2*x] + g[2*y*w+2*x+1] + g[(2*y+1)*w+2*x] + g[(2*y+1)*w+2*x+1]) / 4; return o; };
  const fbil = (g, w, h, x, y) => { x = x < 0 ? 0 : x > w - 1 ? w - 1 : x; y = y < 0 ? 0 : y > h - 1 ? h - 1 : y; const x0 = x | 0, y0 = y | 0, x1 = Math.min(w - 1, x0 + 1), y1 = Math.min(h - 1, y0 + 1), fx = x - x0, fy = y - y0; return (g[y0*w+x0]*(1-fx) + g[y0*w+x1]*fx) * (1-fy) + (g[y1*w+x0]*(1-fx) + g[y1*w+x1]*fx) * fy; };
  const fwarp = (B, u, v, w, h) => { const o = new Float32Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; o[i] = fbil(B, w, h, x + u[i], y + v[i]); } return o; };
  const fup = (u, w, h, W2, H2) => { const o = new Float32Array(W2 * H2), sx = w / W2, sy = h / H2, k = W2 / w; for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) o[y * W2 + x] = fbil(u, w, h, (x + .5) * sx - .5, (y + .5) * sy - .5) * k; return o; };
  function hsLevel(A, B, w, h, u, v, alpha, iters, warps) {
    const a2 = alpha * alpha, n = w * h;
    for (let wp = 0; wp < warps; wp++) {
      const Bw = fwarp(B, u, v, w, h), Ix = new Float32Array(n), Iy = new Float32Array(n), It = new Float32Array(n);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x, xm = Math.max(0, x - 1), xp = Math.min(w - 1, x + 1), ym = Math.max(0, y - 1), yp = Math.min(h - 1, y + 1);
        Ix[i] = ((A[y*w+xp] - A[y*w+xm]) + (Bw[y*w+xp] - Bw[y*w+xm])) / 4; Iy[i] = ((A[yp*w+x] - A[ym*w+x]) + (Bw[yp*w+x] - Bw[ym*w+x])) / 4; It[i] = Bw[i] - A[i]; }
      let du = new Float32Array(n), dv = new Float32Array(n), nu = new Float32Array(n), nv = new Float32Array(n);
      for (let it = 0; it < iters; it++) {
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x, xm = Math.max(0, x - 1), xp = Math.min(w - 1, x + 1), ym = Math.max(0, y - 1), yp = Math.min(h - 1, y + 1);
          const ub = (du[y*w+xm] + du[y*w+xp] + du[ym*w+x] + du[yp*w+x]) / 4, vb = (dv[y*w+xm] + dv[y*w+xp] + dv[ym*w+x] + dv[yp*w+x]) / 4;
          const t = (Ix[i] * ub + Iy[i] * vb + It[i]) / (a2 + Ix[i] * Ix[i] + Iy[i] * Iy[i]); nu[i] = ub - Ix[i] * t; nv[i] = vb - Iy[i] * t; }
        [du, nu] = [nu, du]; [dv, nv] = [nv, dv];
      }
      for (let i = 0; i < n; i++) { u[i] += du[i]; v[i] += dv[i]; }
    }
  }
  // 返回 A -> B 的稠密光流 {u, v}（位移上限 lim 像素，防止在无纹理区域发散）
  function pyrFlow(dA, dB, w, h, levels = 4, alpha = 20, iters = 40, warps = 3, lim = 7) {
    const n = w * h, pa = [fgray(dA, n)], pb = [fgray(dB, n)], sz = [[w, h]];
    for (let l = 1; l < levels; l++) { const [cw, ch] = sz[l - 1]; pa.push(fdown(pa[l - 1], cw, ch)); pb.push(fdown(pb[l - 1], cw, ch)); sz.push([cw >> 1, ch >> 1]); }
    let u = new Float32Array(sz[levels - 1][0] * sz[levels - 1][1]), v = new Float32Array(u.length);
    for (let l = levels - 1; l >= 0; l--) { const [cw, ch] = sz[l]; if (l < levels - 1) { const [pw, ph] = sz[l + 1]; u = fup(u, pw, ph, cw, ch); v = fup(v, pw, ph, cw, ch); } hsLevel(pa[l], pb[l], cw, ch, u, v, alpha, iters, warps); }
    for (let i = 0; i < n; i++) { const m = Math.hypot(u[i], v[i]); if (m > lim) { u[i] *= lim / m; v[i] *= lim / m; } }
    return { u, v };
  }
  async function buildRigs(base) {
    // v2：睁眼序列（assets/eyes-frames.js 里的 window.EYE_SEQ）——只用一只完全睁开的眼睛，眼睑像刚体一样从闭眼位置滑上去，
    //     每 0.1 进度预先合成一帧；播放时只在相邻两帧之间线性混合（两帧只差约 1 像素，没有重影）
    if (window.EYE_SEQ) {
      const S = window.EYE_SEQ;
      for (const key of ['L', 'R']) {
        const [, , w, h] = S.wins[key];
        const imgs = await Promise.all(S[key].map(u => loadImg(u)));
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        rigs[key] = { win: S.wins[key], seq: imgs.map(im => winData(im, null, w, h)), frames: [], out: new ImageData(w, h), cv, g: cv.getContext('2d') };
      }
      return;
    }
    const crops = window.EYE_CROPS;
    const imgs = await Promise.all(crops.frames.map(async f => ({ L: await loadImg(f.L), R: await loadImg(f.R) })));
    for (const key of ['L', 'R']) {
      const R = RIG[key], [wx, wy, w, h] = R.win;
      const frames = [winData(base, R.win, w, h), ...imgs.map(im => winData(im[key], null, w, h))];
      const top = R.tops.map(p => colCurve(p, wx, w));
      for (const t of top) for (let i = 0; i < w; i++) t[i] -= wy;                         // 转成窗口内的 y
      // 只在睫毛范围内生效，两端各用 8 像素渐入渐出
      const wcol = new Float32Array(w); for (let i = 0; i < w; i++) wcol[i] = smooth(R.xa - 8, R.xa + 2, wx + i) * (1 - smooth(R.xb - 2, R.xb + 8, wx + i));
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      // 01→02、02→03 两步：先算好光流（第一步 闭眼→01 变化太大，用睫毛带滑动，不用光流）
      const flow = [null]; for (let k = 1; k < frames.length - 1; k++) flow.push(q.has('noflow') ? null : pyrFlow(frames[k].data, frames[k + 1].data, w, h));
      rigs[key] = { win: R.win, frames, top, wx: wcol, flow, out: new ImageData(w, h), cv, g: cv.getContext('2d') };
    }
  }
  // 纵向双线性取样（x 为整数列）
  function samp(d, w, h, i, y, o) {
    y = y < 0 ? 0 : y > h - 1 ? h - 1 : y; const y0 = y | 0, y1 = Math.min(h - 1, y0 + 1), f = y - y0, p0 = (y0 * w + i) * 4, p1 = (y1 * w + i) * 4;
    o[0] = d[p0] + (d[p1] - d[p0]) * f; o[1] = d[p0 + 1] + (d[p1 + 1] - d[p0 + 1]) * f; o[2] = d[p0 + 2] + (d[p1 + 2] - d[p0 + 2]) * f;
  }
  // 二维双线性取样（RGBA）
  function samp2(d, w, h, x, y, o) {
    x = x < 0 ? 0 : x > w - 1 ? w - 1 : x; y = y < 0 ? 0 : y > h - 1 ? h - 1 : y;
    const x0 = x | 0, y0 = y | 0, x1 = Math.min(w - 1, x0 + 1), y1 = Math.min(h - 1, y0 + 1), fx = x - x0, fy = y - y0;
    const p00 = (y0 * w + x0) * 4, p10 = (y0 * w + x1) * 4, p01 = (y1 * w + x0) * 4, p11 = (y1 * w + x1) * 4;
    for (let c = 0; c < 3; c++) o[c] = (d[p00 + c] * (1 - fx) + d[p10 + c] * fx) * (1 - fy) + (d[p01 + c] * (1 - fx) + d[p11 + c] * fx) * fy;
  }
  // 当前画面进度 p（0 闭眼 … 3 = 03）下，合成一只眼的窗口
  function composeEye(E, p) {
    if (E.seq) {
      const n = E.seq.length, x = clamp(p / 3) * (n - 1), k = Math.min(n - 2, Math.floor(x)), s = x - k;
      const A = E.seq[k].data, B = E.seq[k + 1].data, out = E.out.data;
      for (let i = 0; i < out.length; i += 4) { out[i] = A[i] + (B[i] - A[i]) * s; out[i + 1] = A[i + 1] + (B[i + 1] - A[i + 1]) * s; out[i + 2] = A[i + 2] + (B[i + 2] - A[i + 2]) * s; out[i + 3] = 255; }
      return;
    }
    const [, wy, w, h] = E.win, k = Math.min(2, Math.floor(p)), s = p - k;
    const A = E.frames[k].data, B = E.frames[k + 1].data, C = E.frames[0].data, tA = E.top[k], tB = E.top[k + 1], out = E.out.data;
    const bh = lerp(BAND[k], BAND[k + 1], s);
    const wz3 = k === 0 ? smooth(0, .25, s) : s;          // 眼睑下方：后一张的权重（第一步里更快过渡，避免闭眼睫毛尖残留）
    const gate = k === 0 ? smooth(0, .1, s) : 1;           // 刚开始睁时，从“纯闭眼底图”平滑过渡
    const pa = [0, 0, 0], pb = [0, 0, 0], F = E.flow[k];     // F：01→02、02→03 的光流，第一步为 null
    for (let i = 0; i < w; i++) {
      const ye = lerp(tA[i], tB[i], s), wgt = gate * E.wx[i];
      for (let y = 0; y < h; y++) {
        const o = (y * w + i) * 4, c0 = (y * w + i) * 4;
        let r, g, b;
        if (y < ye - 1) {                                   // 眼睑上方：皮肤，两张几乎一样
          r = lerp(A[o], B[o], s); g = lerp(A[o + 1], B[o + 1], s); b = lerp(A[o + 2], B[o + 2], s);
        } else if (y < ye + bh) {                           // 睫毛带：刚体整体平移
          samp(A, w, h, i, tA[i] + (y - ye), pa); samp(B, w, h, i, tB[i] + (y - ye), pb);
          const m = smooth(0, 1, s); r = lerp(pa[0], pb[0], m); g = lerp(pa[1], pb[1], m); b = lerp(pa[2], pb[2], m);
        } else if (F) {                                     // 眼睑下方（01→02→03）：沿光流把两张图的眼珠/下眼睑“推”到同一位置再混合，避免重影
          const fu = F.u[y * w + i], fv = F.v[y * w + i];
          samp2(A, w, h, i - s * fu, y - s * fv, pa); samp2(B, w, h, i + (1 - s) * fu, y + (1 - s) * fv, pb);
          r = lerp(pa[0], pb[0], s); g = lerp(pa[1], pb[1], s); b = lerp(pa[2], pb[2], s);
        } else {                                            // 眼睑下方（闭眼→01）：眼珠、下眼睑
          r = lerp(A[o], B[o], wz3); g = lerp(A[o + 1], B[o + 1], wz3); b = lerp(A[o + 2], B[o + 2], wz3);
        }
        out[o] = lerp(C[c0], r, wgt); out[o + 1] = lerp(C[c0 + 1], g, wgt); out[o + 2] = lerp(C[c0 + 2], b, wgt); out[o + 3] = 255;
      }
    }
  }
  const feather = document.createElement('canvas'), fg = feather.getContext('2d');
  function paintFace(ctx, p) {
    ctx.drawImage(baseImg, 0, 0);
    if (p <= .001) return;
    // 眼睛窗口（边缘羽化，和底图自然衔接）
    for (const key of ['L', 'R']) { const [wx, wy] = rigs[key].win; ctx.drawImage(eyeLayer(key, p), wx, wy); }
  }
  // 时间进度 u -> 画面进度 p（关键点之间用平滑插值）
  // 保单调的三次 Hermite 插值（Fritsch–Carlson）：经过每个关键点时速度是连续的，不会像逐段缓动那样在每个关键帧处“顿一下”
  const OPEN_TAN = (() => {
    const K = OPEN_KEYS, n = K.length, d = [], m = new Array(n).fill(0);
    for (let i = 0; i < n - 1; i++) d[i] = (K[i + 1][1] - K[i][1]) / (K[i + 1][0] - K[i][0]);
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;      // 两端速度为 0：起步缓、收尾缓
    for (let i = 0; i < n - 1; i++) { if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; } const a = m[i] / d[i], b = m[i + 1] / d[i], s2 = a * a + b * b; if (s2 > 9) { const t = 3 / Math.sqrt(s2); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; } }
    return m;
  })();
  function openProgress(u) {
    u = clamp(u); const K = OPEN_KEYS; let i = 0; while (i < K.length - 2 && u > K[i + 1][0]) i++;
    const x0 = K[i][0], y0 = K[i][1], x1 = K[i + 1][0], y1 = K[i + 1][1], h = x1 - x0, t = (u - x0) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * h * OPEN_TAN[i] + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * h * OPEN_TAN[i + 1];
  }

  // ================= 线稿：从闭眼底图提取边缘 + 发光（edge detection adapted from the original project） =================
  //   新：把边缘串成一条条“笔画”，01 勾勒阶段由多个发光笔尖沿笔画画出来，而不是圆形遮罩扩散
  const SC = 1.0, MASK_S = .6, CELL = 3;           // 线稿层和底图一样大（以前 1.2 倍：三张 2000 px 的全屏图层，集成显卡合成不过来）；遮罩层 0.6 倍；描线用 3×3 像素的格子
  let lineBase = null;
  function rebuildLine() { if (!lineBase) return; const lc = line.getContext('2d'); lc.clearRect(0, 0, line.width, line.height); lc.drawImage(lineBase, 0, 0); }
  let LW = 0, LH = 0, strokes = [], maskCv = null, mctx = null, ldc = null, pc = null, maskT = -1, heads = [];
  function buildLineart(srcCv, eyes) {
    const w = Math.round(srcCv.width * SC), h = Math.round(srcCv.height * SC); LW = w; LH = h;
    const mk = () => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    const src = mk(), sx = src.getContext('2d', { willReadFrequently: true });
    sx.imageSmoothingQuality = 'high'; sx.filter = `blur(${TUNE.blur}px)`; sx.drawImage(srcCv, 0, 0, w, h); sx.filter = 'none';
    const d = sx.getImageData(0, 0, w, h).data;
    const L = new Float32Array(w * h), S = new Float32Array(w * h);
    for (let i = 0, p = 0; i < w * h; i++, p += 4) {
      const r = d[p], g = d[p + 1], b = d[p + 2];
      L[i] = .3 * r + .59 * g + .11 * b; S[i] = Math.max(r, g, b) - Math.min(r, g, b);
    }
    src.width = 0;
    const edge = mk(), ex = edge.getContext('2d', { willReadFrequently: true }); const out = ex.createImageData(w, h); const o = out.data;
    const LO = TUNE.lo, HI = TUNE.hi;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const gxL = -L[i - w - 1] - 2 * L[i - 1] - L[i + w - 1] + L[i - w + 1] + 2 * L[i + 1] + L[i + w + 1];
        const gyL = -L[i - w - 1] - 2 * L[i - w] - L[i - w + 1] + L[i + w - 1] + 2 * L[i + w] + L[i + w + 1];
        const gxS = -S[i - w - 1] - 2 * S[i - 1] - S[i + w - 1] + S[i - w + 1] + 2 * S[i + 1] + S[i + w + 1];
        const gyS = -S[i - w - 1] - 2 * S[i - w] - S[i - w + 1] + S[i + w - 1] + 2 * S[i + w] + S[i + w + 1];
        const m = Math.max(Math.hypot(gxL, gyL), .8 * Math.hypot(gxS, gyS));
        const a = clamp((m - LO) / (HI - LO));
        if (a > 0) { const p = i * 4; o[p] = 255; o[p + 1] = 236; o[p + 2] = 208; o[p + 3] = Math.pow(a, .8) * 255; }
      }
    }
    ex.putImageData(out, 0, 0);
    // 眼部遮罩（羽化椭圆）：把线稿拆成“脸”和“眼睛”两层，眼睛最后亮起
    const mask = mk(), mx = mask.getContext('2d');
    for (const E of eyes) {
      const Z = E.lash;
      mx.save(); mx.translate(Z.c[0] * SC, Z.c[1] * SC); mx.rotate(Z.th); mx.scale(1, Z.ry / Z.rx);
      const rr = (Z.rx + 8) * SC, g = mx.createRadialGradient(0, 0, 0, 0, 0, rr);
      g.addColorStop(0, '#fff'); g.addColorStop(.82, '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)');
      mx.fillStyle = g; mx.fillRect(-rr, -rr, rr * 2, rr * 2); mx.restore();
    }
    const edgeEyes = mk(), ee = edgeEyes.getContext('2d'); ee.drawImage(edge, 0, 0);
    ee.globalCompositeOperation = 'destination-in'; ee.drawImage(mask, 0, 0);
    ex.globalCompositeOperation = 'destination-out'; ex.drawImage(mask, 0, 0); ex.globalCompositeOperation = 'source-over';
    mask.width = 0;
    traceStrokes(ex.getImageData(0, 0, w, h).data, w, h);
    // 发光：暖橙色的光晕 + 象牙白的细线
    const glowOf = (edgeCv, target, bright) => {
      const glow = mk(), gx = glow.getContext('2d'); gx.drawImage(edgeCv, 0, 0);
      gx.globalCompositeOperation = 'source-in'; gx.fillStyle = 'rgb(255,128,52)'; gx.fillRect(0, 0, w, h);
      target.width = w; target.height = h;
      const lc = target.getContext('2d'); lc.globalCompositeOperation = 'lighter';
      lc.filter = 'blur(16px)'; lc.globalAlpha = Math.min(1, .8 * bright); lc.drawImage(glow, 0, 0); lc.drawImage(glow, 0, 0); if (bright > 1) { lc.drawImage(glow, 0, 0); lc.drawImage(glow, 0, 0); }
      lc.filter = 'blur(5px)'; lc.globalAlpha = .95; lc.drawImage(glow, 0, 0);
      lc.filter = 'none'; lc.globalAlpha = 1; lc.drawImage(edgeCv, 0, 0); lc.drawImage(edgeCv, 0, 0);
      glow.width = 0;
    };
    glowOf(edge, line, 1); glowOf(edgeEyes, lineEyes, 1.4);
    lineBase = document.createElement('canvas'); lineBase.width = w; lineBase.height = h; lineBase.getContext('2d').drawImage(line, 0, 0);   // 重播时用来还原（眼睛线稿会被合进 line）
    edge.width = 0; edgeEyes.width = 0;
    lineDraw.width = w; lineDraw.height = h; ldc = lineDraw.getContext('2d');
    maskCv = document.createElement('canvas'); maskCv.width = Math.round(w * MASK_S); maskCv.height = Math.round(h * MASK_S); mctx = maskCv.getContext('2d');
    pen.width = maskCv.width; pen.height = maskCv.height; pc = pen.getContext('2d');
  }

  // 把边缘串成笔画：在 3×3 的格子上，从每个没走过的边缘格出发，沿着方向变化最小的邻格一直走下去
  function traceStrokes(a, w, h) {
    const gw = Math.floor(w / CELL), gh = Math.floor(h / CELL), on = new Uint8Array(gw * gh);
    for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
      let m = 0;
      for (let yy = 0; yy < CELL; yy++) { const row = ((gy * CELL + yy) * w + gx * CELL) * 4 + 3; for (let xx = 0; xx < CELL; xx++) { const v = a[row + xx * 4]; if (v > m) m = v; } }
      if (m > 70) on[gy * gw + gx] = 1;
    }
    const seen = new Uint8Array(gw * gh), NB = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]], list = [];
    const fx0 = FACE.x / 100 * gw, fy0 = FACE.y / 100 * gh, diag = Math.hypot(gw, gh), rnd = rand32(99);
    for (let i = 0; i < gw * gh; i++) {
      if (!on[i] || seen[i]) continue;
      let x = i % gw, y = (i / gw) | 0, dx = 0, dy = 0; const pts = [];
      for (;;) {
        seen[y * gw + x] = 1; pts.push(x, y);
        let best = -1, bs = -9;
        for (const [ax, ay] of NB) {
          const nx = x + ax, ny = y + ay; if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
          const j = ny * gw + nx; if (!on[j] || seen[j]) continue;
          const s = (dx || dy) ? (ax * dx + ay * dy) / Math.hypot(ax, ay) / Math.hypot(dx, dy) : 0;
          if (s > bs) { bs = s; best = j; }
        }
        if (best < 0) break;
        const nx = best % gw, ny = (best / gw) | 0; dx = nx - x; dy = ny - y; x = nx; y = ny;
      }
      const n = pts.length / 2; if (n < 3) continue;
      const k = (CELL * MASK_S), P = new Float32Array(pts.length);
      for (let j = 0; j < pts.length; j++) P[j] = (pts[j] + .5) * k;
      const mxp = pts[(n >> 1) * 2], myp = pts[(n >> 1) * 2 + 1];
      list.push({ P, n, key: Math.hypot(mxp - fx0, (myp - fy0) * 1.15) / diag + rnd() * .1, st: 0, dur: 0, k: 0 });
    }
    // 先画离脸近的，再往外；每条笔画的时长和长度成正比，长线由“笔尖”慢慢走完
    list.sort((p, r) => p.key - r.key);
    let total = 0; for (const s of list) total += s.n;
    let acc = 0; const span = T.sketchEnd - T.sketch - .55;
    for (const s of list) { s.st = T.sketch + Math.pow(acc / total, .85) * span; s.dur = clamp(s.n / 70, .08, .55); acc += s.n; }
    strokes = list;
  }
  // 把笔画画到遮罩上，直到时间 tt；时间倒退（重播 / 定格）时从头画
  function drawMask(tt) {
    if (!mctx) return false;
    if (tt < maskT) { mctx.clearRect(0, 0, maskCv.width, maskCv.height); for (const s of strokes) s.k = 0; }
    maskT = tt;
    let changed = false; heads.length = 0;
    mctx.strokeStyle = '#fff'; mctx.lineCap = 'round'; mctx.lineJoin = 'round'; mctx.lineWidth = CELL * MASK_S * 2.6;
    for (const s of strokes) {
      if (s.st > tt) break;
      const p = clamp((tt - s.st) / s.dur), kk = Math.floor(p * (s.n - 1));
      if (kk > s.k || (p > 0 && s.k === 0 && kk === 0)) {
        const P = s.P; mctx.beginPath(); mctx.moveTo(P[s.k * 2], P[s.k * 2 + 1]);
        for (let j = s.k + 1; j <= Math.max(kk, 1) && j < s.n; j++) mctx.lineTo(P[j * 2], P[j * 2 + 1]);
        mctx.stroke(); s.k = Math.max(kk, 1); changed = true;
      }
      if (p < 1 && s.n > 14 && heads.length < 48) heads.push([s.P[kk * 2], s.P[kk * 2 + 1], s.n]);
    }
    return changed;
  }
  let penDust = [];
  function drawPens(tt, dt, alpha) {
    pc.clearRect(0, 0, pen.width, pen.height);
    if (alpha <= 0) return;
    pc.globalCompositeOperation = 'lighter';
    for (const [x, y, n] of heads) {
      const r = (5 + Math.min(n, 120) / 14) * (.8 + .2 * Math.sin(tt * 30 + x));
      pc.globalAlpha = alpha * .9; pc.drawImage(SPR[0], x - r * 2, y - r * 2, r * 4, r * 4);
      pc.globalAlpha = alpha; pc.fillStyle = '#fff8ee'; pc.beginPath(); pc.arc(x, y, 1.6, 0, 6.283); pc.fill();
      if (FREEZE === null && penDust.length < 260 && Math.random() < .5) penDust.push({ x, y, vx: (Math.random() - .5) * 40, vy: (Math.random() - .5) * 40 - 10, age: 0, life: .35 + Math.random() * .4, r: 1 + Math.random() * 1.6 });
    }
    for (let i = penDust.length - 1; i >= 0; i--) {
      const p = penDust[i]; p.age += dt; if (p.age > p.life) { penDust[i] = penDust[penDust.length - 1]; penDust.pop(); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; const s = p.r * 5;
      pc.globalAlpha = alpha * (1 - p.age / p.life) * .8; pc.drawImage(SPR[1], p.x - s / 2, p.y - s / 2, s, s);
    }
    pc.globalAlpha = 1; pc.globalCompositeOperation = 'source-over';
  }

  // ================= 晕染：颜色从胸前的雏菊花饰像水彩一样晕开（噪声边缘 + 暖金色的湿边） =================
  let nightCol = null, field = null, FW = 0, FH = 0, wmImg = null, rmx = null, rmImg = null, wctx = null, washLast = -1;
  // 平滑的值噪声 + 分形叠加，生成“水渍”边缘
  function noise2(seed) {
    const r = rand32(seed), G = 64, g = new Float32Array(G * G); for (let i = 0; i < g.length; i++) g[i] = r();
    const at = (x, y) => g[((y % G + G) % G) * G + ((x % G + G) % G)];
    const n = (x, y) => { const x0 = Math.floor(x), y0 = Math.floor(y), fx2 = x - x0, fy2 = y - y0, u = fx2 * fx2 * (3 - 2 * fx2), v = fy2 * fy2 * (3 - 2 * fy2);
      return lerp(lerp(at(x0, y0), at(x0 + 1, y0), u), lerp(at(x0, y0 + 1), at(x0 + 1, y0 + 1), u), v); };
    return (x, y) => { let s = 0, a = .5, f = 1; for (let o = 0; o < 4; o++) { s += a * n(x * f, y * f); a *= .5; f *= 2.03; } return s / .9375; };
  }
  function buildWash(iw, ih, ox, oy) {
    FW = 240; FH = Math.round(FW * ih / iw); field = new Float32Array(FW * FH);
    const nz = noise2(5), asp = ih / iw;
    const far = Math.max(Math.hypot(ox, oy * asp), Math.hypot(1 - ox, oy * asp), Math.hypot(ox, (1 - oy) * asp), Math.hypot(1 - ox, (1 - oy) * asp));
    let lo = 9, hi = -9;
    for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
      const u = x / FW, v = y / FH, dd = Math.hypot(u - ox, (v - oy) * asp) / far;
      const f = Math.pow(dd, .85) * .8 + nz(u * 7, v * 7 * asp) * .32; field[y * FW + x] = f; if (f < lo) lo = f; if (f > hi) hi = f;
    }
    for (let i = 0; i < field.length; i++) field[i] = (field[i] - lo) / (hi - lo);
    // wash 现在是一块盖在彩图 / 视频上面的“夜色”遮罩（240 像素宽，由浏览器平滑放大）：还没晕开的地方是夜色，晕开的地方透明。
    // 以前是每帧把视频画进一张和原图一样大的画布再抠形状，太重，窗口大的时候视频都被拖慢了。
    // 夜色和舞台背景一样是径向渐变（radial-gradient(120% 90% at 46% 42%, #1a1420, #0c0a10 55%, #050407)），
    // 这样还没开始晕染时整块盖上去也看不出来（视频模式下要提前把视频完整显示在它下面）
    nightCol = new Uint8Array(FW * FH * 3);
    const st = [[0, 26, 20, 32], [.55, 12, 10, 16], [1, 5, 4, 7]];
    for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
      const g = Math.min(1, Math.hypot((x / FW - .46) / 1.2, (y / FH - .42) / .9)), k = g < .55 ? 0 : 1, f = (g - st[k][0]) / (st[k + 1][0] - st[k][0]), o = (y * FW + x) * 3;
      for (let c = 0; c < 3; c++) nightCol[o + c] = Math.round(lerp(st[k][c + 1], st[k + 1][c + 1], f));
    }
    wash.width = FW; wash.height = FH; wctx = wash.getContext('2d'); wmImg = wctx.createImageData(FW, FH);
    rim.width = FW; rim.height = FH; rmx = rim.getContext('2d'); rmImg = rmx.createImageData(FW, FH);
  }
  const NIGHT = [13, 10, 15];                       // 和舞台背景的夜色一致
  function drawWash(tt) {
    if (!wctx) return;
    const p = easeInOut((tt - T.washStart) / (T.washEnd - T.washStart)), thr = p * 1.2 - .08, band = .085;
    if (Math.abs(p - washLast) < .0005) return;
    washLast = p;
    // 夜色遮罩和暖金色的湿边画在同一张小画布上（以前是两个全屏图层）
    const a = wmImg.data, rimO = bump(T.washStart, T.washEnd + .2, tt) * 220 / 255;
    for (let i = 0, j = 0; i < field.length; i++, j += 4) {
      const x = (thr - field[i]) / band, al = clamp(x), an = 1 - al;
      const rr = al > 0 && al < 1 ? Math.sin(Math.PI * al) : 0, ar = rr * rr * rimO, ao = ar + an * (1 - ar);
      if (ao < .002) { a[j + 3] = 0; continue; }
      const nc = i * 3;
      a[j] = (255 * ar + nightCol[nc] * an * (1 - ar)) / ao; a[j + 1] = (206 * ar + nightCol[nc + 1] * an * (1 - ar)) / ao; a[j + 2] = (150 * ar + nightCol[nc + 2] * an * (1 - ar)) / ao; a[j + 3] = ao * 255;
    }
    wctx.putImageData(wmImg, 0, 0);
    // 夜色遮罩画在 WebGL 那一层里时（见 render）：传成贴图
    if (swayOK && washGL) { gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, swTexWash); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, wash); gl.activeTexture(gl.TEXTURE0); gl.uniform1f(swU.wa, 1); }
  }

  // ---------- [inherited] light ribbons (from Firefade0329/claude-desktop-splash, MIT) ----------
  // ================= 流光丝带 =================
  // 参考：尖锐明亮的前端 + 向后逐渐变宽的半透明多层丝带（尾部在画面外）+ 边缘颗粒状光点拖尾。
  // 每条丝带是一条很长的路径（起点在画面外）；“头部”沿路径前进，路径上头部以后的整段就是丝带。
  // 宽度：头部为 0（尖），往后在 d0 的距离内逐渐变宽；多层薄带随距离逐渐散开。配色取 Claude 主题：陶土橙 / 杏色 / 象牙白。
  // 退场：头部继续沿路径流出画面，尾部追上来，丝带变短、变细、变淡；各条丝带错开离场（中央先清空，边缘残光最后消退）。
  const SILK_COL = {
    orange:  { tip: [255, 238, 214], mid: [240, 148, 92], tail: [200, 98, 68] },       // 陶土橙
    ivory:   { tip: [255, 252, 244], mid: [255, 238, 216], tail: [240, 208, 172] },    // 象牙白 / 奶油
    apricot: { tip: [255, 232, 204], mid: [246, 176, 122], tail: [222, 124, 92] },     // 杏色
    cream:   { tip: [255, 250, 240], mid: [255, 226, 188], tail: [236, 180, 138] }     // 奶油金
  };
  //   pts：路径控制点（相对画面的比例，可超出 0~1）；h0→h1：第一阶段头部走到的位置（路径参数 0~1）；h2：第二阶段继续走到的位置
  //   w：最宽处（占画面高度）；d0：从尖端变到最宽所需的距离（占画面宽度）；amp/freq/speed：丝带的起伏摆动；ex0~ex1：退场时间段
  const RIBBONS = [
    { col: 'orange', pts: [[-.55,.28],[-.2,.34],[.1,.42],[.34,.56],[.58,.55],[.80,.40],[1.0,.20],[1.22,.04]],
      t0: .50, dur: 1.5, h0: .20, h1: .71, dur2: 1.4, h2: 1, w: .17, d0: .40, amp: .030, freq: 1.3, speed: 1.1, ph: 0, seed: 11, ex0: 2.9, ex1: 4.1 },
    { col: 'ivory',  pts: [[1.55,.72],[1.2,.72],[.9,.68],[.66,.62],[.45,.55],[.28,.46],[.10,.34],[-.10,.22],[-.42,.05]],
      t0: .60, dur: 1.5, h0: .20, h1: .625, dur2: 1.4, h2: 1, w: .15, d0: .40, amp: .028, freq: 1.1, speed: .9, ph: 1.7, seed: 23, ex0: 3.0, ex1: 4.2 },
    { col: 'apricot', pts: [[-.55,.70],[-.2,.66],[.2,.66],[.55,.58],[.85,.44],[1.1,.28],[1.35,.14]],
      t0: 1.5, dur: 1.7, h0: .20, h1: .95, dur2: 1, h2: .95, w: .13, d0: .34, amp: .026, freq: 1.5, speed: 1.2, ph: 3.1, seed: 37, ex0: 3.6, ex1: 4.8 },
    { col: 'cream',  pts: [[1.5,.19],[1.2,.14],[.92,.14],[.7,.18],[.56,.22],[.30,.28],[.05,.40],[-.25,.58]],
      t0: 1.8, dur: 1.5, h0: .18, h1: .57, dur2: 1, h2: .57, w: .07, d0: .26, amp: .020, freq: 1.6, speed: 1.3, ph: 4.4, seed: 51, ex0: 3.5, ex1: 5.0 },
    { col: 'ivory',  pts: [[1.5,.92],[1.15,.86],[.85,.80],[.6,.72],[.4,.64],[.18,.56],[-.05,.46],[-.35,.30]],
      t0: 1.9, dur: 1.6, h0: .18, h1: .57, dur2: 1, h2: .57, w: .12, d0: .32, amp: .024, freq: 1.2, speed: 1.0, ph: 5.2, seed: 67, ex0: 3.3, ex1: 4.5 }
  ];
  const SILK_N = 160;
  const rand32 = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  // Catmull-Rom 采样出 SILK_N+1 个点及法向（未摆动）
  function silkSpline(R) {
    const P = R.pts, per = SILK_N / (P.length - 1), out = [];
    for (let i = 0; i <= SILK_N; i++) {
      const f = Math.min(P.length - 1 - 1e-6, i / per), s = Math.floor(f), t = f - s, t2 = t * t, t3 = t2 * t;
      const p0 = P[Math.max(0, s - 1)], p1 = P[s], p2 = P[s + 1], p3 = P[Math.min(P.length - 1, s + 2)];
      out.push([0, 1].map(d => .5 * (2 * p1[d] + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3)));
    }
    R.spl = out.map((p, i) => { const a = out[Math.max(0, i - 1)], b = out[Math.min(SILK_N, i + 1)]; let nx = -(b[1] - a[1]) * H, ny = (b[0] - a[0]) * W; const l = Math.hypot(nx, ny) || 1; return [p[0], p[1], nx / l, ny / l]; });
    const rnd = rand32(R.seed); R.parts = Array.from({ length: 56 }, () => ({ f: rnd(), side: rnd() < .5 ? -1 : 1, r: 1.02 + rnd() * .55, s: .6 + rnd() * 1.1, ph: rnd() * 6.28, sp: .03 + rnd() * .05, j: (rnd() - .5) * 6 }));
  }
  const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${clamp(a, 0, 1).toFixed(3)})`;
  const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  // 画一条丝带；返回头部位置（还在前进时），否则 null
  function drawRibbon(R, tt, alpha) {
    const k = (tt - R.t0) / R.dur; if (k <= 0) return null;
    const e = clamp((tt - R.ex0) / (R.ex1 - R.ex0)); if (e >= 1) return null;
    if (!R.spl) silkSpline(R);
    const k2 = (tt - R.t0 - R.dur) / R.dur2, es = e * e * (3 - 2 * e);
    let hf = k < 1 ? lerp(R.h0, R.h1, 1 - Math.pow(1 - clamp(k), 1.9)) : lerp(R.h1, R.h2, smooth(0, 1, k2));
    if (e > 0) hf = lerp(hf, 1, smooth(0, .8, e));                     // 退场：头部继续流出画面
    const tf = hf * Math.pow(es, 1.2);                                  //       尾部追上来
    alpha *= 1 - smooth(.5, 1, e);                                      //       同时逐渐淡去
    // 采样路径（叠加摆动），只取 [尾, 头] 之间的一段
    const N = SILK_N, ihf = hf * N, ih = Math.floor(ihf), fr = ihf - ih, i0 = Math.min(Math.floor(tf * N), N - 3), col = SILK_COL[R.col];
    const last = Math.min(N, ih + 1), X = [], Y = [], NX = [], NY = [], L = [0];
    for (let i = i0; i <= last; i++) {
      const s = R.spl[i], u = i / N, wob = R.amp * H * Math.sin(u * R.freq * 6.283 + R.ph - tt * R.speed) * Math.sin(Math.PI * Math.min(1, u * 1.15));
      X.push(s[0] * W + s[2] * wob); Y.push(s[1] * H + s[3] * wob); NX.push(s[2]); NY.push(s[3]);
    }
    const n = X.length; if (n < 4) return null;
    if (ih < N) { const j = n - 1; X[j] = lerp(X[j - 1], X[j], fr); Y[j] = lerp(Y[j - 1], Y[j], fr); NX[j] = lerp(NX[j - 1], NX[j], fr); NY[j] = lerp(NY[j - 1], NY[j], fr); }
    for (let i = 1; i < n; i++) L[i] = L[i - 1] + Math.hypot(X[i] - X[i - 1], Y[i] - Y[i - 1]);
    const Lh = L[n - 1], D0 = R.d0 * W, hw = [], fan = [];
    for (let i = 0; i < n; i++) {
      const d = Lh - L[i], tailT = e > 0 ? smooth(0, .3 * W, L[i]) : 1;                 // 尾部也收成尖
      hw.push(.5 * R.w * H * Math.pow(smooth(0, D0, d), .85) * (1 + .12 * smooth(D0, 2 * D0, d)) * tailT); fan.push(smooth(0, D0 * 1.6, d));
    }
    const hx = X[n - 1], hy = Y[n - 1], back = Math.min(Lh, W * 1.1);
    let ti = n - 1; while (ti > 0 && Lh - L[ti] < back) ti--;
    const gx = X[ti], gy = Y[ti];
    const grad = (a) => { const g = rc.createLinearGradient(hx, hy, gx, gy); g.addColorStop(0, rgba(col.tip, a * 1.5)); g.addColorStop(.1, rgba(mixc(col.tip, col.mid, .6), a * 1.15)); g.addColorStop(.5, rgba(col.mid, a)); g.addColorStop(1, rgba(col.tail, a * .75)); return g; };
    const strand = (o, wd, a) => {
      rc.beginPath();
      for (let i = 0; i < n; i++) { const ee = (o * fan[i] + wd) * hw[i]; const x = X[i] + NX[i] * ee, y = Y[i] + NY[i] * ee; i ? rc.lineTo(x, y) : rc.moveTo(x, y); }
      for (let i = n - 1; i >= 0; i--) { const ee = (o * fan[i] - wd) * hw[i]; rc.lineTo(X[i] + NX[i] * ee, Y[i] + NY[i] * ee); }
      rc.closePath(); rc.fillStyle = grad(a); rc.fill();
    };
    const line = (o, wpx, a) => {
      rc.beginPath(); for (let i = 0; i < n; i++) { const ee = o * fan[i] * hw[i]; const x = X[i] + NX[i] * ee, y = Y[i] + NY[i] * ee; i ? rc.lineTo(x, y) : rc.moveTo(x, y); }
      rc.strokeStyle = grad(a); rc.lineWidth = wpx; rc.stroke();
    };
    rc.save(); rc.globalCompositeOperation = 'lighter'; rc.lineJoin = 'round'; rc.lineCap = 'round';
    alpha *= .78 * (R.col === 'ivory' || R.col === 'cream' ? 1.4 : 1);  // 整体收一点避免过曝；象牙白/奶油在深色底上显得偏灰，单独提亮
    // 柔和外晕 + 多层半透明薄带（越往后越散开）
    strand(0, 1.35, alpha * .06);
    strand(0, 1.0, alpha * .17);
    strand(-.50, .52, alpha * .20);
    strand(.46, .46, alpha * .18);
    strand(.02, .20, alpha * .26);
    // 内部清晰的细亮线
    for (const o of [-.7, -.28, .3, .74]) line(o, Math.max(1, DPR), alpha * .40);
    // 亮芯：靠近尖端最亮
    line(0, 6 * DPR, alpha * .10);
    line(0, 2 * DPR, alpha * .62);
    const moving = e === 0 && (k < 1 || k2 < 1);
    // 前端亮点（很小，不要光晕球）
    if (moving) { const r0 = .012 * H, g = rc.createRadialGradient(hx, hy, 0, hx, hy, r0); g.addColorStop(0, rgba(col.tip, alpha)); g.addColorStop(1, rgba(col.tip, 0)); rc.fillStyle = g; rc.beginPath(); rc.arc(hx, hy, r0, 0, 6.283); rc.fill(); }
    // 边缘颗粒光点：沿丝带两侧缓缓流动、闪烁、逐渐消散
    const span = Math.min(Lh, 1.3 * W);
    for (const p of R.parts) {
      const f = (p.f + tt * p.sp) % 1, d = f * span; if (d >= Lh || d < 2) continue;
      let i = n - 1; while (i > 0 && Lh - L[i] < d) i--;
      const ee = (hw[i] * p.r + p.j + 2) * p.side, x = X[i] + NX[i] * ee, y = Y[i] + NY[i] * ee;
      const tw = .45 + .55 * Math.sin(tt * 4 + p.ph), a = alpha * tw * smooth(0, .08, f) * Math.pow(1 - f, .6);
      rc.fillStyle = rgba(mixc(col.tip, col.mid, .35), a * .9); rc.beginPath(); rc.arc(x, y, p.s * DPR, 0, 6.283); rc.fill();
    }
    rc.restore();
    return moving ? [hx, hy] : null;
  }


  // ================= 星芒 ✱：手绘感的放射星（10 根长短不一的锥形光芒） =================
  const STAR_LEN = [1, .8, .94, .76, .99, .84, .92, .78, .97, .86];
  function starRay(ctx, ang, len, w) {
    ctx.save(); ctx.rotate(ang); ctx.beginPath();
    ctx.moveTo(0, -w * .4); ctx.quadraticCurveTo(len * .32, -w, len, 0); ctx.quadraticCurveTo(len * .32, w, 0, w * .4);
    ctx.closePath(); ctx.fill(); ctx.restore();
  }
  // grow(i) -> 0..1：第 i 根光芒的长度比例
  function drawStar(ctx, x, y, R, rot, grow, fill, glow, glowBlur) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = glowBlur; }
    ctx.fillStyle = fill;
    for (let i = 0; i < STAR_LEN.length; i++) { const g = grow(i); if (g > .01) starRay(ctx, i / STAR_LEN.length * 6.2832 - 1.5708, R * STAR_LEN[i] * g, R * .16 * (.6 + .4 * g)); }
    ctx.restore();
  }
  // 同样的形状写成 SVG 路径（字标旁边的星芒）
  function starSvg(R) {
    const n = STAR_LEN.length; let s = '';
    for (let i = 0; i < n; i++) {
      const a = i / n * 6.2832 - 1.5708, len = R * STAR_LEN[i], w = R * .16, c = Math.cos(a), si = Math.sin(a);
      const P = (px, py) => (px * c - py * si).toFixed(2) + ' ' + (px * si + py * c).toFixed(2);
      s += `<path data-i="${i}" d="M${P(0, -w * .4)} Q${P(len * .32, -w)} ${P(len, 0)} Q${P(len * .32, w)} ${P(0, w * .4)}Z"/>`;
    }
    return s;
  }

  // ================= 图上的点 → 屏幕上的点（画布按 object-fit: cover 铺满，再经过镜头的缩放平移） =================
  let IW = 1672, IH = 941, camS = 1, camTX = 0, camTY = 0;
  function toScreen(x, y) {
    const vw = innerWidth, vh = innerHeight, k = Math.max(vw / IW, vh / IH);
    const sx = (vw - IW * k) / 2 + x * k, sy = (vh - IH * k) / 2 + y * k, ox = vw * .4, oy = vh * .4;
    return [(ox + (sx - ox) * camS + camTX * vw / 100) * DPR, (oy + (sy - oy) * camS + camTY * vh / 100) * DPR];
  }

  // ================= 夜空星点 / 丝带光尘 / 花瓣 / 小星芒 =================
  let stars = [], dust = [], petals = [], fgPetals = [], sparks = [];
  const makeGlow = rgb => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(.35, `rgba(${rgb},.45)`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return c; };
  const SPR = [makeGlow('255,220,170'), makeGlow('255,150,80')];
  const PETAL_COL = [[222, 124, 92], [240, 160, 108], [232, 138, 100], [246, 190, 140]];
  // 前景花瓣：预先画好、带景深模糊的贴图
  const petalPath = (g, r) => { g.beginPath(); g.moveTo(0, -r); g.quadraticCurveTo(r * .95, -r * .25, 0, r); g.quadraticCurveTo(-r * .95, -r * .25, 0, -r); };
  const FG_SPR = PETAL_COL.slice(0, 3).map(c => {
    const s = 96, cv = document.createElement('canvas'); cv.width = cv.height = s; const g = cv.getContext('2d');
    g.filter = 'blur(6px)'; g.translate(s / 2, s / 2); const r = 26;
    g.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},.85)`; g.beginPath(); g.moveTo(0, -r); g.quadraticCurveTo(r * .95, -r * .25, 0, r); g.quadraticCurveTo(-r * .95, -r * .25, 0, -r); g.fill();
    return cv;
  });
  // 那阵风里的大花瓣：离镜头很近，所以很大、很虚，一闪而过
  const GUST_SPR = [[232, 132, 92], [244, 170, 120]].map(c => {
    const s = 256, cv = document.createElement('canvas'); cv.width = cv.height = s; const g = cv.getContext('2d');
    g.filter = 'blur(9px)'; g.translate(s / 2, s / 2); const r = 84;
    const gr = g.createLinearGradient(-r, -r, r, r); gr.addColorStop(0, `rgba(${c[0] + 10},${c[1] + 30},${c[2] + 40},.95)`); gr.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},.9)`);
    g.fillStyle = gr; petalPath(g, r); g.fill();
    g.strokeStyle = 'rgba(255,232,210,.55)'; g.lineWidth = 5; g.beginPath(); g.moveTo(0, -r * .8); g.quadraticCurveTo(r * .08, 0, 0, r * .75); g.stroke();
    return cv;
  });
  const GUSTS = [ // 相对 T.gust 的开始时间、用时、大小（占画面高度）、起止高度、透明度
    { t0: 0, dur: .62, s: 1.15, y0: .78, y1: .18, a: .92, c: 0, rot: -1.0 },
    { t0: .14, dur: .9, s: .42, y0: .35, y1: .05, a: .7, c: 1, rot: .4 },
    { t0: .26, dur: 1.1, s: .24, y0: .95, y1: .55, a: .6, c: 0, rot: 2.1 }
  ];
  const gustF = tt => bump(T.gust - .15, T.gust + 1.6, tt);   // 风的强弱：花瓣被吹快、头发飘得更厉害
  function seedStars() {
    const rnd = rand32(7);
    stars = Array.from({ length: 170 }, () => ({ x: rnd() * W, y: rnd() * H, r: (rnd() * 1.2 + .3) * DPR, a: rnd() * .7 + .2, p: rnd() * 6.28, s: rnd() * 2 + .8 }));
    petals = Array.from({ length: PETALS === 'more' ? 30 : 16 }, () => ({ x: rnd() * W, y: rnd() * H, r: (7 + rnd() * 9) * DPR, vx: (10 + rnd() * 16) * DPR, vy: -(4 + rnd() * 10) * DPR, ph: rnd() * 6.28, rot: rnd() * 6.28, vr: (rnd() - .5) * 1.1, flip: rnd() * 6.28, c: Math.floor(rnd() * PETAL_COL.length) }));
    fgPetals = Array.from({ length: PETALS === 'more' ? 10 : 6 }, (_, i) => ({ x: rnd() * W, y: (i % 2 ? .78 : .12 + rnd() * .2) * H + rnd() * H * .1, s: (70 + rnd() * 70) * DPR, vx: (26 + rnd() * 30) * DPR, vy: -(6 + rnd() * 10) * DPR, rot: rnd() * 6.28, vr: (rnd() - .5) * .8, flip: rnd() * 6.28, c: i % 3 }));
    sparks = Array.from({ length: 18 }, () => ({ x: rnd() * W, y: rnd() * H, s: (4 + rnd() * 5) * DPR, ph: rnd() * 6.28, sp: .8 + rnd() * 1.6, vx: (rnd() - .3) * 8 * DPR, vy: -(3 + rnd() * 8) * DPR, rot: rnd() * 6.28 }));
  }
  function emit(x, y) {
    if (dust.length > 220) return;
    for (let i = 0; i < 2; i++) dust.push({ x, y, vx: (Math.random() - .5) * 60 * DPR, vy: (Math.random() - .5) * 60 * DPR, age: 0, life: .5 + Math.random() * .7, r: (Math.random() * 2 + .8) * DPR, c: Math.random() < .5 ? 0 : 1 });
  }

  // 丝带比原项目早 0.7 秒退场：在晕染开始前就流出画面，不和最吃显卡的那一段（线稿 + 晕染 + 视频）叠在一起
  const RIB_EXIT = .7; for (const R of RIBBONS) { R.ex0 -= RIB_EXIT; R.ex1 -= RIB_EXIT; }
  const RIB_END = Math.max(...RIBBONS.map(R => R.ex1)) + .05;
  function drawRibbons(tt) {
    const rt = tt - T.ribbons;
    if (rt > 0 && rt < RIB_END && !SKIP.has('ribbons')) for (const R of RIBBONS) { const head = drawRibbon(R, rt, 1); if (head && FREEZE === null) emit(head[0], head[1]); }
  }
  function drawFx(tt, dt, hasArt) {
    fc.clearRect(0, 0, W, H);
    // 夜空：天亮时淡去
    const night = 1 - smooth(T.dawn, T.dawnEnd - .4, tt);
    if (night > 0) for (const s of stars) {
      const tw = .6 + .4 * Math.sin(tt * s.s + s.p);
      fc.fillStyle = `rgba(255,240,225,${(s.a * tw * night * smooth(.1, 1, tt)).toFixed(3)})`;
      fc.fillRect(s.x, s.y, s.r * 2, s.r * 2);
    }
    // 序 · 星芒：一根根画出 → 脉动 → 炸开成光环和放射光线 → 淡去
    if (tt < T.starEnd + .1) {
      const [sx, sy] = hasArt ? toScreen(FACE.x / 100 * IW, FACE.y / 100 * IH) : [W * .5, H * .45];
      const R0 = Math.min(W, H) * .07, pulse = bump(T.starPulse, T.starOut + .1, tt), out = smooth(T.starOut, T.starEnd, tt);
      const R = R0 * (1 + .3 * pulse + .9 * easeIn(out)), al = 1 - out;
      fc.save(); fc.globalCompositeOperation = 'lighter';
      fc.globalAlpha = al * (.55 + .45 * pulse); const gs = R * 5; fc.drawImage(SPR[1], sx - gs / 2, sy - gs / 2, gs, gs);
      fc.globalAlpha = al;
      const grow = i => easeOut((tt - (T.starIn + i * T.starStep)) / .3);
      drawStar(fc, sx, sy, R, tt * .35, grow, 'rgba(217,119,87,.9)', 'rgba(255,150,90,.9)', 26 * DPR);
      drawStar(fc, sx, sy, R * .62, tt * .35, grow, 'rgba(255,246,232,.95)', null, 0);
      const u = (tt - T.starPulse) / .75;
      if (u > 0 && u < 1) {
        const e = easeOut(u), maxR = Math.hypot(W, H) * .6;
        fc.globalAlpha = Math.pow(1 - u, 2) * .7; fc.strokeStyle = 'rgba(255,190,140,1)'; fc.lineWidth = 2 * DPR;
        fc.beginPath(); fc.arc(sx, sy, R + e * maxR * .5, 0, 6.283); fc.stroke();
        for (let i = 0; i < STAR_LEN.length; i++) {
          const a = i / STAR_LEN.length * 6.2832 - 1.5708 + tt * .35, r0 = R * 1.1 + e * maxR * .15, r1 = r0 + e * maxR * STAR_LEN[i];
          const g = fc.createLinearGradient(sx + Math.cos(a) * r0, sy + Math.sin(a) * r0, sx + Math.cos(a) * r1, sy + Math.sin(a) * r1);
          g.addColorStop(0, 'rgba(255,236,214,0)'); g.addColorStop(.3, 'rgba(255,236,214,.9)'); g.addColorStop(1, 'rgba(255,180,120,0)');
          fc.globalAlpha = 1 - u; fc.strokeStyle = g; fc.lineWidth = 1.6 * DPR;
          fc.beginPath(); fc.moveTo(sx + Math.cos(a) * r0, sy + Math.sin(a) * r0); fc.lineTo(sx + Math.cos(a) * r1, sy + Math.sin(a) * r1); fc.stroke();
        }
      }
      fc.restore();
    }
    drawRibbons(tt);
    // 丝带头部拖出的光尘
    fc.globalCompositeOperation = 'lighter';
    for (let i = dust.length - 1; i >= 0; i--) {
      const p = dust[i]; p.age += dt; if (p.age > p.life) { dust[i] = dust[dust.length - 1]; dust.pop(); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      fc.globalAlpha = (1 - p.age / p.life) * .9; const s = p.r * 6; fc.drawImage(SPR[p.c], p.x - s / 2, p.y - s / 2, s, s);
    }
    fc.globalAlpha = 1; fc.globalCompositeOperation = 'source-over';
    // 花瓣 + 小星芒：晕染之后出现；前景大花瓣带景深模糊，飘得更快
    const ba = smooth(T.washStart + .6, T.washEnd, tt) * (1 - smooth(T.handoff + .2, T.handoff + .8, tt));
    if (ba > 0) {
      for (const p of petals) {
        const gw = 1 + 3 * gustF(tt);
        p.x += (p.vx * gw + Math.sin(tt * .7 + p.ph) * 10 * DPR) * dt; p.y += p.vy * (1 + gustF(tt)) * dt; p.rot += p.vr * dt; p.flip += dt * 1.6;
        if (p.x > W + 30) p.x = -30; if (p.y < -30) p.y = H + 30;
        const c = PETAL_COL[p.c];
        fc.save(); fc.translate(p.x, p.y); fc.rotate(p.rot); fc.scale(.4 + .6 * Math.abs(Math.cos(p.flip)), 1);
        fc.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${(.55 * ba).toFixed(3)})`; petalPath(fc, p.r); fc.fill();
        fc.strokeStyle = `rgba(255,236,210,${(.5 * ba).toFixed(3)})`; fc.lineWidth = Math.max(1, DPR * .8); fc.beginPath(); fc.moveTo(0, -p.r * .8); fc.lineTo(0, p.r * .7); fc.stroke();
        fc.restore();
      }
      for (const s of sparks) {
        s.x += s.vx * dt; s.y += s.vy * dt; if (s.y < -20) { s.y = H + 20; s.x = (s.x * 7.3) % W; }
        const tw = Math.max(0, Math.sin(tt * s.sp + s.ph)), a = ba * tw * tw; if (a < .03) continue;
        fc.globalAlpha = a; fc.drawImage(SPR[0], s.x - s.s * 1.8, s.y - s.s * 1.8, s.s * 3.6, s.s * 3.6);
        drawStar(fc, s.x, s.y, s.s, s.rot + tt * .4, () => 1, 'rgba(232,140,96,1)', null, 0);
      }
      fc.globalAlpha = 1;
    }
    const fa = smooth(T.washEnd - .2, T.washEnd + .6, tt) * (1 - smooth(T.handoff, T.handoff + .5, tt));
    if (fa > 0) {
      for (const p of fgPetals) {
        p.x += p.vx * (1 + 2.2 * gustF(tt)) * dt; p.y += (p.vy + Math.sin(tt * .9 + p.rot) * 8 * DPR) * dt; p.rot += p.vr * dt; p.flip += dt * 1.1;
        if (p.x > W + p.s) { p.x = -p.s; }
        fc.save(); fc.translate(p.x, p.y); fc.rotate(p.rot); fc.scale(.45 + .55 * Math.abs(Math.cos(p.flip)), 1);
        fc.globalAlpha = fa * .55; fc.drawImage(FG_SPR[p.c], -p.s / 2, -p.s / 2, p.s, p.s); fc.restore();
      }
      fc.globalAlpha = 1;
    }
    // 一阵风：大花瓣从左下方掠过镜头飞向右上，近大远小，短暂地遮住一部分画面
    if (hasArt) for (const G of GUSTS) {
      const u = (tt - T.gust - G.t0) / G.dur; if (u <= 0 || u >= 1) continue;
      const e = .3 * easeInOut(u) + .7 * u, s = G.s * H;
      const x = lerp(-.5 * s, W + .5 * s, e), y = lerp(G.y0, G.y1, e) * H + Math.sin(u * 3.1) * .06 * H;
      fc.save(); fc.translate(x, y); fc.rotate(G.rot + u * 2.2); fc.scale(.5 + .5 * Math.abs(Math.cos(u * 4 + G.rot)), 1);
      fc.globalAlpha = G.a * smooth(0, .12, u) * (1 - smooth(.85, 1, u)); fc.drawImage(GUST_SPR[G.c], -s / 2, -s / 2, s, s); fc.restore();
    }
    fc.globalAlpha = 1;
  }
  // ================= 发梢随风飘动 / 视频上的眨眼（WebGL） =================
  //   没有 Live2D 视频时：这一层显示静止的彩图，按风向让发梢轻轻飘动（只让头发动，脸和身体不动）。
  //     头发的范围按颜色（橙色系）选出，再乘以“离脸的距离”——离脸越远（发梢）动得越多，脸附近不动。
  //   有 Live2D 视频时：视频每一帧都传到显卡，在这一层上显示，同时叠上眨眼的眼皮。
  //     视频从头播到尾（tools/make-video-variants.py 把它加长到覆盖整段动画），画面一直是视频本身，不会切换到静止画面。
  //     这需要读取视频的像素：页面从 Claude (Dawn).exe 的本机小服务打开时可以；直接从文件打开时浏览器不许，
  //     那时只显示视频本身（不眨眼），动画照样连贯。
  //   （试过让原画的唇线张开来对口型，但原画的嘴本来就是两段断开的唇线，一张嘴就像凭空多出一张嘴，已放弃。）
  const sway = $('sway');
  let gl = null, swayOK = false, swU = {}, swTexImg = null, swTexMask = null, swTexEye = null, swTexWash = null, swTexLine = null, swDirty = true, swKey = '', washGL = 0, lineVer = 0, lineTexVer = -1, lineGLA = 0;
  let vidGL = false;                                   // 视频的像素能传到显卡（眨眼画在视频上）
  const FACE_C = { x: 575, y: 380 };                  // 脸的中心（底图像素），发梢权重从这里往外增加
  function hairMask(img) {
    const w = 256, h = Math.round(256 * IH / IW), c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0, w, h);
    const im = g.getImageData(0, 0, w, h), d = im.data;
    const fx = FACE_C.x / IW, fy = FACE_C.y / IH, asp = IH / IW;
    for (let i = 0, p = 0; i < w * h; i++, p += 4) {
      const r = d[p], gg = d[p + 1], b = d[p + 2], u = (i % w) / w, v = ((i / w) | 0) / h;
      const hair = clamp((r - b - 55) / 45) * clamp((r - 135) / 50) * clamp((gg - r * .32) / (r * .12)) * clamp((r * .9 - gg) / (r * .1));
      const far = smooth(.13, .44, Math.hypot(u - fx, (v - fy) * asp));
      d[p] = d[p + 1] = d[p + 2] = Math.round(255 * hair * far); d[p + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    const o = document.createElement('canvas'); o.width = w; o.height = h; const og = o.getContext('2d');
    og.filter = 'blur(2.5px)'; og.drawImage(c, 0, 0);
    return o;
  }
  function glTex(src) {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (src) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    return t;
  }
  function buildSway() {
    if (!HAIR && !vidOK) return;
    try { gl = sway.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false }); } catch (e) { gl = null; }
    if (!gl) return;
    // 视频模式：这一层和视频一样大（显示时和 <video> 一样按 cover 铺满，位置完全相同）
    if (vidOK) { sway.width = vid.videoWidth; sway.height = vid.videoHeight; } else { sway.width = color.width; sway.height = color.height; }
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    try {
      const prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, 'attribute vec2 p; varying vec2 uv; void main(){ uv = vec2(p.x * .5 + .5, .5 - p.y * .5); gl_Position = vec4(p, 0., 1.); }'));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, [
        'precision highp float; varying vec2 uv; uniform sampler2D img, msk, eye, wsh, lin; uniform float t, amp, ea, wa, la; uniform vec4 er;',
        'void main(){',
        // 发梢飘动：波从左往右传（风向）；竖直方向是主要的飘动，水平方向轻一点；两种频率叠加，避免看起来像机械的正弦
        '  float m = amp > 0.0 ? texture2D(msk, uv).r * amp : 0.0;',
        '  vec2 st = uv - m * vec2(.0034 * sin(t * 1.5 - uv.x * 5.0 + uv.y * 6.0) + .0012 * sin(t * 2.9 - uv.y * 13.0),',
        '                         .0062 * sin(t * 2.1 - uv.x * 9.0 + uv.y * 2.5) + .0024 * sin(t * 3.7 - uv.x * 19.0 + 1.3));',
        '  vec4 col = texture2D(img, st);',
        // 眨眼（视频模式）：眼皮画在一张小图上（两只眼睛的范围），盖在视频上
        '  if (ea > 0.0) { vec2 e = (uv - er.xy) / er.zw; if (e.x > 0.0 && e.y > 0.0 && e.x < 1.0 && e.y < 1.0) { vec4 ec = texture2D(eye, e); col.rgb = mix(col.rgb, ec.rgb, ec.a * ea); } }',
        // 晕染的夜色遮罩（240 像素宽的小图，见 drawWash）也在这一层里叠上去：少一个全屏图层
        '  float night = 0.0;',
        '  if (wa > 0.0) { vec4 w = texture2D(wsh, uv); col.rgb = mix(col.rgb, w.rgb, w.a * wa); night = w.a * wa; }',
        // 发光线稿：只留在颜色还没晕到的地方（夜色里），晕开的地方线稿随之消失，露出正在动的画面
        '  if (la > 0.0) { vec4 l = texture2D(lin, uv); col.rgb = mix(col.rgb, l.rgb, l.a * la * smoothstep(.05, .7, night)); }',
        '  gl_FragColor = col; }'].join('\n')));
      gl.linkProgram(prog); if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      gl.useProgram(prog);
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      swU = {}; for (const k of ['t', 'amp', 'er', 'ea', 'wa', 'la']) swU[k] = gl.getUniformLocation(prog, k);
      gl.uniform1f(swU.ea, 0);
      gl.uniform1i(gl.getUniformLocation(prog, 'img'), 0); gl.uniform1i(gl.getUniformLocation(prog, 'msk'), 1); gl.uniform1i(gl.getUniformLocation(prog, 'eye'), 2); gl.uniform1i(gl.getUniformLocation(prog, 'wsh'), 3); gl.uniform1f(swU.wa, 0); gl.uniform1i(gl.getUniformLocation(prog, 'lin'), 4); gl.uniform1f(swU.la, 0);
      gl.activeTexture(gl.TEXTURE1); swTexMask = glTex(vidOK ? null : hairMask(baseImg));
      if (vidOK) { gl.activeTexture(gl.TEXTURE2); swTexEye = glTex(null); }
      gl.activeTexture(gl.TEXTURE3); swTexWash = glTex(null);
      gl.activeTexture(gl.TEXTURE4); swTexLine = glTex(null);
      gl.activeTexture(gl.TEXTURE0); swTexImg = glTex(null);
      gl.viewport(0, 0, sway.width, sway.height);
      if (vidOK) {
        // 试着把视频当前这一帧传上去：浏览器不许读视频像素（从文件打开的页面）时这里会出错 → 只显示视频本身
        try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, vid); vidGL = gl.getError() === gl.NO_ERROR; } catch (e) { vidGL = false; }
        document.documentElement.dataset.vidgl = String(vidGL);
        if (!vidGL) { gl = null; return; }
        buildEyeBox(); buildBlinkMasks();
        // 视频有新的一帧时才重新上传（requestVideoFrameCallback；不支持时每帧都传）
        if (vid.requestVideoFrameCallback) { const onFrame = (now, meta) => { swDirty = true; vidMT = meta ? meta.mediaTime : 0; vid.requestVideoFrameCallback(onFrame); }; vid.requestVideoFrameCallback(onFrame); }
        vid.addEventListener('seeked', () => { swDirty = true; });
      }
      swayOK = true; swDirty = true;
    } catch (e) { console.error(e); gl = null; swayOK = false; vidGL = false; }
  }
  function drawSway(tt, amp) {
    if (!swayOK) return;
    let fresh = false;
    if (swDirty || (vidGL && !vid.requestVideoFrameCallback)) {
      // 万一图被浏览器判定为不能读，放弃这一层、直接显示视频 / 那张画布，动画不会因此停住
      try { gl.bindTexture(gl.TEXTURE_2D, swTexImg); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, vidGL ? vid : color); swDirty = false; fresh = true; if (PROF) { const i = Math.floor(tt * 2); pfUp[i] = (pfUp[i] || 0) + 1; if (tt > 7 && !vid.ended && upMT >= 0) pfJud[Math.min(3, Math.max(0, Math.round((vidMT - upMT) * 60)))]++; upMT = vidMT; } }
      catch (e) { swayOK = false; vidGL = false; show(sway, 0); return; }
    } else if (PROF && vidGL && tt > 7 && vidStarted && !vid.ended) pfJud[4]++;
    // 画面没有任何变化（视频还没开始播、没在眨眼、发梢不动）时不重画：少一次全屏绘制，显卡最忙的那几秒能轻松一点
    const a = HAIR && !vidOK ? amp : 0, key = a > 0 ? '' : eyeShown + '|' + washGL + washLast + '|' + lineGLA.toFixed(3);
    if (!fresh && key && key === swKey) return;
    swKey = key;
    gl.uniform1f(swU.t, tt); gl.uniform1f(swU.amp, a);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  // ================= 眨眼 =================
  //   醒来之后再眨一次眼：缓缓闭上（0.3 秒），闭着停一下（0.06 秒），再缓缓睁开（0.5 秒），都是缓入缓出——和整段动画舒缓的节奏一致。
  //   眼皮用的是睁眼同一套眼睛画面（闭眼 → 睁眼的各个阶段）。
  const BLINK = { close: .3, hold: .06, open: .5 };
  function blinkP(tt, at) {
    const u = tt - at, B = BLINK; if (u <= 0 || u >= B.close + B.hold + B.open) return 3;
    const c = u < B.close ? smooth(0, B.close, u) : u < B.close + B.hold ? 1 : 1 - smooth(B.close + B.hold, B.close + B.hold + B.open, u);
    return 3 - 2.92 * c;
  }
  // 视频里她的头在轻轻晃：眼睛的位置随时间变。TRACK 是事先从视频里量出来的偏移（视频按 VIDEO_FRAMING 缩放到底图大小后的像素；
  // 从视频的 3.0 秒（眼睛睁开以后）起，每 0.1 秒一组 [左眼 x, y, 右眼 x, y]）。
  // 重新测量：从本机小服务打开 splash.html?track&livevideo=1080p60（见 trackVideo），结果在窗口标题里。所有画质都由同一个原视频转出，偏移通用。
  const TRACK = { from: 3.0, step: .1, d: [
    [-2.8, 2.3, -3.3, 1.2], [-2.9, 2, -3.4, 1], [-2.9, 1.9, -3.6, 1], [-3, 1.6, -3.7, 0.7], [-2.6, 1.4, -3.2, 0.2], [-2.6, 1.3, -3.2, 0.1], [-2.6, 1.2, -3.2, 0.1], [-2.6, 1.1, -3.2, 0], [-2.6, 1.1, -3.2, 0], [-2.5, 1, -3.2, -0.1],
    [-2.4, 0.8, -3.1, -0.1], [-2.3, 0.8, -3.1, -0.1], [-2.3, 0.7, -3, -0.2], [-2.2, 0.7, -3, -0.2], [-2.2, 0.7, -2.9, -0.3], [-2.1, 0.6, -2.8, -0.3], [-2.1, 0.5, -2.3, -0.6], [-1.5, 0.4, -2.2, -0.7], [-1.5, 0.2, -2.1, -0.7], [-1.4, 0.2, -2.1, -0.7],
    [-1.3, 0.2, -2, -0.7], [-1.2, 0.2, -1.9, -0.7], [-1.1, 0.2, -1.8, -0.7], [-1.1, 0.2, -1.8, -0.7], [-1, 0.2, -1.8, -0.7], [-1, 0.2, -1.7, -0.7], [-0.9, 0.2, -1.7, -0.7], [-0.9, 0.2, -1.6, -0.7], [-0.8, 0.2, -1.5, -0.7], [-0.8, 0.2, -1.5, -0.7],
    [-0.7, 0.2, -1.4, -0.9], [-0.7, 0.2, -1.4, -0.9], [-0.8, 0.2, -1.3, -0.9], [-0.7, 0.2, -1.2, -0.8], [-0.7, 0.2, -1, -0.8], [-0.7, 0.2, -1, -0.8], [-0.7, 0.2, -1, -0.8], [-0.6, 0.2, -1, -0.8], [-0.5, 0.2, -1, -0.8], [-0.5, 0.1, -0.9, -0.8],
    [-0.4, 0.1, -0.9, -0.7], [-0.4, 0.1, -0.9, -0.7], [-0.4, 0.1, -0.8, -0.7], [-0.3, 0.1, -0.8, -0.7], [-0.3, 0.1, -0.7, -0.6], [-0.3, 0.1, -0.7, -0.6], [-0.2, 0.1, -0.7, -0.6], [-0.2, 0.1, -0.6, -0.6], [-0.2, 0.1, -0.6, -0.6], [-0.2, 0.1, -0.6, -0.6],
    [-0.1, 0.1, -0.6, -0.5], [-0.1, 0.1, -0.6, -0.5], [-0.1, 0.1, -1.1, -0.5], [-0.1, 0.2, -1.1, -0.5], [-0.1, 0.2, -1.1, -0.4], [-0.1, 0.2, -1.1, -0.4], [-0.1, 0.2, -1.2, -0.4], [-0.1, 0.2, -1.3, -0.5], [-0.1, 0.2, -0.9, -0.5],
  ] };
  function trackAt(vt, i) {
    const d = TRACK.d; if (!d.length) return 0;
    const x = clamp((vt - TRACK.from) / TRACK.step, 0, d.length - 1), k = Math.min(d.length - 2, Math.floor(x)), f = x - k;
    return d.length < 2 ? d[0][i] : lerp(d[k][i], d[k + 1][i], f);
  }
  // mask：只保留这块区域（视频上的眨眼用 blinkMask，只盖住眨眼时真正变化的眼皮、眼珠，别的地方仍是正在动的视频）
  function eyeLayer(key, p, mask) {
    const E = rigs[key], [, , w, h] = E.win;
    composeEye(E, Math.min(3, p)); E.g.putImageData(E.out, 0, 0);
    feather.width = w; feather.height = h; fg.clearRect(0, 0, w, h); fg.drawImage(E.cv, 0, 0);
    fg.globalCompositeOperation = 'destination-in';
    if (mask) fg.drawImage(mask, 0, 0);
    else {
      const gr = fg.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, '#000'); gr.addColorStop(.78, '#000'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      fg.save(); fg.translate(w / 2, h / 2); fg.scale(1, h / w); fg.translate(-w / 2, -w / 2); fg.fillStyle = gr; fg.fillRect(0, 0, w, w); fg.restore();
    }
    fg.globalCompositeOperation = 'source-over';
    return feather;
  }
  // 眨眼时真正会变的地方：把闭眼、半闭的几帧和睁眼那一帧逐像素比较，差得多的地方（眼皮、睫毛、眼珠）保留，
  // 再往外扩几个像素、边缘羽化。刘海、眉毛、脸颊不在里面：那些地方一直显示正在动的视频，眨眼时不会“定住”
  const blinkMask = {};
  function buildBlinkMasks() {
    for (const key of ['L', 'R']) {
      const E = rigs[key], [, , w, h] = E.win;
      composeEye(E, 3); const open = new Uint8ClampedArray(E.out.data);
      const diff = new Float32Array(w * h);
      for (const p of [0, .6, 1.2, 1.8, 2.4]) {
        composeEye(E, p); const d = E.out.data;
        for (let i = 0, j = 0; j < diff.length; i += 4, j++) diff[j] = Math.max(diff[j], Math.abs(d[i] - open[i]), Math.abs(d[i + 1] - open[i + 1]), Math.abs(d[i + 2] - open[i + 2]));
      }
      const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
      const im = g.createImageData(w, h);
      for (let j = 0; j < diff.length; j++) im.data[j * 4 + 3] = Math.round(255 * smooth(14, 40, diff[j]));
      g.putImageData(im, 0, 0);
      // 往外扩一点再羽化：叠几次模糊后的自己，相当于膨胀
      const o = document.createElement('canvas'); o.width = w; o.height = h; const og = o.getContext('2d');
      og.filter = 'blur(3px)'; for (let k = 0; k < 3; k++) og.drawImage(c, 0, 0); og.drawImage(o, 0, 0);
      og.filter = 'none';
      // 窗口边缘一定透明（和原来的椭圆羽化相乘）
      og.globalCompositeOperation = 'destination-in';
      const gr = og.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, '#000'); gr.addColorStop(.8, '#000'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      og.save(); og.translate(w / 2, h / 2); og.scale(1, h / w); og.translate(-w / 2, -w / 2); og.fillStyle = gr; og.fillRect(0, 0, w, w); og.restore();
      og.globalCompositeOperation = 'source-over';
      blinkMask[key] = o;
    }
    composeEye(rigs.L, 3); composeEye(rigs.R, 3);
  }
  // 视频上的眨眼：两只眼睛所在的一块小图（底图像素的范围，四周留出头部晃动的余量），只在眨眼的那 0.3 秒里重画、上传
  const eyeBox = { x: 0, y: 0, w: 0, h: 0, cv: document.createElement('canvas'), k: 1 };
  function buildEyeBox() {
    const M = 34, ws = ['L', 'R'].map(k => rigs[k].win);
    const x0 = Math.min(...ws.map(w => w[0])) - M, y0 = Math.min(...ws.map(w => w[1])) - M;
    const x1 = Math.max(...ws.map(w => w[0] + w[2])) + M, y1 = Math.max(...ws.map(w => w[1] + w[3])) + M;
    const F = VIDEO_FRAMING; eyeBox.k = sway.width / IW;
    Object.assign(eyeBox, { x: x0 * F.sx + F.dx, y: y0 * F.sy + F.dy, w: (x1 - x0) * F.sx, h: (y1 - y0) * F.sy });
    eyeBox.cv.width = Math.round(eyeBox.w * eyeBox.k); eyeBox.cv.height = Math.round(eyeBox.h * eyeBox.k);
    gl.uniform4f(swU.er, eyeBox.x / IW, eyeBox.y / IH, eyeBox.w / IW, eyeBox.h / IH);
  }
  let eyeShown = -1;
  function blinkOnVideo(p, vt) {
    if (!vidGL) return;
    if (p >= 2.98) { if (eyeShown !== 3) { eyeShown = 3; gl.uniform1f(swU.ea, 0); } return; }
    if (Math.abs(p - eyeShown) < .003) return;
    eyeShown = p;
    const g = eyeBox.cv.getContext('2d'), F = VIDEO_FRAMING, k = eyeBox.k;
    g.clearRect(0, 0, eyeBox.cv.width, eyeBox.cv.height);
    ['L', 'R'].forEach((key, j) => {
      const [wx, wy, w, h] = rigs[key].win, ox = trackAt(vt, j * 2), oy = trackAt(vt, j * 2 + 1);
      g.drawImage(eyeLayer(key, p, blinkMask[key]), (wx * F.sx + F.dx + ox - eyeBox.x) * k, (wy * F.sy + F.dy + oy - eyeBox.y) * k, w * F.sx * k, h * F.sy * k);
    });
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, swTexEye); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, eyeBox.cv); gl.activeTexture(gl.TEXTURE0);
    // 眼皮几乎全开时才快速淡入 / 淡出（约一帧）：视频里眼珠看的方向和底图略有不同，
    // 淡入淡出拖长了会看到两层睫毛叠在一起（重影），比眼珠跳一下更显眼
    gl.uniform1f(swU.ea, smooth(2.995, 2.88, p));
  }
  // 测量（?track，需要从本机小服务打开）：逐个时间点把视频画到底图大小的画布上，找出两只眼睛相对底图位置的偏移
  async function trackVideo() {
    const cv = document.createElement('canvas'); cv.width = IW; cv.height = IH; const g = cv.getContext('2d', { willReadFrequently: true });
    const F = VIDEO_FRAMING, gray = (d, i) => d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11;
    const tpls = [];
    for (const key of ['L', 'R']) { composeEye(rigs[key], 3); rigs[key].g.putImageData(rigs[key].out, 0, 0); tpls.push([rigs[key].cv, rigs[key].win]); }
    const T2 = tpls.map(([src, [wx, wy, w, h]]) => {
      const W2 = Math.round(w * F.sx), H2 = Math.round(h * F.sy), t = document.createElement('canvas'); t.width = W2; t.height = H2;
      const tg = t.getContext('2d', { willReadFrequently: true }); tg.drawImage(src, 0, 0, W2, H2);
      return { A: tg.getImageData(0, 0, W2, H2).data, W2, H2, X0: Math.round(wx * F.sx + F.dx), Y0: Math.round(wy * F.sy + F.dy), best: [0, 0] };
    });
    const out = [], to = +(q.get('trackTo') || (vid.duration - .05)), from = +(q.get('trackFrom') || 3);
    for (let vt = from; vt <= to + 1e-6; vt += .1) {
      vid.currentTime = vt; await new Promise(r => vid.addEventListener('seeked', r, { once: true }));
      g.drawImage(vid, 0, 0, IW, IH); const full = g.getImageData(0, 0, IW, IH).data;
      const row = [];
      for (const P of T2) {
        const { A, W2, H2, X0, Y0 } = P;
        const sad = (ox, oy) => {
          let sum = 0;
          for (let y = Math.round(H2 * .15); y < H2 * .85; y += 2) for (let x = Math.round(W2 * .15); x < W2 * .85; x += 2) {
            const X = X0 + x + ox, Y = Y0 + y + oy; if (X < 0 || Y < 0 || X >= IW || Y >= IH) { sum += 255; continue; }
            sum += Math.abs(gray(A, (y * W2 + x) * 4) - gray(full, (Y * IW + X) * 4));
          }
          return sum;
        };
        let best = [0, 0], bv = sad(0, 0);
        for (let oy = -30; oy <= 30; oy += 2) for (let ox = -30; ox <= 30; ox += 2) { const v = sad(ox, oy); if (v < bv) { bv = v; best = [ox, oy]; } }
        const [cx, cy] = best;
        for (let oy = cy - 2; oy <= cy + 2; oy++) for (let ox = cx - 2; ox <= cx + 2; ox++) { const v = sad(ox, oy); if (v < bv) { bv = v; best = [ox, oy]; } }
        // 亚像素：在最优点两侧按抛物线插值
        const sx = [sad(best[0] - 1, best[1]), bv, sad(best[0] + 1, best[1])], sy = [sad(best[0], best[1] - 1), bv, sad(best[0], best[1] + 1)];
        const sub = a => { const den = a[0] - 2 * a[1] + a[2]; return den > 0 ? clamp((a[0] - a[2]) / (2 * den), -.5, .5) : 0; };
        row.push(+(best[0] + sub(sx)).toFixed(1), +(best[1] + sub(sy)).toFixed(1));
      }
      out.push(row);
    }
    window.__track = { from, step: .1, d: out };
    document.title = 'TRACK|' + JSON.stringify(window.__track);
  }

  // ================= 晨光：左上角斜射的光束 + 镜头光斑（半分辨率画布，screen 混合） =================
  function drawRays(tt, light, vig) {
    yc.clearRect(0, 0, RW, RH);
    yc.globalAlpha = light;
    const ox = -RW * .08, oy = -RH * .18, len = Math.hypot(RW, RH) * 1.3;
    yc.globalCompositeOperation = 'lighter';
    const beams = [[.42, .05, .10], [.55, .035, .14], [.68, .06, .08], [.80, .03, .12], [.93, .05, .07], [1.05, .03, .10]];
    for (const [ang, wid, a] of beams) {
      const th = ang + Math.sin(tt * .35 + ang * 9) * .015;
      const g = yc.createLinearGradient(ox, oy, ox + Math.cos(th) * len, oy + Math.sin(th) * len);
      g.addColorStop(0, `rgba(255,236,206,${a * 1.6})`); g.addColorStop(.45, `rgba(255,226,190,${a})`); g.addColorStop(1, 'rgba(255,220,180,0)');
      yc.fillStyle = g; yc.beginPath(); yc.moveTo(ox, oy);
      yc.lineTo(ox + Math.cos(th - wid) * len, oy + Math.sin(th - wid) * len); yc.lineTo(ox + Math.cos(th + wid) * len, oy + Math.sin(th + wid) * len); yc.closePath(); yc.fill();
    }
    // 光斑：沿着从光源到画面中心的直线排列
    const cx = RW * .55, cy = RH * .55;
    [[.18, 28, .10], [.34, 10, .16], [.52, 46, .05], [.7, 16, .10]].forEach(([k, r, a]) => {
      const x = lerp(ox + RW * .1, cx, k), y = lerp(oy + RH * .12, cy, k), g = yc.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,214,170,${a})`); g.addColorStop(.7, `rgba(255,190,140,${a * .5})`); g.addColorStop(1, 'rgba(255,190,140,0)');
      yc.fillStyle = g; yc.beginPath(); yc.arc(x, y, r, 0, 6.283); yc.fill();
    });
    yc.globalCompositeOperation = 'source-over';
    if (vig > .003) {
      const g = yc.createRadialGradient(RW * .45, RH * .4, 0, RW * .45, RH * .4, Math.hypot(RW, RH) * .62);
      g.addColorStop(0, 'rgba(40,18,8,0)'); g.addColorStop(.55 / 1.12, 'rgba(40,18,8,0)'); g.addColorStop(1, 'rgba(40,18,8,.28)');
      yc.globalAlpha = vig; yc.fillStyle = g; yc.fillRect(0, 0, RW, RH);
    }
    yc.globalAlpha = 1;
  }

  // ================= 交接：胸前花饰处亮起星芒，扩成一团暖光盖满画面 =================
  let flashOn = false;
  function drawHandoff(tt, hasArt) {
    if (tt < T.handoff) { if (flashOn) { hc.clearRect(0, 0, W, H); flashOn = false; } return; }   // 没画东西时不碰这块全屏画布
    hc.clearRect(0, 0, W, H); flashOn = true;
    const B = ART === 'classic' ? BROOCH_CLASSIC : BROOCH;
    let bx = B.x, by = B.y; if (vidOK) { bx = bx * VIDEO_FRAMING.sx + VIDEO_FRAMING.dx; by = by * VIDEO_FRAMING.sy + VIDEO_FRAMING.dy; }
    const [x, y] = hasArt ? toScreen(bx, by) : [W * .5, H * .5];
    const R0 = Math.min(W, H) * .05, g1 = easeOut((tt - T.handoff) / .35), u = easeIn((tt - T.handoff - .25) / .8);
    hc.save(); hc.globalCompositeOperation = 'lighter';
    hc.globalAlpha = g1 * (1 - u * .5); const gs = R0 * 6; hc.drawImage(SPR[0], x - gs / 2, y - gs / 2, gs, gs);
    drawStar(hc, x, y, R0 * (1 + 1.5 * u), tt * .8, i => clamp(g1 * 1.4 - i * .04), 'rgba(255,248,236,1)', 'rgba(255,160,100,1)', 22 * DPR);
    hc.restore();
    if (u > 0) {
      const r = u * Math.hypot(W, H) * 1.15, g = hc.createRadialGradient(x, y, 0, x, y, Math.max(1, r));
      g.addColorStop(0, 'rgba(255,251,245,1)'); g.addColorStop(.45, 'rgba(253,247,239,.97)'); g.addColorStop(.7, 'rgba(250,226,200,.7)'); g.addColorStop(.86, 'rgba(240,178,138,.3)'); g.addColorStop(1, 'rgba(217,119,87,0)');
      hc.fillStyle = g; hc.fillRect(0, 0, W, H);
      if (u >= 1) { hc.fillStyle = 'rgb(252,247,240)'; hc.fillRect(0, 0, W, H); }
    }
  }

  // ================= HUD：左上时钟 / 左下阶段条 / 右上字标和欢迎语 =================
  const stageEl = $('stage'), hudTL = $('hudTL'), clockEl = $('clock'), metaEl = $('meta'), stagesEl = $('stages'), fillEl = $('fill');
  const stEls = [...document.querySelectorAll('#stages .st')];
  const tag = $('tag'), wm = $('wm'), wmSweep = $('wmSweep'), gSweep = $('gSweep'), rule = $('rule'), wtext = $('wtext'), caret = $('caret'), sub = $('sub'), mStar = $('mStar');
  mStar.innerHTML = starSvg(46); mStar.setAttribute('fill', '#d97757');
  const mRays = [...mStar.querySelectorAll('path')];
  const skipEl = $('skip'); if (LAUNCHER) skipEl.style.display = 'block';
  const pad2 = n => String(n).padStart(2, '0');
  let typedN = -1, lastStage = -2, lastClock = '';
  // 只在值变化时才写 DOM：每帧都写样式会让浏览器每帧重新计算样式，CPU 紧张时就会卡
  const _cache = new Map();
  const same = (el, k, v) => { let m = _cache.get(el); if (!m) _cache.set(el, m = {}); if (m[k] === v) return true; m[k] = v; return false; };
  const setS = (el, k, v) => { if (!same(el, 's:' + k, v)) el.style[k] = v; };
  const setP = (el, k, v) => { if (!same(el, 'p:' + k, v)) el.style.setProperty(k, v); };
  const setA = (el, k, v) => { if (!same(el, 'a:' + k, v)) el.setAttribute(k, v); };
  function drawHud(tt) {
    // 夜里象牙白、天亮后墨色
    // 文字颜色从夜里的象牙白渐变成墨色：只分 12 级（每变一次，带阴影的文字都要重画一遍）
    const day = Math.round(smooth(T.dawn + .2, T.dawnEnd - .2, tt) * 12) / 12;
    const mix = (a, b) => a.map((v, i) => Math.round(lerp(v, b[i], day)));
    const c = mix([246, 236, 222], [59, 37, 25]);
    setP(stageEl, '--hud', `rgba(${c},${lerp(.8, .82, day).toFixed(2)})`);
    setP(stageEl, '--hud-dim', `rgba(${c},${lerp(.42, .4, day).toFixed(2)})`);
    // 文字后面垫一层和底色相反的柔光，线稿很亮或衣服很白时也能看清
    setP(stageEl, '--hud-shadow', `0 0 7px rgba(12,7,4,${(.9 * (1 - day)).toFixed(2)}), 0 0 2px rgba(12,7,4,${(.7 * (1 - day)).toFixed(2)}), 0 0 8px rgba(255,250,242,${(.8 * day).toFixed(2)})`);
    const hudOut = 1 - smooth(T.handoff, T.handoff + .45, tt);
    show(hudTL, smooth(.3, 1.1, tt) * hudOut);
    const now = new Date(), ck = pad2(now.getHours()) + ':' + pad2(now.getMinutes()) + ':' + pad2(now.getSeconds());
    if (ck !== lastClock) { lastClock = ck; clockEl.textContent = ck; }
    const kelvin = Math.round(lerp(2700, 5600, smooth(T.dawn, T.text, tt)) / 10) * 10;
    if (!same(metaEl, 'k', kelvin)) metaEl.innerHTML = 'SESSION <b>0x2F</b> · ' + kelvin + 'K';
    show(stagesEl, smooth(1.4, 2.1, tt) * hudOut);
    let si = -1; for (let i = 0; i < 4; i++) if (tt >= STAGE_AT[i]) si = i;
    if (si !== lastStage) { lastStage = si; stEls.forEach((e, i) => { e.classList.toggle('on', i === si); e.classList.toggle('done', i < si); }); }
    setS(fillEl, 'width', (100 * clamp((tt - T.sketch) / (T.handoff - T.sketch))).toFixed(2) + '%');
    // 字标：星芒一根根长出来 → “Claude” 描边写出 → 填色 → 一道光扫过
    const tx = T.text;
    show(tag, smooth(tx - .2, tx + .4, tt));
    mRays.forEach((p, i) => { const g = easeOut((tt - (tx + i * .045)) / .35); setS(p, 'transform', `scale(${g.toFixed(3)})`); setS(p, 'opacity', g > .01 ? '1' : '0'); });
    if (tt > tx - .1) setA(mStar, 'transform', `translate(56 78) rotate(${(tt * 14).toFixed(1)})`);
    setA(wm, 'stroke-dashoffset', (900 * (1 - easeInOut((tt - (tx + .15)) / .8))).toFixed(1));
    setA(wm, 'fill-opacity', smooth(tx + .6, tx + 1.1, tt).toFixed(3));
    setA(wm, 'stroke-opacity', (1 - .75 * smooth(tx + .95, tx + 1.4, tt)).toFixed(3));
    const su = clamp((tt - (tx + 1.05)) / .7), sx0 = -180 + 760 * easeInOut(su);
    setA(gSweep, 'x1', sx0.toFixed(1)); setA(gSweep, 'x2', (sx0 + 170).toFixed(1));
    setA(wmSweep, 'opacity', (bump(0, 1, su) * .9).toFixed(3));
    setS(rule, 'width', (22 * easeOut((tt - (tx + .75)) / .8)).toFixed(2) + 'vw');
    // 欢迎语：逐字打出，名字用陶土橙
    const tn = Math.max(-1, Math.floor((tt - T.welcome) / T.typeStep));
    if (tn !== typedN) {
      typedN = tn; const a = [...WELCOME[0]], b = [...WELCOME[1]], k = Math.max(0, tn + 1);
      const esc = s => s.replace(/[&<>]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]));
      wtext.innerHTML = esc(a.slice(0, k).join('')) + (k > a.length ? '<em>' + esc(b.slice(0, k - a.length).join('')) + '</em>' : '');
    }
    const typedEnd = T.welcome + T.welcomeChars * T.typeStep;
    setS(caret, 'opacity', tt > T.welcome - .3 && tt < T.handoff && (tt < typedEnd || Math.floor(tt * 2.6) % 2 === 0) ? '1' : '0');
    show(sub, VOICE_DUR ? smooth(T.voice - .05, T.voice + .4, tt) : smooth(typedEnd + .1, typedEnd + .6, tt));
  }

  // ================= 渲染一帧 =================
  let lastP = -1, ribOn = false, lastT = 0, hasArt = false, lineDrawAt = -1, eyesMerged = false;
  // 图层显示：用不到的全屏图层直接隐藏（visibility: hidden），GPU 就不用每帧合成它。
  // 以前所有图层都保持 0.003 的透明度“预热”，十几层全屏图每帧都要合成，集成显卡带不动，视频也跟着卡住。
  // warm = 马上要用到：先以几乎看不见的透明度显示出来，让浏览器提前把它传到显存，第一次出现时不卡。
  const SKIP = new Set((q.get('skip') || '').split(',').filter(Boolean));   // 调试：?skip=ribbons,fx,rays,sway 跳过某些绘制
  const HIDE = new Set((q.get('hide') || '').split(',').filter(Boolean));   // 调试：?hide=line,rays,fx 强制隐藏某些图层，用来找出最吃显卡的那一层
  const show = (el, a, warm) => {
    const v = HIDE.has(el.id) ? 0 : Math.round(a * 1000) / 1000; if (HIDE.has(el.id)) warm = false;
    if (v <= .001) { setS(el, 'visibility', warm ? 'visible' : 'hidden'); setS(el, 'opacity', warm ? '0.003' : '0'); }
    else { setS(el, 'visibility', 'visible'); setS(el, 'opacity', String(v)); }
  };
  // 预热窗口：从 from 到结束。各图层的预热时间错开（见下面各处的 from），不要几张全屏图同一时刻第一次出现，那一刻会卡一下
  const near = (tt, from, b) => tt > from && tt < b;
  const camEl = $('cam'), vignetteEl = $('vignette'), fadeEl = $('fade');
  function render(tt) {
    if (PROF) pfMark = performance.now();
    const dt = clamp(tt - lastT, 0, .3); lastT = tt;   // 和时钟一致：卡顿后粒子按真实经过的时间移动，不会“停住再瞬移”
    // 流光丝带（原项目的丝带，时间整体后移 T.ribbons）
    show(rib, 0);   // 丝带在 drawFx 里画（见 drawRibbons）
    pfLap('ribbons');
    if (hasArt) {
      // 01 勾勒：笔尖沿笔画画出线稿；画完后换成完整的发光线稿（光晕不再被遮罩切掉）
      const lineOut = 1 - smooth(T.linesOut, T.linesOutEnd, tt);
      // 线稿遮罩每 1/30 秒才重画一次：每次要在 2000 px 宽的画布上画两遍整张图，是显卡最重的活之一
      if (tt >= T.sketch - .05 && tt <= T.sketchEnd + .6 && (tt - lineDrawAt > .033 || tt < lineDrawAt) && drawMask(tt)) {
        lineDrawAt = tt;
        ldc.globalCompositeOperation = 'source-over'; ldc.clearRect(0, 0, LW, LH); ldc.drawImage(line, 0, 0);
        ldc.globalCompositeOperation = 'destination-in'; ldc.drawImage(maskCv, 0, 0, LW, LH); ldc.globalCompositeOperation = 'source-over';
      }
      const full = smooth(T.sketchEnd - .35, T.sketchEnd + .35, tt);
      show(lineDraw, (tt >= T.sketch ? 1 - full : 0) * lineOut, near(tt, T.sketch - .6, T.sketchEnd + .4));
      const lineA = full * lineOut;   // 主线稿的透明度（晕染开始后画在 WebGL 那一层里，见下面）
      // 眼睛的线稿亮起之后，把它合进主线稿那一层，少一张全屏图层
      if (!eyesMerged && tt >= T.eyesInEnd) { eyesMerged = true; lineVer++; const lc = line.getContext('2d'); lc.globalCompositeOperation = 'lighter'; lc.drawImage(lineEyes, 0, 0); lc.globalCompositeOperation = 'source-over'; }
      if (eyesMerged && tt < T.eyesInEnd) { eyesMerged = false; lineVer++; rebuildLine(); }
      show(lineEyes, eyesMerged ? 0 : smooth(T.eyesIn, T.eyesInEnd, tt) * lineOut, !eyesMerged && near(tt, 3.6, T.eyesInEnd));
      const penA = smooth(T.sketch - .05, T.sketch + .15, tt) * (1 - smooth(T.sketchEnd - .2, T.sketchEnd + .25, tt));
      if (penA > 0 || pen.style.opacity > .01) drawPens(tt, dt, penA);
      show(pen, penA > 0 ? 1 : 0, near(tt, T.sketch - .6, T.sketchEnd));
      // 02 晕染：画面从花饰处晕开；晕开完成后直接显示彩图 / 视频
      syncVideo(tt);
      // 视频模式：视频画面显示在 WebGL 那一层上（眨眼画在视频上）；读不到视频像素时直接显示 <video>
      const src = vidOK ? (vidGL ? sway : vid) : swayOK ? sway : color, vt = tt - VIDEO_START;
      // 预热（几乎透明地先显示）只提前很短的时间：预热中的图层每帧也要合成，提前太久会白白拖慢前面的画面
      // 显示在 WebGL 那一层上时，夜色遮罩直接叠在那一层里（washGL），不再单独显示 wash 这个全屏图层
      const inGL = swayOK && src === sway, washOn = tt >= T.washStart && tt < T.washEnd + .05;
      if (inGL && washGL !== (washOn ? 1 : 0)) { washGL = washOn ? 1 : 0; gl.uniform1f(swU.wa, 0); washLast = -1; }
      if (washOn) { drawWash(tt); show(wash, inGL ? 0 : 1); show(src, 1); }
      else if (tt >= T.washEnd) { show(wash, 0); show(src, 1); }
      else { show(wash, 0, !inGL && near(tt, 4.0, T.washEnd)); show(src, 0, near(tt, 4.05, T.washEnd)); }
      // 线稿：晕染开始后画进 WebGL 那一层，只留在颜色还没晕到的地方（晕开一处、那里的线稿就消失一处）
      const lineGL = inGL && washOn && lineA > .001;
      show(line, lineGL || (inGL && tt >= T.washStart) ? 0 : lineA, !lineGL && near(tt, 3.5, inGL ? T.washStart + .05 : T.linesOutEnd));
      if (inGL) {
        if (lineGL && lineTexVer !== lineVer) { lineTexVer = lineVer; gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, swTexLine); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, line); gl.activeTexture(gl.TEXTURE0); }
        const la = lineGL ? lineA : 0; if (Math.abs(la - lineGLA) > .0005 || (la === 0) !== (lineGLA === 0)) { lineGLA = la; gl.uniform1f(swU.la, la); }
      }
      if (vidGL) show(vid, 0);
      show(rim, 0);
      // 03 醒来：睁眼（逐帧合成；视频模式由视频完成），之后再眨一次眼
      const pr = FORCE_P !== null ? FORCE_P : vidOK ? blinkP(tt, T.blink) : Math.min(openProgress((tt - T.open) / (T.openEnd - T.open)), blinkP(tt, T.blink));
      if (vidGL) blinkOnVideo(pr, vt);
      else if (!vidOK && baseImg && Math.abs(pr - lastP) > .003) { lastP = pr; paintFace(cc, pr); swDirty = true; }
      // 发梢飘动（没有视频时）：晕染开始后慢慢起风，那阵风经过时飘得更厉害
      const swAmp = smooth(T.washStart, T.washEnd + .8, tt) * (1 + 1.3 * gustF(tt));
      if (swayOK && src === sway && tt > 3.4 && !SKIP.has('sway') && (sway.style.visibility === 'visible')) drawSway(tt, swAmp);
    }
    // 镜头：极慢地推近、略微平移
    // 视频模式也一直推到 9.6 秒：晕染时镜头停住、线稿又不动，看起来人物是静止的。（以前 <video> 图层每帧缩放会卡，
    // 所以视频开始前就停住；现在视频画在 WebGL 那一层里，跟着镜头缩放不再卡——见 README 里的实测）
    const camEnd = 9.6;
    // 位置多保留一位小数：推近快结束时每帧只动零点几个像素，精度不够会变成隔几帧才跳一下
    camS = 1.105 - .08 * easeOut((tt - 1.6) / (camEnd - 1.6));   // 最后停在 1.025，平移时边缘不露底
    camTX = -.8 * easeInOut((tt - 2.8) / (camEnd - 2.8)); camTY = -.5 * easeInOut((tt - 2.8) / (camEnd - 2.8));
    if (ZOOM && q.has('zoomAt')) setS(camEl, 'transformOrigin', q.get('zoomAt').split(',').map(v => v + '%').join(' '));
    setS(camEl, 'transform', ZOOM ? `scale(${ZOOM})` : `translate(${camTX.toFixed(4)}vw, ${camTY.toFixed(4)}vh) scale(${camS.toFixed(5)})`);
    // 晨光、暗角
    const light = smooth(T.dawn, T.dawnEnd, tt) * (1 - .35 * smooth(T.text, T.handoff, tt));
    pfLap('art');
    // 晨光和暗角画在同一张半分辨率的画布上（以前暗角是另一个全屏图层）
    const vig = hasArt ? smooth(T.dawn, T.dawnEnd, tt) * .9 : 0;
    if ((light > .003 || vig > .003) && !SKIP.has('rays')) drawRays(tt, light, vig);
    pfLap('rays');
    show(rays, hasArt && (light > .003 || vig > .003) ? 1 : 0, near(tt, 4.3, 99));
    show(vignetteEl, 0);
    drawHud(tt); pfLap('hud');
    if (!SKIP.has('fx')) drawFx(tt, dt, hasArt); pfLap('fx');
    drawHandoff(tt, hasArt); pfLap('handoff');
    show(flash, tt >= T.handoff ? 1 : 0, tt > T.handoff - .6);
    setS(fadeEl, 'opacity', LAUNCHER ? '0' : smooth(T.done + .2, T.total, tt).toFixed(3));
    if (LAUNCHER) show(skipEl, smooth(1.2, 1.9, tt) * (1 - smooth(T.handoff - .3, T.handoff, tt)));
    if (LAUNCHER && !doneSet && tt >= T.done) { doneSet = true; setState('DONE'); }       // 暖光盖满画面时通知启动器淡出窗口
  }

  // ================= 播放控制（时钟和启动器握手 adapted from the original project） =================
  // 播放时钟：平时按真实时间走（卡顿时画面少几帧，但节奏不变，音乐和视频也就不会错开）；
  // 只有窗口被挂起很久（> 0.3 秒，例如被系统暂停绘制）才当作一帧，避免整段跳过。
  // 睁眼视频播放期间，动画不能跑到视频前面超过 0.25 秒：视频解码跟不上时，文字和语音一起等她睁眼（最多等 3 秒）。
  const TICK = q.has('tick'), PAUSE_AT = q.has('pauseAt') ? parseFloat(q.get('pauseAt')) : null;
  let clock = 0, lastNow = 0, raf = 0, tickId = 0, holdLeft = 3, dbgTick = -1;
  // 帧率：屏幕是 120Hz 时，浏览器每秒会想画 120 帧；显卡跟不上时帧间隔在 8～50 ms 之间乱跳，看起来就是“一卡一卡”。
  // 所以把画面上限锁在 60 帧（多画的帧也只是白白占用显卡）。?fps=30 / 60 / 120 可以改上限（调试）。
  const FPS_FIX = q.has('fps') ? +q.get('fps') : 0;
  let pace = FPS_FIX || 60, paceSlow = 0, paceFast = 0;
  function loop(now) {
    const target = 1000 / pace;
    // 视频播放期间，节拍跟着视频走：视频一有新的一帧就画（每帧视频正好显示一次）。
    // 以前按固定的 60 帧节拍画：屏幕是 120Hz 时，视频自己的节拍和画面的节拍会慢慢错开，每秒约 3 次跳过或重复一帧视频，看起来有一点点顿。
    // 只用于 60 帧的视频、晕染结束之后（之前那段最重，视频解码会落后，仍按固定节拍画）；超过 30 毫秒没有新的一帧时照常画，不会停住。
    const vidLock = VID60 && vidGL && vidStarted && !vid.ended && FREEZE === null && !TICK && clock > T.washEnd + .5;
    if (vidLock ? !(swDirty && now - lastNow > 6) && now - lastNow < 30 : !TICK && now - lastNow < target - 4) { raf = requestAnimationFrame(loop); return; }   // 还没到下一帧的时间：这一帧不画
    const dt = now - lastNow; lastNow = now;
    if (!FPS_FIX && !TICK && dt < 200) {
      // 连续 6 帧明显超时 → 降到 30 帧；在 30 帧下连续 2 秒都很轻松 → 升回 60 帧
      // （试过显卡吃紧时自动降到 30 帧：实测反而只剩 24 帧，已去掉）
    }
    if (DBG && dt > 100) { gaps.push(clock.toFixed(1) + ':' + Math.round(dt)); setState(doneSet ? 'DONE' : 'PLAYING'); }
    const raw = Math.max(dt, 0) / 1000;
    let next = clock + (raw > .3 ? .05 : raw) * SPEED;
    if (vidOK && vidStarted && FREEZE === null && !vid.ended && holdLeft > 0) {
      const vclock = VIDEO_START + vid.currentTime;
      if (next > vclock + .25 && next < VIDEO_START + (vid.duration || 5)) { holdLeft -= raw; next = Math.max(clock, vclock + .25); }
    }
    clock = next;
    const tt = clock;
    if (sound) sound.tick(tt);
    if (DBG && Math.floor(tt * 2) !== dbgTick) { dbgTick = Math.floor(tt * 2); setState(doneSet ? 'DONE' : 'PLAYING'); }
    if (PAUSE_AT !== null && tt >= PAUSE_AT) { render(PAUSE_AT); clearInterval(tickId); return; }
    const pfT0 = PROF ? performance.now() : 0;
    render(Math.max(0, tt)); if (DBG) document.documentElement.dataset.clock = tt.toFixed(2);
    if (PROF && tt > 0) {
      const i = Math.floor(tt * 2), b = pfB[i] || (pfB[i] = { n: 0, slow: 0, max: 0, js: 0, jsMax: 0 }), js = performance.now() - pfT0;
      b.n++; if (dt > 25) b.slow++; if (dt > b.max) b.max = dt; b.js += js; if (js > b.jsMax) b.jsMax = js;
      if (tt >= T.total) document.title = 'PROF|' + pfB.map((b, i) => b ? i / 2 + ':' + b.n + '/' + b.slow + '/' + Math.round(b.max) + '/' + (b.js / b.n).toFixed(1) + '/' + Math.round(b.jsMax) : '').join(' ') +
        '|heavy ' + pfB.slice(7, 13).reduce((a, b) => a + (b ? b.n : 0), 0) + ' frames in 3.5-6.5s |pace ' + pace + ' |SEC ' + Object.entries(pfSec).map(([k, v]) => k + '=' + Math.round(v)).join(' ') + ' |UP ' + pfUp.map((n, i) => n ? i / 2 + ':' + n : '').filter(Boolean).join(' ') + ' |JUD +0:' + pfJud[0] + ' +1:' + pfJud[1] + ' +2:' + pfJud[2] + ' +3:' + pfJud[3] + ' held:' + pfJud[4];
    }
    if (tt >= T.total + .2) { clearInterval(tickId); if (AUTOCLOSE) { try { window.close(); } catch (e) {} } return; }
    if (!TICK) raf = requestAnimationFrame(loop);
  }
  function start() {
    cancelAnimationFrame(raf); clearInterval(tickId); typedN = -1; lastP = -1; dust = []; penDust = []; lastT = 0; washLast = -1; maskT = 1e9;
    if (vidOK) { vid.pause(); vid.currentTime = 0; vidStarted = false; swDirty = true; swKey = ''; eyeShown = -1; if (vidGL) gl.uniform1f(swU.ea, 0); }
    doneSet = false; holdLeft = 3; lineDrawAt = -1; pace = FPS_FIX || 60; paceSlow = paceFast = 0; setState('PLAYING');
    wtext.textContent = '';
    clock = -.15; lastNow = performance.now();
    if (sound) sound.play(T, { music: MUSIC_ON, speed: SPEED });
    if (TICK) tickId = setInterval(() => loop(performance.now()), 16); else raf = requestAnimationFrame(loop);
  }
  // 启动器模式：先报 READY，等窗口尺寸稳定、在最终尺寸下画出第一帧后才报 PLAYING（启动器此时才显示窗口）
  function whenWindowReady() {
    return new Promise(res => {
      setState('READY');
      const tStart = performance.now(); let last = tStart, changed = false;
      addEventListener('resize', () => { changed = true; last = performance.now(); });
      const iv = setInterval(() => {
        const n = performance.now();
        if ((changed && n - last > 350) || n - tStart > 3500) { clearInterval(iv); resize(); render(0); setTimeout(res, 150); }
      }, 50);
    });
  }

  // ================= 载入 =================
  resize(); addEventListener('resize', () => { resize(); if (FREEZE !== null) { maskT = 1e9; washLast = -1; render(FREEZE); } });
  async function boot() {
    let base = null;
    if (window.CLAUDE_CLOSED_IMG) { try { base = await loadImg(window.CLAUDE_CLOSED_IMG); } catch (e) { console.error(e); } }
    if (base) {
      baseImg = base; hasArt = true; IW = base.naturalWidth; IH = base.naturalHeight;
      color.width = IW; color.height = IH;
      await buildRigs(base);                                   // 睁眼：经典图的四张眼睛窗口 / 新图的逐帧序列
      await initVideo();                                       // 新图：睁眼视频（最多等 4 秒，失败就用逐帧合成）
      if (vidOK) T.openSnd = VIDEO_START + 1.6;                // 睁眼的琶音对准视频里睁眼的时刻
      const src = document.createElement('canvas'); src.width = IW; src.height = IH;
      const F = vidOK ? VIDEO_FRAMING : { sx: 1, sy: 1, dx: 0, dy: 0 };
      src.getContext('2d').drawImage(base, F.dx, F.dy, IW * F.sx, IH * F.sy);
      buildLineart(src, vidOK ? EYES_VIDEO : EYES); src.width = 0;
      const B = ART === 'classic' ? BROOCH_CLASSIC : BROOCH;
      buildWash(IW, IH, B.x / IW, B.y / IH);
      const p0 = FORCE_P !== null ? FORCE_P : 0; paintFace(cc, p0); lastP = p0;
      buildSway();
      if (q.has('track') && vidGL) { await trackVideo(); return; }
    } else if (!LAUNCHER) { $('missing').style.display = 'block'; }
    // ?renderaudio：录演示视频用——不播放，把整段声音（音乐 + 语音）渲染成 WAV，POST 到本机测试服务的 /__upload
    const RENDER_AUDIO = q.has('renderaudio');
    if (SOUND_ON) { sound = window.DawnSound.create(MUSIC_ON ? VOL : .8, RENDER_AUDIO ? 20 : 0); if (!sound.ok) sound = null; }
    // 语音：解码好之后，把交接挪到语音快说完的时候，保证窗口淡出前整句话说完
    if (sound && VOICE_ON) {
      VOICE_DUR = await Promise.race([sound.loadVoice(window.SPLASH_VOICE, q.has('vvol') ? clamp(+q.get('vvol') || 0, 0, 1.5) : CONF.voiceVolume), new Promise(r => setTimeout(() => r(0), 1500))]);
      if (VOICE_DUR > 0) {
        T.handoff = Math.max(T.handoff, T.voice + VOICE_DUR - .45);
        // Live2D 视频要一直播到暖光完全盖住画面（交接开始后约 1.05 秒）：声音较长、视频不够长时，暖光提前一点开始，
        // 免得人物在还看得见的时候突然定住；窗口仍然等这句话说完再淡出
        if (vidOK && vid.duration) T.handoff = Math.min(T.handoff, VIDEO_START + vid.duration - 1.05);
        T.done = Math.max(T.handoff + .65, T.voice + VOICE_DUR + .1); T.total = T.done + .8;
        sub.textContent = '“' + VOICE_TEXT + '”'; sub.classList.add('quote');
      }
      if (DBG) document.documentElement.dataset.voice = VOICE_DUR.toFixed(2) + ' handoff=' + T.handoff.toFixed(2) + ' done=' + T.done.toFixed(2);
    }
    if (q.has('perf')) console.log('READY after ' + performance.now().toFixed(0) + ' ms');
    if (FREEZE !== null) { resize(); maskT = 1e9; render(FREEZE); setState('FROZEN'); return; }
    if (RENDER_AUDIO && sound) { await renderAudio(); return; }
    if (RENDER) { resize(); window.__renderAt = renderAt; window.__renderTotal = T.total; window.__renderReady = true; return; }
    // ?startdelay=4：过几秒再开始（录屏时先摆好窗口、开始录制）
    if (LAUNCHER) whenWindowReady().then(start); else setTimeout(start, (+q.get('startdelay') || 0) * 1000);
  }
  // 逐帧渲染：把动画时钟设到 t，Live2D 视频跳到对应的那一帧，画完这一帧（外部接着截图）。每帧都完整、准确，不受电脑当时快慢的影响
  async function renderAt(t) {
    clock = t;
    if (vidGL) {
      const vt = clamp(t - VIDEO_START + .004, 0, (vid.duration || 8) - .001);   // 多 4 毫秒：正好落在两帧交界时，浮点误差会让它停在前一帧上（同一帧出现两次）
      if (Math.abs(vid.currentTime - vt) > 1e-4) { vid.currentTime = vt; await new Promise(r => vid.addEventListener('seeked', r, { once: true })); }
      swDirty = true;
    }
    render(Math.max(0, t));
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  }
  async function renderAudio() {
    sound.play(T, { music: MUSIC_ON, speed: SPEED });
    const buf = await sound.renderAll(), n = Math.min(buf.length, Math.ceil((T.total + .5) * buf.sampleRate));
    const L = buf.getChannelData(0), R = buf.getChannelData(1), out = new DataView(new ArrayBuffer(44 + n * 4));
    const str = (o, t) => { for (let i = 0; i < t.length; i++) out.setUint8(o + i, t.charCodeAt(i)); };
    str(0, 'RIFF'); out.setUint32(4, 36 + n * 4, true); str(8, 'WAVEfmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 2, true);
    out.setUint32(24, buf.sampleRate, true); out.setUint32(28, buf.sampleRate * 4, true); out.setUint16(32, 4, true); out.setUint16(34, 16, true); str(36, 'data'); out.setUint32(40, n * 4, true);
    for (let i = 0, o = 44; i < n; i++, o += 4) { out.setInt16(o, clamp(L[i], -1, 1) * 32767, true); out.setInt16(o + 2, clamp(R[i], -1, 1) * 32767, true); }
    const r = await fetch('/__upload?name=' + encodeURIComponent(q.get('renderaudio') || 'dawn_audio.wav'), { method: 'POST', body: out.buffer });
    document.title = 'AUDIO_' + (r.ok ? 'DONE' : 'FAILED') + '|' + (n / buf.sampleRate).toFixed(2) + 's|total ' + T.total.toFixed(2);
  }
  boot().catch(e => { console.error(e); if (LAUNCHER) setState('DONE'); });

  const skip = () => { doneSet = true; setState('DONE'); if (sound) sound.fade(.5); };
  addEventListener('click', () => { if (LAUNCHER) skip(); });
  addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (LAUNCHER) { if (k === 'escape' || k === ' ' || k === 'enter') skip(); return; }
    if ((k === ' ' || k === 'r') && FREEZE === null) start();
    if (k === 'f') (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {});
  });
  addEventListener('mousemove', () => { if (LAUNCHER) return; document.body.classList.add('hint'); clearTimeout(window.__h); window.__h = setTimeout(() => document.body.classList.remove('hint'), 1800); });
  addEventListener('dblclick', () => { if (!LAUNCHER) document.documentElement.requestFullscreen().catch(() => {}); });
})();
