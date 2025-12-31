import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../api/axios.js'
import PageHeader from '../ui/PageHeader.jsx'
import EmptyPanel from '../ui/EmptyPanel.jsx'

const emptyOpen = { openingAmountUsd: '' }
const emptyMovement = { movementType: 'In', amountUsd: '', notes: '' }
const emptyClose = {
  cashTotalUsd: '',
  cardTotalUsd: '',
  transferTotalUsd: '',
  otherTotalUsd: '',
  countedCashUsd: '',
}

export default function Cash() {
  const [current, setCurrent] = useState(null)
  const [closures, setClosures] = useState([])
  const [movements, setMovements] = useState([])
  const [summary, setSummary] = useState(null)
  const [summaryModal, setSummaryModal] = useState(false)
  const [summaryDetails, setSummaryDetails] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [openModal, setOpenModal] = useState(false)
  const [movementModal, setMovementModal] = useState(false)
  const [closeModal, setCloseModal] = useState(false)
  const [openForm, setOpenForm] = useState(emptyOpen)
  const [movementForm, setMovementForm] = useState(emptyMovement)
  const [closeForm, setCloseForm] = useState(emptyClose)
  const [saving, setSaving] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const loadCurrent = async () => {
    try {
      const { data } = await api.get('/cash/current')
      setCurrent(data)
      const summaryData = await loadSummary()
      setSummary(summaryData)
    } catch (err) {
      if (err?.response?.status === 404) {
        setCurrent(null)
        setSummary(null)
        return
      }
      setError(err?.response?.data ?? 'Unable to load cash session.')
    }
  }

  const loadClosures = async () => {
    try {
      const { data } = await api.get('/cash/closures')
      setClosures(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err?.response?.data ?? 'Unable to load cash closures.')
    }
  }

  const loadMovements = async () => {
    try {
      const { data } = await api.get('/cash/movements')
      setMovements(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err?.response?.data ?? 'Unable to load cash movements.')
    }
  }

  const loadSummary = async (cashSessionId) => {
    try {
      const { data } = await api.get('/cash/summary', { params: cashSessionId ? { cashSessionId } : {} })
      return data
    } catch {
      return null
    }
  }

  useEffect(() => {
    setLoading(true)
    setError('')
    Promise.all([loadCurrent(), loadClosures(), loadMovements()]).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('new') === '1') {
      openCash()
      navigate(location.pathname, { replace: true })
    }
  }, [location.pathname, location.search, navigate])

  const openCash = () => {
    setOpenForm(emptyOpen)
    setOpenModal(true)
  }

  const closeCashModal = () => {
    setOpenModal(false)
    const params = new URLSearchParams(location.search)
    if (params.has('new')) {
      params.delete('new')
      const next = params.toString()
      navigate(next ? `${location.pathname}?${next}` : location.pathname, { replace: true })
    }
  }
  const closeMovementModal = () => setMovementModal(false)
  const closeCloseModal = () => setCloseModal(false)

  const openSummary = async (sessionId) => {
    setSummaryModal(true)
    setSummaryDetails(null)
    const data = await loadSummary(sessionId)
    setSummaryDetails(data)
  }

  const closeSummary = () => {
    setSummaryModal(false)
    setSummaryDetails(null)
  }

  const handleOpenSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const amount = Number(openForm.openingAmountUsd || 0)
      if (amount < 0) {
        setError('Opening amount cannot be negative.')
        return
      }
      const { data } = await api.post('/cash/open', { openingAmountUsd: amount })
      setCurrent(data)
      const summaryData = await loadSummary()
      setSummary(summaryData)
      closeCashModal()
      setOpenForm(emptyOpen)
    } catch (err) {
      setError(err?.response?.data ?? 'Unable to open cash session.')
    } finally {
      setSaving(false)
    }
  }

  const handleMovementSubmit = async (event) => {
    event.preventDefault()
    if (!current) {
      setError('Open cash before adding movements.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const amount = Number(movementForm.amountUsd || 0)
      if (amount <= 0) {
        setError('Amount must be greater than zero.')
        return
      }
      await api.post('/cash/movements', {
        cashSessionId: current.id,
        movementType: movementForm.movementType,
        amountUsd: amount,
        notes: movementForm.notes || null,
      })
      setMovementModal(false)
      setMovementForm(emptyMovement)
      await loadMovements()
      await loadCurrent()
    } catch (err) {
      setError(err?.response?.data ?? 'Unable to add cash movement.')
    } finally {
      setSaving(false)
    }
  }

  const handleCloseSubmit = async (event) => {
    event.preventDefault()
    if (!current) {
      setError('No open cash session.')
      return
    }
    if (!window.confirm('Close the cash session?')) return
    setSaving(true)
    setError('')
    try {
      const payload = {
        cashSessionId: current.id,
        cashTotalUsd: Number(closeForm.cashTotalUsd || 0),
        cardTotalUsd: Number(closeForm.cardTotalUsd || 0),
        transferTotalUsd: Number(closeForm.transferTotalUsd || 0),
        otherTotalUsd: Number(closeForm.otherTotalUsd || 0),
        countedCashUsd: Number(closeForm.countedCashUsd || 0),
      }
      await api.post('/cash/close', payload)
      setCloseModal(false)
      setCloseForm(emptyClose)
      await loadCurrent()
      await loadClosures()
      await loadMovements()
    } catch (err) {
      setError(err?.response?.data ?? 'Unable to close cash session.')
    } finally {
      setSaving(false)
    }
  }

  const difference = useMemo(() => {
    return Number(closeForm.countedCashUsd || 0) - Number(closeForm.cashTotalUsd || 0)
  }, [closeForm.cashTotalUsd, closeForm.countedCashUsd])

  return (
    <div>
      <PageHeader
        eyebrow="Cash"
        title="Cash register"
        description="Open shifts, track movements, and close the day."
        actions={
          <div className="flex flex-wrap gap-2">
            {!current ? (
              <button onClick={openCash} className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
                Open cash
              </button>
            ) : (
              <>
                <button
                  onClick={() => setMovementModal(true)}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Add movement
                </button>
                <button
                  onClick={() => setCloseModal(true)}
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  Close cash
                </button>
              </>
            )}
          </div>
        }
      />

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {String(error)}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-6 text-sm text-slate-500">Loading cash status...</div>
      ) : current ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Open session</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">#{current.id}</p>
            <div className="mt-4 space-y-2 text-sm text-slate-500">
              <div>Opened at: {current.openedAtUtc}</div>
              <div>Opening amount: ${current.openingAmountUsd}</div>
              <div>Status: {current.status}</div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Notes</p>
            <p className="mt-3 text-sm text-slate-600">
              Sales and payments require an open session. Use movements for petty cash in/out during the shift.
            </p>
          </div>
          {summary ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Cash summary</p>
              <p className="mt-3 text-2xl font-semibold text-slate-900">${summary.expectedCashUsd}</p>
              <div className="mt-4 space-y-2 text-sm text-slate-500">
                {summary.methodTotals.map((entry) => (
                  <div key={entry.paymentMethodId}>
                    {entry.name}: ${entry.amountUsd}
                  </div>
                ))}
                <div>Movements in: ${summary.cashMovementsInUsd}</div>
                <div>Movements out: ${summary.cashMovementsOutUsd}</div>
                <div>Cash expenses: ${summary.cashExpensesUsd}</div>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-6">
          <EmptyPanel title="No session open" body="Open the cash session before processing payments." />
        </div>
      )}

      <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Closures</h3>
            <p className="text-xs text-slate-500">Most recent closed sessions.</p>
          </div>
        </div>
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Session</th>
              <th className="px-4 py-3">Opened</th>
              <th className="px-4 py-3">Closed</th>
              <th className="px-4 py-3">Opening</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {closures.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-sm text-slate-500" colSpan={6}>
                  No closures yet.
                </td>
              </tr>
            ) : (
              closures.map((session) => (
                <tr key={session.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-4 text-slate-900">#{session.id}</td>
                  <td className="px-4 py-4 text-slate-500">{session.openedAtUtc}</td>
                  <td className="px-4 py-4 text-slate-500">{session.closedAtUtc ?? '-'}</td>
                  <td className="px-4 py-4 text-slate-500">${session.openingAmountUsd}</td>
                  <td className="px-4 py-4 text-slate-500">{session.status}</td>
                  <td className="px-4 py-4 text-right">
                    <button
                      onClick={() => openSummary(session.id)}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Movements</h3>
            <p className="text-xs text-slate-500">Cash in/out history.</p>
          </div>
        </div>
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Session</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Notes</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {movements.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-sm text-slate-500" colSpan={5}>
                  No movements yet.
                </td>
              </tr>
            ) : (
              movements.map((movement) => (
                <tr key={movement.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-4 text-slate-900">#{movement.cashSessionId}</td>
                  <td className="px-4 py-4 text-slate-600">{movement.movementType}</td>
                  <td className="px-4 py-4 text-slate-600">${movement.amountUsd}</td>
                  <td className="px-4 py-4 text-slate-500">{movement.notes ?? '-'}</td>
                  <td className="px-4 py-4 text-slate-400">{movement.createdAtUtc}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {openModal ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 text-center sm:items-center">
          <div className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left shadow-xl transition-all">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-xl text-slate-900">Open cash</h3>
                <p className="mt-1 text-sm text-slate-500">Start a new cash session.</p>
              </div>
              <button onClick={closeCashModal} className="text-sm text-slate-500 hover:text-slate-900">
                Close
              </button>
            </div>
            <form onSubmit={handleOpenSubmit} className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Opening amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={openForm.openingAmountUsd}
                  onChange={(event) => setOpenForm({ ...openForm, openingAmountUsd: event.target.value })}
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeCashModal}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {saving ? 'Opening...' : 'Open cash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {movementModal ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 text-center sm:items-center">
          <div className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left shadow-xl transition-all">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-xl text-slate-900">Add movement</h3>
                <p className="mt-1 text-sm text-slate-500">Record cash in or out.</p>
              </div>
              <button onClick={closeMovementModal} className="text-sm text-slate-500 hover:text-slate-900">
                Close
              </button>
            </div>
            <form onSubmit={handleMovementSubmit} className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Type</label>
                  <select
                    value={movementForm.movementType}
                    onChange={(event) => setMovementForm({ ...movementForm, movementType: event.target.value })}
                    className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="In">In</option>
                    <option value="Out">Out</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={movementForm.amountUsd}
                    onChange={(event) => setMovementForm({ ...movementForm, amountUsd: event.target.value })}
                    className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Notes</label>
                  <input
                    value={movementForm.notes}
                    onChange={(event) => setMovementForm({ ...movementForm, notes: event.target.value })}
                    className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeMovementModal}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Add movement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {closeModal ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 text-center sm:items-center">
          <div className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left shadow-xl transition-all">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-xl text-slate-900">Close cash</h3>
                <p className="mt-1 text-sm text-slate-500">Enter totals and count cash.</p>
              </div>
              <button onClick={closeCloseModal} className="text-sm text-slate-500 hover:text-slate-900">
                Close
              </button>
            </div>
            <form onSubmit={handleCloseSubmit} className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Cash total</label>
                  <input
                    type="number"
                    step="0.01"
                    value={closeForm.cashTotalUsd}
                    onChange={(event) => setCloseForm({ ...closeForm, cashTotalUsd: event.target.value })}
                    className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Card total</label>
                  <input
                    type="number"
                    step="0.01"
                    value={closeForm.cardTotalUsd}
                    onChange={(event) => setCloseForm({ ...closeForm, cardTotalUsd: event.target.value })}
                    className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Transfer total</label>
                  <input
                    type="number"
                    step="0.01"
                    value={closeForm.transferTotalUsd}
                    onChange={(event) => setCloseForm({ ...closeForm, transferTotalUsd: event.target.value })}
                    className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Other total</label>
                  <input
                    type="number"
                    step="0.01"
                    value={closeForm.otherTotalUsd}
                    onChange={(event) => setCloseForm({ ...closeForm, otherTotalUsd: event.target.value })}
                    className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Counted cash</label>
                  <input
                    type="number"
                    step="0.01"
                    value={closeForm.countedCashUsd}
                    onChange={(event) => setCloseForm({ ...closeForm, countedCashUsd: event.target.value })}
                    className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Difference: <span className="font-semibold text-slate-900">${difference.toFixed(2)}</span>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeCloseModal}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {saving ? 'Closing...' : 'Close cash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {summaryModal ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 text-center sm:items-center">
          <div className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left shadow-xl transition-all">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-xl text-slate-900">Cash closure details</h3>
                <p className="mt-1 text-sm text-slate-500">Totals by payment method and cash adjustments.</p>
              </div>
              <button onClick={closeSummary} className="text-sm text-slate-500 hover:text-slate-900">
                Close
              </button>
            </div>
            {!summaryDetails ? (
              <div className="mt-6 text-sm text-slate-500">Loading details...</div>
            ) : (
              <div className="mt-6 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    Expected cash: <span className="font-semibold text-slate-900">${summaryDetails.expectedCashUsd}</span>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    Opening: <span className="font-semibold text-slate-900">${summaryDetails.openingAmountUsd}</span>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    Movements in: <span className="font-semibold text-slate-900">${summaryDetails.cashMovementsInUsd}</span>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    Movements out: <span className="font-semibold text-slate-900">${summaryDetails.cashMovementsOutUsd}</span>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    Cash expenses: <span className="font-semibold text-slate-900">${summaryDetails.cashExpensesUsd}</span>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Method</th>
                        <th className="px-4 py-3">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {summaryDetails.methodTotals.map((entry) => (
                        <tr key={entry.paymentMethodId}>
                          <td className="px-4 py-4 text-slate-900">{entry.name}</td>
                          <td className="px-4 py-4 text-slate-600">${entry.amountUsd}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
