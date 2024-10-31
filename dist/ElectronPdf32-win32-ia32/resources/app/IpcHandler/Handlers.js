const { app, ipcMain, dialog, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

let store;
let mainWindow;

async function initializeStore() {
    const Store = (await import('electron-store')).default;
    store = new Store();
    
}

function setupIpcHandlers(window) {
    mainWindow = window;

    ipcMain.on('viewpdf', (event, filePath) => {
        const pdfWindow = new BrowserWindow({
            width: 1200,
            height: 600,
            parent: mainWindow,
            modal: true,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
            },
        });
        pdfWindow.setMenu(null);
        pdfWindow.loadURL(`file://${filePath}`);
    });

    ipcMain.handle('SelectFolder', async () => {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory'],
        });
        if (!result.canceled) {
            const selectedFolder = result.filePaths[0];
            store.set('defaultDirectory', selectedFolder);
            return selectedFolder;
        }
        return null;
    });

    ipcMain.handle('GetdefaultDiretory', () => {
        return store ? store.get('defaultDirectory', app.getPath('documents')) : app.getPath('documents');
    });

    ipcMain.handle('GetPDF', async (event, directory) => {
        if (!directory) {
            return [];
        }
        try {
            const files = fs.readdirSync(directory).filter(file => file.endsWith('.pdf'));
            return files.map(file => {
                const filePath = path.join(directory, file);
                const stats = fs.statSync(filePath);
                return {
                    name: file,
                    path: filePath,
                    mtime: stats.mtime,
                    size: stats.size,
                };
            });
        } catch (error) {
            console.error('Error reading PDF files:', error);
            return [];
        }
    });

    ipcMain.handle('SaveModal', async (event, defaultDirectory) => {
        const result = await dialog.showSaveDialog({
            title: 'Salvar PDF Mesclado',
            defaultPath: path.join(defaultDirectory, ''),
            filters: [{ name: 'PDF', extensions: ['pdf'] }],
        });
        return result.canceled ? null : result.filePath;
    });
}

module.exports = { initializeStore, setupIpcHandlers };
