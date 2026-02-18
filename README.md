<div align="center">

# 🎭 AUTOPLAY

**An AI-powered roleplay chat application with Electron desktop support, local model management, TTS, video generation, and multi-model streaming.**

**支持 Electron 桌面端、本地模型管理、TTS 语音合成、视频生成和多模型流式输出的 AI 角色扮演聊天应用。**

[English](#english) | [中文](#中文)

`v0.2.0`

</div>

---

## English

### ✨ Features

- **Electron Desktop App** — Runs as a native desktop application with custom dark UI, auto-hide menu bar, and frameless-ready window.
- **Local Model Manager** — Scan, start, stop, and manage local `.gguf` models directly from the UI. Auto-detects models in `Downloads` and app directory.
- **Dynamic Port Proxy** — Local models start on any available port (8081+); a custom Vite plugin dynamically proxies requests without hardcoded ports.
- **Multi-Character Roleplay** — Create and manage multiple AI characters, each with a custom system prompt and voice style.
- **Multi-LLM Backend** — Seamlessly switch between cloud APIs (NVIDIA NIM, OpenAI-compatible) and local models (Ollama, llama.cpp).
- **Streaming Responses** — Real-time token-by-token streaming with a live "responding" indicator.
- **Thinking Process Display** — For reasoning models (e.g. Qwen3, DeepSeek-R1), the `<think>` block is shown in a collapsible, independently scrollable section.
- **Direct Output Mode** — One-click toggle to suppress internal reasoning and get instant, concise replies.
- **Inline Message Editing** — Edit any user message and automatically regenerate the assistant's response. Edit assistant messages directly too.
- **Clear Chat** — One-click broom button to clear all messages in the current conversation with a confirmation dialog.
- **Emotion-Aware TTS** — Powered by Alibaba DashScope. Parses dialogue + emotion annotations (e.g. `"Hello"【语气:温柔】`) and reads them with the correct tone.
- **Video Generation** — Generate short videos from assistant messages using xAI Grok or any compatible API.
- **Dynamic Model Parameters** — Adjust Temperature, Top-P, and Context Window per model.
- **Persistent Settings** — All configurations saved via Zustand with migration support.

### 🤖 Supported Models

| Type | Examples |
|---|---|
| ☁️ Cloud (NVIDIA NIM) | `meta/llama-3.1-70b-instruct`, `nvidia/llama-3.1-nemotron-70b-instruct` |
| 🏠 Local (llama.cpp) | Any `.gguf` model via built-in Local Model Manager |
| 🦙 Ollama | `qwen3-heretic`, `huihui_ai/qwen3-abliterated:4b` |
| 🧤 Ollama (HF) | `hf.co/bartowski/Nemotron-Mini-4B-Instruct-GGUF` |

### 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Desktop | Electron 40 |
| Framework | React 19 + Vite 7 + TypeScript |
| Styling | TailwindCSS v4 |
| State | Zustand (with `persist` middleware) |
| Icons | Lucide React |
| LLM | OpenAI-compatible streaming API |
| TTS | Alibaba DashScope (Qwen3-TTS) |
| Video | xAI Grok / OpenAI-compatible |
| Local Inference | llama.cpp (`llama-server`) + Ollama |

### 🚀 Quick Start

#### Prerequisites
- Node.js 18+
- (Optional) [Ollama](https://ollama.ai) for local models
- (Optional) NVIDIA GPU + llama.cpp for local llama-server

#### Installation

```bash
git clone <repo-url>
cd text-tts
npm install
```

#### Configuration

Copy your API keys into the app's **Settings** panel (right sidebar → Manage APIs):

| Service | Where to get |
|---|---|
| NVIDIA NIM | [build.nvidia.com](https://build.nvidia.com) |
| Alibaba DashScope (TTS) | [dashscope.aliyuncs.com](https://dashscope.aliyuncs.com) |
| xAI (Video) | [console.x.ai](https://console.x.ai) |

#### Run

```bash
# Run as Electron desktop app (recommended)
npm run electron:dev

# Or run as web app only
npm run dev

# (Optional) Start Ollama models
ollama run qwen3-heretic
```

> **Local Models**: Use the built-in **Local Model Manager** (sidebar) to scan and start `.gguf` models. No need to launch `llama-server` manually.

### 📁 Project Structure

```
text-tts/
├── electron/
│   ├── main.cjs                 # Electron main process (model manager, IPC)
│   └── preload.js               # Context bridge for renderer
├── src/
│   ├── App.tsx                  # Main application & chat UI
│   ├── components/
│   │   ├── ApiSettingsModal.tsx  # API configuration modal
│   │   ├── LocalModelManager.tsx # Local .gguf model manager
│   │   ├── ModelInfoModal.tsx   # Local model info & guide
│   │   └── PromptEditorModal.tsx # Full-screen system prompt editor
│   ├── services/
│   │   ├── llm.ts               # LLM streaming service
│   │   ├── tts.ts               # TTS service (DashScope)
│   │   └── video.ts             # Video generation service
│   ├── store/
│   │   └── settings.ts          # Zustand global state store
│   └── utils/
│       └── textParser.ts        # <think> tag parser
├── CHANGELOG.md                 # Version history
├── Modelfile.heretic            # Ollama Modelfile for Qwen3 Heretic
└── 启动本地模型.bat              # One-click local model launcher
```

### 🔧 Proxy Configuration

The Vite dev server proxies the following routes to avoid CORS:

| Proxy Path | Target |
|---|---|
| `/api/nvidia` | `https://integrate.api.nvidia.com/v1` |
| `/api/dashscope` | `https://dashscope.aliyuncs.com` |
| `/api/local-{PORT}` | `http://localhost:{PORT}` (dynamic, any llama-server port) |
| `/api/ollama` | `http://localhost:11434` (Ollama) |

---

## 中文

### ✨ 功能特性

- **Electron 桌面应用** — 作为原生桌面应用运行，深色主题 UI，自动隐藏菜单栏。
- **本地模型管理器** — 在 UI 中直接扫描、启动、停止和管理本地 `.gguf` 模型。自动检测 `Downloads` 和应用目录中的模型文件。
- **动态端口代理** — 本地模型可使用任意可用端口（8081+）启动；自定义 Vite 插件动态代理请求，无需硬编码端口。
- **多角色扮演** — 创建并管理多个 AI 角色，每个角色拥有独立的系统提示词和语音风格。
- **多 LLM 后端** — 无缝切换云端 API（NVIDIA NIM、OpenAI 兼容接口）与本地模型（Ollama、llama.cpp）。
- **流式响应** — 实时逐 Token 流式输出，带有"响应中"动态指示器。
- **思考过程显示** — 对于推理模型（如 Qwen3、DeepSeek-R1），`<think>` 块在可折叠、独立滚动的区域中展示。
- **直出模式** — 一键关闭模型内部推理过程，获得即时、简洁的回复。
- **内联消息编辑** — 编辑任何用户消息，自动重新生成 AI 回复。也可以直接编辑 AI 回复。
- **清空聊天** — 橡皮擦按钮一键清空当前对话所有消息，附确认弹窗。
- **情感感知 TTS** — 基于阿里云灵积（DashScope）。自动解析对白和情感注释（如 `"你好"【语气:温柔】`），以正确的语气朗读。
- **视频生成** — 使用 xAI Grok 或任何兼容 API，根据助手消息生成短视频。
- **动态模型参数** — 为每个模型单独调整 Temperature、Top-P 和上下文窗口大小。
- **持久化设置** — 所有配置通过 Zustand 保存至 `localStorage`，支持版本迁移。

### 🤖 支持的模型

| 类型 | 示例 |
|---|---|
| ☁️ 云端 (NVIDIA NIM) | `meta/llama-3.1-70b-instruct` 等 |
| 🏠 本地 (llama.cpp) | 任意 `.gguf` 模型（通过内置本地模型管理器） |
| 🦙 Ollama | `qwen3-heretic`、`huihui_ai/qwen3-abliterated:4b` |
| 🧤 Ollama (HF) | `hf.co/bartowski/Nemotron-Mini-4B-Instruct-GGUF` |

### 🛠️ 技术栈

| 层级 | 技术 |
|---|---|
| 桌面端 | Electron 40 |
| 框架 | React 19 + Vite 7 + TypeScript |
| 样式 | TailwindCSS v4 |
| 状态管理 | Zustand（含 `persist` 中间件） |
| 图标 | Lucide React |
| LLM | OpenAI 兼容流式 API |
| TTS | 阿里云灵积（Qwen3-TTS） |
| 视频 | xAI Grok / OpenAI 兼容接口 |
| 本地推理 | llama.cpp (`llama-server`) + Ollama |

### 🚀 快速开始

#### 前置条件
- Node.js 18+
- （可选）[Ollama](https://ollama.ai) 用于本地模型
- （可选）NVIDIA 显卡 + llama.cpp 用于本地 llama-server

#### 安装

```bash
git clone <repo-url>
cd text-tts
npm install
```

#### 配置

在应用的**设置**面板（右侧边栏 → 管理接口）中填入您的 API Key：

| 服务 | 获取地址 |
|---|---|
| NVIDIA NIM | [build.nvidia.com](https://build.nvidia.com) |
| 阿里云灵积 DashScope (TTS) | [dashscope.aliyuncs.com](https://dashscope.aliyuncs.com) |
| xAI（视频生成） | [console.x.ai](https://console.x.ai) |

#### 运行

```bash
# 以 Electron 桌面应用运行（推荐）
npm run electron:dev

# 或仅作为 Web 应用运行
npm run dev

# （可选）启动 Ollama 模型
ollama run qwen3-heretic
```

> **本地模型**：使用内置的**本地模型管理器**（侧边栏）扫描并启动 `.gguf` 模型，无需手动启动 `llama-server`。

### 📁 项目结构

```
text-tts/
├── electron/
│   ├── main.cjs                 # Electron 主进程（模型管理、IPC）
│   └── preload.js               # 上下文桥接
├── src/
│   ├── App.tsx                  # 主应用与聊天 UI
│   ├── components/
│   │   ├── ApiSettingsModal.tsx  # API 配置弹窗
│   │   ├── LocalModelManager.tsx # 本地 .gguf 模型管理器
│   │   ├── ModelInfoModal.tsx   # 本地模型介绍与使用指南
│   │   └── PromptEditorModal.tsx # 全屏系统提示词编辑器
│   ├── services/
│   │   ├── llm.ts               # LLM 流式服务
│   │   ├── tts.ts               # TTS 服务（DashScope）
│   │   └── video.ts             # 视频生成服务
│   ├── store/
│   │   └── settings.ts          # Zustand 全局状态管理
│   └── utils/
│       └── textParser.ts        # <think> 标签解析器
├── CHANGELOG.md                 # 版本更新日志
├── Modelfile.heretic            # Qwen3 Heretic 的 Ollama Modelfile
└── 启动本地模型.bat              # 一键启动本地模型脚本
```

### 🔧 代理配置

Vite 开发服务器通过以下代理路由解决跨域（CORS）问题：

| 代理路径 | 目标地址 |
|---|---|
| `/api/nvidia` | `https://integrate.api.nvidia.com/v1` |
| `/api/dashscope` | `https://dashscope.aliyuncs.com` |
| `/api/local-{PORT}` | `http://localhost:{PORT}`（动态端口，任意 llama-server） |
| `/api/ollama` | `http://localhost:11434`（Ollama） |

---

<div align="center">
Made with ❤️ using React + Vite + Electron + Zustand
</div>
