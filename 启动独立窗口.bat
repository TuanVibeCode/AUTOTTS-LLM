@echo off
title AutoTTS LLM Studio - Desktop
cd /d "%~dp0"
echo ============================================
echo   启动独立桌面窗口 (Electron)...
echo   请等待 Vite 服务启动后自动弹出窗口
echo ============================================
npm run electron:dev
pause
