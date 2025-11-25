import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TitleBar } from './TitleBar'

export function AppLayout() {
  return (
    <div className="flex flex-col h-screen w-full bg-white dark:bg-gray-950 overflow-hidden">
      <TitleBar />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 h-full overflow-hidden bg-white dark:bg-gray-950 relative">
          <Outlet />
        </main>
      </div>
    </div>
  )
}