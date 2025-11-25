import { Minus, Square, X } from 'lucide-react'

export function TitleBar() {
  // 使用 window.electron 发送 IPC 消息
  const handleMin = () => (window as any).electron.ipcRenderer.send('window-min')
  const handleMax = () => (window as any).electron.ipcRenderer.send('window-max')
  const handleClose = () => (window as any).electron.ipcRenderer.send('window-close')

  return (
    <div className="h-10 w-full flex justify-between items-center bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 select-none z-50">
      {/* 左侧：Logo 或 标题 (可拖拽区域) */}
      <div className="flex-1 h-full dragging-region flex items-center px-4">
        <span className="text-sm font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          JhNovel
        </span>
      </div>

      {/* 右侧：窗口控制按钮 (不可拖拽) */}
      <div className="flex h-full no-drag">
        <button onClick={handleMin} className="w-12 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors flex items-center justify-center text-gray-500">
          <Minus className="w-4 h-4" />
        </button>
        <button onClick={handleMax} className="w-12 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors flex items-center justify-center text-gray-500">
          <Square className="w-3 h-3" />
        </button>
        <button onClick={handleClose} className="w-12 hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center text-gray-500">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}