import { useState, useEffect, useCallback, useRef } from 'react';
import { CheckCircle, Circle, Play, Square, HardDrive, RefreshCw, AlertTriangle, Loader2, Folder, ChevronDown, ChevronUp, Cpu } from 'lucide-react';
import type { ScannedModel, RunningModelInfo } from '../types/electron';
import { useSettingsStore } from '../store/settings';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/** Is the Electron API available? (not available in browser mode) */
const isElectron = () => typeof window !== 'undefined' && !!window.electronAPI;

interface RunningInfo {
    port: number;
    modelName: string;
    modelPath: string;
    pid: number;
    healthy: boolean;
}

export function LocalModelManager() {
    const [models, setModels] = useState<ScannedModel[]>([]);
    const [runningModels, setRunningModels] = useState<RunningInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [startingModel, setStartingModel] = useState<string | null>(null);
    const [stoppingPort, setStoppingPort] = useState<number | null>(null);
    const [expanded, setExpanded] = useState(true);
    const [showSwitchDialog, setShowSwitchDialog] = useState<{
        newModelPath: string;
        newModelName: string;
        existingPort: number;
        existingName: string;
    } | null>(null);

    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── Scan for models ──
    const scanModels = useCallback(async () => {
        if (!isElectron()) return;
        setLoading(true);
        try {
            const result = await window.electronAPI!.scanModels();
            setModels(result);
        } catch (err) {
            console.error('Failed to scan models:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // ── Refresh running model status ──
    const refreshStatus = useCallback(async () => {
        if (!isElectron()) return;
        try {
            const running = await window.electronAPI!.getRunningModels();
            const withHealth: RunningInfo[] = await Promise.all(
                running.map(async (m: RunningModelInfo) => {
                    const health = await window.electronAPI!.checkModelStatus(m.port);
                    return {
                        port: m.port,
                        modelName: m.modelName,
                        modelPath: m.modelPath,
                        pid: m.pid,
                        healthy: health.running,
                    };
                })
            );
            setRunningModels(withHealth);
        } catch (err) {
            console.error('Failed to refresh status:', err);
        }
    }, []);

    // ── Start a model ──
    const handleStartModel = useCallback(async (model: ScannedModel) => {
        if (!isElectron()) return;

        // Only show switch dialog if a DIFFERENT healthy model is already running
        const healthyOthers = runningModels.filter(
            r => r.healthy && r.modelPath !== model.path
        );

        if (healthyOthers.length > 0) {
            const existing = healthyOthers[0];
            setShowSwitchDialog({
                newModelPath: model.path,
                newModelName: model.name,
                existingPort: existing.port,
                existingName: existing.modelName,
            });
            return;
        }

        await doStartModel(model.path, model.name);
    }, [runningModels]);

    const doStartModel = async (modelPath: string, modelName: string) => {
        setStartingModel(modelName);
        try {
            const result = await window.electronAPI!.startModel(modelPath);
            if (!result.success) {
                alert(`启动失败: ${result.error}`);
                return;
            }

            // Auto-create/update LLM config and set it as active
            if (result.port) {
                const store = useSettingsStore.getState();
                const configId = `local-${result.port}`;
                const existing = store.llmConfigs.find(c => c.id === configId);
                if (existing) {
                    store.updateLlmConfig(configId, {
                        name: `🖥️ ${modelName}`,
                        baseUrl: `http://localhost:${result.port}/v1`,
                        model: modelName,
                    });
                } else {
                    store.addLlmConfig({
                        id: configId,
                        name: `🖥️ ${modelName}`,
                        baseUrl: `http://localhost:${result.port}/v1`,
                        apiKey: '',
                        model: modelName,
                        temperature: 0.7,
                        top_p: 0.9,
                        max_tokens: 2048,
                    });
                }
                store.setActiveLlmConfig(configId);
            }

            // Wait a moment for the server to initialize, then refresh
            setTimeout(() => refreshStatus(), 3000);
        } catch (err: any) {
            alert(`启动失败: ${err.message}`);
        } finally {
            // Keep showing loading for a few seconds while server initializes
            setTimeout(() => setStartingModel(null), 5000);
        }
    };

    // ── Stop a model ──
    const handleStopModel = useCallback(async (port: number) => {
        if (!isElectron()) return;
        setStoppingPort(port);
        try {
            const result = await window.electronAPI!.stopModel(port);
            if (!result.success) {
                alert(`停止失败: ${result.error}`);
            }
            await refreshStatus();
        } catch (err: any) {
            alert(`停止失败: ${err.message}`);
        } finally {
            setStoppingPort(null);
        }
    }, [refreshStatus]);

    // ── Switch model dialog actions ──
    const handleSwitchKeepOld = async () => {
        if (!showSwitchDialog) return;
        const { newModelPath, newModelName } = showSwitchDialog;
        setShowSwitchDialog(null);
        await doStartModel(newModelPath, newModelName);
    };

    const handleSwitchReplaceOld = async () => {
        if (!showSwitchDialog) return;
        const { existingPort, newModelPath, newModelName } = showSwitchDialog;
        setShowSwitchDialog(null);
        // Stop old model first
        await window.electronAPI!.stopModel(existingPort);
        await new Promise(r => setTimeout(r, 1000));
        await doStartModel(newModelPath, newModelName);
    };

    // ── Initialize + polling ──
    useEffect(() => {
        if (!isElectron()) return;
        scanModels();
        refreshStatus();

        // Poll every 5 seconds
        pollRef.current = setInterval(refreshStatus, 5000);

        // Listen for model-stopped events
        window.electronAPI!.onModelStopped(() => {
            refreshStatus();
        });

        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
            window.electronAPI?.removeModelStoppedListener();
        };
    }, [scanModels, refreshStatus]);

    // ── Helper: is this model running? ──
    const getRunningInfo = (modelPath: string): RunningInfo | undefined => {
        return runningModels.find(r => r.modelPath === modelPath);
    };

    if (!isElectron()) {
        return null; // Don't show in browser mode
    }

    return (
        <>
            <section className="space-y-4">
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="w-full flex items-center justify-between group"
                >
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[.2em] flex items-center gap-2">
                        <HardDrive className="w-3.5 h-3.5" />
                        Local Models
                    </h3>
                    {expanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
                </button>

                {expanded && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                        {/* Refresh button */}
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] text-slate-500 uppercase tracking-wide">
                                {models.length} 个模型已检测
                            </span>
                            <button
                                onClick={scanModels}
                                disabled={loading}
                                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-indigo-400 transition-colors disabled:opacity-40"
                                title="重新扫描"
                            >
                                <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                            </button>
                        </div>

                        {/* Running models summary */}
                        {runningModels.length > 0 && (
                            <div className="px-3 py-2 rounded-lg bg-emerald-950/30 border border-emerald-800/40">
                                <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-bold uppercase tracking-wide">
                                    <Cpu className="w-3 h-3" />
                                    {runningModels.length} 个模型运行中
                                </div>
                            </div>
                        )}

                        {/* Model list */}
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                            {models.map((model) => {
                                const running = getRunningInfo(model.path);
                                const isStarting = startingModel === model.name;
                                const isStopping = running ? stoppingPort === running.port : false;

                                return (
                                    <div
                                        key={model.path}
                                        className={cn(
                                            "rounded-xl border p-3 transition-all",
                                            running?.healthy
                                                ? "bg-emerald-950/20 border-emerald-700/40"
                                                : "bg-slate-800/30 border-slate-700/40 hover:border-slate-600"
                                        )}
                                    >
                                        <div className="flex items-start gap-2.5">
                                            {/* Status icon */}
                                            <div className="shrink-0 mt-0.5">
                                                {isStarting ? (
                                                    <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                                                ) : running?.healthy ? (
                                                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                                                ) : (
                                                    <Circle className="w-4 h-4 text-slate-600" />
                                                )}
                                            </div>

                                            {/* Model info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-semibold text-slate-200 truncate">
                                                    {model.name}
                                                </div>
                                                <div className="text-[10px] text-slate-500 mt-0.5">
                                                    {model.sizeMB > 1024
                                                        ? `${(model.sizeMB / 1024).toFixed(1)} GB`
                                                        : `${model.sizeMB} MB`
                                                    }
                                                    {running && (
                                                        <span className="text-emerald-500 ml-2">
                                                            :{running.port}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Action button */}
                                            <div className="shrink-0">
                                                {running ? (
                                                    <button
                                                        onClick={() => handleStopModel(running.port)}
                                                        disabled={isStopping}
                                                        className="p-1.5 rounded-lg bg-red-900/30 border border-red-800/40 hover:bg-red-800/50 transition-colors disabled:opacity-40"
                                                        title="停止模型"
                                                    >
                                                        {isStopping ? (
                                                            <Loader2 className="w-3.5 h-3.5 text-red-400 animate-spin" />
                                                        ) : (
                                                            <Square className="w-3.5 h-3.5 text-red-400" />
                                                        )}
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleStartModel(model)}
                                                        disabled={isStarting}
                                                        className="p-1.5 rounded-lg bg-emerald-900/30 border border-emerald-800/40 hover:bg-emerald-800/50 transition-colors disabled:opacity-40"
                                                        title="启动模型"
                                                    >
                                                        {isStarting ? (
                                                            <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                                                        ) : (
                                                            <Play className="w-3.5 h-3.5 text-emerald-400" />
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Directory hint */}
                                        <div className="mt-1.5 flex items-center gap-1 text-[9px] text-slate-600 truncate">
                                            <Folder className="w-3 h-3 shrink-0" />
                                            <span className="truncate">{model.directory}</span>
                                        </div>
                                    </div>
                                );
                            })}

                            {models.length === 0 && !loading && (
                                <div className="text-center py-4 text-xs text-slate-500">
                                    未检测到 .gguf 模型文件
                                    <br />
                                    <span className="text-[10px] text-slate-600">
                                        请将模型放在项目目录或 Downloads 文件夹
                                    </span>
                                </div>
                            )}

                            {loading && models.length === 0 && (
                                <div className="text-center py-4">
                                    <Loader2 className="w-5 h-5 text-indigo-400 animate-spin mx-auto" />
                                    <span className="text-[10px] text-slate-500 mt-1 block">扫描中...</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </section>

            {/* ── Switch Model Confirmation Dialog ── */}
            {showSwitchDialog && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-[420px] max-w-[90vw] overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="px-6 pt-6 pb-3">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                                </div>
                                <h3 className="text-base font-bold text-slate-100">切换本地模型</h3>
                            </div>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                当前已有模型 <span className="text-indigo-400 font-semibold">{showSwitchDialog.existingName}</span> 在端口
                                <span className="text-indigo-400 font-mono"> :{showSwitchDialog.existingPort}</span> 运行。
                            </p>
                            <p className="text-sm text-slate-400 leading-relaxed mt-1">
                                您要启动 <span className="text-emerald-400 font-semibold">{showSwitchDialog.newModelName}</span>，请选择操作：
                            </p>
                        </div>

                        {/* Warning */}
                        <div className="mx-6 px-3 py-2 rounded-lg bg-amber-950/30 border border-amber-800/30 mb-4">
                            <p className="text-[11px] text-amber-400/80 leading-relaxed">
                                ⚠️ 同时运行多个大模型可能导致 GPU 显存不足，引发崩溃或性能下降。建议显存低于 8GB 时仅运行一个模型。
                            </p>
                        </div>

                        {/* Buttons */}
                        <div className="px-6 pb-6 space-y-2">
                            <button
                                onClick={handleSwitchReplaceOld}
                                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors"
                            >
                                关闭旧模型 → 启动新模型
                            </button>
                            <button
                                onClick={handleSwitchKeepOld}
                                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors border border-slate-700"
                            >
                                保留旧模型，同时运行
                            </button>
                            <button
                                onClick={() => setShowSwitchDialog(null)}
                                className="w-full py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                            >
                                取消
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
