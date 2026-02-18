import { useSettingsStore } from '../store/settings';

// Interface for dialogue with emotion
export interface DialogueWithEmotion {
    text: string;
    emotion: string;
}

// Extract all dialogues with their emotion annotations from content
// Matches: "对白"【语气:描述】 or "对白"[语气:描述]
export function extractDialoguesWithEmotion(content: string): DialogueWithEmotion[] {
    const results: DialogueWithEmotion[] = [];

    // Regex to match dialogue followed by emotion annotation
    // Chinese quotes: \u201C (") and \u201D ("), plus ASCII quotes
    // Emotion markers: 【语气:...】 or [语气:...]
    const regex = new RegExp(
        '[\u201C\u201D""]([^\u201C\u201D""]+)[\u201C\u201D""][【\\[]语气[:：]([^】\\]]+)[】\\]]',
        'g'
    );

    let match;
    while ((match = regex.exec(content)) !== null) {
        if (match[1] && match[2]) {
            results.push({
                text: match[1].trim(),
                emotion: match[2].trim()
            });
        }
    }

    return results;
}

// Extract dialogues without emotion (fallback for simple quotes)
export function extractDialogues(text: string): string[] {
    const regex = new RegExp('[\u201C\u201D""]([^\u201C\u201D""]+)[\u201C\u201D""]', 'g');
    const results: string[] = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
        if (match[1]) results.push(match[1]);
    }
    return results;
}

export class TTSService {
    private static audioQueue: string[] = [];
    private static isPlaying = false;
    private static audioPlayer = new Audio();

    // Speak a single dialogue with optional emotion
    static async speakDialogue(dialogue: string, emotion?: string) {
        const { apiSettings, ttsEnabled } = useSettingsStore.getState();

        if (!ttsEnabled) return;

        if (!apiSettings.ttsApiKey) {
            console.warn('TTS API Key not configured');
            alert('请先配置 TTS API Key');
            return;
        }

        await this.generateAndEnqueue(dialogue, emotion);
    }

    // Speak all dialogues from text
    static async speak(text: string) {
        const { ttsEnabled } = useSettingsStore.getState();
        if (!ttsEnabled) return;

        // Strip thinking tags if present
        const thinkRegex = /<think>[\s\S]*?<\/think>/gi;
        const cleanedText = text.replace(thinkRegex, '').trim();

        if (!cleanedText) return;

        // First try to extract dialogues with emotion
        const dialoguesWithEmotion = extractDialoguesWithEmotion(cleanedText);

        if (dialoguesWithEmotion.length > 0) {
            for (const d of dialoguesWithEmotion) {
                await this.generateAndEnqueue(d.text, d.emotion);
            }
        } else {
            // Fallback to simple dialogue extraction
            const dialogues = extractDialogues(text);
            for (const dialogue of dialogues) {
                await this.generateAndEnqueue(dialogue);
            }
        }
    }

    private static async generateAndEnqueue(text: string, emotion?: string) {
        const { apiSettings } = useSettingsStore.getState();

        try {
            console.log('TTS: Generating speech for:', text);
            if (emotion) console.log('TTS: With emotion:', emotion);

            // Build request body
            const requestBody: any = {
                model: apiSettings.ttsModel || 'qwen3-tts-flash',
                input: {
                    text: text,
                    voice: apiSettings.ttsVoice || 'Cherry',
                    language_type: apiSettings.ttsLanguage || 'Auto'
                }
            };

            // Add voice_prompt if emotion is provided
            if (emotion) {
                requestBody.input.voice_prompt = emotion;
            }

            const response = await fetch('/api/dashscope/api/v1/services/aigc/multimodal-generation/generation', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiSettings.ttsApiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            console.log('TTS: Response status:', response.status);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('TTS Error:', errorData);
                throw new Error(errorData.message || errorData.error?.message || `TTS Request failed: ${response.status}`);
            }

            const result = await response.json();
            console.log('TTS: Result:', result);

            // Check for audio URL in response
            const audioUrl = result.output?.audio?.url ||
                result.output?.audio_url ||
                result.output?.url ||
                result.audio?.url;

            if (audioUrl) {
                console.log('TTS: Got audio URL:', audioUrl);
                this.audioQueue.push(audioUrl);
                if (!this.isPlaying) {
                    this.playNext();
                }
            } else if (result.output?.audio) {
                // If audio is base64 encoded
                const audioData = result.output.audio;
                if (audioData.startsWith('data:') || audioData.length > 1000) {
                    const audioBlob = await this.base64ToBlob(audioData);
                    const url = URL.createObjectURL(audioBlob);
                    this.audioQueue.push(url);
                    if (!this.isPlaying) {
                        this.playNext();
                    }
                }
            } else {
                console.warn('TTS: No audio URL in response', result);
            }
        } catch (error) {
            console.error('TTS Error:', error);
            console.warn(`TTS 错误: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private static async base64ToBlob(base64: string): Promise<Blob> {
        const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return new Blob([bytes], { type: 'audio/mp3' });
    }

    private static playNext() {
        if (this.audioQueue.length === 0) {
            this.isPlaying = false;
            return;
        }

        this.isPlaying = true;
        const url = this.audioQueue.shift()!;
        console.log('TTS: Playing audio:', url);
        this.audioPlayer.src = url;
        this.audioPlayer.play().catch(err => {
            console.error('Audio playback error:', err);
            this.playNext();
        });

        this.audioPlayer.onended = () => {
            if (url.startsWith('blob:')) {
                URL.revokeObjectURL(url);
            }
            this.playNext();
        };
    }
}
