import { Outlet } from 'react-router-dom'
import Sidebar from '../ui/Sidebar.jsx'
import Topbar from '../ui/Topbar.jsx'

export default function AppLayout() {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-72">
        <Topbar />
        <main className="px-6 pb-16 pt-6 lg:px-10">
          <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-6 shadow-sm backdrop-blur">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
