import { useEffect, useRef, useState } from 'react'
import { CheckBadgeIcon, ClockIcon } from '@heroicons/react/20/solid'
import api from '../api/axios.js'
import { formatMemberId } from '../utils/formatMemberId.js'

export default function PublicCheckIn() {
  const [memberId, setMemberId] = useState('')
  const [member, setMember] = useState(null)
  const [checkInResult, setCheckInResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [checkingIn, setCheckingIn] = useState(false)
  const [error, setError] = useState('')
  const [scanSupported, setScanSupported] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState('')
  const [manualOpen, setManualOpen] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(0)
  const lastScannedRef = useRef('')
  const scanningRef = useRef(false)
  const [recentCheckIns, setRecentCheckIns] = useState([])
  const [logo, setLogo] = useState('')

  const loadTodayCheckIns = async () => {
    try {
      const { data } = await api.get('/checkins/today')
      const list = Array.isArray(data) ? data : []
      setRecentCheckIns(
        list.map((item) => ({
          id: item.id,
          name: item.fullName,
          isActive: item.isActive,
          checkedInAtUtc: item.checkedInAtUtc,
          imageUrl: item.photoBase64 ?? '',
          subscriptionStatus: item.subscriptionStatus ?? 'None',
          subscriptionEndDate: item.subscriptionEndDate ?? '--',
          daysToExpire: item.daysToExpire ?? '--',
          hasActiveSubscription: item.hasActiveSubscription ?? false,
        }))
      )
    } catch {
      // Ignore load errors on public screen.
    }
  }

  useEffect(() => {
    loadTodayCheckIns()
  }, [])

  useEffect(() => {
    let isMounted = true
    api
      .get('/config')
      .then((response) => {
        if (!isMounted) return
        setLogo(response.data?.logoBase64 ?? '')
      })
      .catch(() => {
        if (isMounted) setLogo('')
      })
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    setScanSupported(Boolean(window.BarcodeDetector && navigator?.mediaDevices?.getUserMedia))
  }, [])

  useEffect(() => {
    return () => {
      stopScan()
    }
  }, [])

  useEffect(() => {
    let buffer = ''
    let timer = 0

    const reset = () => {
      buffer = ''
      if (timer) {
        clearTimeout(timer)
        timer = 0
      }
    }

    const handleKeyDown = (event) => {
      if (manualOpen || scanningRef.current) return
      if (event.key === 'Enter') {
        const value = buffer.trim()
        if (value) {
          setMemberId(value)
          handleLookupByValue(value, { autoCheck: true })
        }
        reset()
        return
      }

      if (event.key.length === 1) {
        buffer += event.key
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => {
          buffer = ''
          timer = 0
        }, 500)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      reset()
    }
  }, [manualOpen])

  const stopScan = () => {
    scanningRef.current = false
    setScanning(false)
    setScanError('')
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const openManualInput = () => {
    stopScan()
    setManualCode('')
    setManualOpen(true)
    setError('')
    setScanError('')
    setCheckInResult(null)
  }

  const closeManualInput = () => {
    setManualOpen(false)
  }

  const submitManualInput = async (event) => {
    event.preventDefault()
    const value = manualCode.trim()
    if (!value) {
      setError('Enter your member code.')
      return
    }
    setMemberId(value)
    await handleLookupByValue(value, { autoCheck: true })
    setManualOpen(false)
  }

  const handleLookupByValue = async (value, { autoCheck = true } = {}) => {
    setError('')
    setCheckInResult(null)
    if (!value) {
      setError('Enter your member code.')
      return
    }
    setLoading(true)
    try {
      const { data } = await api.get(`/checkins/scan/${value}`)
      setMember(data)
      if (autoCheck && data?.hasActiveSubscription) {
        await handleCheckIn(data)
      }
    } catch (err) {
      setMember(null)
      setError(err?.response?.data ?? 'Member not found.')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckIn = async (targetMember = member) => {
    if (!targetMember || checkingIn) return
    setCheckingIn(true)
    setError('')
    try {
      const { data } = await api.post('/checkins', { memberId: targetMember.memberId })
      setCheckInResult(data)
      await loadTodayCheckIns()
    } catch (err) {
      setError(err?.response?.data ?? 'Unable to check in.')
    } finally {
      setCheckingIn(false)
    }
  }

  const startScan = async () => {
    setScanError('')
    setError('')
    setCheckInResult(null)
    if (!scanSupported) {
      setScanError('Camera scanning is not supported on this device.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      const detector = new BarcodeDetector({ formats: ['qr_code'] })
      scanningRef.current = true
      setScanning(true)

      const scanFrame = async () => {
        if (!videoRef.current || !scanningRef.current) return
        try {
          const barcodes = await detector.detect(videoRef.current)
          if (barcodes.length > 0) {
            const rawValue = String(barcodes[0].rawValue ?? '').trim()
            if (rawValue && rawValue !== lastScannedRef.current) {
              lastScannedRef.current = rawValue
              setMemberId(rawValue)
              await handleLookupByValue(rawValue, { autoCheck: true })
              stopScan()
              return
            }
          }
        } catch (err) {
          setScanError(err?.message ?? 'Unable to read QR code.')
          stopScan()
          return
        }
        rafRef.current = requestAnimationFrame(scanFrame)
      }

      rafRef.current = requestAnimationFrame(scanFrame)
    } catch (err) {
      setScanError(err?.message ?? 'Unable to access the camera.')
      stopScan()
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-12">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-slate-800 bg-black text-white shadow-lg shadow-pink-500/20">
              {logo ? <img src={logo} alt="Logo" className="h-full w-full object-cover" /> : 'TB'}
            </div>
            <div className="text-xs uppercase tracking-[0.4em] text-slate-400">Team Beauty Brownsville</div>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl">Member Check-in</h1>
          <p className="max-w-2xl text-sm text-slate-300">
            Scan your QR or enter your member code to register today&apos;s visit.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={openManualInput}
            className="rounded-full border border-slate-800 bg-black px-5 py-3 text-left text-sm text-slate-300 transition hover:border-slate-600 hover:text-white"
          >
            Scan your member QR, use the handheld scanner, or click here for input the code member.
          </button>
          {scanSupported ? (
            <button
              type="button"
              onClick={scanning ? stopScan : startScan}
              className="h-12 rounded-full border border-slate-700 px-6 text-sm font-semibold text-slate-200"
            >
              {scanning ? 'Stop camera' : 'Scan QR'}
            </button>
          ) : null}
        </div>

        {memberId ? (
          <div className="mt-3 text-xs text-slate-400">
            Last scan: {formatMemberId(member?.memberNumber ?? memberId)}
          </div>
        ) : null}

        {scanning ? (
          <div className="mt-6 w-full max-w-sm overflow-hidden rounded-3xl border border-slate-800 bg-black/70 p-3">
            <video ref={videoRef} className="h-64 w-full rounded-2xl object-cover" playsInline muted />
            <div className="mt-3 text-xs text-slate-400">Point the camera at the QR code.</div>
          </div>
        ) : null}

        {scanError ? (
          <div className="mt-4 rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            {String(scanError)}
          </div>
        ) : null}

        {manualOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
            <div className="w-full max-w-sm rounded-3xl border border-slate-800 bg-black/95 p-6 shadow-xl">
              <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Manual input</div>
              <h2 className="mt-2 text-lg font-semibold">Enter member code</h2>
              <form onSubmit={submitManualInput} className="mt-4 space-y-3">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(event) => setManualCode(event.target.value)}
                  placeholder="Member code"
                  className="w-full rounded-2xl border border-slate-700 bg-black px-4 py-3 text-sm text-white outline-none focus:border-pink-400"
                  autoFocus
                />
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    className="rounded-full bg-pink-500 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Lookup
                  </button>
                  <button
                    type="button"
                    onClick={closeManualInput}
                    className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="mt-6 rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {String(error)}
          </div>
        ) : null}

        <div className="mt-10 grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="rounded-3xl border border-slate-800 bg-black/70 p-6">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Member</div>
            {member ? (
              <>
                <div className="mt-4 flex items-center gap-4">
                  <div className="h-16 w-16 overflow-hidden rounded-full bg-black/70">
                    {member.photoBase64 ? (
                      <img src={member.photoBase64} alt={member.fullName} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{member.fullName}</div>
                    <div className="text-xs text-slate-400">
                      ID: {formatMemberId(member.memberNumber ?? member.memberId) || '--'}
                    </div>
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-sm text-slate-300">
                  <div>Status: {member.isActive ? 'Active' : 'Inactive'}</div>
                </div>
              </>
            ) : (
              <p className="mt-4 text-sm text-slate-400">No member selected.</p>
            )}
          </div>

          <div className="rounded-3xl border border-slate-800 bg-black/70 p-6">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Membership</div>
            {member ? (
              <>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-800 bg-black/80 p-4">
                    <div className="text-xs text-slate-400">Subscription</div>
                    <div className="mt-2 text-lg font-semibold">
                      {member.subscriptionStatus ?? 'None'}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-black/80 p-4">
                    <div className="text-xs text-slate-400">Ends</div>
                    <div className="mt-2 text-lg font-semibold">
                      {member.subscriptionEndDate ?? '--'}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-black/80 p-4">
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

        <div className="mt-10">
          <div className="mb-4 text-xs uppercase tracking-[0.3em] text-slate-400">Recent check-ins</div>
          {recentCheckIns.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-black/70 px-4 py-3 text-sm text-slate-400">
              No check-ins yet.
            </div>
          ) : (
            <ul role="list" className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {recentCheckIns.map((person) => (
                <li
                  key={person.id}
                  className="col-span-1 flex flex-col divide-y divide-slate-800 rounded-2xl bg-black/70 text-center shadow-sm"
                >
                  <div className="flex flex-1 flex-col p-6">
                    {person.imageUrl ? (
                      <img
                        alt=""
                        src={person.imageUrl}
                        className="mx-auto size-24 shrink-0 rounded-full bg-black/70 outline -outline-offset-1 outline-black/5"
                      />
                    ) : (
                      <div className="mx-auto flex size-24 items-center justify-center rounded-full bg-black/70 text-xl font-semibold text-slate-300">
                        {person.name?.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <h3 className="mt-4 text-sm font-semibold text-white">{person.name}</h3>
                    <dl className="mt-1 flex grow flex-col justify-between text-sm text-slate-400">
                      <dt className="sr-only">Status</dt>
                      <dd>{person.isActive ? 'Active member' : 'Inactive member'}</dd>
                      <dt className="sr-only">Check-in</dt>
                      <dd className="mt-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                            person.hasActiveSubscription
                              ? 'bg-emerald-500/10 text-emerald-300'
                              : 'bg-rose-500/10 text-rose-200'
                          }`}
                        >
                          {person.subscriptionStatus ?? 'No subscription'}
                        </span>
                      </dd>
                      <dt className="sr-only">Membership details</dt>
                      <dd className="mt-3 text-xs text-slate-400">
                        Ends: {person.subscriptionEndDate ?? '--'}
                      </dd>
                      <dd className="text-xs text-slate-400">
                        {Number.isFinite(Number(person.daysToExpire)) ? (
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium inset-ring ${
                              Number(person.daysToExpire) <= 3
                                ? 'bg-red-50 text-red-700 inset-ring-red-600/10 dark:bg-red-400/10 dark:text-red-400 dark:inset-ring-red-400/20'
                                : Number(person.daysToExpire) <= 7
                                  ? 'bg-yellow-50 text-yellow-800 inset-ring-yellow-600/20 dark:bg-yellow-400/10 dark:text-yellow-500 dark:inset-ring-yellow-400/20'
                                  : 'bg-green-50 text-green-700 inset-ring-green-600/20 dark:bg-green-400/10 dark:text-green-400 dark:inset-ring-green-500/20'
                            }`}
                          >
                            {person.daysToExpire} days left
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 inset-ring inset-ring-gray-500/10 dark:bg-gray-400/10 dark:text-gray-400 dark:inset-ring-gray-400/20">
                            Days left: --
                          </span>
                        )}
                      </dd>
                    </dl>
                  </div>
                  <div className="border-t border-slate-800 px-6 py-3 text-center text-xs text-slate-300">
                    <span className="inline-flex items-center gap-2">
                      <ClockIcon aria-hidden="true" className="size-4 text-slate-400" />
                      {person.checkedInAtUtc ?? '--'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
