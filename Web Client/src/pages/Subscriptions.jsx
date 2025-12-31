import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios.js'
import PageHeader from '../ui/PageHeader.jsx'

const emptyForm = {
  memberId: '',
  planId: '',
  startDate: '',
}

const emptyEditForm = {
  id: null,
  status: '',
  startDate: '',
  endDate: '',
}

const toDateInput = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (part) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export default function Subscriptions() {
  const [members, setMembers] = useState([])
  const [plans, setPlans] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [search, setSearch] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState(emptyEditForm)
  const [changeModalOpen, setChangeModalOpen] = useState(false)
  const [changeForm, setChangeForm] = useState({ subscriptionId: null, memberId: '', planId: '', startDate: '' })
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  const loadMembers = async () => {
    const { data } = await api.get('/members')
    setMembers(Array.isArray(data) ? data : [])
  }

  const loadPlans = async () => {
    const { data } = await api.get('/membership-plans')
    setPlans(Array.isArray(data) ? data : [])
  }

  const loadSubscriptions = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/subscriptions')
      setSubscriptions(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err?.response?.data ?? 'Unable to load subscriptions.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMembers()
    loadPlans()
    loadSubscriptions()
  }, [])

  const memberMap = useMemo(() => {
    const map = new Map()
    members.forEach((member) => map.set(member.id, member))
    return map
  }, [members])

  const planMap = useMemo(() => {
    const map = new Map()
    plans.forEach((plan) => map.set(plan.id, plan))
    return map
  }, [plans])

  const subscriptionsByMember = useMemo(() => {
    const map = new Map()
    subscriptions.forEach((sub) => {
      if (!map.has(sub.memberId)) map.set(sub.memberId, [])
      map.get(sub.memberId).push(sub)
    })
    return map
  }, [subscriptions])

  const subscriptionStatusClass = (status) => {
    const normalized = String(status || '').toLowerCase()
    if (normalized === 'active') return 'bg-emerald-50 text-emerald-700'
    if (normalized === 'expired') return 'bg-rose-50 text-rose-600'
    if (normalized === 'paused') return 'bg-amber-50 text-amber-700'
    if (normalized === 'cancelled') return 'bg-slate-200 text-slate-700'
    return 'bg-slate-100 text-slate-600'
  }

  const getLatestSubscription = (memberId) => {
    const list = subscriptionsByMember.get(memberId) ?? []
    if (list.length === 0) return null
    return list
      .slice()
      .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())[0]
  }

  const getActiveSubscription = (memberId) => {
    const list = subscriptionsByMember.get(memberId) ?? []
    return list.find((sub) => String(sub.status || '').toLowerCase() === 'active') ?? null
  }

  const filteredMembers = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return members
    return members.filter((member) => member.fullName?.toLowerCase().includes(term))
  }, [members, search])

  const filteredSubscriptions = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return subscriptions
    return subscriptions.filter((sub) => {
      const member = memberMap.get(sub.memberId)
      const plan = planMap.get(sub.planId)
      return (
        String(sub.status || '').toLowerCase().includes(term) ||
        member?.fullName?.toLowerCase().includes(term) ||
        plan?.name?.toLowerCase().includes(term)
      )
    })
  }, [subscriptions, search, memberMap, planMap])

  const openCreate = (memberId) => {
    const activeSubscription = getActiveSubscription(memberId)
    if (activeSubscription) {
      setError('This member already has an active subscription.')
      return
    }
    setForm({ ...emptyForm, memberId: String(memberId) })
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setForm(emptyForm)
  }

  const openEdit = (subscription) => {
    setEditForm({
      id: subscription.id,
      status: subscription.status ?? '',
      startDate: toDateInput(subscription.startDate),
      endDate: toDateInput(subscription.endDate),
    })
    setEditModalOpen(true)
  }

  const closeEditModal = () => {
    setEditModalOpen(false)
    setEditForm(emptyEditForm)
  }

  const handleSave = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (!form.memberId) {
        setError('Select a member first.')
        return
      }
      if (!form.planId) {
        setError('Select a plan.')
        return
      }

      const payload = {
        planId: Number(form.planId),
        startDate: form.startDate || null,
      }

      await api.post(`/members/${form.memberId}/subscriptions`, payload)
      await loadSubscriptions()
      closeModal()
    } catch (err) {
      setError(err?.response?.data ?? 'Unable to create subscription.')
    } finally {
      setSaving(false)
    }
  }

  const handleEditSave = async (event) => {
    event.preventDefault()
    if (!editForm.id) return
    setSaving(true)
    setError('')
    try {
      await api.put(`/subscriptions/${editForm.id}`, {
        status: editForm.status || null,
        startDate: editForm.startDate || null,
        endDate: editForm.endDate || null,
      })
      await loadSubscriptions()
      closeEditModal()
    } catch (err) {
      setError(err?.response?.data ?? 'Unable to update subscription.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = async (subscriptionId) => {
    if (!window.confirm('Cancel this subscription?')) return
    setError('')
    try {
      await api.put(`/subscriptions/${subscriptionId}`, { status: 'Cancelled' })
      await loadSubscriptions()
    } catch (err) {
      setError(err?.response?.data ?? 'Unable to cancel subscription.')
    }
  }

  const handlePause = async (subscriptionId) => {
    try {
      await api.post(`/subscriptions/${subscriptionId}/pause`)
      await loadSubscriptions()
    } catch (err) {
      setError(err?.response?.data ?? 'Unable to pause subscription.')
    }
  }

  const handleResume = async (subscriptionId) => {
    try {
      await api.post(`/subscriptions/${subscriptionId}/resume`)
      await loadSubscriptions()
    } catch (err) {
      setError(err?.response?.data ?? 'Unable to resume subscription.')
    }
  }

  const handleRenew = async (subscription) => {
    try {
      const { data } = await api.post(`/subscriptions/${subscription.id}/renew`, { startDate: null })
      await loadSubscriptions()
      navigate(`/payments/new?memberId=${data.memberId}&subscriptionId=${data.id}&amount=${data.priceUsd}`)
    } catch (err) {
      setError(err?.response?.data ?? 'Unable to renew subscription.')
    }
  }

  const openChangePlan = (subscription) => {
    setChangeForm({ subscriptionId: subscription.id, memberId: String(subscription.memberId), planId: '', startDate: '' })
    setChangeModalOpen(true)
  }

  const closeChangePlan = () => {
    setChangeModalOpen(false)
    setChangeForm({ subscriptionId: null, memberId: '', planId: '', startDate: '' })
  }

  const handleChangePlanSave = async (event) => {
    event.preventDefault()
    if (!changeForm.subscriptionId) return
    setSaving(true)
    setError('')
    try {
      if (!changeForm.planId) {
        setError('Select a plan.')
        return
      }
      const { data } = await api.post(`/subscriptions/${changeForm.subscriptionId}/change-plan`, {
        planId: Number(changeForm.planId),
        startDate: changeForm.startDate || null,
      })
      await loadSubscriptions()
      closeChangePlan()
      navigate(`/payments/new?memberId=${data.memberId}&subscriptionId=${data.id}&amount=${data.priceUsd}`)
    } catch (err) {
      setError(err?.response?.data ?? 'Unable to change plan.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Subscriptions"
        title="Active subscriptions"
        description="Pause, resume, renew, or cancel memberships."
        actions={
          <button
            onClick={() => setShowAll((prev) => !prev)}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
          >
            {showAll ? 'Show members' : 'Show all subscriptions'}
          </button>
        }
      />

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={showAll ? 'Filter by member, plan, or status...' : 'Search members...'}
          className="h-10 w-full max-w-sm rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        />
        <div className="text-sm text-slate-500">
          {showAll ? filteredSubscriptions.length : filteredMembers.length} records
        </div>
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
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Dates</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-sm text-slate-500" colSpan={6}>
                  Loading subscriptions...
                </td>
              </tr>
            ) : showAll ? (
              filteredSubscriptions.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-500" colSpan={6}>
                    No subscriptions found.
                  </td>
                </tr>
              ) : (
                filteredSubscriptions.map((sub) => {
                  const member = memberMap.get(sub.memberId)
                  const plan = planMap.get(sub.planId)
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/60">
                      <td className="py-5 pr-3 pl-4 text-sm whitespace-nowrap sm:pl-0">
                        <div className="flex items-center">
                          <div className="size-11 shrink-0">
                            {member?.photoBase64 ? (
                              <img
                                alt={member.fullName}
                                src={member.photoBase64}
                                className="size-11 rounded-full object-contain bg-slate-100"
                              />
                            ) : (
                              <div className="size-11 rounded-full bg-slate-100" />
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="font-medium text-slate-900">{member?.fullName ?? '--'}</div>
                            <div className="mt-1 text-xs text-slate-500">Member #{sub.memberId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{plan?.name ?? `Plan #${sub.planId}`}</td>
                      <td className="px-4 py-4 text-slate-600">{sub.startDate} - {sub.endDate}</td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${subscriptionStatusClass(sub.status)}`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-600">${sub.priceUsd}</td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEdit(sub)}
                            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                          >
                            Edit
                          </button>
                          {sub.status === 'Active' ? (
                            <button
                              onClick={() => handlePause(sub.id)}
                              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                            >
                              Pause
                            </button>
                          ) : null}
                          {sub.status === 'Paused' ? (
                            <button
                              onClick={() => handleResume(sub.id)}
                              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                            >
                              Resume
                            </button>
                          ) : null}
                          <button
                            onClick={() => handleRenew(sub)}
                            className="rounded-full border border-indigo-200 px-3 py-1 text-xs font-semibold text-indigo-600"
                          >
                            Renew
                          </button>
                          <button
                            onClick={() => openChangePlan(sub)}
                            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                          >
                            Upgrade/Downgrade plan
                          </button>
                          {sub.status !== 'Cancelled' ? (
                            <button
                              onClick={() => handleCancel(sub.id)}
                              className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600"
                            >
                              Cancel
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )
            ) : filteredMembers.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-sm text-slate-500" colSpan={6}>
                  No members found.
                </td>
              </tr>
            ) : (
              filteredMembers.map((member) => {
                const activeSubscription = getActiveSubscription(member.id)
                const latestSubscription = activeSubscription ?? getLatestSubscription(member.id)
                const plan = latestSubscription ? planMap.get(latestSubscription.planId) : null
                return (
                  <tr key={member.id} className="hover:bg-slate-50/60">
                    <td className="py-5 pr-3 pl-4 text-sm whitespace-nowrap sm:pl-0">
                      <div className="flex items-center">
                        <div className="size-11 shrink-0">
                          {member.photoBase64 ? (
                            <img
                              alt={member.fullName}
                              src={member.photoBase64}
                              className="size-11 rounded-full object-contain bg-slate-100"
                            />
                          ) : (
                            <div className="size-11 rounded-full bg-slate-100" />
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="font-medium text-slate-900">{member.fullName}</div>
                          <div className="mt-1 text-xs text-slate-500">{member.email ?? 'No email'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{plan?.name ?? '--'}</td>
                    <td className="px-4 py-4 text-slate-600">
                      {latestSubscription ? `${latestSubscription.startDate} - ${latestSubscription.endDate}` : '--'}
                    </td>
                    <td className="px-4 py-4">
                      {latestSubscription ? (
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${subscriptionStatusClass(latestSubscription.status)}`}>
                          {latestSubscription.status}
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                          None
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-slate-600">{latestSubscription ? `$${latestSubscription.priceUsd}` : '--'}</td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openCreate(member.id)}
                          disabled={Boolean(activeSubscription)}
                          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 disabled:opacity-50"
                        >
                          New subscription
                        </button>
                        {latestSubscription ? (
                          <>
                            <button
                              onClick={() => openEdit(latestSubscription)}
                              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                            >
                              Edit
                            </button>
                            {latestSubscription.status === 'Active' ? (
                              <button
                                onClick={() => handlePause(latestSubscription.id)}
                                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                              >
                                Pause
                              </button>
                            ) : null}
                            {latestSubscription.status === 'Paused' ? (
                              <button
                                onClick={() => handleResume(latestSubscription.id)}
                                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                              >
                                Resume
                              </button>
                            ) : null}
                            <button
                              onClick={() => handleRenew(latestSubscription)}
                              className="rounded-full border border-indigo-200 px-3 py-1 text-xs font-semibold text-indigo-600"
                            >
                              Renew
                            </button>
                            <button
                              onClick={() => openChangePlan(latestSubscription)}
                              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                            >
                              Upgrade/Downgrade plan
                            </button>
                            {latestSubscription.status !== 'Cancelled' ? (
                              <button
                                onClick={() => handleCancel(latestSubscription.id)}
                                className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600"
                              >
                                Cancel
                              </button>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 text-center sm:items-center">
          <div className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left shadow-xl transition-all">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-xl text-slate-900">Create subscription</h3>
                <p className="mt-1 text-sm text-slate-500">Assign a plan to a member.</p>
              </div>
              <button onClick={closeModal} className="text-sm text-slate-500 hover:text-slate-900">
                Close
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Member</label>
                <select
                  value={form.memberId}
                  onChange={(event) => setForm({ ...form, memberId: event.target.value })}
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">Select member</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Plan</label>
                <select
                  value={form.planId}
                  onChange={(event) => setForm({ ...form, planId: event.target.value })}
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">Select plan</option>
                  {plans.filter((plan) => plan.isActive).map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} (${plan.priceUsd})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Start date (optional)
                </label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(event) => setForm({ ...form, startDate: event.target.value })}
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Create subscription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 text-center sm:items-center">
          <div className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left shadow-xl transition-all">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-xl text-slate-900">Edit subscription</h3>
                <p className="mt-1 text-sm text-slate-500">Update dates or status.</p>
              </div>
              <button onClick={closeEditModal} className="text-sm text-slate-500 hover:text-slate-900">
                Close
              </button>
            </div>

            <form onSubmit={handleEditSave} className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Status</label>
                <select
                  value={editForm.status}
                  onChange={(event) => setEditForm({ ...editForm, status: event.target.value })}
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">Select status</option>
                  <option value="Active">Active</option>
                  <option value="Paused">Paused</option>
                  <option value="Expired">Expired</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Start date</label>
                  <input
                    type="date"
                    value={editForm.startDate}
                    onChange={(event) => setEditForm({ ...editForm, startDate: event.target.value })}
                    className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">End date</label>
                  <input
                    type="date"
                    value={editForm.endDate}
                    onChange={(event) => setEditForm({ ...editForm, endDate: event.target.value })}
                    className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {changeModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 text-center sm:items-center">
          <div className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left shadow-xl transition-all">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-xl text-slate-900">Upgrade/Downgrade plan</h3>
                <p className="mt-1 text-sm text-slate-500">Create a new subscription with a different plan.</p>
              </div>
              <button onClick={closeChangePlan} className="text-sm text-slate-500 hover:text-slate-900">
                Close
              </button>
            </div>

            <form onSubmit={handleChangePlanSave} className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Plan</label>
                <select
                  value={changeForm.planId}
                  onChange={(event) => setChangeForm({ ...changeForm, planId: event.target.value })}
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">Select plan</option>
                  {plans.filter((plan) => plan.isActive).map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} (${plan.priceUsd})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Start date (optional)
                </label>
                <input
                  type="date"
                  value={changeForm.startDate}
                  onChange={(event) => setChangeForm({ ...changeForm, startDate: event.target.value })}
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeChangePlan}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Create subscription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}


