/**
 * Extracts text inside quotes (both Chinese and English)
 * @param text The input text from AI
 * @returns Array of strings found inside quotes
 */
export const extractDialogue = (text: string): string[] => {
    const regex = /[“"「]([^“”"」]+)[”"」]/g;
    const matches = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
        matches.push(match[1]);
    }
    return matches;
};

/**
 * Parses content for <think> tags
 * @param content The raw message content
 * @returns An object with thinking text (if any) and cleaned content
 */
export const parseThinkingProcess = (content: string) => {
    const thinkRegex = /<think>([\s\S]*?)(?:<\/think>|$)/i;
    const match = content.match(thinkRegex);

    if (match) {
        const thinking = match[1].trim();
        const cleanedContent = content.replace(thinkRegex, '').trim();
        return { thinking, content: cleanedContent };
    }

    return { thinking: null, content };
};
