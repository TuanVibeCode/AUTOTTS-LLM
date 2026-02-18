import React, { useState, useEffect } from 'react';
import { X, Save, Maximize2, Copy, Check } from 'lucide-react';

interface PromptEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialValue: string;
    onSave: (value: string) => void;
    title: string;
}

export const PromptEditorModal: React.FC<PromptEditorModalProps> = ({
    isOpen,
    onClose,
    initialValue,
    onSave,
    title
}) => {
    const [value, setValue] = useState(initialValue);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setValue(initialValue);
        }
    }, [isOpen, initialValue]);

    if (!isOpen) return null;

    const handleCopy = () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSave = () => {
        onSave(value);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-8">
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={onClose} />

            <div className="relative w-full max-w-5xl h-full max-h-[85vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                            <Maximize2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">{title}</h2>
                            <p className="text-xs text-slate-500 mt-0.5">在此编辑器中精细调整系统提示词，掌控角色人格</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCopy}
                            className="p-2.5 hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-white group relative"
                            title="复制全部"
                        >
                            {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                        </button>
                        <button onClick={onClose} className="p-2.5 hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-white">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Editor Area */}
                <div className="flex-1 p-6 bg-slate-950/30 relative">
                    <textarea
                        className="w-full h-full bg-transparent text-slate-200 text-lg leading-relaxed outline-none resize-none font-sans scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent selection:bg-indigo-500/30"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder="输入系统提示词..."
                        spellCheck={false}
                    />

                    {/* Character Count */}
                    <div className="absolute bottom-4 right-8 text-[10px] font-mono text-slate-600 uppercase tracking-widest bg-slate-900/50 px-2 py-1 rounded backdrop-blur-sm">
                        Total Characters: {value.length}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-slate-900/80 border-t border-slate-800 flex justify-end gap-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-all"
                    >
                        取消修改
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-900/40 flex items-center gap-2 active:scale-95"
                    >
                        <Save className="w-4 h-4" />
                        保存并更新角色
                    </button>
                </div>
            </div>
        </div>
    );
};
