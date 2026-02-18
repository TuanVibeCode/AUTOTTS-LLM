import React, { useState } from 'react';
import { X, Cpu, Zap, Brain, Wrench, BookOpen, ChevronDown, ChevronUp, ExternalLink, Server, Sparkles } from 'lucide-react';

interface ModelInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ModelInfoModal: React.FC<ModelInfoModalProps> = ({ isOpen, onClose }) => {
    const [expandedSection, setExpandedSection] = useState<string | null>('intro');

    if (!isOpen) return null;

    const toggleSection = (id: string) => {
        setExpandedSection(expandedSection === id ? null : id);
    };

    const sections = [
        {
            id: 'intro',
            icon: <Sparkles className="w-4 h-4" />,
            title: '模型简介',
            color: 'from-violet-500 to-purple-600',
            content: (
                <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
                    <p>
                        <strong className="text-white">Nanbeige4.1-3B</strong> 是由
                        <strong className="text-purple-300"> 南北阁 (Nanbeige) LLM Lab</strong> 开发的 30 亿参数推理模型，
                        基于 Nanbeige4-3B-Base 构建，通过监督微调 (SFT) 和强化学习 (RL) 进行了深度优化。
                    </p>
                    <p>
                        作为小参数规模的开源模型，它在推理能力、偏好对齐和 Agent 能力方面表现出色，
                        是第一个原生支持深度搜索任务的通用小模型。
                    </p>
                    <div className="flex flex-wrap gap-2 pt-2">
                        {['中英双语', '3B 参数', 'Q8 量化', 'GGUF 格式', 'GPU 加速'].map(tag => (
                            <span key={tag} className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300">
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
            )
        },
        {
            id: 'features',
            icon: <Zap className="w-4 h-4" />,
            title: '核心能力',
            color: 'from-amber-500 to-orange-600',
            content: (
                <div className="space-y-4 text-sm">
                    <div className="flex gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shrink-0">
                            <Brain className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h4 className="text-white font-medium">💡 强推理能力</h4>
                            <p className="text-slate-400 text-xs mt-1">
                                能解决复杂多步推理问题，在 AIME 2026、LiveCodeBench 等基准测试中表现优异，
                                推理过程连贯且准确。
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shrink-0">
                            <Zap className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h4 className="text-white font-medium">🎯 偏好对齐</h4>
                            <p className="text-slate-400 text-xs mt-1">
                                超越同规模模型如 Qwen3-4B，甚至在 Arena-Hard-v2 等测试中超过更大的 Qwen3-30B 和 Qwen3-32B。
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                            <Wrench className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h4 className="text-white font-medium">🔧 Agent 能力</h4>
                            <p className="text-slate-400 text-xs mt-1">
                                首个原生支持深度搜索任务的通用小模型，能可靠地进行超过 500 轮工具调用的复杂问题解决。
                            </p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'setup',
            icon: <Server className="w-4 h-4" />,
            title: '使用教程',
            color: 'from-emerald-500 to-teal-600',
            content: (
                <div className="space-y-4 text-sm">
                    <div className="space-y-3">
                        <div className="flex gap-3 items-start">
                            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">1</span>
                            <div>
                                <h4 className="text-white font-medium">启动本地模型服务</h4>
                                <p className="text-slate-400 text-xs mt-1">
                                    双击项目根目录下的 <code className="bg-slate-800 px-1.5 py-0.5 rounded text-emerald-400">启动本地模型.bat</code> 文件。
                                    等待终端显示 "server listening" 字样，表示服务已启动。
                                </p>
                                <div className="mt-2 p-2.5 bg-slate-950 rounded-lg font-mono text-xs text-slate-400 border border-slate-800">
                                    <span className="text-slate-600"># 预计启动时间: 10~30 秒</span><br />
                                    <span className="text-emerald-400">✓</span> server listening at http://0.0.0.0:8080
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 items-start">
                            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">2</span>
                            <div>
                                <h4 className="text-white font-medium">在 APP 中切换模型</h4>
                                <p className="text-slate-400 text-xs mt-1">
                                    打开 <strong className="text-slate-200">API 设置</strong> →
                                    在 <strong className="text-slate-200">文本模型 (LLM)</strong> 标签中 →
                                    点击 <strong className="text-slate-200">"🏠 本地 Nanbeige4.1-3B"</strong> 将其激活。
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3 items-start">
                            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">3</span>
                            <div>
                                <h4 className="text-white font-medium">开始对话</h4>
                                <p className="text-slate-400 text-xs mt-1">
                                    回到聊天界面，发送消息即可。本地模型无需网络，所有数据在本地处理，完全私密。
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'specs',
            icon: <Cpu className="w-4 h-4" />,
            title: '技术规格',
            color: 'from-blue-500 to-indigo-600',
            content: (
                <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            ['模型架构', 'LLaMA'],
                            ['参数规模', '3B (30 亿)'],
                            ['量化精度', 'Q8_0 (~3.9GB)'],
                            ['上下文长度', '4096 tokens'],
                            ['推荐温度', '0.6'],
                            ['推荐 Top-P', '0.95'],
                            ['推理框架', 'llama.cpp (CUDA)'],
                            ['GPU 要求', '≥4GB 显存'],
                        ].map(([label, value]) => (
                            <div key={label} className="flex justify-between p-2.5 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                <span className="text-slate-400">{label}</span>
                                <span className="text-white font-medium">{value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )
        },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-slate-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-900/30">
                                <BookOpen className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Nanbeige4.1-3B</h2>
                                <p className="text-xs text-slate-500 mt-0.5">本地推理模型 · 功能介绍与使用教程</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl transition-colors">
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>

                    {/* Quick links */}
                    <div className="flex gap-2 mt-4">
                        <a
                            href="https://huggingface.co/Nanbeige/Nanbeige4.1-3B"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-lg text-xs text-slate-300 hover:text-white transition-all"
                        >
                            <ExternalLink className="w-3 h-3" /> HuggingFace
                        </a>
                        <a
                            href="https://github.com/Nanbeige/Nanbeige4.1-3B"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-lg text-xs text-slate-300 hover:text-white transition-all"
                        >
                            <ExternalLink className="w-3 h-3" /> GitHub
                        </a>
                    </div>
                </div>

                {/* Content - Accordion Sections */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                    {sections.map(section => (
                        <div
                            key={section.id}
                            className="border border-slate-800 rounded-2xl overflow-hidden transition-all"
                        >
                            <button
                                onClick={() => toggleSection(section.id)}
                                className="w-full flex items-center justify-between p-4 hover:bg-slate-800/30 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${section.color} flex items-center justify-center`}>
                                        {section.icon}
                                    </div>
                                    <span className="text-white font-semibold text-sm">{section.title}</span>
                                </div>
                                {expandedSection === section.id
                                    ? <ChevronUp className="w-4 h-4 text-slate-400" />
                                    : <ChevronDown className="w-4 h-4 text-slate-400" />
                                }
                            </button>
                            {expandedSection === section.id && (
                                <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                    {section.content}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Footer */}
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
