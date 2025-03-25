import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';

// 自定义渲染器 API
const api = {
  send: (channel, ...args) => ipcRenderer.send(channel, ...args),
  on: (channel, callback) => {
    const subscription = (_event, ...args) => callback(...args);
    ipcRenderer.on(channel, subscription);
    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  },
  off: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  },
  // 添加一个新方法来获取保存的定时设置
  getSavedSchedules: () => ipcRenderer.invoke('get-saved-schedules'),
  // 获取最后锁屏时间
  getLastLockTime: () => ipcRenderer.send('get-last-lock-time')
};

// 使用 `contextBridge` API 将 Electron API 暴露给渲染器
// 仅在启用上下文隔离时使用，否则直接添加到 DOM 全局变量中
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('api', api);
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = electronAPI;
  window.api = api;
}