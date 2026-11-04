@echo off
rem Preview the animation in its own window (does not start Claude). Space / R = replay, F = fullscreen.
rem 预览动画（不启动 Claude）。空格 / R 重播，F 全屏。由 Claude (Dawn).exe 从本机的小服务打开，口型等效果才能画在视频上。
if exist "%~dp0Claude (Dawn).exe" (start "" "%~dp0Claude (Dawn).exe" --preview) else (echo Build Claude ^(Dawn^).exe first: tools\build-exe.ps1 & pause)
