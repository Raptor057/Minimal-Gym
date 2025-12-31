import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import AppLayout from '../layouts/AppLayout.jsx'
import AuthLayout from '../layouts/AuthLayout.jsx'
import Dashboard from '../pages/Dashboard.jsx'
import Members from '../pages/Members.jsx'
import MembersEditor from '../pages/MembersEditor.jsx'
import Users from '../pages/Users.jsx'
import MembershipPlans from '../pages/MembershipPlans.jsx'
import Subscriptions from '../pages/Subscriptions.jsx'
import Payments from '../pages/Payments.jsx'
import PaymentsEditor from '../pages/PaymentsEditor.jsx'
import PaymentMethods from '../pages/PaymentMethods.jsx'
import Products from '../pages/Products.jsx'
import ProductsEditor from '../pages/ProductsEditor.jsx'
import Inventory from '../pages/Inventory.jsx'
import Sales from '../pages/Sales.jsx'
import Cash from '../pages/Cash.jsx'
import Reports from '../pages/Reports.jsx'
import Audit from '../pages/Audit.jsx'
import CheckIns from '../pages/CheckIns.jsx'
import Expenses from '../pages/Expenses.jsx'
import ExpensesEditor from '../pages/ExpensesEditor.jsx'
import Config from '../pages/Config.jsx'
import Health from '../pages/Health.jsx'
import PublicCheckIn from '../pages/PublicCheckIn.jsx'
import Login from '../pages/Login.jsx'
import { isAdminRole } from '../utils/auth.js'

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/checkin" element={<PublicCheckIn />} />
        </Route>
        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route element={<RequireAdmin />}>
              <Route path="/users" element={<Users />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/audit" element={<Audit />} />
              <Route path="/config" element={<Config />} />
              <Route path="/health" element={<Health />} />
            </Route>
            <Route path="/members" element={<Members />} />
            <Route path="/members/new" element={<MembersEditor />} />
            <Route path="/members/:id" element={<MembersEditor />} />
            <Route path="/membership-plans" element={<MembershipPlans />} />
            <Route path="/subscriptions" element={<Subscriptions />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/payments/new" element={<PaymentsEditor />} />
            <Route path="/payment-methods" element={<PaymentMethods />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/new" element={<ProductsEditor />} />
            <Route path="/products/:id" element={<ProductsEditor />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/cash" element={<Cash />} />
            <Route path="/checkins" element={<CheckIns />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/expenses/new" element={<ExpensesEditor />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

function RequireAuth() {
  const token = localStorage.getItem('access_token')
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}

function RequireAdmin() {
  const token = localStorage.getItem('access_token')
  if (!token) {
    return <Navigate to="/login" replace />
  }
  if (!isAdminRole()) {
    return <Navigate to="/dashboard" replace />
  }
  return <Outlet />
}
