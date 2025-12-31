import { useEffect, useMemo, useState } from 'react'
import { ChevronDownIcon } from '@heroicons/react/16/solid'
import { CheckIcon, XMarkIcon } from '@heroicons/react/20/solid'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../api/axios.js'
import PageHeader from '../ui/PageHeader.jsx'

const emptyItem = { productId: '', quantity: '1', unitPriceUsd: '', discountUsd: '0', taxUsd: '' }
const emptyPayment = { paymentMethodId: '', amountUsd: '', reference: '', proofBase64: '', proofName: '' }

export default function Sales() {
  const [sales, setSales] = useState([])
  const [products, setProducts] = useState([])
  const [members, setMembers] = useState([])
  const [methods, setMethods] = useState([])
  const [config, setConfig] = useState(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [details, setDetails] = useState(null)
  const [items, setItems] = useState([])
  const [form, setForm] = useState({
    memberId: '',
    receiptNumber: '',
  })
  const [payments, setPayments] = useState([emptyPayment])
  const [cashSummary, setCashSummary] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showOutOfStock, setShowOutOfStock] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const toErrorMessage = (err, fallback) => {
    const data = err?.response?.data
    if (typeof data === 'string') return data
    if (data?.detail) return data.detail
    if (data?.title) return data.title
    return fallback
  }

  const loadSales = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/sales')
      setSales(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(toErrorMessage(err, 'Unable to load sales.'))
    } finally {
      setLoading(false)
    }
  }

  const loadFormData = async () => {
    const [productsRes, membersRes, methodsRes, configRes] = await Promise.all([
      api.get('/products'),
      api.get('/members'),
      api.get('/payment-methods'),
      api.get('/config').catch((err) => {
        if (err?.response?.status === 404) return { data: null }
        throw err
      }),
    ])
    setProducts(Array.isArray(productsRes.data) ? productsRes.data : [])
    setMembers(Array.isArray(membersRes.data) ? membersRes.data : [])
    setMethods(Array.isArray(methodsRes.data) ? methodsRes.data : [])
    setConfig(configRes?.data ?? null)
  }

  const loadCashSummary = async () => {
    try {
      const { data } = await api.get('/cash/summary')
      setCashSummary(data)
    } catch {
      setCashSummary(null)
    }
  }

  useEffect(() => {
    loadSales()
    loadFormData()
    loadCashSummary()
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('new') === '1') {
      openCreate()
      navigate(location.pathname, { replace: true })
    }
  }, [location.pathname, location.search, navigate])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return sales
    return sales.filter((sale) => String(sale.id).includes(term) || sale.status?.toLowerCase().includes(term))
  }, [search, sales])

  const getProductStock = (productId) => {
    const product = products.find((entry) => entry.id === Number(productId))
    return Number(product?.stock ?? 0)
  }

  const openCreate = () => {
    setForm({
      memberId: '',
      receiptNumber: '',
    })
    setItems([])
    setPayments([emptyPayment])
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    const params = new URLSearchParams(location.search)
    if (params.has('new')) {
      params.delete('new')
      const next = params.toString()
      navigate(next ? `${location.pathname}?${next}` : location.pathname, { replace: true })
    }
  }

  const getItemQuantity = (productId) => {
    const item = items.find((entry) => Number(entry.productId) === Number(productId))
    return item ? Number(item.quantity || 0) : 0
  }

  const setItemQuantity = (product, nextQuantity) => {
    const normalized = Math.max(0, Number(nextQuantity || 0))
    const stock = Number(product?.stock ?? 0)
    const capped = stock > 0 ? Math.min(normalized, stock) : 0
    setItems((prev) => {
      const index = prev.findIndex((entry) => Number(entry.productId) === Number(product.id))
      if (capped === 0) {
        return index >= 0 ? prev.filter((_, idx) => idx !== index) : prev
      }
      const nextItem = {
        ...emptyItem,
        productId: String(product.id),
        quantity: String(capped),
        unitPriceUsd: String(product.salePriceUsd ?? ''),
      }
      if (index >= 0) {
        return prev.map((entry, idx) =>
          idx === index ? { ...entry, quantity: String(capped), unitPriceUsd: entry.unitPriceUsd || nextItem.unitPriceUsd } : entry
        )
      }
      return [...prev, nextItem]
    })
  }

  const adjustItemQuantity = (product, delta) => {
    const current = getItemQuantity(product.id)
    setItemQuantity(product, current + delta)
  }

  const taxRate = Number(config?.taxRate ?? 0)
  const getLineTax = (item) => {
    if (item.taxUsd !== '' && item.taxUsd !== null && item.taxUsd !== undefined) {
      return Number(item.taxUsd || 0)
    }
    if (!taxRate) return 0
    const qty = Number(item.quantity || 0)
    const price = Number(item.unitPriceUsd || 0)
    const discount = Number(item.discountUsd || 0)
    const base = qty * price - discount
    if (base <= 0) return 0
    return Math.round(base * taxRate * 100) / 100
  }

  const totals = items.reduce(
    (acc, item) => {
      const qty = Number(item.quantity || 0)
      const price = Number(item.unitPriceUsd || 0)
      const discount = Number(item.discountUsd || 0)
      const tax = getLineTax(item)
      const line = qty * price - discount + tax
      acc.subtotal += qty * price
      acc.discount += discount
      acc.tax += tax
      acc.total += line
      return acc
    },
    { subtotal: 0, discount: 0, tax: 0, total: 0 }
  )

  const paymentTotals = payments.reduce((sum, payment) => sum + Number(payment.amountUsd || 0), 0)
  const remainingBalance = Math.max(0, totals.total - paymentTotals)
  const changeDue = Math.max(0, paymentTotals - totals.total)
  const canAddPayment = totals.total > 0 && paymentTotals < totals.total

  const getMethod = (methodId) => methods.find((method) => method.id === Number(methodId))
  const requiresProof = (methodId) => {
    const method = getMethod(methodId)
    return method ? method.name?.toLowerCase() !== 'cash' : false
  }

  const updatePayment = (index, patch) => {
    setPayments((prev) => prev.map((payment, idx) => (idx === index ? { ...payment, ...patch } : payment)))
  }

  const removePayment = (index) => {
    setPayments((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== index)))
  }

  const addPaymentRow = () => {
    if (!canAddPayment) return
    setPayments((prev) => [...prev, emptyPayment])
  }

  const handleProofChange = (index, file) => {
    if (!file) {
      updatePayment(index, { proofBase64: '', proofName: '' })
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      updatePayment(index, { proofBase64: String(reader.result || ''), proofName: file.name })
    }
    reader.readAsDataURL(file)
  }

  const activeProducts = products.filter((product) => product.isActive)
  const inStockProducts = activeProducts.filter((product) => Number(product.stock ?? 0) > 0)
  const outOfStockProducts = activeProducts.filter((product) => Number(product.stock ?? 0) <= 0)

  const handleSave = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (items.length === 0) {
        setError('Add at least one item.')
        return
      }
      for (const item of items) {
        if (!item.productId || Number(item.quantity) <= 0 || Number(item.unitPriceUsd) <= 0) {
          setError('Each item needs product, quantity, and price.')
          return
        }
      }

      if (payments.length === 0) {
        setError('Add at least one payment.')
        return
      }

      for (const payment of payments) {
        if (!payment.paymentMethodId || Number(payment.amountUsd) <= 0) {
          setError('Each payment needs a method and amount.')
          return
        }
        if (requiresProof(payment.paymentMethodId) && !payment.proofBase64) {
          setError('Upload proof for non-cash payments.')
          return
        }
      }

      if (paymentTotals < totals.total) {
        setError('Payment total must cover the order total.')
        return
      }

      const payload = {
        memberId: form.memberId ? Number(form.memberId) : null,
        subtotalUsd: totals.subtotal,
        discountUsd: totals.discount,
        taxUsd: totals.tax,
        totalUsd: totals.total,
        receiptNumber: form.receiptNumber || null,
        items: items.map((item) => ({
          productId: Number(item.productId),
          quantity: Number(item.quantity),
          unitPriceUsd: Number(item.unitPriceUsd),
          discountUsd: Number(item.discountUsd || 0),
          taxUsd: getLineTax(item),
        })),
      }

      const { data } = await api.post('/sales', payload)
      await api.post(`/sales/${data.id}/payments/batch`, {
        payments: payments.map((payment) => ({
          paymentMethodId: Number(payment.paymentMethodId),
          amountUsd: Number(payment.amountUsd),
          reference: payment.reference || null,
          proofBase64: payment.proofBase64 || null,
        })),
      })
      await loadSales()
      closeModal()
      loadCashSummary()
    } catch (err) {
      setError(toErrorMessage(err, 'Unable to create sale.'))
    } finally {
      setSaving(false)
    }
  }

  const handleRefund = async (saleId) => {
    if (!window.confirm('Refund this sale?')) return
    try {
      await api.post(`/sales/${saleId}/refund`)
      await loadSales()
      loadCashSummary()
    } catch (err) {
      setError(toErrorMessage(err, 'Unable to refund sale.'))
    }
  }

  const openDetails = async (saleId) => {
    setDetailsLoading(true)
    setDetailsOpen(true)
    setDetails(null)
    setError('')
    try {
      const { data } = await api.get(`/sales/${saleId}/details`)
      setDetails(data)
    } catch (err) {
      setError(toErrorMessage(err, 'Unable to load sale details.'))
      setDetailsOpen(false)
    } finally {
      setDetailsLoading(false)
    }
  }

  const closeDetails = () => {
    setDetailsOpen(false)
    setDetails(null)
  }

  const suggestedReceipt = config ? `${config.receiptPrefix ?? ''}${config.nextReceiptNo ?? ''}` : ''

  const formatPrice = (value) => {
    if (value === null || value === undefined || value === '') return '$0.00'
    const numeric = Number(value)
    if (Number.isNaN(numeric)) return '$0.00'
    return `$${numeric.toFixed(2)}`
  }

  const downloadProof = (payment) => {
    if (!payment?.proofBase64) return
    const link = document.createElement('a')
    link.href = payment.proofBase64
    link.download = `sale-${details?.sale?.id ?? 'payment'}-proof.png`
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  const saleStatusClass = (status) => {
    const normalized = String(status || '').toLowerCase()
    if (normalized === 'completed') return 'bg-emerald-50 text-emerald-700'
    if (normalized === 'refunded') return 'bg-rose-50 text-rose-600'
    if (normalized === 'voided') return 'bg-amber-50 text-amber-700'
    return 'bg-slate-100 text-slate-600'
  }

  const detailsPaymentsTotal = details
    ? details.payments.reduce((sum, payment) => sum + Number(payment.amountUsd || 0), 0)
    : 0
  const detailsChangeDue = details ? Math.max(0, detailsPaymentsTotal - Number(details.sale.totalUsd || 0)) : 0


  return (
    <div>
      <PageHeader
        eyebrow="POS"
        title="Sales"
        description="Create tickets, add items, and collect payments."
        actions={
          <button onClick={openCreate} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            New sale
          </button>
        }
      />

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Filter by id or status..."
          className="h-10 w-full max-w-sm rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        />
        <div className="text-sm text-slate-500">{filtered.length} sales</div>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {String(error)}
        </div>
      ) : null}

      {cashSummary ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          Cash in drawer: <span className="font-semibold text-slate-900">{formatPrice(cashSummary.expectedCashUsd)}</span>
        </div>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Sale</th>
              <th className="px-4 py-3">Totals</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-sm text-slate-500" colSpan={5}>
                  Loading sales...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-sm text-slate-500" colSpan={5}>
                  No sales found.
                </td>
              </tr>
            ) : (
              filtered.map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-4 text-slate-900">#{sale.id}</td>
                  <td className="px-4 py-4 text-slate-600">
                    ${sale.totalUsd} <span className="text-xs text-slate-400">({sale.subtotalUsd} subtotal)</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${saleStatusClass(sale.status)}`}>
                      {sale.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-slate-400">{sale.createdAtUtc}</td>
                  <td className="px-4 py-4 text-right">
                    <button
                      onClick={() => openDetails(sale.id)}
                      className="mr-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      Details
                    </button>
                    {sale.status !== 'Refunded' ? (
                      <button
                        onClick={() => handleRefund(sale.id)}
                        className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                      >
                        Refund
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen ? (
        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-display text-xl text-slate-900">New sale</h3>
              <p className="mt-1 text-sm text-slate-500">Create a ticket with items.</p>
            </div>
            <button onClick={closeModal} className="text-sm text-slate-500 hover:text-slate-900">
              Close
            </button>
          </div>

          <form onSubmit={handleSave} className="mt-6 space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Member</label>
                  <select
                    value={form.memberId}
                    onChange={(event) => setForm({ ...form, memberId: event.target.value })}
                    className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="">Walk-in</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.fullName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Receipt #</label>
                  <input
                    value={form.receiptNumber}
                    onChange={(event) => setForm({ ...form, receiptNumber: event.target.value })}
                    className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  />
                  {suggestedReceipt && !form.receiptNumber ? (
                    <p className="mt-1 text-xs text-slate-400">Auto: {suggestedReceipt}</p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Products</p>
                    <p className="mt-1 text-sm text-slate-500">Tap to add items to the sale.</p>
                  </div>
                  <div className="text-sm text-slate-500">
                    {products.filter((product) => product.isActive).length} items
                  </div>
                </div>

                {activeProducts.length === 0 ? (
                  <div className="mt-6 text-sm text-slate-500">No active products yet.</div>
                ) : (
                  <>
                    {inStockProducts.length === 0 ? (
                      <div className="mt-6 text-sm text-slate-500">All products are out of stock.</div>
                    ) : (
                      <div className="mt-6 grid grid-cols-1 gap-y-12 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-4 xl:gap-x-8">
                        {inStockProducts.map((product) => {
                        const quantity = getItemQuantity(product.id)
                        const stock = Number(product.stock ?? 0)
                        const canAdd = stock > 0
                        return (
                          <div key={product.id}>
                            <div className="relative">
                              <div className="relative h-64 w-full overflow-hidden rounded-lg bg-slate-100">
                                {product.photoBase64 ? (
                                  <img
                                    alt={product.name}
                                    src={product.photoBase64}
                                    className="size-full object-contain p-3"
                                  />
                                ) : (
                                  <div className="flex size-full items-center justify-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                                    No photo
                                  </div>
                                )}
                              </div>
                              <div className="relative mt-4">
                                <h3 className="text-sm font-medium text-slate-900">{product.name}</h3>
                                <p className="mt-1 text-sm text-slate-500">{product.category || 'Uncategorized'}</p>
                                <p className="mt-1 text-xs text-slate-500">Stock: {product.stock ?? 0}</p>
                              </div>
                              <div className="absolute inset-x-0 top-0 flex h-64 items-end justify-end overflow-hidden rounded-lg p-4">
                                <div
                                  aria-hidden="true"
                                  className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black opacity-60"
                                />
                                <p className="relative text-lg font-semibold text-white">
                                  {formatPrice(product.salePriceUsd)}
                                </p>
                              </div>
                            </div>
                            <div className="mt-6 flex items-center justify-between">
                              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                                Qty
                              </span>
                              <div className="inline-flex items-center rounded-full border border-slate-200 bg-white">
                                <button
                                  type="button"
                                  onClick={() => adjustItemQuantity(product, -1)}
                                  disabled={quantity <= 0}
                                  className="h-9 w-9 text-lg font-semibold text-slate-600 disabled:opacity-40"
                                >
                                  -
                                </button>
                                <span className="w-8 text-center text-sm font-semibold text-slate-900">
                                  {quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => adjustItemQuantity(product, 1)}
                                  disabled={!canAdd || quantity >= stock}
                                  className="h-9 w-9 text-lg font-semibold text-slate-600 disabled:opacity-40"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                      </div>
                    )}

                    {outOfStockProducts.length > 0 ? (
                      <div className="mt-10">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Out of stock
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowOutOfStock((prev) => !prev)}
                            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                          >
                            {showOutOfStock ? 'Hide' : 'Show'}
                          </button>
                        </div>
                        {showOutOfStock ? (
                          <div className="mt-4 grid grid-cols-1 gap-y-12 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-4 xl:gap-x-8">
                            {outOfStockProducts.map((product) => (
                              <div key={product.id}>
                                <div className="relative">
                                  <div className="relative h-64 w-full overflow-hidden rounded-lg bg-slate-100">
                                    {product.photoBase64 ? (
                                      <img
                                        alt={product.name}
                                        src={product.photoBase64}
                                        className="size-full object-contain p-3"
                                      />
                                    ) : (
                                      <div className="flex size-full items-center justify-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                                        No photo
                                      </div>
                                    )}
                                  </div>
                                  <div className="relative mt-4">
                                    <h3 className="text-sm font-medium text-slate-900">{product.name}</h3>
                                    <p className="mt-1 text-sm text-slate-500">{product.category || 'Uncategorized'}</p>
                                    <span className="mt-2 inline-flex items-center rounded-full bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-600">
                                      Out of stock
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </>
                )}

                <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-lg font-semibold text-slate-900">Shopping cart</h4>
                      <p className="mt-1 text-sm text-slate-500">Items ready for checkout.</p>
                    </div>
                    <div className="text-sm text-slate-500">{items.length} items</div>
                  </div>

                  <div className="mt-6 lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-8">
                    <section aria-label="Cart items" className="lg:col-span-7">
                      {items.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                          No items selected yet.
                        </div>
                      ) : (
                        <ul role="list" className="divide-y divide-slate-200 border-y border-slate-200">
                          {items.map((item) => {
                            const product = products.find((entry) => entry.id === Number(item.productId))
                            const stock = product ? getProductStock(product.id) : 0
                            const isInStock = stock > 0
                            const maxQty = stock > 0 ? Math.min(10, Math.floor(stock)) : 0
                            const qtyOptions = maxQty > 0 ? Array.from({ length: maxQty }, (_, index) => index + 1) : [0]
                            const qty = Number(item.quantity || 0)
                            const price = Number(item.unitPriceUsd || 0)
                            const discount = Number(item.discountUsd || 0)
                            const tax = getLineTax(item)
                            const lineTotal = qty * price - discount + tax
                            return (
                              <li key={item.productId} className="flex py-6">
                                <div className="shrink-0">
                                  {product?.photoBase64 ? (
                                    <img
                                      alt={product?.name ?? 'Product'}
                                      src={product.photoBase64}
                                      className="h-20 w-20 rounded-md object-contain p-2 sm:h-28 sm:w-28"
                                    />
                                  ) : (
                                    <div className="flex h-20 w-20 items-center justify-center rounded-md bg-slate-100 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 sm:h-28 sm:w-28">
                                      No photo
                                    </div>
                                  )}
                                </div>

                                <div className="ml-4 flex flex-1 flex-col justify-between sm:ml-6">
                                  <div className="relative pr-10 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:pr-0">
                                    <div>
                                      <div className="flex justify-between">
                                        <h3 className="text-sm font-medium text-slate-900">
                                          {product?.name ?? `Product #${item.productId}`}
                                        </h3>
                                      </div>
                                      <div className="mt-1 flex text-sm text-slate-500">
                                        <p>{product?.category || 'Uncategorized'}</p>
                                      </div>
                                      <p className="mt-1 text-sm font-semibold text-slate-900">{formatPrice(price)}</p>
                                    </div>

                                    <div className="mt-4 sm:mt-0 sm:pr-9">
                                      <div className="grid w-full max-w-16 grid-cols-1">
                                        <select
                                          value={qty}
                                          onChange={(event) =>
                                            product ? setItemQuantity(product, Number(event.target.value)) : null
                                          }
                                          disabled={stock <= 0}
                                          className="col-start-1 row-start-1 appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-slate-900 outline-1 -outline-offset-1 outline-slate-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 disabled:opacity-50 sm:text-sm/6"
                                        >
                                          {qtyOptions.map((option) => (
                                            <option key={option} value={option}>
                                              {option}
                                            </option>
                                          ))}
                                        </select>
                                        <ChevronDownIcon
                                          aria-hidden="true"
                                          className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-slate-500 sm:size-4"
                                        />
                                      </div>

                                      <div className="absolute right-0 top-0">
                                        <button
                                          type="button"
                                          onClick={() => (product ? setItemQuantity(product, 0) : null)}
                                          className="-m-2 inline-flex p-2 text-slate-400 hover:text-slate-500"
                                        >
                                          <span className="sr-only">Remove</span>
                                          <XMarkIcon aria-hidden="true" className="size-5" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
                                    <span className="flex items-center gap-2">
                                      {isInStock ? (
                                        <CheckIcon aria-hidden="true" className="size-5 text-emerald-500" />
                                      ) : (
                                        <XMarkIcon aria-hidden="true" className="size-5 text-rose-500" />
                                      )}
                                      {isInStock ? `In stock (${stock})` : 'Out of stock'}
                                    </span>
                                    <span className="text-sm font-semibold text-slate-900">{formatPrice(lineTotal)}</span>
                                  </div>
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </section>

                    <section aria-label="Order summary" className="mt-10 rounded-lg bg-slate-50 px-4 py-6 sm:p-6 lg:col-span-5 lg:mt-0 lg:p-8">
                      <h4 className="text-base font-semibold text-slate-900">Order summary</h4>
                      <dl className="mt-6 space-y-4 text-sm">
                        <div className="flex items-center justify-between">
                          <dt className="text-slate-600">Subtotal</dt>
                          <dd className="font-medium text-slate-900">{formatPrice(totals.subtotal)}</dd>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                          <dt className="text-slate-600">Discount</dt>
                          <dd className="font-medium text-slate-900">{formatPrice(totals.discount)}</dd>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                          <dt className="text-slate-600">Tax</dt>
                          <dd className="font-medium text-slate-900">{formatPrice(totals.tax)}</dd>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                          <dt className="text-base font-semibold text-slate-900">Order total</dt>
                          <dd className="text-base font-semibold text-slate-900">{formatPrice(totals.total)}</dd>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                          <dt className="text-slate-600">Paid</dt>
                          <dd className="font-medium text-slate-900">{formatPrice(paymentTotals)}</dd>
                        </div>
                        <div className="flex items-center justify-between">
                          <dt className="text-slate-600">Remaining</dt>
                          <dd className="font-medium text-slate-900">{formatPrice(remainingBalance)}</dd>
                        </div>
                        <div className="flex items-center justify-between">
                          <dt className="text-slate-600">Change due</dt>
                          <dd className="font-medium text-slate-900">{formatPrice(changeDue)}</dd>
                        </div>
                      </dl>
                    </section>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Payments</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Add payment methods until the total is covered.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addPaymentRow}
                    disabled={!canAddPayment}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 disabled:opacity-50"
                  >
                    Add method
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  {payments.map((payment, index) => {
                    const showProof = requiresProof(payment.paymentMethodId)
                    return (
                      <div key={`${payment.paymentMethodId}-${index}`} className="grid gap-4 sm:grid-cols-4">
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Method</label>
                          <select
                            value={payment.paymentMethodId}
                            onChange={(event) =>
                              updatePayment(index, { paymentMethodId: event.target.value, proofBase64: '', proofName: '' })
                            }
                            className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                          >
                            <option value="">Select method</option>
                            {methods.map((method) => (
                              <option key={method.id} value={method.id}>
                                {method.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Amount</label>
                          <input
                            type="number"
                            step="0.01"
                            value={payment.amountUsd}
                            onChange={(event) => updatePayment(index, { amountUsd: event.target.value })}
                            className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Reference</label>
                          <input
                            value={payment.reference}
                            onChange={(event) => updatePayment(index, { reference: event.target.value })}
                            className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                          />
                        </div>
                        <div className="flex items-end gap-2">
                          <button
                            type="button"
                            onClick={() => removePayment(index)}
                            disabled={payments.length <= 1}
                            className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </div>
                        {showProof ? (
                          <div className="sm:col-span-4">
                            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                              Proof (required)
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(event) => handleProofChange(index, event.target.files?.[0] ?? null)}
                              className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                            />
                            {payment.proofName ? (
                              <p className="mt-1 text-xs text-slate-500">Selected: {payment.proofName}</p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
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
                  {saving ? 'Saving...' : 'Create sale'}
                </button>
              </div>
            </form>
        </div>
      ) : null}

      {detailsOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 text-center sm:items-center">
          <div className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white p-6 text-left shadow-xl transition-all">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-xl text-slate-900">Sale details</h3>
                <p className="mt-1 text-sm text-slate-500">Items and payments for this ticket.</p>
              </div>
              <button onClick={closeDetails} className="text-sm text-slate-500 hover:text-slate-900">
                Close
              </button>
            </div>

            {detailsLoading ? (
              <div className="mt-6 text-sm text-slate-500">Loading details...</div>
            ) : details ? (
              <div className="mt-6 space-y-6">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Items</h4>
                  <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Product</th>
                          <th className="px-4 py-3">Qty</th>
                          <th className="px-4 py-3">Price</th>
                          <th className="px-4 py-3">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {details.items.length === 0 ? (
                          <tr>
                            <td className="px-4 py-4 text-sm text-slate-500" colSpan={4}>
                              No items.
                            </td>
                          </tr>
                        ) : (
                          details.items.map((item) => {
                            const product = products.find((p) => p.id === item.productId)
                            return (
                              <tr key={item.id}>
                                <td className="px-4 py-4 text-slate-900">
                                  {product?.name ?? `Product #${item.productId}`}
                                </td>
                                <td className="px-4 py-4 text-slate-600">{item.quantity}</td>
                                <td className="px-4 py-4 text-slate-600">${item.unitPriceUsd}</td>
                                <td className="px-4 py-4 text-slate-600">${item.lineTotalUsd}</td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Payments</h4>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      Order total: <span className="font-semibold text-slate-900">{formatPrice(details.sale.totalUsd)}</span>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      Paid: <span className="font-semibold text-slate-900">{formatPrice(detailsPaymentsTotal)}</span>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      Change due: <span className="font-semibold text-slate-900">{formatPrice(detailsChangeDue)}</span>
                    </div>
                  </div>
                  <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Method</th>
                          <th className="px-4 py-3">Amount</th>
                          <th className="px-4 py-3">Paid at</th>
                          <th className="px-4 py-3 text-right">Proof</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {details.payments.length === 0 ? (
                          <tr>
                            <td className="px-4 py-4 text-sm text-slate-500" colSpan={4}>
                              No payments.
                            </td>
                          </tr>
                        ) : (
                          details.payments.map((payment) => {
                            return (
                              <tr key={payment.id}>
                                <td className="px-4 py-4 text-slate-900">
                                  {payment.paymentMethodName ?? `Method #${payment.paymentMethodId}`}
                                </td>
                                <td className="px-4 py-4 text-slate-600">${payment.amountUsd}</td>
                                <td className="px-4 py-4 text-slate-500">{payment.paidAtUtc}</td>
                                <td className="px-4 py-4 text-right">
                                  {payment.proofBase64 &&
                                  String(payment.paymentMethodName || '').toLowerCase() !== 'cash' ? (
                                    <button
                                      onClick={() => downloadProof(payment)}
                                      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                                    >
                                      Download proof
                                    </button>
                                  ) : (
                                    <span className="text-xs text-slate-400">--</span>
                                  )}
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 text-sm text-slate-500">No details available.</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
