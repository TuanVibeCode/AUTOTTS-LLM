const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// ── Running models registry ──
// Map<port, { process, modelPath, modelName, port }>
const runningModels = new Map();

let mainWindow = null;

// ── Default scan directories ──
function getDefaultScanDirs() {
    const appDir = isDev ? process.cwd() : path.dirname(app.getPath('exe'));
    const downloadsDir = path.join(os.homedir(), 'Downloads');
    return [appDir, downloadsDir];
}

// ── Get llama-server executable path ──
function getLlamaServerPath() {
    const appDir = isDev ? process.cwd() : path.dirname(app.getPath('exe'));
    return path.join(appDir, 'llama-server', 'llama-server.exe');
}

// ── Find next available port starting from 8081 ──
function getNextPort() {
    let port = 8081;
    while (runningModels.has(port)) {
        port++;
    }
    return port;
}

// ── Scan directories for .gguf files ──
function scanModels(extraDirs = []) {
    const dirs = [...new Set([...getDefaultScanDirs(), ...extraDirs])];
    const models = [];

    for (const dir of dirs) {
        try {
            if (!fs.existsSync(dir)) continue;
            const files = fs.readdirSync(dir);
            for (const file of files) {
                if (!file.toLowerCase().endsWith('.gguf')) continue;
                const filePath = path.join(dir, file);
                try {
                    const stat = fs.statSync(filePath);
                    models.push({
                        name: file.replace(/\.gguf$/i, ''),
                        filename: file,
                        path: filePath,
                        sizeMB: Math.round(stat.size / 1024 / 1024),
                        directory: dir,
                    });
                } catch { /* skip unreadable files */ }
            }
        } catch { /* skip unreadable dirs */ }
    }

    return models;
}

// ── Health check via HTTP ──
function checkHealth(port) {
    return new Promise((resolve) => {
        const req = http.get(`http://127.0.0.1:${port}/health`, { timeout: 3000 }, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    resolve({ running: true, status: data.status || 'ok' });
                } catch {
                    resolve({ running: true, status: 'ok' });
                }
            });
        });
        req.on('error', () => resolve({ running: false, status: 'offline' }));
        req.on('timeout', () => { req.destroy(); resolve({ running: false, status: 'timeout' }); });
    });
}

// ── Start a model ──
function startModel(modelPath, port) {
    const llamaServer = getLlamaServerPath();

    if (!fs.existsSync(llamaServer)) {
        return { success: false, error: `llama-server.exe not found at: ${llamaServer}` };
    }
    if (!fs.existsSync(modelPath)) {
        return { success: false, error: `Model file not found: ${modelPath}` };
    }
    if (runningModels.has(port)) {
        return { success: false, error: `Port ${port} is already in use` };
    }

    const args = [
        '-m', modelPath,
        '--port', String(port),
        '-c', '4096',
        '-ngl', '99',
        '--host', '0.0.0.0',
        '-t', '4',
    ];

    const child = spawn(llamaServer, args, {
        stdio: 'pipe',
        detached: false,
        windowsHide: true,
    });

    const modelName = path.basename(modelPath, '.gguf');

    const entry = {
        process: child,
        modelPath,
        modelName,
        port,
        pid: child.pid,
        startedAt: Date.now(),
        logs: [],
    };

    // Capture logs (keep last 50 lines)
    child.stdout.on('data', (data) => {
        const lines = data.toString().split('\n').filter(Boolean);
        entry.logs.push(...lines);
        if (entry.logs.length > 50) entry.logs = entry.logs.slice(-50);
    });
    child.stderr.on('data', (data) => {
        const lines = data.toString().split('\n').filter(Boolean);
        entry.logs.push(...lines);
        if (entry.logs.length > 50) entry.logs = entry.logs.slice(-50);
    });

    child.on('exit', (code) => {
        console.log(`[Model Manager] ${modelName} on port ${port} exited with code ${code}`);
        runningModels.delete(port);
        // Notify renderer that model stopped
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('model-stopped', { port, modelName, code });
        }
    });

    child.on('error', (err) => {
        console.error(`[Model Manager] Failed to start ${modelName}:`, err);
        runningModels.delete(port);
    });

    runningModels.set(port, entry);

    return { success: true, port, pid: child.pid, modelName };
}

// ── Stop a model ──
function stopModel(port) {
    const entry = runningModels.get(port);
    if (!entry) {
        return { success: false, error: `No model running on port ${port}` };
    }

    try {
        // On Windows, use taskkill to forcefully kill the process tree
        spawn('taskkill', ['/pid', String(entry.process.pid), '/T', '/F'], { windowsHide: true });
        runningModels.delete(port);
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── Get running models info ──
function getRunningModels() {
    const result = [];
    for (const [port, entry] of runningModels) {
        result.push({
            port,
            modelName: entry.modelName,
            modelPath: entry.modelPath,
            pid: entry.pid,
            startedAt: entry.startedAt,
        });
    }
    return result;
}

// ── Register IPC handlers ──
function registerIpcHandlers() {
    ipcMain.handle('scan-models', async (_event, extraDirs) => {
        return scanModels(extraDirs || []);
    });

    ipcMain.handle('start-model', async (_event, modelPath, port) => {
        const actualPort = port || getNextPort();
        return startModel(modelPath, actualPort);
    });

    ipcMain.handle('stop-model', async (_event, port) => {
        return stopModel(port);
    });

    ipcMain.handle('check-model-status', async (_event, port) => {
        return checkHealth(port);
    });

    ipcMain.handle('get-running-models', async () => {
        return getRunningModels();
    });

    ipcMain.handle('get-next-port', async () => {
        return getNextPort();
    });
}

// ── Create window ──
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 900,
        minHeight: 600,
        backgroundColor: '#020617',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
        titleBarStyle: 'default',
        autoHideMenuBar: true,
        icon: path.join(__dirname, '../public/favicon.ico'),
        title: 'AUTOPLAY',
        show: false,
    });

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    const startUrl = isDev
        ? 'http://localhost:5173'
        : `file://${path.join(__dirname, '../dist/index.html')}`;

    mainWindow.loadURL(startUrl);
}

app.whenReady().then(() => {
    registerIpcHandlers();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    // Kill all running models when app closes
    for (const [port] of runningModels) {
        stopModel(port);
    }
    if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
    for (const [port] of runningModels) {
        stopModel(port);
    }
});
