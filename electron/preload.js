const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Scan directories for .gguf model files
    scanModels: (extraDirs) => ipcRenderer.invoke('scan-models', extraDirs),

    // Start a model on a given port (port is optional, auto-assigned if omitted)
    startModel: (modelPath, port) => ipcRenderer.invoke('start-model', modelPath, port),

    // Stop a running model by port
    stopModel: (port) => ipcRenderer.invoke('stop-model', port),

    // Check health of a model on a given port
    checkModelStatus: (port) => ipcRenderer.invoke('check-model-status', port),

    // Get list of all running models
    getRunningModels: () => ipcRenderer.invoke('get-running-models'),

    // Get next available port
    getNextPort: () => ipcRenderer.invoke('get-next-port'),

    // Listen for model-stopped events from main process
    onModelStopped: (callback) => {
        ipcRenderer.on('model-stopped', (_event, data) => callback(data));
    },

    // Remove model-stopped listener
    removeModelStoppedListener: () => {
        ipcRenderer.removeAllListeners('model-stopped');
    },
});
