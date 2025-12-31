import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios.js'
import PageHeader from '../ui/PageHeader.jsx'

export default function Expenses() {
  const [expenses, setExpenses] = useState([])
  const [methods, setMethods] = useState([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(8)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const fetchExpenses = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/expenses')
      setExpenses(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err?.response?.data ?? 'Unable to load expenses.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExpenses()
    api
      .get('/payment-methods')
      .then(({ data }) => setMethods(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  const getMethodName = (methodId) => {
    const method = methods.find((entry) => entry.id === Number(methodId))
    return method?.name ?? '-'
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return expenses
    return expenses.filter((expense) => {
      return expense.description?.toLowerCase().includes(term) || expense.notes?.toLowerCase().includes(term)
    })
  }, [search, expenses])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div>
      <PageHeader
        eyebrow="Expenses"
        title="Operational expenses"
        description="Track utilities, maintenance, and supplier invoices."
        actions={
          <button
            onClick={() => navigate('/expenses/new')}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Add expense
          </button>
        }
      />

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by description or notes..."
          className="h-10 w-full max-w-sm rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        />
        <div className="text-sm text-slate-500">{filtered.length} expenses</div>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {String(error)}
        </div>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-sm text-slate-500" colSpan={5}>
                  Loading expenses...
                </td>
              </tr>
            ) : paged.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-sm text-slate-500" colSpan={5}>
                  No expenses found.
                </td>
              </tr>
            ) : (
              paged.map((expense) => (
                <tr key={expense.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-4 text-slate-900">{expense.description}</td>
                  <td className="px-4 py-4 text-slate-500">{getMethodName(expense.paymentMethodId)}</td>
                  <td className="px-4 py-4 text-slate-600">${expense.amountUsd}</td>
                  <td className="px-4 py-4 text-slate-500">{expense.expenseDateUtc}</td>
                  <td className="px-4 py-4 text-slate-500">{expense.notes ?? '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
        <button
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
          disabled={page === 1}
        >
          Prev
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
          disabled={page === totalPages}
        >
          Next
        </button>
      </div>
    </div>
  )
}
