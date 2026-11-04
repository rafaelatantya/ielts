import React from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { useApp } from '../../context/AppContext'

export const AppShell: React.FC = () => {
  const { focusMode } = useApp()

  return (
    <div className="min-h-screen bg-neutral text-primary flex">
      {/* Editorial Sidebar */}
      <Sidebar collapsed={focusMode} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1360px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
