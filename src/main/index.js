import { app, shell, BrowserWindow, ipcMain, screen, Tray, Menu } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import icon from '../../resources/icon.png?asset';
import { exec } from 'child_process';
import { homedir } from 'os';
// 由于 electron-store 是 ES Module，使用动态导入
let store;
const initStore = async () => {
  try {
    const { default: Store } = await import('electron-store');
    store = new Store({
      clearInvalidConfig: true, // 清除无效的配置
      migrations: {
        // 添加迁移以处理可能的损坏数据
        '>=1.0.0': store => {
          // 重置可能损坏的数据
          if (typeof store.get('multiSchedules') !== 'undefined') {
            try {
              const schedules = store.get('multiSchedules');
              if (!Array.isArray(schedules)) {
                store.set('multiSchedules', []);
              }
            } catch (e) {
              store.set('multiSchedules', []);
            }
          }
          
          if (typeof store.get('lastLockTime') !== 'undefined') {
            try {
              const lastTime = store.get('lastLockTime');
              if (typeof lastTime !== 'string') {
                store.set('lastLockTime', null);
              }
            } catch (e) {
              store.set('lastLockTime', null);
            }
          }
        }
      }
    });
    console.log('electron-store 初始化成功');
    return store;
  } catch (error) {
    console.error('初始化 electron-store 时出错:', error);
    
    // 尝试删除可能已损坏的配置文件
    try {
      const fs = require('fs');
      const path = require('path');
      const { homedir } = require('os');
      const configPath = path.join(homedir(), '.screen-lock-assistant', 'config.json');
      
      if (fs.existsSync(configPath)) {
        console.log('尝试删除可能损坏的配置文件:', configPath);
        fs.unlinkSync(configPath);
        
        // 重新尝试初始化
        const { default: Store } = await import('electron-store');
        store = new Store();
        console.log('重新初始化 electron-store 成功');
        return store;
      }
    } catch (fsError) {
      console.error('尝试删除配置文件失败:', fsError);
    }
    
    // 如果所有尝试都失败，返回一个内存中的模拟存储
    return {
      get: (key, defaultValue) => defaultValue,
      set: () => {},
      has: () => false,
      delete: () => {},
      clear: () => {}
    };
  }
};

// 初始化存储
initStore().catch(err => console.error('初始化存储失败:', err));

// 确保应用程序只有一个实例
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // 当运行第二个实例时，将焦点放在第一个实例的窗口上
    if (mainWindowRef) {
      if (mainWindowRef.isMinimized()) {
        mainWindowRef.restore();
      }
      mainWindowRef.show();
      mainWindowRef.focus();
    }
  });
}

// 声明全局变量以保存托盘实例和主窗口引用
let tray = null;
let mainWindowRef = null;

function createWindow() {
  // 获取主屏幕尺寸
  const primaryDisplay = screen.getPrimaryDisplay();
  const { height } = primaryDisplay.workAreaSize;
  
  // 创建浏览器窗口
  mainWindowRef = new BrowserWindow({
    width: 600,
    height: 1000, 
    show: false,
    autoHideMenuBar: true,
    resizable: true, // 允许调整窗口大小
    minWidth: 600, // 最小宽度
    minHeight: 1000, // 增加最小高度以确保内容完全显示
    maxWidth: 800, // 最大宽度
    maxHeight: height, // 最大高度为屏幕高度
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

// 设置应用程序的用户数据和缓存目录
const userDataPath = join(homedir(), '.screen-lock-assistant');
app.setPath('userData', userDataPath);
app.setPath('cache', join(userDataPath, 'cache'));

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
        
        // 保存锁屏时间
      const lockTime = new Date().toISOString();
      if (store) {
        try {
          store.set('lastLockTime', lockTime);
        } catch (storeError) {
          console.error('保存锁屏时间时出错:', storeError);
          // 继续执行，即使保存失败
        }
      }
        
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
    
    // 清除之前的倒计时定时器（如果有）
    if (lockTimerIds.get('single').has(event.sender.id)) {
      const timer = lockTimerIds.get('single').get(event.sender.id);
      if (timer && timer.id) {
        clearTimeout(timer.id);
      }
    }
    
    // 计算目标时间（精确到毫秒）
    const targetTime = Date.now() + (lockTime * 1000);
    
    const scheduleNextTick = () => {
      const now = Date.now();
      if (now >= targetTime) {
        console.log(`执行锁屏，计划时间：${lockTime}秒，实际延迟：${(now - (targetTime - lockTime * 1000)) / 1000}秒`);
        lockScreen(event);
        lockTimerIds.get('single').delete(event.sender.id);
      } else {
        const remainingTime = targetTime - now;
        const nextTickTime = Math.min(remainingTime, 100); // 每100ms检查一次
        const timerId = setTimeout(scheduleNextTick, nextTickTime);
        lockTimerIds.get('single').set(event.sender.id, {
          id: timerId,
          targetTime: targetTime
        });
      }
    };
    
    scheduleNextTick();
  });
  
  // 监听取消锁屏计时事件
  ipcMain.on('cancel-lock-timer', (event, { mode = 'single' } = {}) => {
    // 根据模式选择对应的定时器集合
    const timersMap = lockTimerIds.get(mode);
    if (timersMap && timersMap.has(event.sender.id)) {
      const timers = timersMap.get(event.sender.id);
      if (Array.isArray(timers)) {
        // 多次定时模式
        timers.forEach(timer => {
          if (timer && timer.timeoutId) {
            clearTimeout(timer.timeoutId);
          }
        });
      } else if (timers) {
        // 单次定时模式
        if (typeof timers === 'object' && timers.id) {
          clearTimeout(timers.id);
        } else {
          clearTimeout(timers);
        }
      }
      timersMap.delete(event.sender.id);
      console.log(`${mode}模式的锁屏计时已取消`);
    }
  });

  // 处理获取保存的定时设置的请求
  ipcMain.handle('get-saved-schedules', async () => {
    try {
      // 确保 store 已经初始化
      if (!store) {
        store = await initStore();
      }
      return store.get('multiSchedules', []);
    } catch (error) {
      console.error('获取保存的定时设置时出错:', error);
      return [];
    }
  });
  
  // 处理获取最后锁屏时间的请求
  ipcMain.on('get-last-lock-time', async (event) => {
    try {
      // 确保 store 已经初始化
      if (!store) {
        store = await initStore();
      }
      const lastLockTime = store.get('lastLockTime', null);
      event.reply('last-lock-time', lastLockTime);
    } catch (error) {
      console.error('获取最后锁屏时间时出错:', error);
      event.reply('last-lock-time', null);
    }
  });

  // 监听多次定时设置事件
  ipcMain.on('set-multi-schedules', async (event, { schedules, mode, isDelete, isSilent }) => {
    try {
      // 确保 store 已经初始化
      if (!store) {
        store = await initStore();
      }

      // 检查schedules是否为数组
      if (!Array.isArray(schedules)) {
        throw new Error('定时设置必须是数组格式');
      }

      try {
        // 保存定时设置到 electron-store
        await store.set('multiSchedules', schedules);
        console.log('接收到多次定时设置:', schedules);
      } catch (storeError) {
        console.error('保存定时设置到 store 时出错:', storeError);
        // 如果保存失败，继续执行但不依赖存储
      }

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
        const modeTimers = lockTimerIds.get(mode);
        if (modeTimers.has(event.sender.id)) {
          const oldTimers = modeTimers.get(event.sender.id);
          if (Array.isArray(oldTimers)) {
            oldTimers.forEach(timer => {
              if (timer && timer.timeoutId) {
                clearTimeout(timer.timeoutId);
              }
            });
          }
          modeTimers.delete(event.sender.id);
        }
      }

      // 设置模式对应的新定时器
      const newTimers = await Promise.all(validSchedules.map(async schedule => {
        const targetTime = Date.now() + schedule.time;
        console.log(`设置定时器，将在 ${new Date(targetTime).toLocaleString()} 锁定屏幕`);
        
        const scheduleNextTick = () => {
          const now = Date.now();
          if (now >= targetTime) {
            console.log(`执行定时锁屏，计划时间：${new Date(targetTime).toLocaleString()}，实际时间：${new Date().toLocaleString()}`);
            lockScreen(event);
            
            // 定时器执行后，从数组中移除该定时器
            const timerArray = lockTimerIds.get(mode).get(event.sender.id);
            if (Array.isArray(timerArray)) {
              const index = timerArray.findIndex(t => t.id === schedule.id);
              if (index > -1) {
                timerArray.splice(index, 1);
                
                // 更新存储的任务列表
                const savedSchedules = store.get('multiSchedules', []);
                // 只删除非每日执行的任务
                const targetSchedule = savedSchedules.find(s => s.id === schedule.id);
                if (targetSchedule && !targetSchedule.isDaily) {
                  // 过滤掉已执行的单次任务和过期的单次任务
                  const now = new Date();
                  const updatedSchedules = savedSchedules.filter(s => {
                    if (s.id === schedule.id) return false; // 移除已执行的任务
                    if (!s.isDaily) {
                      // 对于其他单次任务，检查是否过期
                      const scheduleTime = new Date(s.scheduledTime);
                      return scheduleTime > now;
                    }
                    return true; // 保留所有每日任务
                  });
                  
                  store.set('multiSchedules', updatedSchedules);
                  
                  // 通知渲染进程更新 UI
                  event.reply('schedule-executed', { 
                    scheduleId: schedule.id,
                    updatedSchedules: updatedSchedules,
                    isDaily: false
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
          } else {
            const remainingTime = targetTime - now;
            const nextTickTime = Math.min(remainingTime, 100); // 每100ms检查一次
            const timeoutId = setTimeout(scheduleNextTick, nextTickTime);
            return {
              id: schedule.id,
              timeoutId: timeoutId,
              scheduledTime: new Date(targetTime)
            };
          }
        };
        
        return scheduleNextTick();
      }));

      // 存储新的定时器信息到对应模式下
      if (!lockTimerIds.get(mode)) {
        lockTimerIds.set(mode, new Map());
      }
      lockTimerIds.get(mode).set(event.sender.id, newTimers);

      // 根据操作类型发送适当的响应
      if (!isSilent) {
        let message;
        if (isDelete) {
          message = '已删除定时锁屏任务';
          console.log(message);
          event.reply('multi-schedule-result', { 
            success: true, 
            message: message,
            fromMultiSchedule: true,
            isDelete: true
          });
        } else {
          message = validSchedules.length === 1 
            ? '已设置1个定时锁屏任务' 
            : `已设置 ${validSchedules.length} 个定时锁屏任务`;
          
          console.log(message);
          event.reply('multi-schedule-result', { 
            success: true, 
            message: message,
            fromMultiSchedule: true
          });
        }
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
  for (const [_, modeTimers] of lockTimerIds) {
    for (const [__, timers] of modeTimers) {
      if (Array.isArray(timers)) {
        timers.forEach(timer => {
          if (timer && timer.timeoutId) {
            clearTimeout(timer.timeoutId);
          }
        });
      }
    }
  }
  lockTimerIds.clear();
});

  createWindow();

  // 从 electron-store 加载定时设置
  setTimeout(async () => {
    try {
      // 确保 store 已经初始化
      if (!store) {
        store = await initStore();
      }
      
      const savedSchedules = store.get('multiSchedules', []);
      if (Array.isArray(savedSchedules) && savedSchedules.length > 0) {
        console.log('从存储中加载定时设置:', savedSchedules);
        // 确保有可用的窗口
        const windows = BrowserWindow.getAllWindows();
        if (windows.length > 0) {
          windows[0].webContents.send('load-saved-schedules', savedSchedules);
        }
      } else {
        console.log('没有找到保存的定时设置或格式不正确');
      }
    } catch (error) {
      console.error('加载保存的定时设置时出错:', error);
    }
  }, 1500); // 给予足够的时间让 store 初始化

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