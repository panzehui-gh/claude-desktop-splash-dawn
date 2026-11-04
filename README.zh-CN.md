[English](README.md) | [日本語](README.ja.md) | 简体中文

# Claude Desktop Splash · Dawn（晨光）

给 Claude 桌面应用（Windows）加的开屏动画。双击快捷方式后，动画会盖在 Claude 的窗口上播放，同时在后台启动 Claude，播完后淡出，露出 Claude。

> 非官方个人项目，与 Anthropic 无关。只支持 Windows，需要 Microsoft Edge 和 Microsoft Store 版的 Claude 桌面应用。

## 改写自哪里、改了什么

这个项目改写自 [Firefade0329/claude-desktop-splash](https://github.com/Firefade0329/claude-desktop-splash) 和它的分支 [Inanis404/claude-desktop-splash](https://github.com/Inanis404/claude-desktop-splash)（v1.2.0，MIT 协议）。原项目的代码完全不动，这里是另起的新项目。

- **启动器**（`launcher\`）：基本沿用原项目。它负责盖住 Claude 窗口、跟着窗口移动、淡出交接，这部分已经由原作者在 Windows 上实测过。这里只改了快捷方式的默认名称，并让 `-Art` 参数在不指定时改由 `config.js` 决定。
- **动画**（`splash.html`、`js\`）：重新编排成“晨光”主题，借鉴了 DeepSeek Harness 开机套件和 Codex 龙娘启动动画的手法：
  1. **序 · 星芒**：Claude 的星芒 ✱ 一根根画出来，脉动一下，炸开成光环。
  2. **流光**：沿用原项目的流光丝带。
  3. **01 勾勒**：几个发光的笔尖沿着线条把角色“画”出来，眼睛最后亮起。原项目是圆形遮罩扩散。
  4. **02 晕染**：颜色从胸前的雏菊花饰处像水彩一样晕开，同时夜色转为清晨，左上角斜照进晨光。
  5. **03 醒来**：一阵风吹过，一片离镜头很近的大花瓣一闪而过，短暂地遮住一部分画面；镜头缓慢推近，她睁开眼睛。默认用原项目的 Live2D 视频（画质可选），从晕染开始到结束是一整段连贯的动画（约 7 秒起渐渐变成慢动作）：头发和飘带随风飘动，她会眨一次眼，中途不会切换成静止画面。关掉 Live2D 时，人物是一张静止的图，只睁眼、眨眼（发梢可以轻轻飘动），最省资源。
  6. **04 就绪**：`✱ Claude` 字标先描边、再填色，然后一道光扫过；欢迎语逐字打出。
  7. **语音**：音乐收住之后，一个温柔的少女声音说 “Welcome back, my dear friend.”，标题下方同时出现这句话。她说话时嘴不会动：试过做口型（让原画的唇线像 Live2D 的网格一样张开，下巴跟着动），但原画里她的嘴本来就是两段断开的唇线，这也是她好看的原因之一，一张嘴就像凭空多出一张嘴，所以放弃了。如果觉得不对口型有违和感，可以在设置里关掉语音。
  8. **交接**：语音快说完时，胸前花饰处亮起星芒，扩成一团暖光盖满画面，启动器随后淡出窗口。整段约 13 秒。
  - 全程有左上角的实时时钟、左下角的阶段条（01 勾勒 / 02 晕染 / 03 醒来 / 04 就绪）和刻度进度线。
  - 音效：用 Web Audio 现场合成（`js\sound.js`），和画面时间轴对齐，不用任何音频素材。
  - 语音：由 `tools\make-voice.py` 用微软的神经网络语音（edge-tts）生成，可以换声音、语速、音高和台词。
- **设置页面**：第一次运行时会打开设置页面，可以填称呼、逐个试听并选择结尾语音、调音量、选角色图、预览动画；以后用 `--settings` 随时打开。别人下载后也能改成自己的称呼。

## 关于角色图（重要）

角色图、Live2D 睁眼视频和图标属于原项目的作者，**不在 MIT 协议范围内**，所以没有放进这个仓库。`tools\get-art.ps1` 会把原项目下载到 `third_party\`，动画从那里读取。只在自己电脑上使用没有问题；要在别处使用这些图片，请先联系原作者。

## 安装

### 最简单的方法：让 Claude 帮你安装

如果你用的是 **Claude Code**（Claude 桌面版里的 Code 功能），复制下面这段话发给 Claude，它会照着这份 README 帮你装好。（普通的 Claude 聊天不能在电脑上运行命令，所以做不到。）

```text
请帮我在这台 Windows 电脑上安装 Claude Desktop Splash · Dawn（Claude 桌面版的开屏动画）：https://github.com/panzehui-gh/claude-desktop-splash-dawn

请按仓库 README 里“安装”一节完成安装。要点：

1. 把仓库下载到“文档”文件夹下的 claude-desktop-splash-dawn（有 git 就 clone，没有就下载 ZIP 解压）。装好后这个文件夹不要再移动。
2. 运行 tools\get-art.ps1，下载原作者的角色图和 Live2D 视频。
3. 检查电脑上有没有 Python 和 ffmpeg，缺的话用 winget 安装（安装前先问我）。然后运行“py -m pip install edge-tts”“py tools\make-voice.py”和“py tools\make-video-variants.py”。最后一条要几分钟到十几分钟，可以放到后台运行。
4. 运行 launcher\make_shortcut.ps1 和 tools\build-exe.ps1，生成“Claude (Dawn).exe”。
5. 在桌面上创建两个指向“Claude (Dawn).exe”的快捷方式：一个叫“Claude (Dawn)”，一个叫“Claude (Dawn) 设置”，目标末尾加上“ --settings”。如果快捷方式被杀毒软件删掉了，告诉我。
6. 不要替我退出或重启 Claude。全部完成后告诉我怎么试：先完全退出 Claude（托盘图标右键 → 退出），再双击“Claude (Dawn)”。第一次会先打开设置页面，称呼、声音和画质由我自己选。

运行每个脚本之前，先看一遍它会做什么。某一步失败的话，告诉我原因，不要悄悄跳过。
```

Claude 会在最后一步之前停下，这是故意的：Claude Code 本身运行在 Claude 桌面版里，退出 Claude 会让它的会话也跟着断掉。最后由你自己试，称呼、声音和画质也在设置页面里由你自己选。

### 手动安装

1. 把这个仓库放在一个固定的位置（桌面快捷方式会记住路径，之后不要再移动）。
2. 下载角色图：
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\get-art.ps1
   ```
3. 生成结尾语音（需要联网；不做这一步就没有语音）。会按 `tools\voices.json` 里的列表生成 10 种声音（默认英式的 Sonia），之后在设置页面里试听、选择：
   ```powershell
   py -m pip install edge-tts
   py tools\make-voice.py
   ```
   想换台词：`py tools\make-voice.py --text "Welcome home, my dear friend."`；想加别的声音，在 `tools\voices.json` 里加一行（`--list` 列出可选的声音）。
4. 生成睁眼视频的各种画质（需要 ffmpeg；不做这一步就用逐帧合成睁眼）：
   ```powershell
   py tools\make-video-variants.py
   ```
   它从原项目的 4K 视频转出 8 种画质（不带 B 帧、关键帧密，集成显卡也能顺畅解码），并把视频从 5 秒加长到约 8.5 秒，覆盖整段动画：睁眼之后渐渐放慢成慢动作（0.36 倍）并一直动到最后，像她开口说话时时间慢了下来。慢下来的部分补出了真正的中间帧（运动补偿插帧），所以依然流畅。原视频里人物大约每秒只换 30 个姿势（只有树叶每帧都在动），所以只用人物换了姿势的那些帧、按均匀的时间间隔来补中间帧；否则每个重复的姿势放慢后都会变成一小段停顿，人物看起来一顿一顿的。另外，两个姿势正中间补出来的帧比正好在姿势上的帧略模糊，画面会以每秒约 10 次的节奏“清楚—模糊”地跳动；现在按每一帧离姿势有多近给它加一点点模糊，让所有帧一样清晰；画面始终向前动（以前的版本把结尾倒放再正放，飘落的树叶会明显地往回飞）。这一步要几分钟，慢动作的母版保存为 `assets\video\_master.mp4`。
5. 生成启动程序。第一行会找出 Claude 的应用 ID 并提取图标，第二行用 Windows 自带的 C# 编译器生成 `Claude (Dawn).exe`：
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File .\launcher\make_shortcut.ps1
   powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\build-exe.ps1
   ```
6. 双击 `Claude (Dawn).exe`。**第一次运行会先打开设置页面**：填好称呼、试听并选好声音，点“保存并启动 Claude”。
7. 在 `Claude (Dawn).exe` 上右键 → 发送到 → 桌面快捷方式，以后从桌面打开 Claude。想改设置时，再建一个快捷方式，在“目标”末尾加上 ` --settings`（例如命名为“Claude (Dawn) 设置”）。

Claude 已经在运行时不会播放动画，要看动画需要先在托盘图标上右键完全退出 Claude。

> 为什么用 .exe：`make_shortcut.ps1` 生成的 `.lnk` 指向 `conhost --headless powershell -ExecutionPolicy Bypass`，有些杀毒软件会把这种快捷方式当成病毒删掉。`Claude (Dawn).exe` 只做三件事：不弹窗口地运行 `launcher\launch.ps1`，在本机开一个小服务提供动画和设置页面（见下文），以及显示设置页面。源代码在 `launcher\ClaudeDawn.cs`，可以自己检查。

只想看动画、不启动 Claude：在设置页面点“预览动画”，或双击 `preview.cmd`（它运行 `Claude (Dawn).exe --preview`）。

## 设置页面

`Claude (Dawn).exe --settings` 会打开一个设置窗口（第一次运行时自动打开）。也可以**按住 Shift 键再双击** `Claude (Dawn).exe` 或它的快捷方式来打开。

- **欢迎语**：问候语和称呼，下面会实时显示动画里的样子。
- **结尾语音**：10 种声音，点 ▶ 试听，点卡片选择；可以关掉语音、调音量。
- **背景音乐**：开关和音量。背景音乐和语音都关掉，动画就完全静音。
- **画面效果**：Live2D 开关，以及两个下拉框选择视频画质：分辨率（480p / 720p / 1080p / 2K）和帧数（30 / 60 帧），默认 1080p · 30（还没生成的画质会变灰）；关闭 Live2D 时可以开关发梢飘动；落叶多或少。配置低的电脑可以调低。
- **角色图**：新版或原版。
- **预览动画**：用还没保存的设置直接播放一遍（不启动 Claude）。

`Claude (Dawn).exe` 在本机开一个只给自己用的小服务（`localhost`，随机端口），动画和设置页面都从这里打开：

- 直接从文件打开的网页不能读取本地视频的像素，从 `localhost` 打开的可以，所以眨眼才能画在正在播放的 Live2D 视频上。直接双击 `splash.html` 打开时，Live2D 视频照常播放，但不会眨眼。
- 网页本身不能写文件，所以保存设置时，设置页面（带一个随机口令）请这个程序把选择写进 `config.js`。

动画或设置窗口关掉后，这个小服务就停止。

### 手动修改（`config.js`）

设置页面写的就是这个文件，也可以直接用文本编辑器改。所有选项和默认值见 `config.example.js`：

| 项 | 默认 | 说明 |
|---|---|---|
| `name` | 空 | 欢迎语里的称呼；留空只显示问候语 |
| `greeting` | `欢迎回来` | 问候语 |
| `voice` / `voiceId` / `voiceVolume` | `true` / `sonia` / `1.0` | 结尾语音、选哪种声音（`tools\voices.json` 里的 id）、音量 |
| `sound` / `volume` | `true` / `0.8` | 背景音乐和音量 |
| `art` | `new` | `new` = Inanis404 的新图，`classic` = Firefade0329 的原图 |
| `liveVideo` | `1080p30` | Live2D：`off`（静止的图，逐帧合成睁眼）或视频画质 `480p30` … `1080p60`、`1440p30` / `1440p60`（2K） |
| `petals` / `hairSway` | `more` / `true` | 落叶多（`more`）或少（`less`）；发梢随风飘动（只在 Live2D 关闭时） |
| `artRoot` | `third_party/claude-desktop-splash` | 原项目放在哪里 |

启动器参数和原项目一样（`-NoSound`、`-NoClaude`、`-Fullscreen`、`-Art new|classic` 等），可以加在 `Claude (Dawn).exe` 后面，见 `launcher\launch.ps1` 开头的说明。

调试用的页面参数：`?t=5.2` 定格在某一秒，`?speed=0.5` 慢放，`?name=xxx` 临时改称呼，`?voice=emma` 换声音，`?novideo` 不用睁眼视频，`?novoice` 不放语音，`?nosfx` 不放音效，`?mute` 全部静音，`?withvoice` 即使 `config.js` 里关了语音也播放语音。`?renderaudio` 和 `?render`（从 `localhost` 打开）把声音渲染成 WAV、把画面逐帧渲染出来，用来做演示视频。`?track`（从 `localhost` 打开）测量视频里各时刻眼睛的位置，结果已写进 `js\splash.js`。

## 验证情况

- 已在 Edge 中逐帧截图检查过各段画面。
- 冷启动（Claude 完全退出后双击）的完整流程还需要实际运行确认。如果有问题，请看 `launcher\launcher.log`。
- 在 `Claude (Dawn).exe` → 只播动画（`-NoClaude`）的模式下实际跑过，窗口能准确盖住 Claude 窗口并正常淡出。
- **流畅度实测**（这台电脑：AMD Radeon 610M 集成显卡，120Hz 屏幕，窗口 2300×1200，从 `localhost` 打开，逐帧记录每一帧的间隔）：画面上限是 60 帧。测量时语音在播放。超过 25 毫秒的慢帧占比：1080p · 60 约 2～3%（最初的版本约 35%；随电脑当时的忙碌程度波动），Live2D 关闭约 3.5%，2K · 60 约 6～7%（2K 视频在最忙的那一段已经在播放）。Live2D 模式下镜头现在也全程缓缓推近；视频画在 WebGL 那一层里，不会再因此卡顿。大部分时间是稳定的 60 帧，整句语音期间也是；最重的一段是 3.5～6.5 秒（线稿、晕染、视频叠在一起），约 50～53 帧。晕染的夜色遮罩改为在视频那一层里一起画、不再单独占一个全屏图层，那一段的慢帧少了约三分之一（交替对比测量）。剩下的慢帧几乎都是 25～29 毫秒（少刷新一次屏幕），零星出现在 4.5～6 秒和 7.5 秒附近。8 种画质都能完整播完。
- **没测到的**：真正从冷启动 Claude 时，Claude 本身也在占用显卡，这一步只能由你实际看；我在这里测的是只播动画、外加 CPU 负载模拟。
- **连续性**：用屏幕录制把真实播放录下来，按每秒 18 帧逐帧检查过（不加负载、以及 6 个满负荷线程模拟 Claude 冷启动两种情况）。修掉了：晕染时人物看起来是静止的（现在视频和晕染同时开始播、镜头继续缓缓推近，发光的线稿在颜色晕到的地方随之消失，不再静止地盖在正在动的画面上）、眨眼时眼睛周围的刘海和皮肤被“定住”（现在只盖住眨眼时真正变化的眼皮和眼珠，并跟着视频里头部的轻微晃动移动）、结尾飘落的树叶往回飞（现在改成慢动作，不再倒放）、慢动作里人物一顿一顿（现在只用人物真正换姿势的帧来补帧）、在 120Hz 屏幕上每秒约 3 次跳过或重复一帧视频（60 帧的视频现在一有新的一帧就画，每帧视频正好显示一次）、眨眼太快、和舒缓的节奏不搭（现在用 0.3 秒闭上、停一下、再用 0.5 秒缓缓睁开）、花瓣停住再瞬移、睁眼迟到（在语音之后才睁眼）、丝带突然消失，以及说话前从视频切换到静止画面（色差、头发突然停住）——现在视频一直播到最后，眨眼直接画在视频上。真实的启动器路径（`Claude (Dawn).exe -NoClaude`，页面从 `localhost` 打开）也用同样的方法录屏检查过。
- 声音按动画时钟播放：画面卡顿时音乐和语音也跟着等，不会再出现“语音说完了才睁眼”。
- 设置页面：打开、试听列表、预览动画、保存到 `config.js`、关闭后程序退出，这几步都实际测试过。
- 语音的声音是否温柔自然，要靠人耳来判断，可以在设置页面里逐个试听。

## 许可

代码使用 [MIT License](LICENSE)，包含原项目的版权声明。角色图不在本仓库中，也不受这个许可证约束。
