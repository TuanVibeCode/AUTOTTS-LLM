import { useSettingsStore } from '../store/settings';

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    reasoning?: string;
    videoUrl?: string;
}

export async function* streamChat(messages: ChatMessage[]) {
    const { llmConfigs, activeLlmConfigId, disableModelThinking } = useSettingsStore.getState();
    const config = llmConfigs.find(c => c.id === activeLlmConfigId) || llmConfigs[0];

    if (!config) {
        throw new Error('No LLM configuration found');
    }

    // Prepare messages for thinking suppression if enabled
    let finalMessages = [...messages];
    if (disableModelThinking) {
        // Find the last user message to append the instruction, or add a system instruction
        const lastUserIdx = [...finalMessages].reverse().findIndex(m => m.role === 'user');
        if (lastUserIdx !== -1) {
            const idx = finalMessages.length - 1 - lastUserIdx;
            finalMessages[idx] = {
                ...finalMessages[idx],
                content: finalMessages[idx].content + "\n\n(IMPORTANT: Please respond directly and concisely. Do NOT use <think> tags or show your reasoning process. Output ONLY the response.)"
            };
        }
    }

    // Convert external URLs to proxy paths to bypass CORS
    let baseUrl = config.baseUrl.replace(/\/+$/, '').replace(/\/chat\/completions$/, '');

    // Check if it's the NVIDIA endpoint (using proxy)
    if (baseUrl.includes('integrate.api.nvidia.com')) {
        baseUrl = '/api/nvidia';
    }

    // Check if it's a local llama-server endpoint (any port in 8080-8099 range)
    const localMatch = baseUrl.match(/(?:localhost|127\.0\.0\.1):(\d+)/);
    const localPort = localMatch ? parseInt(localMatch[1], 10) : 0;
    const isLocalModel = localPort >= 8080 && localPort <= 8099;
    if (isLocalModel) {
        // Use dynamic port proxy: /api/local-{port}/...
        baseUrl = `/api/local-${localPort}`;
    }

    // Check if it's an Ollama endpoint (using proxy)
    const isOllamaModel = baseUrl.includes('localhost:11434') || baseUrl.includes('127.0.0.1:11434');
    if (isOllamaModel) {
        baseUrl = '/api/ollama/v1';
    }

    const isLocalAny = isLocalModel || isOllamaModel;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (!isLocalAny && config.apiKey.trim()) {
        headers['Authorization'] = `Bearer ${config.apiKey.trim()}`;
    }

    const body: any = {
        model: config.model.trim(),
        messages: finalMessages,
        stream: true,
        temperature: config.temperature,
        top_p: config.top_p,
        max_tokens: config.max_tokens,
        ...(config.extraBody || {}),
    };

    // Specialty handling for Ollama options
    if (isOllamaModel) {
        body.options = {
            temperature: config.temperature,
            top_p: config.top_p,
            num_ctx: config.num_ctx,
            ...(body.options || {}),
        };
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        let errorMessage = `API Request Failed (${response.status} ${response.statusText})`;
        try {
            const errorData = await response.json();
            errorMessage = errorData.error?.message || errorData.message || JSON.stringify(errorData);
        } catch {
            const text = await response.text();
            if (text) errorMessage += `: ${text.slice(0, 200)}`;
        }
        throw new Error(errorMessage);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) return;

    let buffer = '';
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;

            if (trimmedLine.startsWith('data: ')) {
                try {
                    const json = JSON.parse(trimmedLine.slice(6));
                    const delta = json.choices[0]?.delta;
                    const content = delta?.content || '';
                    const reasoning = delta?.reasoning_content || '';

                    if (reasoning) yield { type: 'reasoning', content: reasoning };
                    if (content) yield { type: 'content', content: content };
                } catch (e) {
                    console.error('Error parsing stream line', e);
                }
            }
        }
    }
}

