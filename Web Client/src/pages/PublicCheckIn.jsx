import { useState } from 'react'
import api from '../api/axios.js'

export default function PublicCheckIn() {
  const [memberId, setMemberId] = useState('')
  const [member, setMember] = useState(null)
  const [checkInResult, setCheckInResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [checkingIn, setCheckingIn] = useState(false)
  const [error, setError] = useState('')

  const handleLookup = async (event) => {
    event.preventDefault()
    setError('')
    setCheckInResult(null)
    const value = memberId.trim()
    if (!value) {
      setError('Enter your member code.')
      return
    }
    setLoading(true)
    try {
      const { data } = await api.get(`/checkins/scan/${value}`)
      setMember(data)
    } catch (err) {
      setMember(null)
      setError(err?.response?.data ?? 'Member not found.')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckIn = async () => {
    if (!member) return
    setCheckingIn(true)
    setError('')
    try {
      const { data } = await api.post('/checkins', { memberId: member.memberId })
      setCheckInResult(data)
    } catch (err) {
      setError(err?.response?.data ?? 'Unable to check in.')
    } finally {
      setCheckingIn(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-12">
        <div className="flex flex-col gap-3">
          <div className="text-xs uppercase tracking-[0.4em] text-slate-400">Team Beauty Brownsville</div>
          <h1 className="font-display text-3xl sm:text-4xl">Member Check-in</h1>
          <p className="max-w-2xl text-sm text-slate-300">
            Scan your QR or enter your member code to register today&apos;s visit.
          </p>
        </div>

        <form onSubmit={handleLookup} className="mt-8 flex flex-wrap gap-3">
          <input
            value={memberId}
            onChange={(event) => setMemberId(event.target.value)}
            placeholder="Member code"
            className="h-12 w-full max-w-sm rounded-full border border-slate-800 bg-slate-900 px-5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
          <button
            type="submit"
            disabled={loading}
            className="h-12 rounded-full bg-indigo-500 px-6 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? 'Searching...' : 'Find member'}
          </button>
        </form>

        {error ? (
          <div className="mt-6 rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {String(error)}
          </div>
        ) : null}

        <div className="mt-10 grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Member</div>
            {member ? (
              <>
                <div className="mt-4 flex items-center gap-4">
                  <div className="h-16 w-16 overflow-hidden rounded-full bg-slate-800">
                    {member.photoBase64 ? (
                      <img src={member.photoBase64} alt={member.fullName} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{member.fullName}</div>
                    <div className="text-xs text-slate-400">#{member.memberId}</div>
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-sm text-slate-300">
                  <div>Email: {member.email ?? '-'}</div>
                  <div>Phone: {member.phone ?? '-'}</div>
                  <div>Status: {member.isActive ? 'Active' : 'Inactive'}</div>
                </div>
              </>
            ) : (
              <p className="mt-4 text-sm text-slate-400">No member selected.</p>
            )}
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Membership</div>
            {member ? (
              <>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                    <div className="text-xs text-slate-400">Subscription</div>
                    <div className="mt-2 text-lg font-semibold">
                      {member.subscriptionStatus ?? 'None'}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                    <div className="text-xs text-slate-400">Ends</div>
                    <div className="mt-2 text-lg font-semibold">
                      {member.subscriptionEndDate ?? '--'}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                    <div className="text-xs text-slate-400">Days left</div>
                    <div className="mt-2 text-lg font-semibold">
                      {member.daysToExpire ?? '--'}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleCheckIn}
                    disabled={checkingIn || !member.hasActiveSubscription}
                    className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    {checkingIn ? 'Checking in...' : 'Check in now'}
                  </button>
                  {!member.hasActiveSubscription ? (
                    <span className="text-xs text-rose-200">
                      No active subscription. Please visit front desk.
                    </span>
                  ) : null}
                  {checkInResult ? (
                    <span className="text-xs text-emerald-200">Checked in at {checkInResult.checkedInAtUtc}.</span>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="mt-4 text-sm text-slate-400">Scan a member code to see membership details.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
