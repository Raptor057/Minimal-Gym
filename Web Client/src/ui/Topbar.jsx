import { useLocation, useNavigate } from 'react-router-dom'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import {
  ChevronDownIcon,
  CreditCardIcon,
  CurrencyDollarIcon,
  PlusCircleIcon,
  ReceiptPercentIcon,
  UserPlusIcon,
} from '@heroicons/react/20/solid'
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
        <h1 className="font-display text-2xl text-slate-900">{title}</h1>
      </div>
      <div className="hidden items-center gap-3 md:flex">
        <Menu as="div" className="relative inline-block text-left">
          <MenuButton className="inline-flex items-center gap-x-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-500/30">
            New action
            <ChevronDownIcon aria-hidden="true" className="size-4 text-white/80" />
          </MenuButton>
          <MenuItems className="absolute right-0 z-10 mt-2 w-56 origin-top-right divide-y divide-slate-100 rounded-xl bg-white shadow-lg outline-1 outline-black/5">
            <div className="py-1">
              <MenuItem>
                <button
                  type="button"
                  onClick={() => navigate('/members/new')}
                  className="group flex w-full items-center px-4 py-2 text-sm text-slate-700 data-focus:bg-slate-100 data-focus:text-slate-900"
                >
                  <UserPlusIcon
                    aria-hidden="true"
                    className="mr-3 size-5 text-slate-400 group-data-focus:text-slate-500"
                  />
                  New member
                </button>
              </MenuItem>
              <MenuItem>
                <button
                  type="button"
                  onClick={() => navigate('/sales?new=1')}
                  className="group flex w-full items-center px-4 py-2 text-sm text-slate-700 data-focus:bg-slate-100 data-focus:text-slate-900"
                >
                  <ReceiptPercentIcon
                    aria-hidden="true"
                    className="mr-3 size-5 text-slate-400 group-data-focus:text-slate-500"
                  />
                  New sale
                </button>
              </MenuItem>
              <MenuItem>
                <button
                  type="button"
                  onClick={() => navigate('/payments/new')}
                  className="group flex w-full items-center px-4 py-2 text-sm text-slate-700 data-focus:bg-slate-100 data-focus:text-slate-900"
                >
                  <CreditCardIcon
                    aria-hidden="true"
                    className="mr-3 size-5 text-slate-400 group-data-focus:text-slate-500"
                  />
                  Record payment
                </button>
              </MenuItem>
            </div>
            <div className="py-1">
              <MenuItem>
                <button
                  type="button"
                  onClick={() => navigate('/expenses/new')}
                  className="group flex w-full items-center px-4 py-2 text-sm text-slate-700 data-focus:bg-slate-100 data-focus:text-slate-900"
                >
                  <CurrencyDollarIcon
                    aria-hidden="true"
                    className="mr-3 size-5 text-slate-400 group-data-focus:text-slate-500"
                  />
                  Add expense
                </button>
              </MenuItem>
              <MenuItem>
                <button
                  type="button"
                  onClick={() => navigate('/cash?new=1')}
                  className="group flex w-full items-center px-4 py-2 text-sm text-slate-700 data-focus:bg-slate-100 data-focus:text-slate-900"
                >
                  <PlusCircleIcon
                    aria-hidden="true"
                    className="mr-3 size-5 text-slate-400 group-data-focus:text-slate-500"
                  />
                  Open cash
                </button>
              </MenuItem>
            </div>
          </MenuItems>
        </Menu>
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
