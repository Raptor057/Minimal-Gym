import { useEffect, useState } from 'react'
import api from '../api/axios.js'

export default function Logo() {
  const [logo, setLogo] = useState('')

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

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/30">
        {logo ? <img src={logo} alt="Logo" className="h-full w-full object-cover" /> : 'TB'}
      </div>
      <div>
        <div className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">Team Beauty</div>
        <div className="font-display text-lg text-slate-900">Brownsville</div>
      </div>
    </div>
  )
}
