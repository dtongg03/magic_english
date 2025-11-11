import { app, BrowserWindow, nativeTheme, nativeImage, ipcMain, screen, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerIpcHandlers } from './ipcHandlers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = process.env.NODE_ENV === 'development';

// Set application name and ID for Windows
if (process.platform === 'win32') {
  app.setAppUserModelId('com.alphatitan.magicenglish');
}
app.name = 'Magic English';

let mainWindow;
let magicSearchWindow;

async function createWindow() {
  // Load icon with multiple size fallbacks for Windows
  const isWindows = process.platform === 'win32';
  let windowIcon = null;
  
  // Try loading different icon sizes for best compatibility
  const iconSizes = [256, 128, 64, 48, 32, 16];
  const iconPaths = isWindows 
    ? [
        path.join(__dirname, '../static/icon.ico'),
        ...iconSizes.map(size => path.join(__dirname, `../static/icon-${size}.png`)),
        path.join(__dirname, '../static/icon.png'),
        path.join(__dirname, '../static/logo.png')
      ]
    : [
        ...iconSizes.map(size => path.join(__dirname, `../static/icon-${size}.png`)),
        path.join(__dirname, '../static/icon.png'),
        path.join(__dirname, '../static/logo.png')
      ];
  
  // Try each path until we find a valid icon
  for (const iconPath of iconPaths) {
    try {
      const testIcon = nativeImage.createFromPath(iconPath);
      if (!testIcon.isEmpty()) {
        windowIcon = testIcon;
        break;
      }
    } catch (err) {
      // Continue to next path
    }
  }
  
  // If we found an icon, resize it to multiple sizes for Windows
  if (windowIcon && !windowIcon.isEmpty() && isWindows) {
    windowIcon = windowIcon.resize({ width: 256, height: 256, quality: 'best' });
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0f0f10' : '#f3f4f6',
    autoHideMenuBar: true,
    show: false,
    frame: false,
    titleBarOverlay: {
      color: nativeTheme.shouldUseDarkColors ? '#000000' : '#fafafa',
      symbolColor: nativeTheme.shouldUseDarkColors ? '#ffffff' : '#111111',
      height: 48
    },
    icon: windowIcon && !windowIcon.isEmpty() ? windowIcon : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });

  try {
    await registerIpcHandlers(mainWindow);
  } catch (error) {
    if (isDev) {
      console.error('[Main] Failed to register IPC handlers:', error);
    }
    // Continue anyway - some handlers might still work
  }

  // Prevent navigation to external URLs (security)
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const parsedUrl = new URL(url);
    const appUrl = mainWindow.webContents.getURL();
    const appUrlParsed = new URL(appUrl);
    
    // Allow navigation within the same origin (for HMR in dev)
    if (parsedUrl.origin === appUrlParsed.origin) {
      return;
    }
    
    // Block all other navigation
    event.preventDefault();
    if (isDev) {
      console.log('[Main] Blocked navigation to:', url);
    }
  });

  // Block new window creation (security)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Open external links in default browser instead
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url).catch(err => {
        if (isDev) {
          console.error('[Main] Failed to open external URL:', err);
        }
      });
    }
    return { action: 'deny' };
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    if (isDev) {
      mainWindow?.webContents.openDevTools({ mode: 'detach' });
    }
  });

  // Clean up magic search window when main window closes
  mainWindow.on('close', () => {
    if (magicSearchWindow && !magicSearchWindow.isDestroyed()) {
      magicSearchWindow.close();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    // Force close magic search if still open
    if (magicSearchWindow && !magicSearchWindow.isDestroyed()) {
      magicSearchWindow.destroy();
      magicSearchWindow = null;
    }
  });

  const rendererPath = path.join(__dirname, '../src/renderer/index.html');
  await mainWindow.loadFile(rendererPath);
}

// Create Magic Search floating window
function createMagicSearchWindow() {
  if (magicSearchWindow) {
    magicSearchWindow.show();
    magicSearchWindow.focus();
    return;
  }

  // Get cursor position to show window near cursor
  const cursorPosition = screen.getCursorScreenPoint();
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  // Calculate position (centered horizontally, near top)
  const windowWidth = 600;
  const windowHeight = 100; // Start compact
  const x = Math.max(0, Math.min(cursorPosition.x - windowWidth / 2, screenWidth - windowWidth));
  const y = Math.max(50, Math.min(cursorPosition.y - 100, screenHeight - windowHeight - 50));

  // Use same icon loading logic as main window
  let magicIcon = null;
  
  // Try loading different icon sizes for best compatibility
  const iconSizes = [256, 128, 64, 48, 32, 16];
  const isWindows = process.platform === 'win32';
  const iconPaths = isWindows 
    ? [
        path.join(__dirname, '../static/icon.ico'),
        ...iconSizes.map(size => path.join(__dirname, `../static/icon-${size}.png`)),
        path.join(__dirname, '../static/icon.png'),
        path.join(__dirname, '../static/logo.png')
      ]
    : [
        ...iconSizes.map(size => path.join(__dirname, `../static/icon-${size}.png`)),
        path.join(__dirname, '../static/icon.png'),
        path.join(__dirname, '../static/logo.png')
      ];
  
  // Try each path until we find a valid icon
  for (const iconPath of iconPaths) {
    try {
      const testIcon = nativeImage.createFromPath(iconPath);
      if (!testIcon.isEmpty()) {
        magicIcon = testIcon;
        break;
      }
    } catch (err) {
      // Continue to next path
    }
  }
  
  // If we found an icon, resize it for Windows
  if (magicIcon && !magicIcon.isEmpty() && isWindows) {
    magicIcon = magicIcon.resize({ width: 256, height: 256, quality: 'best' });
  }

  magicSearchWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    minHeight: 100,
    maxHeight: 800,
    x: x,
    y: y,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    icon: magicIcon && !magicIcon.isEmpty() ? magicIcon : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  const magicSearchPath = path.join(__dirname, '../src/magic-search/magic-search.html');
  magicSearchWindow.loadFile(magicSearchPath);

  // Security: Prevent navigation and new windows for magic search too
  magicSearchWindow.webContents.on('will-navigate', (event, url) => {
    event.preventDefault();
    if (isDev) {
      console.log('[MagicSearch] Blocked navigation to:', url);
    }
  });

  magicSearchWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url).catch(err => {
        if (isDev) {
          console.error('[MagicSearch] Failed to open external URL:', err);
        }
      });
    }
    return { action: 'deny' };
  });

  magicSearchWindow.once('ready-to-show', () => {
    magicSearchWindow.show();
    magicSearchWindow.focus();
    
    // Sync current theme from main window
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.executeJavaScript('document.body.dataset.theme')
        .then(theme => {
          if (theme && magicSearchWindow && !magicSearchWindow.isDestroyed()) {
            magicSearchWindow.webContents.send('theme-changed', theme);
          }
        })
        .catch(() => {
          // Ignore if main window is not ready
        });
    }
  });

  magicSearchWindow.on('blur', () => {
    // Optional: auto-hide when losing focus
    // magicSearchWindow.hide();
  });

  magicSearchWindow.on('closed', () => {
    magicSearchWindow = null;
  });

  // Only log console messages in development
  if (isDev) {
    magicSearchWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
      console.log(`[Magic Search Console] ${message} (${sourceId}:${line})`);
    });
  }

  // Open DevTools in development mode
  if (isDev) {
    magicSearchWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

// IPC handlers for Magic Search
ipcMain.handle('magic-search:open', () => {
  createMagicSearchWindow();
});

ipcMain.handle('magic-search:close', () => {
  if (magicSearchWindow) {
    magicSearchWindow.close();
  }
});

ipcMain.handle('magic-search:toggle', () => {
  if (magicSearchWindow && magicSearchWindow.isVisible()) {
    magicSearchWindow.close();
  } else {
    createMagicSearchWindow();
  }
});

ipcMain.handle('magic-search:get-bounds', () => {
  if (magicSearchWindow) {
    return magicSearchWindow.getBounds();
  }
  return null;
});

ipcMain.handle('magic-search:set-bounds', (event, bounds) => {
  if (magicSearchWindow) {
    magicSearchWindow.setBounds(bounds, true); // animate = true
  }
});

// Sync theme to magic search window
ipcMain.handle('magic-search:sync-theme', (event, theme) => {
  if (magicSearchWindow && !magicSearchWindow.isDestroyed()) {
    magicSearchWindow.webContents.send('theme-changed', theme);
  }
});

app.setName('Magic English');

app.whenReady().then(async () => {
  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Clean up magic search window before quitting
  if (magicSearchWindow && !magicSearchWindow.isDestroyed()) {
    magicSearchWindow.destroy();
    magicSearchWindow = null;
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Force cleanup before quit
app.on('before-quit', () => {
  if (magicSearchWindow && !magicSearchWindow.isDestroyed()) {
    magicSearchWindow.destroy();
    magicSearchWindow = null;
  }
});

