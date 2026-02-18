import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Settings, User, Bot, Volume2, Play, Plus, MoreVertical, Trash2, Copy, Maximize2, Video, Loader2, BookOpen, RefreshCw, Pencil, Check, X, Eraser } from 'lucide-react';
import { useSettingsStore, type StoredMessage } from './store/settings';
import { streamChat, type ChatMessage } from './services/llm';
import { TTSService, extractDialogues } from './services/tts';
import { parseThinkingProcess } from './utils/textParser';
import { generateVideo } from './services/video';
import { ApiSettingsModal } from './components/ApiSettingsModal';
import { PromptEditorModal } from './components/PromptEditorModal';
import { ModelInfoModal } from './components/ModelInfoModal';
import { LocalModelManager } from './components/LocalModelManager';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {

  const [input, setInput] = useState('');
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [isModelInfoOpen, setIsModelInfoOpen] = useState(false);
  const [isVideoGenerating, setIsVideoGenerating] = useState<number | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  /** Index of the message currently being edited, null if none */
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    characters,
    activeCharacterId,
    apiSettings,
    updateApiSettings,
    updateCharacter,
    addCharacter,
    setActiveCharacter,
    deleteCharacter,
    llmConfigs,
    activeLlmConfigId,
    setActiveLlmConfig,
    videoConfigs,
    activeVideoConfigId,
    setActiveVideoConfig,
    ttsEnabled,
    setTtsEnabled,
    showThinking,
    setShowThinking,
    disableModelThinking,
    setDisableModelThinking,
    conversationMessages,
  } = useSettingsStore();

  const activeChar = characters.find(c => c.id === activeCharacterId) || characters[0];
  const activeCharId = activeChar?.id ?? '';

  /** Messages for the currently active character */
  const messages: StoredMessage[] = conversationMessages[activeCharId] ?? [];

  const setMessages = useCallback((updater: StoredMessage[] | ((prev: StoredMessage[]) => StoredMessage[])) => {
    // Always read the LATEST state from the store to avoid stale closures
    const latestState = useSettingsStore.getState();
    const currentMessages = latestState.conversationMessages[activeCharId] ?? [];
    const newMessages = typeof updater === 'function' ? updater(currentMessages) : updater;
    latestState.setConversationMessages(activeCharId, newMessages);
  }, [activeCharId]);

  const handleNewConversation = () => {
    const newId = Date.now().toString();
    const newChar = {
      id: newId,
      name: '新对话',
      systemPrompt: '',
      voiceStylePrompt: '',
    };
    addCharacter(newChar);
    setActiveCharacter(newId);
    // The new character has no messages in the store, so the view will be empty automatically.
    setIsRightSidebarOpen(true);
  };

  const handleCopyCharacter = (char: any) => {
    const newId = Date.now().toString();
    const newChar = {
      ...char,
      id: newId,
      name: `${char.name} (副本)`,
    };
    addCharacter(newChar);
    setOpenMenuId(null);
  };

  const handleDeleteCharacter = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (characters.length <= 1) {
      alert('至少需要保留一个角色');
      return;
    }
    if (confirm('确定要删除这个对话吗？')) {
      deleteCharacter(id);
      setOpenMenuId(null);
    }
  };

  const handleGenerateVideo = async (index: number, content: string) => {
    if (isVideoGenerating !== null) return;
    setIsVideoGenerating(index);
    try {
      const result = await generateVideo(content);
      if (result.error) {
        alert('视频生成失败: ' + result.error);
      } else if (result.videoUrl) {
        setMessages(prev => prev.map((msg, i) =>
          i === index ? { ...msg, videoUrl: result.videoUrl } : msg
        ));
      }
    } finally {
      setIsVideoGenerating(null);
    }
  };

  /** Delete a single message by index */
  const handleDeleteMessage = (index: number) => {
    setMessages(prev => prev.filter((_, i) => i !== index));
  };

  /** Start editing an assistant message */
  const handleStartEdit = (index: number, content: string) => {
    setEditingIndex(index);
    setEditingContent(content);
  };

  /** Save inline edit */
  const handleSaveEdit = (index: number) => {
    setMessages(prev => prev.map((msg, i) =>
      i === index ? { ...msg, content: editingContent } : msg
    ));
    setEditingIndex(null);
    setEditingContent('');
  };

  /** Cancel inline edit */
  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingContent('');
  };

  /** Save user message edit: update content, remove the following assistant reply, and regenerate */
  const handleSaveUserEdit = async (index: number) => {
    if (isGenerating) return;
    const updatedMessages = messages.map((msg, i) =>
      i === index ? { ...msg, content: editingContent } : msg
    );
    // Keep everything up to and including the edited user message, discard the rest
    const historyUpToUser = updatedMessages.slice(0, index + 1);
    setMessages(historyUpToUser);
    setEditingIndex(null);
    setEditingContent('');
    await runGeneration(historyUpToUser, activeChar.systemPrompt);
  };

  /** Core streaming send logic, reusable for both normal send and regenerate */
  const runGeneration = async (historyMessages: StoredMessage[], systemPrompt: string) => {
    setIsGenerating(true);
    try {
      const systemMessage: ChatMessage = { role: 'system', content: systemPrompt };
      const apiMessages: ChatMessage[] = historyMessages.map(m => ({ role: m.role, content: m.content }));
      const stream = streamChat([systemMessage, ...apiMessages]);

      let assistantContent = '';
      let reasoningContent = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '', reasoning: '' }]);

      for await (const chunk of stream) {
        if (chunk.type === 'reasoning') {
          reasoningContent += chunk.content;
        } else {
          assistantContent += chunk.content;
        }

        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = {
            ...next[next.length - 1],
            content: assistantContent,
            reasoning: reasoningContent,
          };
          return next;
        });
      }

      TTSService.speak(assistantContent);

    } catch (err: any) {
      console.error(err);
      // Remove the empty/incomplete assistant message on error
      setMessages(prev => {
        if (prev.length > 0 && prev[prev.length - 1].role === 'assistant' && !prev[prev.length - 1].content) {
          return prev.slice(0, -1);
        }
        return prev;
      });
      alert(`Error: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return;

    const userMessage: StoredMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');

    await runGeneration(newMessages, activeChar.systemPrompt);
  };

  /** Regenerate: remove last assistant turn and re-run */
  const handleRegenerate = async (assistantIndex: number) => {
    if (isGenerating) return;
    // Remove the assistant message at assistantIndex (and keep everything before it)
    const historyUpToAssistant = messages.slice(0, assistantIndex);
    setMessages(historyUpToAssistant);
    await runGeneration(historyUpToAssistant, activeChar.systemPrompt);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Left Sidebar - Character Selection */}
      <aside className={cn(
        "w-[15vw] min-w-[200px] max-w-[280px] border-r border-slate-800 bg-slate-900/50 backdrop-blur-xl transition-all duration-300 flex flex-col shrink-0",
        !isLeftSidebarOpen && "-ml-[15vw]"
      )}>
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">角色列表</h2>
          <button onClick={() => setIsLeftSidebarOpen(false)} className="lg:hidden p-1 hover:bg-slate-800 rounded">
            <Settings className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {characters.map(char => (
            <div key={char.id} className="relative group/item">
              <button
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left pr-10",
                  activeCharacterId === char.id ? "bg-indigo-600/20 border border-indigo-500/50 text-indigo-100" : "hover:bg-slate-800/50 text-slate-400"
                )}
                onClick={() => {
                  setActiveCharacter(char.id);
                  setOpenMenuId(null);
                }}
              >
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <span className="font-medium truncate flex-1">{char.name}</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuId(openMenuId === char.id ? null : char.id);
                }}
                className={cn(
                  "absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-slate-700 transition-all opacity-0 group-hover/item:opacity-100",
                  openMenuId === char.id && "opacity-100 bg-slate-700"
                )}
              >
                <MoreVertical className="w-4 h-4 text-slate-400" />
              </button>

              {openMenuId === char.id && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                  <div className="absolute right-0 top-full mt-1 w-36 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-100">
                    <button
                      onClick={() => handleCopyCharacter(char)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      复制角色
                    </button>
                    <button
                      onClick={(e) => handleDeleteCharacter(char.id, e)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      删除对话
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative min-w-0">
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-950/50 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            {!isLeftSidebarOpen && (
              <button onClick={() => setIsLeftSidebarOpen(true)} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                <User className="w-5 h-5" />
              </button>
            )}
            <div>
              <h1 className="font-semibold text-lg">{activeChar.name}</h1>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest">Active Chat</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Clear Chat Button */}
            <button
              onClick={() => {
                if (messages.length === 0) return;
                if (confirm('确定要删除当前对话的全部聊天记录吗？此操作不可撤销。')) {
                  setMessages([]);
                }
              }}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors group relative"
              title="清空当前对话记录"
            >
              <Eraser className="w-5 h-5 text-slate-400 group-hover:text-red-400" />
            </button>
            <button
              onClick={() => setIsModelInfoOpen(true)}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors group relative"
              title="本地模型介绍"
            >
              <BookOpen className="w-5 h-5 text-slate-400 group-hover:text-purple-400" />
            </button>
            <button
              onClick={handleNewConversation}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors group relative"
              title="创建新的对话"
            >
              <Plus className="w-5 h-5 text-slate-400 group-hover:text-indigo-400" />
            </button>
            {!isRightSidebarOpen && (
              <button onClick={() => setIsRightSidebarOpen(true)} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                <Settings className="w-5 h-5 text-slate-400" />
              </button>
            )}
          </div>
        </header>

        {/* Message List */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-smooth">
          <div className="w-full px-4 md:px-10 lg:px-16 py-6 space-y-8">
            {messages.length === 0 && (
              <div className="h-[60vh] flex flex-col items-center justify-center text-slate-600 space-y-6 animate-in fade-in zoom-in duration-700">
                <div className="relative">
                  <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full"></div>
                  <div className="relative p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl">
                    <Bot className="w-16 h-16 text-indigo-500" />
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-medium text-slate-300">与 {activeChar.name} 开始秘密对话</h3>
                  <p className="text-sm mt-2 max-w-xs mx-auto">设置好您的 API Key 后，随时可以开始这段美妙的旅程</p>
                </div>
              </div>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} className={cn(
                "flex gap-4 group animate-in fade-in slide-in-from-bottom-4 duration-500",
                msg.role === 'user' ? "flex-row-reverse" : "flex-row"
              )}>
                <div className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border shadow-lg relative",
                  msg.role === 'user' ? "bg-indigo-600 border-indigo-400" : "bg-slate-900 border-slate-800"
                )}>
                  {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                  {msg.role === 'assistant' && isGenerating && idx === messages.length - 1 && (
                    <div className="absolute -bottom-2 -right-2 bg-indigo-600 text-[8px] font-bold px-1 py-0.5 rounded-md border border-indigo-400 animate-pulse">
                      响应中
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <div className={cn(
                    "relative max-w-[95%] px-5 py-3.5 rounded-2xl text-sm leading-snug transition-all",
                    msg.role === 'user'
                      ? "bg-indigo-600 shadow-xl shadow-indigo-900/10 text-white rounded-tr-none"
                      : "bg-slate-900/80 backdrop-blur-sm border border-slate-800 text-slate-200 rounded-tl-none group-hover:border-slate-700"
                  )}>

                    {/* ── Inline Edit Mode (both user and assistant) ── */}
                    {editingIndex === idx ? (
                      <textarea
                        className={cn(
                          "w-full min-w-[300px] rounded-xl px-4 py-3 text-sm outline-none resize-y leading-6 focus:ring-1",
                          msg.role === 'user'
                            ? "bg-indigo-700/50 border border-indigo-400/60 text-white ring-indigo-300 placeholder-indigo-200"
                            : "bg-slate-800/80 border border-indigo-500/60 text-slate-100 ring-indigo-500"
                        )}
                        value={editingContent}
                        onChange={e => setEditingContent(e.target.value)}
                        rows={Math.max(3, editingContent.split('\n').length)}
                        autoFocus
                      />
                    ) : (
                      msg.role === 'user' ? (
                        /* ── User message: plain text ── */
                        <div className="whitespace-pre-wrap break-words leading-6">{msg.content}</div>
                      ) : (
                        /* ── Assistant message: rich content with thinking, dialogues, etc. ── */
                        (() => {
                          const { thinking, content: displayContent } = parseThinkingProcess(msg.content);
                          const combinedReasoning = (msg.reasoning || '') + (thinking || '');

                          return (
                            <>
                              {showThinking && combinedReasoning && (
                                <details className="mb-4 group/think">
                                  <summary className="flex items-center gap-2 mb-1 cursor-pointer select-none text-[10px] font-bold text-indigo-400 uppercase tracking-widest opacity-70 hover:opacity-100 transition-opacity list-none">
                                    <Bot className="w-3 h-3" />
                                    <span>思考过程</span>
                                    <div className="w-3 h-3 transition-transform duration-300 group-open/think:rotate-180">
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                    </div>
                                  </summary>
                                  <div className="p-3 bg-slate-950/50 border-l-2 border-indigo-500/50 text-[13px] text-slate-400 italic rounded-r-lg animate-in slide-in-from-top-2 fade-in duration-300 whitespace-pre-wrap max-h-[40vh] overflow-y-auto">
                                    {combinedReasoning}
                                  </div>
                                </details>
                              )}

                              <div className="whitespace-pre-wrap break-words leading-6">
                                {displayContent ? (
                                  (() => {
                                    const parts: React.ReactNode[] = [];
                                    const regexWithEmotion = new RegExp(
                                      '[\u201C\u201D""]([^\u201C\u201D""]+)[\u201C\u201D""][【\\[]语气[:：]([^】\\]]+)[】\\]]',
                                      'g'
                                    );
                                    const regexSimple = new RegExp('[\u201C\u201D""]([^\u201C\u201D""]+)[\u201C\u201D""]', 'g');

                                    const emotionMatches: { index: number; end: number; text: string; emotion: string }[] = [];
                                    let match;
                                    while ((match = regexWithEmotion.exec(displayContent)) !== null) {
                                      emotionMatches.push({
                                        index: match.index,
                                        end: match.index + match[0].length,
                                        text: match[1],
                                        emotion: match[2]
                                      });
                                    }

                                    const simpleMatches: { index: number; end: number; text: string }[] = [];
                                    while ((match = regexSimple.exec(displayContent)) !== null) {
                                      const isOverlap = emotionMatches.some(
                                        em => match!.index >= em.index && match!.index < em.end
                                      );
                                      if (!isOverlap) {
                                        simpleMatches.push({
                                          index: match.index,
                                          end: match.index + match[0].length,
                                          text: match[1]
                                        });
                                      }
                                    }

                                    const allMatches = [
                                      ...emotionMatches.map(m => ({ ...m, hasEmotion: true })),
                                      ...simpleMatches.map(m => ({ ...m, emotion: '', hasEmotion: false }))
                                    ].sort((a, b) => a.index - b.index);

                                    let lastIndex = 0;
                                    for (const m of allMatches) {
                                      if (m.index > lastIndex) {
                                        parts.push(displayContent.slice(lastIndex, m.index));
                                      }
                                      parts.push(
                                        <span key={m.index} className="inline-flex items-center gap-1 flex-wrap group/dialogue">
                                          <span className="text-indigo-300 font-medium">"{m.text}"</span>
                                          {m.hasEmotion && (
                                            <span className="text-[10px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                                              {m.emotion}
                                            </span>
                                          )}
                                          <button
                                            onClick={() => TTSService.speakDialogue(m.text, m.hasEmotion ? m.emotion : undefined)}
                                            className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600/30 hover:bg-indigo-600/60 text-indigo-300 hover:text-white transition-all opacity-60 group-hover/dialogue:opacity-100 hover:scale-110"
                                          >
                                            <Play className="w-2.5 h-2.5 fill-current" />
                                          </button>
                                        </span>
                                      );
                                      lastIndex = m.end;
                                    }
                                    if (lastIndex < displayContent.length) {
                                      parts.push(displayContent.slice(lastIndex));
                                    }
                                    return parts.length > 0 ? parts : displayContent;
                                  })()
                                ) : (
                                  isGenerating && idx === messages.length - 1 ? (
                                    <div className="flex items-center gap-2 text-slate-400 italic">
                                      <span>响应中</span>
                                      <div className="flex gap-1">
                                        <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                      </div>
                                    </div>
                                  ) : msg.content
                                )}
                              </div>
                            </>
                          );
                        })()
                      ))}

                    {/* ── Assistant-only: dialogue summary + video ── */}
                    {msg.role === 'assistant' && extractDialogues(msg.content).length > 0 && editingIndex !== idx && (
                      <div className="mt-3 pt-3 border-t border-slate-800/50 flex items-center gap-2 text-[10px] text-indigo-400 uppercase tracking-tighter font-bold flex-wrap">
                        <Volume2 className="w-3 h-3" />
                        <span>{extractDialogues(msg.content).length} 条对白</span>

                        <div className="flex items-center gap-1 ml-auto">
                          <button
                            onClick={() => handleGenerateVideo(idx, msg.content)}
                            disabled={isVideoGenerating === idx}
                            className="px-2 py-1 bg-slate-800/50 hover:bg-slate-700 rounded text-[9px] uppercase tracking-wide transition-colors flex items-center gap-1"
                            title="生成短视频"
                          >
                            {isVideoGenerating === idx ? <Loader2 className="w-3 h-3 animate-spin" /> : <Video className="w-3 h-3" />}
                            生成视频
                          </button>
                          <button
                            onClick={() => TTSService.speak(msg.content)}
                            className="px-2 py-1 bg-indigo-600/30 hover:bg-indigo-600/60 text-indigo-100 rounded text-[9px] uppercase tracking-wide transition-colors"
                          >
                            全部朗读
                          </button>
                        </div>
                      </div>
                    )}

                    {msg.videoUrl && (
                      <div className="mt-3 rounded-xl overflow-hidden border border-slate-700 bg-black aspect-video flex items-center justify-center group/video relative">
                        <video
                          src={msg.videoUrl}
                          controls
                          className="w-full h-full object-contain"
                          autoPlay
                          loop
                        />
                      </div>
                    )}

                    {/* ── Assistant Action Buttons (inside bubble) ── */}
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-1 pt-2 mt-2 border-t border-slate-700/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {editingIndex !== idx && (
                          <>
                            <button
                              onClick={() => handleRegenerate(idx)}
                              disabled={isGenerating}
                              title="重新生成"
                              className="px-2 py-1 rounded-lg text-[10px] text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>重新生成</span>
                            </button>
                            <button
                              onClick={() => handleStartEdit(idx, msg.content)}
                              title="编辑回复"
                              className="px-2 py-1 rounded-lg text-[10px] text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors flex items-center gap-1"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>编辑</span>
                            </button>
                            <button
                              onClick={() => handleDeleteMessage(idx)}
                              title="删除消息"
                              className="px-2 py-1 rounded-lg text-[10px] text-slate-400 hover:text-red-300 hover:bg-red-500/10 transition-colors flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>删除</span>
                            </button>
                            <button
                              onClick={() => navigator.clipboard.writeText(msg.content)}
                              title="复制"
                              className="px-2 py-1 rounded-lg text-[10px] text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors flex items-center gap-1"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </>
                        )}
                        {editingIndex === idx && (
                          <>
                            <button
                              onClick={() => handleSaveEdit(idx)}
                              title="保存"
                              className="px-2.5 py-1 rounded-lg text-[10px] text-emerald-300 bg-emerald-600/20 hover:bg-emerald-600/40 transition-colors flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              <span>保存</span>
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              title="取消"
                              className="px-2.5 py-1 rounded-lg text-[10px] text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors flex items-center gap-1"
                            >
                              <X className="w-3 h-3" />
                              <span>取消</span>
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ── User Action Buttons (BELOW the bubble) ── */}
                  {msg.role === 'user' && (
                    <div className={cn(
                      "flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
                      "justify-end"
                    )}>
                      {editingIndex !== idx && (
                        <>
                          <button
                            onClick={() => handleStartEdit(idx, msg.content)}
                            title="编辑并重新生成"
                            className="px-2 py-1 rounded-lg text-[10px] text-slate-500 hover:text-indigo-300 hover:bg-indigo-500/10 transition-colors flex items-center gap-1"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>编辑</span>
                          </button>
                          <button
                            onClick={() => handleDeleteMessage(idx)}
                            title="删除消息"
                            className="px-2 py-1 rounded-lg text-[10px] text-slate-500 hover:text-red-300 hover:bg-red-500/10 transition-colors flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>删除</span>
                          </button>
                          <button
                            onClick={() => navigator.clipboard.writeText(msg.content)}
                            title="复制"
                            className="px-2 py-1 rounded-lg text-[10px] text-slate-500 hover:text-slate-300 hover:bg-slate-700/30 transition-colors flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </>
                      )}
                      {editingIndex === idx && (
                        <>
                          <button
                            onClick={() => handleSaveUserEdit(idx)}
                            disabled={isGenerating}
                            title="保存并重新生成回复"
                            className="px-2.5 py-1 rounded-lg text-[10px] text-emerald-300 bg-emerald-600/20 hover:bg-emerald-600/40 transition-colors flex items-center gap-1 disabled:opacity-40"
                          >
                            <Check className="w-3 h-3" />
                            <span>保存并重新生成</span>
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            title="取消"
                            className="px-2.5 py-1 rounded-lg text-[10px] text-slate-500 hover:text-slate-300 hover:bg-slate-700/30 transition-colors flex items-center gap-1"
                          >
                            <X className="w-3 h-3" />
                            <span>取消</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Input Area */}
        <div className="p-6">
          <div className="w-full px-4 md:px-10 lg:px-16 relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl blur opacity-20 group-focus-within:opacity-40 transition duration-1000"></div>
            <div className="relative flex items-center">
              <input
                className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl pl-6 pr-14 py-5 focus:ring-1 ring-indigo-500 outline-none transition-all backdrop-blur-2xl text-slate-100 placeholder-slate-500"
                placeholder={`寄语 ${activeChar.name}... (回车发送)`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <button
                onClick={handleSend}
                disabled={isGenerating}
                className="absolute right-3 p-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-xl transition-all shadow-xl shadow-indigo-900/20 active:scale-95"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Right Sidebar - Advanced Settings */}
      <aside className={cn(
        "w-[20vw] min-w-[260px] max-w-[360px] border-l border-slate-800 bg-slate-900/50 backdrop-blur-xl transition-all duration-300 flex flex-col shrink-0",
        !isRightSidebarOpen && "-mr-[20vw]"
      )}>
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold">高级配置</h2>
          </div>
          <button onClick={() => setIsRightSidebarOpen(false)} className="p-1 hover:bg-slate-800 rounded">
            <Settings className="w-4 h-4 text-slate-500 rotate-90" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Character Settings */}
          <section className="space-y-5">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[.2em]">Character Config</h3>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400">角色名称</label>
              <input
                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-sm focus:ring-1 ring-indigo-500 outline-none transition-all"
                value={activeChar.name}
                onChange={(e) => updateCharacter(activeChar.id, { name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-400">人格设定 (System Prompt)</label>
                <button
                  onClick={() => setIsPromptModalOpen(true)}
                  className="p-1 hover:bg-slate-800 rounded text-indigo-400 transition-colors"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <textarea
                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 h-32 text-sm focus:ring-1 ring-indigo-500 outline-none transition-all resize-none leading-relaxed"
                value={activeChar.systemPrompt}
                onChange={(e) => updateCharacter(activeChar.id, { systemPrompt: e.target.value })}
              />
            </div>
          </section>

          <hr className="border-slate-800/50" />

          {/* Local Model Manager (Electron only) */}
          <LocalModelManager />

          <hr className="border-slate-800/50" />

          {/* API Settings */}
          <section className="space-y-5">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[.2em]">API Endpoints</h3>

            <div className="space-y-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-400">文本模型接口</label>
                <button onClick={() => setIsApiModalOpen(true)} className="text-[10px] text-indigo-400 font-bold uppercase">管理接口</button>
              </div>
              <select
                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-sm appearance-none cursor-pointer"
                value={activeLlmConfigId || ''}
                onChange={(e) => setActiveLlmConfig(e.target.value)}
              >
                {llmConfigs.map(config => (
                  <option key={config.id} value={config.id}>{config.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400">视频生成接口</label>
              <select
                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-sm appearance-none cursor-pointer"
                value={activeVideoConfigId || ''}
                onChange={(e) => setActiveVideoConfig(e.target.value)}
              >
                {videoConfigs.map(config => (
                  <option key={config.id} value={config.id}>{config.name}</option>
                ))}
              </select>
            </div>

            <hr className="border-slate-800/50" />

            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-400">显示思考过程 (Thinking)</label>
              <button
                onClick={() => setShowThinking(!showThinking)}
                className={cn(
                  "relative w-11 h-6 rounded-full transition-colors duration-200",
                  showThinking ? "bg-purple-600" : "bg-slate-700"
                )}
              >
                <span className={cn(
                  "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200",
                  showThinking ? "translate-x-5" : "translate-x-0"
                )} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-slate-400">直出模式 (Direct Output)</label>
                <span className="text-[9px] text-slate-500">模型跳过思考过程直接回复</span>
              </div>
              <button
                onClick={() => setDisableModelThinking(!disableModelThinking)}
                className={cn(
                  "relative w-11 h-6 rounded-full transition-colors duration-200",
                  disableModelThinking ? "bg-orange-600" : "bg-slate-700"
                )}
              >
                <span className={cn(
                  "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200",
                  disableModelThinking ? "translate-x-5" : "translate-x-0"
                )} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setTtsEnabled(!ttsEnabled)}
                className={cn(
                  "relative w-11 h-6 rounded-full transition-colors duration-200",
                  ttsEnabled ? "bg-indigo-600" : "bg-slate-700"
                )}
              >
                <span className={cn(
                  "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200",
                  ttsEnabled ? "translate-x-5" : "translate-x-0"
                )} />
              </button>
            </div>

            <div className={cn("space-y-4 transition-opacity", !ttsEnabled && "opacity-40 pointer-events-none")}>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400">TTS Base URL</label>
                <input
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-xs font-mono"
                  value={apiSettings.ttsBaseUrl}
                  onChange={(e) => updateApiSettings({ ttsBaseUrl: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400">TTS API Key</label>
                <input
                  type="password"
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-xs font-mono"
                  value={apiSettings.ttsApiKey}
                  onChange={(e) => updateApiSettings({ ttsApiKey: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400">语音音色</label>
                <select
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-sm appearance-none cursor-pointer"
                  value={apiSettings.ttsVoice}
                  onChange={(e) => updateApiSettings({ ttsVoice: e.target.value })}
                >
                  <optgroup label="女声">
                    <option value="Cherry">Cherry - 甜美女声</option>
                    <option value="Momo">Momo - 活泼俏皮</option>
                    <option value="Vivian">Vivian - 高冷御姐</option>
                    <option value="Mia">Mia - 温柔女声</option>
                  </optgroup>
                  <optgroup label="男声">
                    <option value="Aiden">Aiden - 美式男声</option>
                    <option value="Vincent">Vincent - 沙哑磁性</option>
                  </optgroup>
                </select>
              </div>
            </div>
          </section>
        </div>
      </aside>

      <ApiSettingsModal isOpen={isApiModalOpen} onClose={() => setIsApiModalOpen(false)} />
      <PromptEditorModal
        isOpen={isPromptModalOpen}
        onClose={() => setIsPromptModalOpen(false)}
        initialValue={activeChar.systemPrompt}
        onSave={(val) => updateCharacter(activeChar.id, { systemPrompt: val })}
        title={`编辑 ${activeChar.name} 的人格设定`}
      />
      <ModelInfoModal isOpen={isModelInfoOpen} onClose={() => setIsModelInfoOpen(false)} />
    </div>
  );
}
