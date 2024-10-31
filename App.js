const { app, BrowserWindow } = require('electron');
const path = require('path');
const { initializeStore, setupIpcHandlers } = require('./ipcHandler/Handlers');

let mainWindow; // Varíavel para armazenar ref à janela

async function createWindow() {
    await initializeStore();
    mainWindow = new BrowserWindow({
        width: 1366,
        height: 768,
        resizable: false,
        title: 'Junte PDFs',
        icon: path.join(__dirname, 'assets', 'icon.jpg'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    mainWindow.setMenu(null);
    mainWindow.loadFile('public/index.html');
    
    setupIpcHandlers(mainWindow);
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
