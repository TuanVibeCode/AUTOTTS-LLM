# Changelog

All notable changes to this project will be documented in this file.

---

## [0.2.0] - 2026-02-19

### 🖥️ Electron Desktop App
- Added full Electron integration — the app now runs as a native desktop window
- Window title set to **AUTOPLAY**
- Auto-hide menu bar, custom dark background, and frameless-ready styling

### 🧠 Local Model Manager
- New **LocalModelManager** component for scanning, starting, stopping, and managing local `.gguf` models
- Auto-scans `Downloads` and app directory for `.gguf` model files
- Dynamic port allocation (8081+) — supports running multiple models simultaneously
- Real-time health check polling with status indicators (loading / healthy / error)
- Switch dialog: when starting a new model while another is running, prompts to replace or keep both
- **Auto-configure LLM**: starting a local model automatically creates an API config and sets it as active

### 🔀 Dynamic Port Proxy
- Custom Vite plugin (`localModelDynamicProxy`) using Node's built-in `http` module
- Dynamically proxies `/api/local-{PORT}/...` → `localhost:{PORT}/...` — no hardcoded ports
- LLM service updated to detect local models on any port (8080–8099) and route through the correct proxy

### 💬 Chat UX Improvements
- **Message action buttons redesigned**:
  - Assistant messages: regenerate, edit, delete, copy buttons in a footer row inside the bubble
  - User messages: edit, delete, copy buttons rendered **below** the bubble (outside)
- **User message editing**: click Edit to modify your message in an inline textarea; saving triggers automatic regeneration of the assistant's response (all subsequent messages are discarded)
- **Thinking process scroll fix**: expanded thinking content now has `max-h-[40vh]` with independent scrolling — no longer blocks page scroll
- **Clear chat button**: broom (eraser) icon in the chat header — click to delete all messages in the current conversation (with confirmation dialog)

### 🐛 Bug Fixes
- Fixed stale closure in `setMessages` causing message loss during streaming — now reads latest state via `useSettingsStore.getState()`
- Fixed chat input becoming unresponsive after API errors — incomplete assistant messages are now auto-removed on error
- Fixed model restart blocking chat input — switch dialog now only shows for different healthy models, not when restarting the same model

---

## [0.1.0] - 2026-02-18

### Initial Release
- Multi-character AI roleplay chat with custom system prompts
- Multi-LLM backend (NVIDIA NIM, OpenAI-compatible, Ollama, llama.cpp)
- Streaming responses with real-time token output
- Thinking process display for reasoning models (Qwen3, DeepSeek-R1)
- Direct output mode toggle
- Emotion-aware TTS via Alibaba DashScope
- Video generation from assistant messages
- Dynamic model parameter adjustment (Temperature, Top-P, Context Window)
- Persistent settings via Zustand with migration support
