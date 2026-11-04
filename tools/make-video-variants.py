"""Makes lighter, longer copies of the Live2D eye-opening video, in 8 quality levels the settings page can choose from.
把原项目的 Live2D 睁眼视频转成 8 种画质（480p / 720p / 1080p / 1440p(2K) × 30 / 60 帧），并加长到能覆盖整段动画，设置页面里可以选。

  python tools/make-video-variants.py                  # all 8
  python tools/make-video-variants.py --only 1080p60   # just one (the slow-motion master is reused if it exists)
  python tools/make-video-variants.py --ffmpeg C:\\path\\to\\ffmpeg.exe

Needs ffmpeg (on PATH, or --ffmpeg). Reads the 4K original from the art folder (third_party/claude-desktop-splash/assets/video/)
and writes assets/video/<quality>.mp4. These copies are made from the original authors' video, so they are not part of
this repository (see .gitignore) and the original's license applies to them.

Longer: the original is 5 s, and with the closing voice the splash shows the video for about 8.8 s (until the warm light covers it). The video plays at
normal speed until 2.5 s (her eyes are open by then), then eases into slow motion (0.32x) and keeps moving to the end, like
time slowing down while she speaks. The slow part gets real in-between frames (motion-compensated interpolation), made
only from the frames where the character's pose changes (see pose_frames), so the character moves smoothly too. Everything only moves forward: an earlier version played the end backwards and then forwards again, and
the falling leaves visibly flew backwards.
慢动作：原视频 2.5 秒以后渐渐放慢到 0.32 倍并一直保持（补出中间帧），树叶、头发始终向前动，不倒放、不定格。
The slow-motion master (1440p60, made once, takes a few minutes) is kept as assets/video/_master.mp4; all levels are
scaled from it.

Easy to decode: no B-frames, a keyframe every 0.25 s, Main profile, no audio.
The originals use High profile with B-frames, which stalled half-way on integrated graphics in testing.
"""
import argparse, os, shutil, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'third_party', 'claude-desktop-splash', 'assets', 'video', 'open_4k60.mp4')
OUT = os.path.join(ROOT, 'assets', 'video')
MASTER = os.path.join(OUT, '_master.mp4')
SLOW_FROM = 2.5    # seconds into the original where the slowdown starts (eyes open)
RAMP = 1.2         # seconds (output) to ease from normal speed down to SLOW
SLOW = 0.32        # final speed: deep enough that the video lasts until the warm light covers the picture (with the default
                   # voice), not so deep that each pose is stretched too far
EVEN_BLUR = 0.8    # blur for frames right at a pose (1440p pixels), see make_master
LEVELS = {  # name: (height, fps, crf)
    '480p30': (480, 30, 21), '480p60': (480, 60, 21),
    '720p30': (720, 30, 20), '720p60': (720, 60, 20),
    '1080p30': (1080, 30, 19), '1080p60': (1080, 60, 19),
    '1440p30': (1440, 30, 18), '1440p60': (1440, 60, 18),   # 2K
}


def pose_frames(ffmpeg, src, first):
    """Frames (from `first` on) where the character's pose changes.

    The original is 60 fps, but the character is drawn at about 30 poses a second (in an uneven 10-frame rhythm); only the
    leaves move on every frame. Interpolating every frame for slow motion turned each repeated pose into a short pause
    (about 0.06 s at 0.28x), so the character moved in small jerks while the leaves stayed smooth. So only the frames with
    a new pose are kept, with their original timestamps, and the in-between frames are made from those.
    原视频是 60 帧，但人物大约每秒只换 30 个姿势（叶子每帧都在动）；放慢时只用换了姿势的帧来补中间帧，人物才不会一顿一顿。
    """
    w, h = 240, 150   # the face, neck and the hair around them, small and grey (leaves rarely cross this area)
    raw = subprocess.run([ffmpeg, '-hide_banner', '-loglevel', 'error', '-i', src, '-vf',
                          f'crop=1600:1000:1100:300,scale={w}:{h},format=gray', '-f', 'rawvideo', '-'],
                         check=True, capture_output=True).stdout
    n, fs = len(raw) // (w * h), w * h
    diff = [0.0] + [sum(abs(a - b) for a, b in zip(raw[i * fs:(i + 1) * fs], raw[(i - 1) * fs:i * fs])) / fs for i in range(1, n)]
    vals = sorted(diff[first:])
    thr = vals[len(vals) // 2]
    for _ in range(20):   # two groups: repeated pose (small difference) and new pose (large)
        lo = [v for v in vals if v <= thr]; hi = [v for v in vals if v > thr]
        if not lo or not hi: break
        thr = (sum(lo) / len(lo) + sum(hi) / len(hi)) / 2
    keep = [first] + [i for i in range(first + 1, n) if diff[i] > thr]
    print(f'pose frames: {len(keep)} of {n - first} (threshold {thr:.2f})')
    return keep


def make_master(ffmpeg, src):
    # Output time u for source time s (seconds after SLOW_FROM): the speed falls linearly from 1 to SLOW during RAMP,
    # then stays at SLOW. Inverse of s(u) = u - (1 - SLOW) u^2 / (2 RAMP) during the ramp.
    k, sr = 1 - SLOW, RAMP * (1 + SLOW) / 2
    remap = f"if(lt(T,{sr}),({RAMP}/{k})*(1-sqrt(1-2*{k}*T/{RAMP})),{RAMP}+(T-{sr})/{SLOW})/TB"
    keep = pose_frames(ffmpeg, src, round(SLOW_FROM * 60))
    pick = '+'.join(f'eq(n,{i})' for i in keep)
    # The poses are spaced evenly in time: in the original their timing jitters (a pose is shown for 1, 2 or 3 frames),
    # which slow motion would magnify into visible unevenness
    step = (keep[-1] - keep[0]) / 60 / (len(keep) - 1)
    # Even sharpness: an interpolated frame half-way between two poses is a little softer than a frame right at a pose,
    # so in slow motion the picture "pulses" sharp-soft-sharp about 10 times a second, which looks like slight stutter.
    # Frames are blurred by how close they are to a pose (weight 1 at a pose, 0 half-way), so all frames look alike.
    # x = position counted in poses for output time T (the inverse of the time remapping above)
    x = f'(if(lt(T,{RAMP}),T-{k}*T*T/(2*{RAMP}),{sr}+{SLOW}*(T-{RAMP}))/{step:.6f})'
    wgt = f'(0.5+0.5*cos(2*PI*({x}-floor({x}))))'
    graph = ('[0:v]scale=-2:1440:flags=lanczos,split=2[a][b];'
             f'[a]trim=end={SLOW_FROM},setpts=PTS-STARTPTS[p1];'
             f"[b]select='{pick}',setpts='N*{step:.6f}/TB',setpts='{remap}',"
             'minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1,split=2[s][sb];'
             f"[sb]gblur=sigma={EVEN_BLUR}[bl];[s][bl]blend=all_expr='A*(1-{wgt})+B*{wgt}'[p2];"
             '[p1][p2]concat=n=2:v=1:a=0[out]')
    subprocess.run([ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-an', '-filter_complex', graph, '-map', '[out]',
                    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'slow', '-crf', '12', MASTER], check=True)
    print(f'wrote {MASTER}')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--only', choices=sorted(LEVELS))
    ap.add_argument('--ffmpeg', default=shutil.which('ffmpeg'))
    ap.add_argument('--src', default=SRC)
    ap.add_argument('--remaster', action='store_true', help='make the slow-motion master again')
    a = ap.parse_args()
    if not a.ffmpeg or not os.path.exists(a.ffmpeg):
        sys.exit('ffmpeg not found: install it or pass --ffmpeg C:\\path\\to\\ffmpeg.exe')
    if not os.path.exists(a.src):
        sys.exit('original video not found: ' + a.src + '  (run tools\\get-art.ps1 first)')
    os.makedirs(OUT, exist_ok=True)
    if a.remaster or not os.path.exists(MASTER):
        make_master(a.ffmpeg, a.src)
    for name, (h, fps, crf) in LEVELS.items():
        if a.only and name != a.only:
            continue
        out = os.path.join(OUT, name + '.mp4')
        gop = max(1, fps // 4)
        cmd = [a.ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-i', MASTER, '-an', '-vf', f'scale=-2:{h}:flags=lanczos,fps={fps}',
               '-c:v', 'libx264', '-profile:v', 'main', '-pix_fmt', 'yuv420p', '-preset', 'slow', '-crf', str(crf),
               '-bf', '0', '-g', str(gop), '-keyint_min', str(gop), '-sc_threshold', '0',
               '-movflags', '+faststart', out]
        subprocess.run(cmd, check=True)
        print(f'wrote {out}  ({os.path.getsize(out) / 1e6:.1f} MB)')
    # the still picture of an earlier version is no longer used
    for old in ('last-frame.jpg', 'last-frame.js'):
        p = os.path.join(OUT, old)
        if os.path.exists(p):
            os.remove(p)


main()
