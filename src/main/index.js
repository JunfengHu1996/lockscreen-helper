import { app, shell, BrowserWindow, ipcMain, screen } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import icon from '../../resources/icon.png?asset';
import { exec } from 'child_process';

function createWindow() {
  // 获取主屏幕尺寸
  const primaryDisplay = screen.getPrimaryDisplay();
  const { height } = primaryDisplay.workAreaSize;
  
  // 创建浏览器窗口
  const mainWindow = new BrowserWindow({
    width: 500,
    height: Math.floor(height * 0.9), // 设置为屏幕高度的80%
    show: false,
    autoHideMenuBar: true,
    resizable: false,
    center: true,
    title: '定时锁屏',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // 基于 electron-vite cli 的渲染器热更新
  // 开发环境加载远程 URL，生产环境加载本地 HTML 文件
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

// 此方法将在 Electron 完成初始化并准备好创建浏览器窗口时调用
// 某些 API 只能在此事件发生后使用
app.whenReady().then(() => {
  // 设置 Windows 应用用户模型 ID
  electronApp.setAppUserModelId('com.electron');

  // 默认在开发环境中按 F12 打开或关闭开发者工具
  // 在生产环境中忽略 CommandOrControl + R
  // 请参阅 https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // IPC 测试
  ipcMain.on('ping', () => console.log('pong'));

  // 存储定时器ID，以便可以取消
  let lockTimerIds = new Map();

  // 监听 start-lock-timer 事件
  ipcMain.on('start-lock-timer', (event, lockTime) => {
    console.log(`接收到锁屏请求，将在 ${lockTime} 秒后锁定屏幕`);
    
    // 清除之前的定时器（如果有）
    if (lockTimerIds.has(event.sender.id)) {
      clearTimeout(lockTimerIds.get(event.sender.id));
    }
    
    // 设置新的定时器
    const timerId = setTimeout(() => {
      if (process.platform === 'win32') {
        exec('rundll32.exe user32.dll,LockWorkStation', (error, stdout, stderr) => {
          if (error) {
            console.error(`执行锁屏命令时出错: ${error.message}`);
            event.reply('lock-screen-result', { success: false, error: error.message });
            return;
          }
          if (stderr) {
            console.error(`执行锁屏命令时出现错误输出: ${stderr}`);
            event.reply('lock-screen-result', { success: false, error: stderr });
            return;
          }
          console.log('屏幕已锁定');
          event.reply('lock-screen-result', { success: true });
        });
      } else {
        console.log('非 Windows 系统，无法执行锁屏命令');
        event.reply('lock-screen-result', { success: false, error: '非 Windows 系统，无法执行锁屏命令' });
      }
      
      // 定时器执行后从Map中移除
      lockTimerIds.delete(event.sender.id);
    }, lockTime * 1000);
    
    // 存储定时器ID
    lockTimerIds.set(event.sender.id, timerId);
  });
  
  // 监听取消锁屏计时事件
  ipcMain.on('cancel-lock-timer', (event) => {
    if (lockTimerIds.has(event.sender.id)) {
      clearTimeout(lockTimerIds.get(event.sender.id));
      lockTimerIds.delete(event.sender.id);
      console.log('锁屏计时已取消');
      event.reply('lock-screen-result', { success: false, error: '用户已取消锁屏' });
    }
  });

  createWindow();

  app.on('activate', function () {
    // 在 macOS 上，当点击应用程序的停靠图标且没有其他窗口打开时，通常会重新创建一个窗口
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// 当所有窗口关闭时退出应用程序，除非是在 macOS 上。在 macOS 上，应用程序及其菜单栏通常会保持活动状态，直到用户明确使用 Cmd + Q 退出
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 你可以在这个文件中包含应用程序主进程的其余特定代码
// 也可以将它们放在单独的文件中并在此处引入