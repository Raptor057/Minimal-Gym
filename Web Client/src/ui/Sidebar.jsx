import { NavLink } from 'react-router-dom'
import Logo from './Logo.jsx'
import { adminNavigation, operationsNavigation, primaryNavigation } from '../data/navigation.js'
import { getAuthUserName, isAdminRole } from '../utils/auth.js'

const baseLink =
  'group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition'

function SidebarSection({ title, items }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{title}</div>
      <div className="mt-3 space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `${baseLink} ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                  : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'
              }`
            }
          >
            <span className="h-2 w-2 rounded-full bg-current opacity-40" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </div>
  )
}

export default function Sidebar() {
  const userName = getAuthUserName()
  const isAdmin = isAdminRole()
  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
      <div className="flex grow flex-col gap-10 overflow-y-auto border-r border-slate-200/60 bg-white/80 px-6 py-10 backdrop-blur">
        <Logo />
        {userName ? (
          <div className="rounded-2xl border border-slate-200/70 bg-slate-50 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Bienvenido</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{userName}</div>
          </div>
        ) : null}
        <SidebarSection title="Core" items={primaryNavigation} />
        <SidebarSection title="Operations" items={operationsNavigation} />
        {isAdmin ? <SidebarSection title="Admin" items={adminNavigation} /> : null}
        <div className="mt-auto rounded-xl border border-slate-200/80 bg-slate-50 px-4 py-3 text-xs text-slate-500">
          API status: <span className="font-semibold text-emerald-600">ready</span>
        </div>
      </div>
    </aside>
  )
}
