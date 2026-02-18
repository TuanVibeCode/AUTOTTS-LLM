import { useSettingsStore } from '../store/settings';

export interface VideoGenerationResponse {
    videoUrl?: string;
    taskId?: string;
    error?: string;
}

export async function generateVideo(prompt: string): Promise<VideoGenerationResponse> {
    const { videoConfigs, activeVideoConfigId } = useSettingsStore.getState();
    const config = videoConfigs.find(c => c.id === activeVideoConfigId) || videoConfigs[0];

    if (!config) {
        throw new Error('未发现视频生成配置，请在设置中添加。');
    }

    const cleanBaseUrl = config.baseUrl.trim().replace(/\/+$/, '');

    // Support OpenAI-style Chat Completion for models that support it (like grok-4)
    // or dedicated video generation endpoints.
    const isChatEndpoint = cleanBaseUrl.endsWith('/chat/completions');
    const endpoint = isChatEndpoint ? cleanBaseUrl : `${cleanBaseUrl}/video/generate`;

    try {
        const payload = isChatEndpoint ? {
            model: config.model.trim(),
            messages: [
                { role: 'system', content: 'You are a video generation assistant. Based on the user prompt, return a direct URL to a generated video in your response.' },
                { role: 'user', content: `Generate a video for: ${prompt}` }
            ],
            stream: false,
        } : {
            model: config.model.trim(),
            prompt: prompt,
            // Additional parameters can be added here
        };

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.apiKey.trim()}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            let errorMsg = `API 请求失败 (${response.status})`;
            try {
                const error = await response.json();
                errorMsg = error.error?.message || error.message || errorMsg;
            } catch (e) { }
            throw new Error(errorMsg);
        }

        const data = await response.json();

        // Handle different response formats
        // 1. OpenAI Chat format: look for URL in content
        if (isChatEndpoint) {
            const content = data.choices?.[0]?.message?.content || '';
            const urlMatch = content.match(/https?:\/\/[^\s"'<>]+(?:\.mp4|\.mov|\.webm)/i) ||
                content.match(/https?:\/\/[^\s"'<>]+/i);
            if (urlMatch) {
                return { videoUrl: urlMatch[0] };
            }
            throw new Error('AI 返回的内容中未包含视频链接：' + content);
        }

        // 2. Dedicated Video API format (e.g. xAI Grok Imagine)
        // Adjust based on actual API spec
        return {
            videoUrl: data.video_url || data.url || data.data?.[0]?.url,
            taskId: data.id || data.task_id
        };

    } catch (error: any) {
        console.error('Video generation error:', error);
        return { error: error.message };
    }
}
