import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Character {
    id: string;
    name: string;
    avatar?: string;
    systemPrompt: string;
    voiceStylePrompt: string;
}

export interface LlmApiConfig {
    id: string;
    name: string;
    baseUrl: string;
    apiKey: string;
    model: string;
    temperature?: number;
    top_p?: number;
    num_ctx?: number;
    max_tokens?: number;
    extraBody?: any;
}

export interface VideoApiConfig {
    id: string;
    name: string;
    baseUrl: string;
    apiKey: string;
    model: string;
}

export interface ApiSettings {
    ttsBaseUrl: string;
    ttsApiKey: string;
    ttsModel: string;
    ttsVoice: string;
    ttsLanguage: string;
    // LLM related fields are moved to LlmApiConfig, but we keep them here temporarily for migration
    llmBaseUrl?: string;
    llmApiKey?: string;
    llmModel?: string;
    extraBody?: any;
}

// Minimal message type stored in the store (mirrors ChatMessage from llm.ts)
export interface StoredMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    reasoning?: string;
    videoUrl?: string;
}

interface SettingsState {
    characters: Character[];
    activeCharacterId: string | null;
    apiSettings: ApiSettings;
    llmConfigs: LlmApiConfig[];
    activeLlmConfigId: string | null;
    videoConfigs: VideoApiConfig[];
    activeVideoConfigId: string | null;
    ttsEnabled: boolean;
    showThinking: boolean;
    disableModelThinking: boolean;
    /** Messages stored per characterId */
    conversationMessages: Record<string, StoredMessage[]>;

    // Actions
    addCharacter: (char: Character) => void;
    updateCharacter: (id: string, char: Partial<Character>) => void;
    deleteCharacter: (id: string) => void;
    setActiveCharacter: (id: string) => void;
    updateApiSettings: (settings: Partial<ApiSettings>) => void;
    setTtsEnabled: (enabled: boolean) => void;
    setShowThinking: (enabled: boolean) => void;
    setDisableModelThinking: (disabled: boolean) => void;
    addLlmConfig: (config: LlmApiConfig) => void;
    updateLlmConfig: (id: string, config: Partial<LlmApiConfig>) => void;
    deleteLlmConfig: (id: string) => void;
    setActiveLlmConfig: (id: string) => void;
    addVideoConfig: (config: VideoApiConfig) => void;
    updateVideoConfig: (id: string, config: Partial<VideoApiConfig>) => void;
    deleteVideoConfig: (id: string) => void;
    setActiveVideoConfig: (id: string) => void;
    setConversationMessages: (characterId: string, messages: StoredMessage[]) => void;
    clearConversationMessages: (characterId: string) => void;
}

const DEFAULT_LLM_CONFIG: LlmApiConfig = {
    id: 'default-nvidia',
    name: 'NVIDIA GLM-4',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    apiKey: '',  // Enter your NVIDIA API key in the app settings
    model: 'z-ai/glm4.7',
    extraBody: {
        chat_template_kwargs: {
            enable_thinking: true,
            clear_thinking: false
        }
    }
};

const DEFAULT_LOCAL_NANBEIGE_CONFIG: LlmApiConfig = {
    id: 'local-nanbeige-3b',
    name: '🤖 本地补完 Nanbeige-4.1-3B (8081)',
    baseUrl: 'http://localhost:8081/v1',
    apiKey: 'not-needed',
    model: 'nanbeige-4.1-3b',
    temperature: 0.6,
    top_p: 0.95,
    num_ctx: 4096,
};

const DEFAULT_OLLAMA_QWEN3_CONFIG: LlmApiConfig = {
    id: 'ollama-qwen3-4b',
    name: '🌟 Ollama Qwen3-4B-Instruct',
    baseUrl: 'http://localhost:11434/v1',
    apiKey: 'ollama',
    model: 'huihui_ai/qwen3-abliterated:4b',
    temperature: 0.7,
    top_p: 0.9,
    num_ctx: 4096,
};

const DEFAULT_OLLAMA_HERETIC_CONFIG: LlmApiConfig = {
    id: 'ollama-heretic-4b',
    name: '🧠 Ollama Qwen3-4B Heretic (带思考/无审查)',
    baseUrl: 'http://localhost:11434/v1',
    apiKey: 'ollama',
    model: 'qwen3-heretic:latest',
    top_p: 0.9,
    num_ctx: 4096,
};

const DEFAULT_OLLAMA_NEMOTRON_CONFIG: LlmApiConfig = {
    id: 'ollama-nemotron-mini',
    name: '🧤 NVIDIA Nemotron-Mini-4B',
    baseUrl: 'http://localhost:11434/v1',
    apiKey: 'ollama',
    model: 'hf.co/bartowski/Nemotron-Mini-4B-Instruct-GGUF',
    temperature: 0.6,
    top_p: 0.9,
    num_ctx: 4096,
};

const DEFAULT_VIDEO_CONFIG: VideoApiConfig = {
    id: 'default-xai',
    name: 'xAI Grok Imagine',
    baseUrl: 'https://api.x.ai/v1',
    apiKey: '',  // Enter your xAI API key in the app settings
    model: 'grok-4-latest'
};

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            characters: [
                {
                    id: '1',
                    name: '默认御姐',
                    systemPrompt: `你是一个成熟、优雅、富有魅力的女性，语气略带慵懒但又不失威严。

【重要】对白语气标注规则：
在输出对白时，请在每段对白后用【语气:描述】标注该对白的语气 and 情感。
描述应包含：情感状态、音调特点、语速建议等。

示例：
"你终于来了~"【语气:慵懒撩人，音调低沉，语速缓慢】
"这可不行哦"【语气:威严警告，音调上扬，略带玩味】
"嗯...让我想想"【语气:沉思，音调平稳，语速放慢】`,
                    voiceStylePrompt: '成熟女性，磁性嗓音，酥软语气，语速略慢',
                }
            ],
            activeCharacterId: '1',
            llmConfigs: [DEFAULT_LLM_CONFIG, DEFAULT_LOCAL_NANBEIGE_CONFIG, DEFAULT_OLLAMA_QWEN3_CONFIG, DEFAULT_OLLAMA_HERETIC_CONFIG, DEFAULT_OLLAMA_NEMOTRON_CONFIG],
            activeLlmConfigId: 'default-nvidia',
            videoConfigs: [DEFAULT_VIDEO_CONFIG],
            activeVideoConfigId: 'default-xai',
            ttsEnabled: true,
            showThinking: true,
            disableModelThinking: false,
            conversationMessages: {},
            apiSettings: {
                ttsBaseUrl: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2audio/speech-synthesizer',
                ttsApiKey: '',  // Enter your DashScope API key in the app settings
                ttsModel: 'qwen3-tts-flash',
                ttsVoice: 'Cherry',
                ttsLanguage: 'Auto'
            },
            addCharacter: (char) => set((state) => ({ characters: [...state.characters, char] })),
            deleteCharacter: (id) => set((state) => {
                const newCharacters = state.characters.filter((c) => c.id !== id);
                if (newCharacters.length === 0) return state; // Don't delete last character
                const nextActiveId = state.activeCharacterId === id ? newCharacters[0].id : state.activeCharacterId;
                // Also clean up messages for deleted character
                const newMessages = { ...state.conversationMessages };
                delete newMessages[id];
                return { characters: newCharacters, activeCharacterId: nextActiveId, conversationMessages: newMessages };
            }),
            updateCharacter: (id, char) => set((state) => ({
                characters: state.characters.map((c) => (c.id === id ? { ...c, ...char } : c)),
            })),
            setActiveCharacter: (id) => set({ activeCharacterId: id }),
            updateApiSettings: (settings) => set((state) => ({
                apiSettings: { ...state.apiSettings, ...settings },
            })),
            addLlmConfig: (config) => set((state) => ({ llmConfigs: [...state.llmConfigs, config] })),
            updateLlmConfig: (id, config) => set((state) => ({
                llmConfigs: state.llmConfigs.map((c) => (c.id === id ? { ...c, ...config } : c)),
            })),
            deleteLlmConfig: (id) => set((state) => {
                const newConfigs = state.llmConfigs.filter((c) => c.id !== id);
                if (newConfigs.length === 0) return state;
                const nextActiveId = state.activeLlmConfigId === id ? newConfigs[0].id : state.activeLlmConfigId;
                return { llmConfigs: newConfigs, activeLlmConfigId: nextActiveId };
            }),
            setActiveLlmConfig: (id) => set({ activeLlmConfigId: id }),
            addVideoConfig: (config) => set((state) => ({ videoConfigs: [...state.videoConfigs, config] })),
            updateVideoConfig: (id, config) => set((state) => ({
                videoConfigs: state.videoConfigs.map((c) => (c.id === id ? { ...c, ...config } : c)),
            })),
            deleteVideoConfig: (id) => set((state) => {
                const newConfigs = state.videoConfigs.filter((c) => c.id !== id);
                if (newConfigs.length === 0) return state;
                const nextActiveId = state.activeVideoConfigId === id ? newConfigs[0].id : state.activeVideoConfigId;
                return { videoConfigs: newConfigs, activeVideoConfigId: nextActiveId };
            }),
            setActiveVideoConfig: (id) => set({ activeVideoConfigId: id }),
            setTtsEnabled: (enabled) => set({ ttsEnabled: enabled }),
            setShowThinking: (enabled) => set({ showThinking: enabled }),
            setDisableModelThinking: (disabled) => set({ disableModelThinking: disabled }),
            setConversationMessages: (characterId, messages) => set((state) => ({
                conversationMessages: { ...state.conversationMessages, [characterId]: messages }
            })),
            clearConversationMessages: (characterId) => set((state) => {
                const newMessages = { ...state.conversationMessages };
                delete newMessages[characterId];
                return { conversationMessages: newMessages };
            }),
        }),
        {
            name: 'roleplay-settings',
            onRehydrateStorage: () => (state) => {
                if (!state) return;
                // Migration for LLM configs
                if (!state.llmConfigs || state.llmConfigs.length === 0) {
                    const legacyLlm = {
                        id: 'legacy-config',
                        name: '内置配置 (旧)',
                        baseUrl: state.apiSettings?.llmBaseUrl || DEFAULT_LLM_CONFIG.baseUrl,
                        apiKey: state.apiSettings?.llmApiKey || DEFAULT_LLM_CONFIG.apiKey,
                        model: state.apiSettings?.llmModel || DEFAULT_LLM_CONFIG.model,
                        extraBody: state.apiSettings?.extraBody || DEFAULT_LLM_CONFIG.extraBody,
                    };
                    state.llmConfigs = [legacyLlm];
                    state.activeLlmConfigId = 'legacy-config';
                }
                // Migration for Video configs
                if (!state.videoConfigs || state.videoConfigs.length === 0) {
                    state.videoConfigs = [DEFAULT_VIDEO_CONFIG];
                    state.activeVideoConfigId = DEFAULT_VIDEO_CONFIG.id;
                }
                // Migration: inject local Nanbeige config if not present
                if (state.llmConfigs && !state.llmConfigs.some(c => c.id === 'local-nanbeige-3b')) {
                    state.llmConfigs = [...state.llmConfigs, DEFAULT_LOCAL_NANBEIGE_CONFIG];
                }
                // Migration: inject Ollama Qwen3 config if not present
                if (state.llmConfigs && !state.llmConfigs.some(c => c.id === 'ollama-qwen3-4b')) {
                    state.llmConfigs = [...state.llmConfigs, DEFAULT_OLLAMA_QWEN3_CONFIG];
                }
                // Migration: inject Ollama Heretic config if not present
                if (state.llmConfigs && !state.llmConfigs.some(c => c.id === 'ollama-heretic-4b')) {
                    state.llmConfigs = [...state.llmConfigs, DEFAULT_OLLAMA_HERETIC_CONFIG];
                }
                // Migration: inject Nemotron Mini config if not present
                if (state.llmConfigs && !state.llmConfigs.some(c => c.id === 'ollama-nemotron-mini')) {
                    state.llmConfigs = [...state.llmConfigs, DEFAULT_OLLAMA_NEMOTRON_CONFIG];
                }

                // Add default parameters if missing
                if (state.llmConfigs) {
                    state.llmConfigs = state.llmConfigs.map(config => ({
                        ...config,
                        temperature: config.temperature ?? 0.7,
                        top_p: config.top_p ?? 1.0,
                        num_ctx: config.num_ctx ?? 4096,
                    }));
                }

                if (state.showThinking === undefined) {
                    state.showThinking = true;
                }
                if (state.disableModelThinking === undefined) {
                    state.disableModelThinking = false;
                }
                // Initialize conversationMessages if missing
                if (!state.conversationMessages) {
                    state.conversationMessages = {};
                }
            },
        }
    )
);
