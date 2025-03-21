import { app, shell, BrowserWindow, ipcMain, screen, Tray, Menu } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import icon from '../../resources/icon.png?asset';
import { exec } from 'child_process';
import Store from 'electron-store';

// 创建一个新的 Store 实例
const store = new Store();

// 声明全局变量以保存托盘实例和主窗口引用
let tray = null;
let mainWindowRef = null;

function createWindow() {
  // 获取主屏幕尺寸
  const primaryDisplay = screen.getPrimaryDisplay();
  const { height } = primaryDisplay.workAreaSize;
  
  // 创建浏览器窗口
  mainWindowRef = new BrowserWindow({
    width: 500,
    height: Math.floor(height * 0.9), // 设置为屏幕高度的90%
    show: false,
    autoHideMenuBar: true,
    resizable: true, // 允许调整窗口大小
    minWidth: 600, // 最小宽度
    minHeight: 600, // 最小高度
    maxWidth: 800, // 最大宽度
    maxHeight: height, // 最大高度为屏幕高度的95%
    center: true,
    title: '锁屏小助手',
    icon: icon,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  });

  mainWindowRef.on('ready-to-show', () => {
    mainWindowRef.show();
  });

  // 创建系统托盘
  tray = new Tray(icon);
  tray.setToolTip('锁屏小助手');

  // 创建托盘菜单
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        mainWindowRef.show();
      }
    },
    {
      label: '退出',
      click: () => {
        app.quit();
      }
    }
  ]);

  // 设置托盘菜单
  tray.setContextMenu(contextMenu);

  // 点击托盘图标显示主窗口
  tray.on('click', () => {
    mainWindowRef.show();
  });

  // 处理窗口关闭按钮点击事件
  mainWindowRef.on('close', (event) => {
    // 如果不是要退出程序，则阻止默认行为
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindowRef.hide();
    }
  });

  mainWindowRef.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // 基于 electron-vite cli 的渲染器热更新
  // 开发环境加载远程 URL，生产环境加载本地 HTML 文件
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindowRef.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindowRef.loadFile(join(__dirname, '../renderer/index.html'));
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
  // 按模式存储定时器：{mode => {senderId => timers}}
let lockTimerIds = new Map([
    ['single', new Map()],
    ['multi', new Map()]
  ]);

  // 执行锁屏
  const lockScreen = (event) => {
    if (process.platform === 'win32') {
      exec('rundll32.exe user32.dll,LockWorkStation', (error, stdout, stderr) => {
        if (error) {
          console.error(`执行锁屏命令时出错: ${error.message}`);
          event.reply('lock-execution-result', { success: false, error: error.message });
          return;
        }
        if (stderr) {
          console.error(`执行锁屏命令时出现错误输出: ${stderr}`);
          event.reply('lock-execution-result', { success: false, error: stderr });
          return;
        }
        console.log('屏幕已锁定');
        event.reply('lock-execution-result', { success: true });
      });
    } else {
      console.log('非 Windows 系统，无法执行锁屏命令');
      event.reply('lock-execution-result', { success: false, error: '非 Windows 系统，无法执行锁屏命令' });
    }
  };

  // 监听 start-lock-timer 事件（单次定时）
  ipcMain.on('start-lock-timer', (event, lockTime) => {
    console.log(`接收到锁屏请求，将在 ${lockTime} 秒后锁定屏幕`);
    
    // 清除之前的定时器（如果有）
    if (lockTimerIds.has(event.sender.id)) {
      clearTimeout(lockTimerIds.get(event.sender.id));
    }
    
    // 记录开始时间，用于确保精确计时
    const startTime = Date.now();
    const targetTime = startTime + (lockTime * 1000);
    
    // 设置模式对应的新定时器
    const timerId = setTimeout(() => {
      console.log(`执行锁屏，计划时间：${lockTime}秒，实际延迟：${(Date.now() - startTime) / 1000}秒`);
      lockScreen(event);
      // 定时器执行后从Map中移除
      lockTimerIds.delete(event.sender.id);
    }, lockTime * 1000);
    
    // 存储定时器ID和目标时间
    lockTimerIds.set(event.sender.id, {
      id: timerId,
      targetTime: targetTime
    });
  });
  
  // 监听取消锁屏计时事件
  ipcMain.on('cancel-lock-timer', (event) => {
    if (lockTimerIds.has(event.sender.id)) {
      const timers = lockTimerIds.get(event.sender.id);
      if (Array.isArray(timers)) {
        timers.forEach(timer => {
          if (timer && timer.timeoutId) {
            clearTimeout(timer.timeoutId);
          }
        });
      } else if (timers) {
        // 处理新格式的计时器对象
        if (typeof timers === 'object' && timers.id) {
          clearTimeout(timers.id);
        } else {
          // 兼容旧格式
          clearTimeout(timers);
        }
      }
      lockTimerIds.delete(event.sender.id);
      console.log('锁屏计时已取消');
      // 不发送取消消息，因为这可能是由设置新的定时引起的
    }
  });

  // 处理获取保存的定时设置的请求
  ipcMain.handle('get-saved-schedules', () => {
    return store.get('multiSchedules', []);
  });

  // 监听多次定时设置事件
  ipcMain.on('set-multi-schedules', (event, { schedules, mode, isDelete, isSilent }) => {
    // 保存定时设置到 electron-store
    store.set('multiSchedules', schedules);
    if (!Array.isArray(schedules)) {
        return;
    }
    console.log('接收到多次定时设置:', schedules);

    try {
      // 验证并过滤定时设置，只接受正数时间
      const validSchedules = schedules.filter(schedule => {
        return Number.isFinite(schedule.time) && schedule.time > 0;
      });

      if (validSchedules.length === 0) {
        // 如果没有有效的定时设置，静默返回
        return;
      }

      // 清理当前模式对应的旧定时器
    if (lockTimerIds.has(mode)) {
      const oldTimers = lockTimerIds.get(mode).get(event.sender.id);
      if (Array.isArray(oldTimers)) {
        oldTimers.forEach(timer => clearTimeout(timer.timeoutId));
      }
      lockTimerIds.get(mode).delete(event.sender.id);
    }
      if (lockTimerIds.has(event.sender.id)) {
        const oldTimers = lockTimerIds.get(event.sender.id);
        if (Array.isArray(oldTimers)) {
          oldTimers.forEach(timer => {
            if (timer && timer.timeoutId) {
              clearTimeout(timer.timeoutId);
            }
          });
        } else if (oldTimers) {
          clearTimeout(oldTimers);
        }
      }

      // 设置模式对应的新定时器
      const newTimers = validSchedules.map(schedule => {
        const delayInSeconds = Math.floor(schedule.time/1000);
        console.log(`设置定时器，将在 ${delayInSeconds} 秒后锁定屏幕`);
        
        const timeoutId = setTimeout(() => {
          console.log(`执行定时锁屏，原计划时间：${delayInSeconds}秒`);
          lockScreen(event);
          
          // 定时器执行后，从数组中移除该定时器
          const timerArray = lockTimerIds.get(event.sender.id);
          if (Array.isArray(timerArray)) {
            const index = timerArray.findIndex(t => t.id === schedule.id);
            if (index > -1) {
              timerArray.splice(index, 1);
              
              // 更新存储的任务列表
              const savedSchedules = store.get('multiSchedules', []);
              // 只删除非每日执行的任务
              const targetSchedule = savedSchedules.find(s => s.id === schedule.id);
              if (targetSchedule && !targetSchedule.isDaily) {
                const updatedSchedules = savedSchedules.filter(s => s.id !== schedule.id);
                store.set('multiSchedules', updatedSchedules);
                
                // 通知渲染进程更新 UI
                event.reply('schedule-executed', { 
                  scheduleId: schedule.id,
                  updatedSchedules: updatedSchedules
                });
              } else if (targetSchedule && targetSchedule.isDaily) {
                // 对于每日任务，更新下次执行时间
                const scheduledTime = new Date(targetSchedule.scheduledTime);
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(scheduledTime.getHours());
                tomorrow.setMinutes(scheduledTime.getMinutes());
                tomorrow.setSeconds(0);
                tomorrow.setMilliseconds(0);
                
                const updatedSchedules = savedSchedules.map(s => 
                  s.id === schedule.id 
                    ? { ...s, scheduledTime: tomorrow.toISOString() }
                    : s
                );
                store.set('multiSchedules', updatedSchedules);
                
                // 通知渲染进程更新 UI，但不删除任务
                event.reply('schedule-executed', { 
                  scheduleId: schedule.id,
                  updatedSchedules: updatedSchedules,
                  isDaily: true
                });
              }
            }
          }
        }, schedule.time);

        return {
          id: schedule.id,
          timeoutId: timeoutId,
          scheduledTime: new Date(Date.now() + schedule.time)
        };
      });

      // 存储新的定时器信息
      lockTimerIds.set(event.sender.id, newTimers);

      // 只在非删除且非静默操作时发送成功响应
      if (!isDelete && !isSilent) {
        const message = validSchedules.length === 1 
          ? '已设置1个定时锁屏任务' 
          : `已设置 ${validSchedules.length} 个定时锁屏任务`;
        
        console.log(message);
        event.reply('multi-schedule-result', { 
          success: true, 
          message: message,
          fromMultiSchedule: true
        });
      }

    } catch (error) {
      console.error('设置定时器时出错:', error);
      event.reply('multi-schedule-result', { 
        success: false, 
        error: '设置定时器失败：' + error.message,
        fromMultiSchedule: true
      });
    }
  });

  // 在应用退出前清理所有定时器并销毁托盘图标
app.on('before-quit', () => {
  // 标记应用正在退出
  app.isQuitting = true;
  
  // 销毁托盘图标
  if (tray) {
    tray.destroy();
    tray = null;
  }
  
  // 清理所有定时器
  for (const [_, timers] of lockTimerIds) {
    if (Array.isArray(timers)) {
      timers.forEach(timer => {
        if (timer && timer.timeoutId) {
          clearTimeout(timer.timeoutId);
        } else if (timer && timer.id) {
          clearTimeout(timer.id);
        } else if (timer) {
          clearTimeout(timer);
        }
      });
    } else if (timers) {
      // 处理新格式的计时器对象
      if (typeof timers === 'object' && timers.id) {
        clearTimeout(timers.id);
      } else {
        // 兼容旧格式
        clearTimeout(timers);
      }
    }
  }
  lockTimerIds.clear();
});

  createWindow();

  // 从 electron-store 加载定时设置
  const savedSchedules = store.get('multiSchedules');
  if (savedSchedules) {
    console.log('从存储中加载定时设置:', savedSchedules);
    // 这里可以发送一个事件到渲染进程，通知它加载保存的定时设置
    BrowserWindow.getAllWindows()[0].webContents.send('load-saved-schedules', savedSchedules);
  }

  app.on('activate', function () {
    // 在 macOS 上，当点击应用程序的停靠图标且没有其他窗口打开时，通常会重新创建一个窗口
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
  else {
    // 如果窗口存在但是隐藏的，则显示窗口
    mainWindowRef.show();
  }
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