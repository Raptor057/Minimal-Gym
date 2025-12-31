import { useEffect, useMemo, useState } from 'react'
import { Combobox, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react'
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid'
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

const classNames = (...classes) => classes.filter(Boolean).join(' ')

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
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [memberQuery, setMemberQuery] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState(emptyEditForm)
  const [saving, setSaving] = useState(false)

  const loadMembers = async () => {
    const { data } = await api.get('/members')
    setMembers(Array.isArray(data) ? data : [])
  }

  const loadPlans = async () => {
    const { data } = await api.get('/membership-plans')
    setPlans(Array.isArray(data) ? data : [])
  }

  const loadSubscriptions = async (memberId) => {
    if (!memberId) {
      setSubscriptions([])
      return
    }
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get(`/members/${memberId}/subscriptions`)
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
  }, [])

  useEffect(() => {
    if (selectedMemberId) {
      setSubscriptions([])
      loadSubscriptions(selectedMemberId)
    }
  }, [selectedMemberId])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return subscriptions
    return subscriptions.filter((sub) => sub.status?.toLowerCase().includes(term))
  }, [search, subscriptions])

  const filteredMembers =
    memberQuery.trim() === ''
      ? members
      : members.filter((member) => member.fullName?.toLowerCase().includes(memberQuery.trim().toLowerCase()))

  const subscriptionStatusClass = (status) => {
    const normalized = String(status || '').toLowerCase()
    if (normalized === 'active') return 'bg-emerald-50 text-emerald-700'
    if (normalized === 'expired') return 'bg-rose-50 text-rose-600'
    if (normalized === 'paused') return 'bg-amber-50 text-amber-700'
    if (normalized === 'cancelled') return 'bg-slate-200 text-slate-700'
    return 'bg-slate-100 text-slate-600'
  }

  const selectedMember = members.find((member) => String(member.id) === selectedMemberId) ?? null

  const activeSubscription = subscriptions.find(
    (sub) => String(sub.status ?? '').toLowerCase() === 'active'
  )

  const openCreate = () => {
    if (activeSubscription) {
      setError('This member already has an active subscription.')
      return
    }
    setForm({ ...emptyForm, memberId: selectedMemberId || '' })
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
      await loadSubscriptions(form.memberId)
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
      await loadSubscriptions(selectedMemberId)
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
      await loadSubscriptions(selectedMemberId)
    } catch (err) {
      setError(err?.response?.data ?? 'Unable to cancel subscription.')
    }
  }

  const handlePause = async (subscriptionId) => {
    try {
      await api.post(`/subscriptions/${subscriptionId}/pause`)
      await loadSubscriptions(selectedMemberId)
    } catch (err) {
      setError(err?.response?.data ?? 'Unable to pause subscription.')
    }
  }

  const handleResume = async (subscriptionId) => {
    try {
      await api.post(`/subscriptions/${subscriptionId}/resume`)
      await loadSubscriptions(selectedMemberId)
    } catch (err) {
      setError(err?.response?.data ?? 'Unable to resume subscription.')
    }
  }

  const handleRenew = async (subscriptionId) => {
    try {
      await api.post(`/subscriptions/${subscriptionId}/renew`, { startDate: null })
      await loadSubscriptions(selectedMemberId)
    } catch (err) {
      setError(err?.response?.data ?? 'Unable to renew subscription.')
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
            onClick={openCreate}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            disabled={Boolean(activeSubscription)}
          >
            New subscription
          </button>
        }
      />

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <div className="w-full max-w-xs">
          <Combobox
            value={selectedMember}
            onChange={(member) => {
              setSelectedMemberId(member ? String(member.id) : '')
              if (!member) {
                setSubscriptions([])
              }
              setMemberQuery('')
            }}
          >
            <div className="relative">
              <ComboboxInput
                className="h-10 w-full rounded-full border border-slate-200 bg-white py-2 pr-10 pl-10 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                displayValue={(member) => member?.fullName ?? ''}
                placeholder="Search member..."
                onChange={(event) => setMemberQuery(event.target.value)}
              />
              <MagnifyingGlassIcon
                className="pointer-events-none absolute left-3 top-2.5 size-5 text-slate-400"
                aria-hidden="true"
              />
            </div>
            <ComboboxOptions className="mt-2 max-h-60 overflow-auto rounded-2xl border border-slate-200 bg-white py-2 text-sm shadow-lg">
              {selectedMember ? (
                <ComboboxOption
                  value={null}
                  className={({ active }) =>
                    classNames(
                      'cursor-default select-none px-4 py-2 text-slate-500',
                      active && 'bg-slate-100 text-slate-900'
                    )
                  }
                >
                  Clear selection
                </ComboboxOption>
              ) : null}
              {filteredMembers.length === 0 ? (
                <div className="px-4 py-2 text-slate-500">No members found.</div>
              ) : (
                filteredMembers.map((member) => (
                  <ComboboxOption
                    key={member.id}
                    value={member}
                    className={({ active }) =>
                      classNames(
                        'cursor-default select-none px-4 py-2 text-slate-700',
                        active && 'bg-slate-100 text-slate-900'
                      )
                    }
                  >
                    {member.fullName}
                  </ComboboxOption>
                ))
              )}
            </ComboboxOptions>
          </Combobox>
        </div>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Filter by status..."
          className="h-10 w-full max-w-xs rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        />
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {String(error)}
        </div>
      ) : null}

      {activeSubscription ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          This member already has an active subscription. Pause or expire it before creating another.
        </div>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-500">
            <tr>
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
                <td className="px-4 py-6 text-sm text-slate-500" colSpan={5}>
                  Loading subscriptions...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-sm text-slate-500" colSpan={5}>
                  No subscriptions found.
                </td>
              </tr>
            ) : (
              filtered.map((sub) => (
                <tr key={sub.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-4 text-slate-900">Plan #{sub.planId}</td>
                  <td className="px-4 py-4 text-slate-600">
                    {sub.startDate} → {sub.endDate}
                  </td>
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
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                      >
                        Edit
                      </button>
                      {sub.status === 'Active' ? (
                        <button
                          onClick={() => handlePause(sub.id)}
                          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                        >
                          Pause
                        </button>
                      ) : null}
                      {sub.status === 'Paused' ? (
                        <button
                          onClick={() => handleResume(sub.id)}
                          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                        >
                          Resume
                        </button>
                      ) : null}
                      <button
                        onClick={() => handleRenew(sub.id)}
                        className="rounded-full border border-indigo-200 px-3 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
                      >
                        Renew
                      </button>
                      {sub.status !== 'Cancelled' ? (
                        <button
                          onClick={() => handleCancel(sub.id)}
                          className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                        >
                          Cancel
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
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
    </div>
  )
}
