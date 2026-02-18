// Type declarations for the Electron preload API
export interface ScannedModel {
    name: string;
    filename: string;
    path: string;
    sizeMB: number;
    directory: string;
}

export interface StartModelResult {
    success: boolean;
    port?: number;
    pid?: number;
    modelName?: string;
    error?: string;
}

export interface StopModelResult {
    success: boolean;
    error?: string;
}

export interface ModelHealthStatus {
    running: boolean;
    status: string;
}

export interface RunningModelInfo {
    port: number;
    modelName: string;
    modelPath: string;
    pid: number;
    startedAt: number;
}

export interface ModelStoppedEvent {
    port: number;
    modelName: string;
    code: number | null;
}

export interface ElectronAPI {
    scanModels: (extraDirs?: string[]) => Promise<ScannedModel[]>;
    startModel: (modelPath: string, port?: number) => Promise<StartModelResult>;
    stopModel: (port: number) => Promise<StopModelResult>;
    checkModelStatus: (port: number) => Promise<ModelHealthStatus>;
    getRunningModels: () => Promise<RunningModelInfo[]>;
    getNextPort: () => Promise<number>;
    onModelStopped: (callback: (data: ModelStoppedEvent) => void) => void;
    removeModelStoppedListener: () => void;
}

declare global {
    interface Window {
        electronAPI?: ElectronAPI;
    }
}
