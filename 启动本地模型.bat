@echo off
chcp 65001 >nul
title Nanbeige4.1-3B 本地模型服务
cd /d "%~dp0"

echo ============================================
echo   Nanbeige4.1-3B 本地推理服务 (GPU 加速)
echo ============================================
echo.
echo 模型文件: C:\Users\spark\Downloads\nanbeige4.1-3b-q8_0.gguf
echo 服务地址: http://localhost:8081
echo API 地址: http://localhost:8081/v1/chat/completions
echo.
echo 正在启动 llama-server ...
echo.

llama-server\llama-server.exe ^
  -m "C:\Users\spark\Downloads\nanbeige4.1-3b-q8_0.gguf" ^
  --port 8081 ^
  -c 4096 ^
  -ngl 99 ^
  --host 0.0.0.0 ^
  -t 4

echo.
echo 服务已停止。
pause
