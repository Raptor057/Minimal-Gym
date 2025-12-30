import { useEffect, useMemo, useState } from 'react'
import api from '../api/axios.js'
import PageHeader from '../ui/PageHeader.jsx'

const emptyItem = { productId: '', quantity: '1', unitPriceUsd: '', discountUsd: '0', taxUsd: '' }

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
  const [items, setItems] = useState([emptyItem])
  const [form, setForm] = useState({
    memberId: '',
    receiptNumber: '',
    paymentMethodId: '',
    paymentAmountUsd: '',
    paymentReference: '',
  })
  const [saving, setSaving] = useState(false)

  const loadSales = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/sales')
      setSales(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err?.response?.data ?? 'Unable to load sales.')
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

  useEffect(() => {
    loadSales()
    loadFormData()
  }, [])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return sales
    return sales.filter((sale) => String(sale.id).includes(term) || sale.status?.toLowerCase().includes(term))
  }, [search, sales])

  const openCreate = () => {
    setForm({
      memberId: '',
      receiptNumber: '',
      paymentMethodId: '',
      paymentAmountUsd: '',
      paymentReference: '',
    })
    setItems([emptyItem])
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
  }

  const updateItem = (index, patch) => {
    setItems((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)))
  }

  const addItem = () => setItems((prev) => [...prev, emptyItem])

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index))
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

      const wantsPayment = form.paymentMethodId || form.paymentAmountUsd || form.paymentReference
      if (wantsPayment) {
        if (!form.paymentMethodId || Number(form.paymentAmountUsd) <= 0) {
          setError('Select a payment method and amount to collect payment.')
          return
        }
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
      if (wantsPayment) {
        await api.post(`/sales/${data.id}/payments`, {
          paymentMethodId: Number(form.paymentMethodId),
          amountUsd: Number(form.paymentAmountUsd),
          reference: form.paymentReference || null,
        })
      }
      await loadSales()
      closeModal()
    } catch (err) {
      setError(err?.response?.data ?? 'Unable to create sale.')
    } finally {
      setSaving(false)
    }
  }

  const handleRefund = async (saleId) => {
    if (!window.confirm('Refund this sale?')) return
    try {
      await api.post(`/sales/${saleId}/refund`)
      await loadSales()
    } catch (err) {
      setError(err?.response?.data ?? 'Unable to refund sale.')
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
      setError(err?.response?.data ?? 'Unable to load sale details.')
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
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
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
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 text-center sm:items-center">
          <div className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left shadow-xl transition-all">
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

              <div className="rounded-2xl border border-slate-200">
                <div className="grid grid-cols-12 gap-2 bg-slate-50 px-4 py-3 text-xs uppercase tracking-[0.2em] text-slate-500">
                  <div className="col-span-4">Product</div>
                  <div className="col-span-2">Qty</div>
                  <div className="col-span-2">Price</div>
                  <div className="col-span-2">Discount</div>
                  <div className="col-span-1">Tax</div>
                  <div className="col-span-1"></div>
                </div>
                <div className="divide-y divide-slate-100">
                  {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 px-4 py-3 text-sm">
                      <div className="col-span-4">
                        <select
                          value={item.productId}
                          onChange={(event) => updateItem(index, { productId: event.target.value })}
                          className="w-full rounded-md border border-slate-200 px-2 py-2 text-sm"
                        >
                          <option value="">Select product</option>
                          {products.filter((p) => p.isActive).map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          step="0.01"
                          value={item.quantity}
                          onChange={(event) => updateItem(index, { quantity: event.target.value })}
                          className="w-full rounded-md border border-slate-200 px-2 py-2 text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          step="0.01"
                          value={item.unitPriceUsd}
                          onChange={(event) => updateItem(index, { unitPriceUsd: event.target.value })}
                          className="w-full rounded-md border border-slate-200 px-2 py-2 text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          step="0.01"
                          value={item.discountUsd}
                          onChange={(event) => updateItem(index, { discountUsd: event.target.value })}
                          className="w-full rounded-md border border-slate-200 px-2 py-2 text-sm"
                        />
                      </div>
                      <div className="col-span-1">
                        <input
                          type="number"
                          step="0.01"
                          value={item.taxUsd}
                          onChange={(event) => updateItem(index, { taxUsd: event.target.value })}
                          className="w-full rounded-md border border-slate-200 px-2 py-2 text-sm"
                        />
                      </div>
                      <div className="col-span-1 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-xs font-semibold text-rose-500 hover:text-rose-700"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between px-4 py-3 text-sm">
                  <button type="button" onClick={addItem} className="text-xs font-semibold text-indigo-600">
                    + Add item
                  </button>
                  <div className="text-sm text-slate-600">
                    Total: <span className="font-semibold text-slate-900">${totals.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
                <div className="sm:col-span-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Payment (optional)</p>
                  <p className="mt-1 text-sm text-slate-500">Collect payment now or leave it unpaid.</p>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Method</label>
                  <select
                    value={form.paymentMethodId}
                    onChange={(event) => setForm({ ...form, paymentMethodId: event.target.value })}
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
                    value={form.paymentAmountUsd}
                    onChange={(event) => setForm({ ...form, paymentAmountUsd: event.target.value })}
                    className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Reference</label>
                  <input
                    value={form.paymentReference}
                    onChange={(event) => setForm({ ...form, paymentReference: event.target.value })}
                    className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  />
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
                  <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Method</th>
                          <th className="px-4 py-3">Amount</th>
                          <th className="px-4 py-3">Paid at</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {details.payments.length === 0 ? (
                          <tr>
                            <td className="px-4 py-4 text-sm text-slate-500" colSpan={3}>
                              No payments.
                            </td>
                          </tr>
                        ) : (
                          details.payments.map((payment) => {
                            const method = methods.find((m) => m.id === payment.paymentMethodId)
                            return (
                              <tr key={payment.id}>
                                <td className="px-4 py-4 text-slate-900">
                                  {method?.name ?? `Method #${payment.paymentMethodId}`}
                                </td>
                                <td className="px-4 py-4 text-slate-600">${payment.amountUsd}</td>
                                <td className="px-4 py-4 text-slate-500">{payment.paidAtUtc}</td>
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
