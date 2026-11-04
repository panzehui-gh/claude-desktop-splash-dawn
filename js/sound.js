// Startup sound for the Dawn splash, synthesized live with Web Audio (no audio files).
// 开屏音效：用 Web Audio 现场合成，不用任何音频素材。音符取 D 大调五声音阶（D E F# A B），和画面时间轴对齐。
// API: DawnSound.create(volume, offlineSeconds) -> { ok, play(T, {music, speed}), tick(animationClock), fade(sec), loadVoice(dataUrl, gain) -> seconds, renderAll() -> AudioBuffer, state() }
// offlineSeconds：不播放，而是把整段声音渲染成一段音频（录演示视频时用，见 splash.js 的 ?renderaudio）
// play() 只准备好声音列表；页面每一帧调用 tick(动画时钟)，声音按动画时钟播放，画面卡住时声音也一起等。
// 结尾的语音（assets/voices/<id>.js，由 tools/make-voice.py 生成）在音乐收住之后播放，时间是 T.voice。
(function () {
  'use strict';
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);       // MIDI -> Hz
  const D3 = 50, PENTA = [0, 2, 4, 7, 9];                    // D 大调五声音阶（相对 D 的半音）
  const note = (oct, k) => D3 + 12 * oct + PENTA[((k % 5) + 5) % 5] + 12 * Math.floor(k / 5);

  function create(volume, offlineSeconds) {
    let ctx;
    try { ctx = offlineSeconds ? new OfflineAudioContext(2, Math.ceil(48000 * offlineSeconds), 48000) : new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return { ok: false, play() {}, tick() {}, fade() {}, loadVoice: async () => 0, state: () => 'none' }; }
    const master = ctx.createGain(); master.gain.value = volume;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3;
    master.connect(comp); comp.connect(ctx.destination);
    // 混响：程序生成的衰减噪声当作冲激响应
    const verb = ctx.createConvolver(), wet = ctx.createGain(); wet.gain.value = .45;
    {
      const len = ctx.sampleRate * 3.2, ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
      verb.buffer = ir;
    }
    verb.connect(wet); wet.connect(master);
    const noiseBuf = (() => { const n = ctx.sampleRate * 2, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return b; })();

    // 一个声部的出口：干声 + 混响送出，可选声像
    function out(gainNode, send, pan) {
      let n = gainNode;
      if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; n.connect(p); n = p; }
      n.connect(master);
      if (send) { const s = ctx.createGain(); s.gain.value = send; n.connect(s); s.connect(verb); }
    }
    // 拨弦/铃：正弦 + 少量泛音，指数衰减
    function pluck(t, f, g, decay, send, pan, partials) {
      const env = ctx.createGain(); env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(g, t + .006); env.gain.exponentialRampToValueAtTime(.0001, t + decay);
      for (const [mul, amp] of (partials || [[1, 1], [2, .18], [3.01, .06]])) {
        const o = ctx.createOscillator(), a = ctx.createGain(); o.type = 'sine'; o.frequency.value = f * mul; a.gain.value = amp;
        o.connect(a); a.connect(env); o.start(t); o.stop(t + decay + .05);
      }
      out(env, send == null ? .5 : send, pan);
    }
    // 垫音：几个音叠在一起，慢起慢收
    function pad(t, dur, freqs, g, cutoff) {
      if (dur < .3) return;
      const env = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cutoff || 1400;
      env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(g, t + Math.min(1.4, dur * .4)); env.gain.setValueAtTime(g, t + dur * .7); env.gain.linearRampToValueAtTime(0, t + dur);
      freqs.forEach((f, i) => {
        for (const det of [-4, 4]) {
          const o = ctx.createOscillator(); o.type = i % 2 ? 'triangle' : 'sine'; o.frequency.value = f; o.detune.value = det;
          const a = ctx.createGain(); a.gain.value = 1 / freqs.length / 2; o.connect(a); a.connect(lp); o.start(t); o.stop(t + dur + .1);
        }
      });
      lp.connect(env); out(env, .6);
    }
    // 气流声：带通噪声，中心频率扫动，可从一侧扫到另一侧
    function whoosh(t, dur, g, f0, f1, pan0, pan1) {
      const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = .9;
      bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur * .6); bp.frequency.exponentialRampToValueAtTime(f0 * .8, t + dur);
      const env = ctx.createGain(); env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(g, t + dur * .45); env.gain.linearRampToValueAtTime(0, t + dur);
      src.connect(bp); bp.connect(env);
      let n = env;
      if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.setValueAtTime(pan0 || 0, t); p.pan.linearRampToValueAtTime(pan1 || 0, t + dur); env.connect(p); n = p; }
      n.connect(master); const s = ctx.createGain(); s.gain.value = .35; n.connect(s); s.connect(verb);
      src.start(t); src.stop(t + dur + .05);
    }
    // 笔尖的沙沙声：很短的高通噪声颗粒
    function scratch(t, g, pan) {
      const src = ctx.createBufferSource(); src.buffer = noiseBuf;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2600 + Math.random() * 2400;
      const env = ctx.createGain(), d = .02 + Math.random() * .05;
      env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(g, t + .004); env.gain.exponentialRampToValueAtTime(.0001, t + d);
      src.connect(hp); hp.connect(env); out(env, .15, pan);
      src.start(t, Math.random() * 1.5); src.stop(t + d + .02);
    }


    // ---------- 调度：声音跟着动画时钟走，而不是开头一次排好 ----------
    // 以前所有声音在开始时按“真实时间”一次排好；页面一卡，画面慢下来，声音却照常往前，结果语音说完了画面才睁眼。
    // 现在每一帧由页面调用 tick(动画时钟)，只把接下来 0.25 秒内的声音排进去；画面慢，声音也跟着等。
    let started = false, events = [], evIdx = 0, speed = 1;
    const LOOK = .25;
    // long：可以晚一点开始的长音（垫音、语音），晚开始时从中间接上；短音晚了超过 0.15 秒就不放了
    const ev = (t, fn, long) => events.push({ t, fn, long: !!long });
    function play(T, opts) {
      if (ctx.state === 'suspended' && !offlineSeconds) ctx.resume();
      speed = (opts && opts.speed) || 1; started = true; events = []; evIdx = 0;
      master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setValueAtTime(volume, ctx.currentTime);
      if (!opts || opts.music !== false) music(T);
      voiceAndOutro(T);
      events.sort((a, b) => a.t - b.t);
    }
    function tick(clock) {
      if (!started) return;
      while (evIdx < events.length && events[evIdx].t <= clock + LOOK) {
        const e = events[evIdx++], ahead = (e.t - clock) / speed;
        if (ahead < -.15 && !e.long) continue;
        e.fn(ctx.currentTime + Math.max(0, ahead) + .02, Math.max(0, -ahead));
      }
    }
    function music(T) {
      // 0 秒：夜色里的低音铺底
      ev(0, (at, late) => pad(at, T.washStart + .6 - late, [hz(D3 - 12), hz(D3 - 5)], .13, 600), true);
      // 星芒：每画出一根光芒，一声轻轻的拨弦
      for (let i = 0; i < T.starRays; i++) ev(T.starIn + i * T.starStep, at => pluck(at, hz(note(1, i)), .05, 1.3, .55, (i / (T.starRays - 1) - .5) * .6));
      // 星芒脉动：一个闪光 + 上扬的气流
      ev(T.starPulse, at => pluck(at, hz(note(2, 0)), .07, 2.4, .8, 0, [[1, 1], [2.76, .25], [5.4, .08]]));
      ev(T.starPulse - .1, at => whoosh(at, 1.1, .05, 400, 3200, 0, 0));
      // 一阵风：大花瓣掠过镜头时，一声从左到右的风声
      if (T.gust != null) ev(T.gust - .2, at => whoosh(at, 1.4, .1, 220, 2600, -.9, .9));
      // 流光：两条丝带从两侧扫过
      ev(T.ribbons + .5, at => whoosh(at, 1.6, .07, 300, 1800, -.8, .5));
      ev(T.ribbons + .65, at => whoosh(at, 1.6, .06, 350, 2200, .8, -.4));
      // 勾勒：笔尖沙沙声 + 稀疏的小铃
      for (let t = T.sketch; t < T.sketchEnd; t += .03 + Math.random() * .05) { const g = .012 + Math.random() * .014, p = Math.random() * 1.2 - .6; ev(t, at => scratch(at, g, p)); }
      for (let i = 0, t = T.sketch + .2; t < T.sketchEnd; i++, t += .32) { const p = Math.random() * .8 - .4; ev(t, at => pluck(at, hz(note(2, i * 2 + 1)), .02, 1.0, .7, p)); }
      ev(T.eyesIn, at => pluck(at, hz(note(3, 1)), .03, 2, .8));
      // 晕染：温暖的 Dadd9 和弦慢慢铺开，在“就绪”之后收住（留出安静的一拍给语音）
      ev(T.washStart, (at, late) => pad(at, T.musicEnd - T.washStart - late, [hz(D3), hz(D3 + 4), hz(D3 + 7), hz(D3 + 14), hz(D3 + 16)], .11, 2200), true);
      // 醒来：上行的琶音闪光
      [0, 2, 4, 5, 7].forEach((k, i) => ev(T.openSnd + i * .11, at => pluck(at, hz(note(2, k)), .045, 2.2, .7, (i - 2) * .15)));
      // 字标：主铃声，长尾音
      ev(T.text + .25, at => { pluck(at, hz(D3 + 24), .09, 3.6, .9, 0, [[1, 1], [2.76, .3], [5.4, .12], [8.93, .04]]); pluck(at, hz(D3 + 12), .05, 3.2, .9, 0); });
      // 欢迎语：每打一个字，一声极轻的点
      for (let i = 0; i < T.welcomeChars; i++) ev(T.welcome + i * T.typeStep, at => pluck(at, hz(note(3, i % 3)), .012, .25, .3, .3));
      // 交接：上扬的光；有语音时只留很轻的一层，不盖住人声的尾音
      ev(T.handoff - .2, at => whoosh(at, 1.4, voiceBuf ? .03 : .07, 500, 5200, 0, 0));
      if (!voiceBuf) [0, 4, 7, 12].forEach((k, i) => ev(T.handoff + .35 + i * .04, at => pluck(at, hz(D3 + 12 + k), .04, 2.8, .9)));
    }
    function voiceAndOutro(T) {
      // 语音：音乐收住之后说出来，带一点柔和的混响；晚了就从中间接上（不会和画面错开）
      if (voiceBuf) ev(T.voice, (at, late) => {
        if (late > voiceBuf.duration - .3) return;
        const src = ctx.createBufferSource(), g = ctx.createGain(), hs = ctx.createBiquadFilter();
        src.buffer = voiceBuf; hs.type = 'highshelf'; hs.frequency.value = 6500; hs.gain.value = -3;   // 齿音收一点，更柔
        g.gain.value = voiceGain; src.connect(hs); hs.connect(g); out(g, .22, 0);
        src.start(at, late);
      }, true);
    }
    // 语音：data URL（assets/voices/<id>.js 里的 window.SPLASH_VOICE）-> 解码；返回时长（秒），失败返回 0
    let voiceBuf = null, voiceGain = 1;
    async function loadVoice(dataUrl, gain) {
      try {
        const bin = atob(dataUrl.split(',')[1]), u8 = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        voiceBuf = await ctx.decodeAudioData(u8.buffer); voiceGain = gain == null ? 1 : gain;
        return voiceBuf.duration;
      } catch (e) { voiceBuf = null; return 0; }
    }
    function fade(sec) {
      if (!started) return;
      evIdx = events.length;                     // 不再排新的声音
      const n = ctx.currentTime; master.gain.cancelScheduledValues(n); master.gain.setValueAtTime(master.gain.value, n); master.gain.linearRampToValueAtTime(0, n + sec);
    }
    // 离线渲染：所有声音按动画时间轴的理想时间排好（和实时播放一样提前 0.02 秒的余量），然后一次渲染完
    function renderAll() { for (const e of events) e.fn(e.t / speed + .02, 0); evIdx = events.length; return ctx.startRendering(); }
    return { ok: true, play, tick, fade, loadVoice, renderAll, state: () => ctx.state };
  }
  window.DawnSound = { create };
})();
