import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios.js'
import PageHeader from '../ui/PageHeader.jsx'

export default function Products() {
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(8)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const fetchProducts = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/products')
      setProducts(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err?.response?.data ?? 'Unable to load products.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return products
    return products.filter((product) => {
      return (
        product.name?.toLowerCase().includes(term) ||
        product.sku?.toLowerCase().includes(term) ||
        product.category?.toLowerCase().includes(term)
      )
    })
  }, [search, products])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize)

  const handleDelete = async (productId) => {
    if (!window.confirm('Disable this product?')) return
    try {
      await api.delete(`/products/${productId}`)
      await fetchProducts()
    } catch (err) {
      setError(err?.response?.data ?? 'Unable to delete product.')
    }
  }

  const formatPrice = (value) => {
    if (value === null || value === undefined || value === '') return '$0.00'
    const numeric = Number(value)
    if (Number.isNaN(numeric)) return '$0.00'
    return `$${numeric.toFixed(2)}`
  }

  return (
    <div>
      <PageHeader
        eyebrow="Inventory"
        title="Products"
        description="Manage supplements, accessories, and retail items."
        actions={
          <button
            onClick={() => navigate('/products/new')}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Add product
          </button>
        }
      />

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
          placeholder="Search products..."
          className="h-10 w-full max-w-sm rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        />
        <div className="text-sm text-slate-500">
          {filtered.length} products - page {page} of {totalPages}
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {String(error)}
        </div>
      ) : null}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
        {loading ? (
          <div className="text-sm text-slate-500">Loading products...</div>
        ) : paged.length === 0 ? (
          <div className="text-sm text-slate-500">No products found.</div>
        ) : (
          <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
            {paged.map((product) => (
              <div key={product.id} className="group relative">
                {product.photoBase64 ? (
                  <img
                    alt={product.name}
                    src={product.photoBase64}
                    className="aspect-square w-full rounded-md bg-slate-100 object-cover group-hover:opacity-90 lg:aspect-auto lg:h-72"
                  />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center rounded-md bg-slate-100 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 lg:aspect-auto lg:h-72">
                    No photo
                  </div>
                )}
                <div className="mt-4 flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{product.name}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {product.category || 'Uncategorized'} - SKU {product.sku}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{formatPrice(product.salePriceUsd)}</p>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      product.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'
                    }`}
                  >
                    {product.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      onClick={() => navigate(`/products/${product.id}`)}
                      className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="rounded-full border border-rose-200 px-3 py-1 font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      Disable
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between text-sm text-slate-500">
        <button
          disabled={page <= 1}
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          className="rounded-full border border-slate-200 px-4 py-2 disabled:opacity-50"
        >
          Prev
        </button>
        <button
          disabled={page >= totalPages}
          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          className="rounded-full border border-slate-200 px-4 py-2 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  )
}
