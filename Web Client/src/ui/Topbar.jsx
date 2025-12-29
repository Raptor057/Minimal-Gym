import { useLocation, useNavigate } from 'react-router-dom'
import api from '../api/axios.js'

const titles = {
  '/dashboard': 'Dashboard',
  '/members': 'Members',
  '/membership-plans': 'Membership Plans',
  '/subscriptions': 'Subscriptions',
  '/payments': 'Payments',
  '/payment-methods': 'Payment Methods',
  '/checkins': 'Check-ins',
  '/products': 'Products',
  '/inventory': 'Inventory',
  '/sales': 'Sales',
  '/cash': 'Cash Register',
  '/expenses': 'Expenses',
  '/config': 'Configuration',
  '/health': 'Health',
  '/reports': 'Reports',
  '/audit': 'Audit Log',
}

export default function Topbar() {
  const { pathname } = useLocation()
  const title = titles[pathname] ?? 'Team Beauty Brownsville'
  const navigate = useNavigate()

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refresh_token')
    try {
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken })
      }
    } catch {
      // Ignore logout errors and clear local state.
    } finally {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      navigate('/login')
    }
  }

  return (
    <div className="sticky top-0 z-30 flex items-center gap-4 border-b border-slate-200/70 bg-white/80 px-6 py-4 backdrop-blur lg:px-10">
      <div className="flex-1">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Minimal Gym</p>
        <h1 className="font-display text-2xl text-slate-900">{title}</h1>
      </div>
      <div className="hidden items-center gap-3 md:flex">
        <input
          placeholder="Search members, payments..."
          className="h-10 w-56 rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-600 shadow-inner shadow-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        />
        <button className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-500/30">
          New action
        </button>
        <button
          onClick={handleLogout}
          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
        >
          Logout
        </button>
      </div>
    </div>
  )
}
