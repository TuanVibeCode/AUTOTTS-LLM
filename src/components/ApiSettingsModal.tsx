import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, Globe, Key, Layers, Activity, Save } from 'lucide-react';
import { useSettingsStore } from '../store/settings';
import type { LlmApiConfig, VideoApiConfig } from '../store/settings';
import { Video } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ApiSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ApiSettingsModal: React.FC<ApiSettingsModalProps> = ({ isOpen, onClose }) => {
    const {
        llmConfigs, addLlmConfig, updateLlmConfig, deleteLlmConfig, activeLlmConfigId, setActiveLlmConfig,
        videoConfigs, addVideoConfig, updateVideoConfig, deleteVideoConfig, activeVideoConfigId, setActiveVideoConfig
    } = useSettingsStore();

    const [activeTab, setActiveTab] = useState<'llm' | 'video'>('llm');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<LlmApiConfig | VideoApiConfig | null>(null);
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    if (!isOpen) return null;

    const handleAdd = () => {
        const id = Date.now().toString();
        const newConfig = {
            id,
            name: activeTab === 'llm' ? '新 LLM 配置' : '新 Video 配置',
            baseUrl: activeTab === 'llm' ? 'https://api.openai.com/v1' : 'https://api.x.ai/v1',
            apiKey: '',
            model: activeTab === 'llm' ? 'gpt-3.5-turbo' : 'grok-4-latest',
            ...(activeTab === 'llm' ? {
                temperature: 0.7,
                top_p: 1.0,
                num_ctx: 4096
            } : {})
        };

        if (activeTab === 'llm') {
            addLlmConfig(newConfig as LlmApiConfig);
        } else {
            addVideoConfig(newConfig as VideoApiConfig);
        }

        setEditingId(id);
        setEditForm(newConfig);
    };

    const handleEdit = (config: LlmApiConfig | VideoApiConfig) => {
        setEditingId(config.id);
        setEditForm({ ...config });
        setTestResult(null);
    };

    const handleSave = () => {
        if (editingId && editForm) {
            const cleanForm = {
                ...editForm,
                name: editForm.name.trim(),
                baseUrl: editForm.baseUrl.trim().replace(/\/+$/, ''),
                apiKey: editForm.apiKey.trim(),
                model: editForm.model.trim(),
            };

            if (activeTab === 'llm') {
                updateLlmConfig(editingId, cleanForm as LlmApiConfig);
            } else {
                updateVideoConfig(editingId, cleanForm as VideoApiConfig);
            }
            setEditingId(null);
            setEditForm(null);
        }
    };

    const handleTest = async () => {
        if (!editForm) return;
        setIsTesting(true);
        setTestResult(null);

        try {
            // Sanitize Base URL for testing
            let baseUrl = editForm.baseUrl.trim().replace(/\/+$/, '').replace(/\/chat\/completions$/, '');

            if (baseUrl.includes('integrate.api.nvidia.com')) {
                baseUrl = '/api/nvidia';
            }

            const response = await fetch(`${baseUrl}/models`, {
                headers: {
                    'Authorization': editForm.apiKey ? `Bearer ${editForm.apiKey}` : '',
                },
            });

            if (response.ok) {
                setTestResult({ success: true, message: '连接成功！' });
            } else {
                let errorMsg = `失败 (${response.status})`;
                try {
                    const error = await response.json();
                    errorMsg = `失败: ${error.error?.message || error.message || JSON.stringify(error)}`;
                } catch {
                    const text = await response.text();
                    if (text) errorMsg += `: ${text.slice(0, 100)}`;
                }
                setTestResult({ success: false, message: errorMsg });
            }
        } catch (err: any) {
            setTestResult({ success: false, message: `错误: ${err.message}` });
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-slate-800">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-white">管理 API 配置</h2>
                            <p className="text-xs text-slate-500 mt-1">配置第三方模型接口，支持 OpenAI 兼容格式</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl transition-colors">
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>

                    <div className="flex p-1 bg-slate-950/50 rounded-2xl w-fit">
                        <button
                            onClick={() => { setActiveTab('llm'); setEditingId(null); }}
                            className={cn(
                                "flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-medium transition-all",
                                activeTab === 'llm' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/40" : "text-slate-400 hover:text-slate-200"
                            )}
                        >
                            <Activity className="w-4 h-4" /> 文本模型 (LLM)
                        </button>
                        <button
                            onClick={() => { setActiveTab('video'); setEditingId(null); }}
                            className={cn(
                                "flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-medium transition-all",
                                activeTab === 'video' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/40" : "text-slate-400 hover:text-slate-200"
                            )}
                        >
                            <Video className="w-4 h-4" /> 视频生成 (Video)
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {editingId && editForm ? (
                        /* Edit View */
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-400 flex items-center gap-2">
                                        <Layers className="w-3 h-3" /> 配置名称
                                    </label>
                                    <input
                                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm focus:ring-2 ring-indigo-500/50 outline-none transition-all"
                                        value={editForm.name}
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                        placeholder="例如：DeepSeek-V3"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-400 flex items-center gap-2">
                                        <Globe className="w-3 h-3" /> Base URL
                                    </label>
                                    <input
                                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm font-mono focus:ring-2 ring-indigo-500/50 outline-none transition-all"
                                        value={editForm.baseUrl}
                                        onChange={(e) => setEditForm({ ...editForm, baseUrl: e.target.value })}
                                        placeholder="https://api.openai.com/v1"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-400 flex items-center gap-2">
                                        <Key className="w-3 h-3" /> API Key
                                    </label>
                                    <input
                                        type="password"
                                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm font-mono focus:ring-2 ring-indigo-500/50 outline-none transition-all"
                                        value={editForm.apiKey}
                                        onChange={(e) => setEditForm({ ...editForm, apiKey: e.target.value })}
                                        placeholder="sk-..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-400 flex items-center gap-2">
                                        <Activity className="w-3 h-3" /> 模型名称 (Model ID)
                                    </label>
                                    <input
                                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm font-mono focus:ring-2 ring-indigo-500/50 outline-none transition-all"
                                        value={editForm.model}
                                        onChange={(e) => setEditForm({ ...editForm, model: e.target.value })}
                                        placeholder="gpt-4o"
                                    />
                                </div>

                                {activeTab === 'llm' && (
                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Temperature ({(editForm as LlmApiConfig).temperature ?? 0.7})</label>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="2"
                                                step="0.1"
                                                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                                value={(editForm as LlmApiConfig).temperature ?? 0.7}
                                                onChange={(e) => setEditForm({ ...editForm, temperature: parseFloat(e.target.value) } as LlmApiConfig)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Top P ({(editForm as LlmApiConfig).top_p ?? 1.0})</label>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="1"
                                                step="0.05"
                                                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                                value={(editForm as LlmApiConfig).top_p ?? 1.0}
                                                onChange={(e) => setEditForm({ ...editForm, top_p: parseFloat(e.target.value) } as LlmApiConfig)}
                                            />
                                        </div>
                                        <div className="col-span-2 space-y-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">上下文窗口 (Context Window / num_ctx)</label>
                                            <input
                                                type="number"
                                                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-2 text-sm focus:ring-2 ring-indigo-500/50 outline-none transition-all font-mono"
                                                value={(editForm as LlmApiConfig).num_ctx ?? 4096}
                                                onChange={(e) => setEditForm({ ...editForm, num_ctx: parseInt(e.target.value) } as LlmApiConfig)}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {testResult && (
                                <div className={cn(
                                    "p-3 rounded-xl text-xs flex items-center gap-2",
                                    testResult.success ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                                )}>
                                    {testResult.success ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                    {testResult.message}
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={handleTest}
                                    disabled={isTesting}
                                    className="flex-1 px-4 py-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-100 text-sm font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isTesting ? "测试中..." : "测试连接"}
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2"
                                >
                                    <Save className="w-4 h-4" /> 保存配置
                                </button>
                                <button
                                    onClick={() => { setEditingId(null); setEditForm(null); }}
                                    className="px-4 py-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-100 text-sm font-medium transition-all"
                                >
                                    取消
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* List View */
                        <div className="space-y-4 animate-in fade-in duration-300">
                            {(activeTab === 'llm' ? llmConfigs : videoConfigs).length === 0 ? (
                                <div className="text-center py-12 text-slate-500">
                                    <Activity className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p>还没有配置任何 API</p>
                                </div>
                            ) : (
                                (activeTab === 'llm' ? llmConfigs : videoConfigs).map(config => (
                                    <div
                                        key={config.id}
                                        className={cn(
                                            "group relative p-4 rounded-2xl border transition-all flex items-center justify-between",
                                            (activeTab === 'llm' ? activeLlmConfigId : activeVideoConfigId) === config.id ? "bg-indigo-600/10 border-indigo-500/50" : "bg-slate-800/30 border-slate-800 hover:border-slate-700"
                                        )}
                                    >
                                        <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => activeTab === 'llm' ? setActiveLlmConfig(config.id) : setActiveVideoConfig(config.id)}>
                                            <div className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center border",
                                                (activeTab === 'llm' ? activeLlmConfigId : activeVideoConfigId) === config.id ? "bg-indigo-600 border-indigo-400 text-white" : "bg-slate-800 border-slate-700 text-slate-400"
                                            )}>
                                                <Globe className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold text-slate-100 flex items-center gap-2">
                                                    {config.name}
                                                    {(activeTab === 'llm' ? activeLlmConfigId : activeVideoConfigId) === config.id && (
                                                        <span className="text-[10px] bg-indigo-500 text-white px-1.5 py-0.5 rounded uppercase font-bold tracking-tighter">当前激活</span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-slate-500 truncate mt-0.5">{config.model} • {config.baseUrl}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleEdit(config)}
                                                className="p-2 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-all"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => activeTab === 'llm' ? deleteLlmConfig(config.id) : deleteVideoConfig(config.id)}
                                                className="p-2 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}

                            <button
                                onClick={handleAdd}
                                className="w-full p-4 border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl flex items-center justify-center gap-2 text-slate-500 hover:text-indigo-400 transition-all group"
                            >
                                <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                <span className="font-medium">添加新的 API 配置</span>
                            </button>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-950/50 border-t border-slate-800 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition-all"
                    >
                        关闭
                    </button>
                </div>
            </div>
        </div>
    );
};
