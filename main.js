const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 400,
    height: 400,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    resizable: true,
    title: 'Pomodoro Timer',
    icon: path.join(__dirname, 'assets/icon.ico'),
    autoHideMenuBar: true,
    show: false,
    minWidth: 240,
    minHeight: 220,
    alwaysOnTop: true
  });

  mainWindow.loadFile('index.html');
  
  // Mostrar la ventana cuando esté lista
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
  
  // Abrir las herramientas de desarrollador en modo desarrollo
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

// Escuchar eventos de redimensionamiento desde el renderer
ipcMain.on('resize-window', (event, { width, height }) => {
  console.log(`Recibido mensaje para redimensionar a ${width}x${height}`);
  const window = BrowserWindow.fromWebContents(event.sender);
  if (window) {
    // Usar setContentSize que es más confiable para redimensionamiento
    window.setContentSize(width, height);
    
    // Centrar la ventana después del redimensionamiento
    window.center();
    
    console.log('Ventana redimensionada correctamente');
  } else {
    console.log('No se pudo obtener la ventana');
  }
});

// Eliminar el menú por defecto
Menu.setApplicationMenu(null);

app.whenReady().then(createWindow);

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