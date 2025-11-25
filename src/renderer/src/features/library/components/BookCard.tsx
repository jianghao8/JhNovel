import React from 'react'
import { Book } from '../../../types'
import { Book as BookIcon, Trash2 } from 'lucide-react'

interface BookCardProps {
  book: Book
  onDelete: (id: string) => void
  onOpen: (book: Book) => void
}

export function BookCard({ book, onDelete, onOpen }: BookCardProps) {
  // 格式化文件大小
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  return (
    <div 
      className="group relative flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer overflow-hidden h-full"
      onClick={() => onOpen(book)}
    >
      {/* 封面区域 */}
      <div className="h-40 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center relative">
        <BookIcon className="w-12 h-12 text-blue-200 dark:text-gray-400" />
        
        {/* 格式标签 */}
        <span className="absolute top-2 right-2 px-2 py-0.5 text-[10px] font-bold uppercase bg-black/20 text-white backdrop-blur-sm rounded">
          {book.format}
        </span>
      </div>

      {/* 信息区域 */}
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-bold text-gray-800 dark:text-gray-100 line-clamp-2 mb-1 leading-snug" title={book.title}>
          {book.title}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{book.author}</p>
        
        {/* 底部元数据 */}
        <div className="mt-auto flex justify-between items-center text-xs text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-2">
          <span>{formatSize(book.size)}</span>
          <span>{book.progress}%</span>
        </div>
      </div>

      {/* 悬浮操作菜单 (删除按钮) */}
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onDelete(book.id);
        }}
        className="absolute bottom-3 right-3 p-2 bg-red-50 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 shadow-sm"
        title="移除书籍"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}