import { useState, useEffect } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { StatusBadge, RoleBadge, EmptyState, ConfirmModal } from '../../components/ui'
import { useToast } from '../../context/ToastContext'
import { fmtDate, fmtTime, fmtPKR } from '../../utils'
import api from '../../api/axios'

// ── Admin Dashboard ───────────────────────────────────────────
export function AdminDashboard() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    api.get('/admin/stats').then(({ data }) => setStats(data)).catch(() => {})
  }, [])

  const CARDS = [
    { label: 'Total Users', val: stats?.totalUsers, bg: '#eff6ff', color: '#2563eb', icon: '👥' },
    { label: 'Businesses', val: stats?.totalBusinesses, bg: '#f3e8ff', color: '#7c3aed', icon: '🏢' },
    { label: 'Appointments', val: stats?.totalAppointments, bg: '#fef9c3', color: '#a16207', icon: '📅' },
    { label: 'Platform Revenue', val: fmtPKR(stats?.totalRevenue), bg: '#f0fdf4', color: '#166534', icon: '💰' },
  ]

  return (
    <AppLayout title="Admin Dashboard" subtitle="Platform-wide overview">
      <div className="stats-grid">
        {CARDS.map(c => (
          <div key={c.label} className="stat-card">
            <div className="stat-icon" style={{ background: c.bg }}>
              <span style={{ fontSize: '1.4rem' }}>{c.icon}</span>
            </div>
            <div>
              <div className="stat-num" style={{ color: c.color, fontSize: c.label === 'Platform Revenue' ? '1.2rem' : '1.8rem' }}>{c.val ?? '—'}</div>
              <div className="stat-label">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <div className="card-title">Role Breakdown</div>
          {[
            { label: 'Super Admins', val: 1, color: '#7c3aed', bg: '#f3e8ff' },
            { label: 'Business Owners', val: stats?.totalOwners, color: '#c2410c', bg: '#fff3e8' },
            { label: 'Customers', val: stats?.totalCustomers, color: '#166534', bg: '#f0fdf4' },
          ].map(r => (
            <div key={r.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '.88rem', color: 'var(--text-muted)' }}>{r.label}</span>
              <span style={{ fontWeight: 800, fontSize: '1.1rem', background: r.bg, color: r.color, padding: '2px 12px', borderRadius: 99 }}>{r.val ?? '—'}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-title">Platform Health</div>
          {[
            { label: 'Active Businesses', val: stats?.totalBusinesses, icon: '✅' },
            { label: 'Total Appointments', val: stats?.totalAppointments, icon: '📅' },
            { label: 'Total Revenue', val: fmtPKR(stats?.totalRevenue), icon: '💰' },
          ].map(r => (
            <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '1.3rem' }}>{r.icon}</span>
              <span style={{ flex: 1, fontSize: '.88rem', color: 'var(--text-muted)' }}>{r.label}</span>
              <span style={{ fontWeight: 700 }}>{r.val ?? '—'}</span>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}

// ── Admin: All Businesses ─────────────────────────────────────
export function AdminBusinesses() {
  const [businesses, setBusinesses] = useState([])
  const [suspendId, setSuspendId] = useState(null)
  const [suspendActive, setSuspendActive] = useState(false)
  const { toast } = useToast()

  const load = () => api.get('/admin/businesses').then(({ data }) => setBusinesses(data)).catch(() => {})
  useEffect(() => { load() }, [])

  const toggleSuspend = async () => {
    try {
      const { data } = await api.patch(`/admin/businesses/${suspendId}/suspend`)
      toast(data.message)
      load()
    } catch (e) { toast(e.response?.data?.error || 'Failed', 'error') }
    setSuspendId(null)
  }

  const openSuspend = (biz) => { setSuspendId(biz.id); setSuspendActive(!!biz.is_active) }

  return (
    <AppLayout title="All Businesses" subtitle="Manage all registered businesses on the platform">
      <div className="card">
        {businesses.length === 0
          ? <EmptyState icon="🏢" title="No businesses yet" />
          : <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Business</th><th>Owner</th><th>Category</th><th>Services</th><th>Bookings</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {businesses.map(b => (
                    <tr key={b.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{b.name}</div>
                        <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>{b.address}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '.85rem' }}>{b.owner_name}</div>
                        <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>{b.owner_email}</div>
                      </td>
                      <td><span style={{ fontSize: '.75rem', background: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>{b.category}</span></td>
                      <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{b.services}</td>
                      <td style={{ fontWeight: 600 }}>{b.bookings}</td>
                      <td><span className={`badge ${b.is_active ? 'badge-active' : 'badge-suspended'}`}>{b.is_active ? 'Active' : 'Suspended'}</span></td>
                      <td>
                        <button className={`btn btn-sm ${b.is_active ? 'btn-danger' : 'btn-success'}`} onClick={() => openSuspend(b)}>
                          {b.is_active ? 'Suspend' : 'Reactivate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </div>
      <ConfirmModal open={!!suspendId} onClose={() => setSuspendId(null)} onConfirm={toggleSuspend}
        title={suspendActive ? 'Suspend Business' : 'Reactivate Business'}
        message={suspendActive ? 'This will prevent customers from seeing this business.' : 'This will make the business visible and bookable again.'}
        danger={suspendActive} />
    </AppLayout>
  )
}

// ── Admin: All Users ──────────────────────────────────────────
export function AdminUsers() {
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [toggleId, setToggleId] = useState(null)
  const [toggleActive, setToggleActive] = useState(false)
  const { toast } = useToast()

  const load = () => api.get('/admin/users').then(({ data }) => setUsers(data)).catch(() => {})
  useEffect(() => { load() }, [])

  const toggleUser = async () => {
    try {
      const { data } = await api.patch(`/admin/users/${toggleId}/toggle`)
      toast(data.message); load()
    } catch (e) { toast(e.response?.data?.error || 'Failed', 'error') }
    setToggleId(null)
  }

  const shown = users.filter(u => {
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
    return matchRole && matchSearch
  })

  return (
    <AppLayout title="All Users" subtitle="Manage platform users">
      <div className="card" style={{ marginBottom: 16, padding: '14px 20px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="tab-row">
            {['all', 'super_admin', 'business_owner', 'customer'].map(r => (
              <button key={r} className={`tab-btn${roleFilter === r ? ' active' : ''}`} onClick={() => setRoleFilter(r)}>
                {r === 'all' ? `All (${users.length})` : r.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </button>
            ))}
          </div>
          <div className="search-box" style={{ marginLeft: 'auto' }}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" /></svg>
            <input type="text" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>
      <div className="card">
        {shown.length === 0
          ? <EmptyState icon="👥" title="No users found" />
          : <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>User</th><th>Role</th><th>Phone</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
                <tbody>
                  {shown.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="avatar">{u.name[0]}</div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{u.name}</div>
                            <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td><RoleBadge role={u.role} /></td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '.83rem' }}>{u.phone || '—'}</td>
                      <td><span className={`badge ${u.is_active ? 'badge-active' : 'badge-suspended'}`}>{u.is_active ? 'Active' : 'Suspended'}</span></td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>{fmtDate(u.created_at)}</td>
                      <td>
                        {u.role !== 'super_admin' && (
                          <button className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-success'}`}
                            onClick={() => { setToggleId(u.id); setToggleActive(!!u.is_active) }}>
                            {u.is_active ? 'Suspend' : 'Reactivate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </div>
      <ConfirmModal open={!!toggleId} onClose={() => setToggleId(null)} onConfirm={toggleUser}
        title={toggleActive ? 'Suspend User' : 'Reactivate User'}
        message={toggleActive ? 'This user will not be able to log in.' : 'This user will be able to log in again.'}
        danger={toggleActive} />
    </AppLayout>
  )
}

// ── Admin: All Appointments ───────────────────────────────────
export function AdminAppointments() {
  const [appts, setAppts] = useState([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => { api.get('/appointments').then(({ data }) => setAppts(data)).catch(() => {}) }, [])

  const shown = appts.filter(a => {
    const matchStatus = filter === 'all' || a.status === filter
    const matchSearch = !search || a.customer_name?.toLowerCase().includes(search.toLowerCase()) || a.service_name?.toLowerCase().includes(search.toLowerCase()) || a.business_name?.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  return (
    <AppLayout title="All Appointments" subtitle="Platform-wide appointment overview">
      <div className="card" style={{ marginBottom: 16, padding: '14px 20px' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="tab-row">
            {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map(f => (
              <button key={f} className={`tab-btn${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
                {f === 'all' ? `All (${appts.length})` : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <div className="search-box" style={{ marginLeft: 'auto' }}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" /></svg>
            <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>
      <div className="card">
        {shown.length === 0
          ? <EmptyState icon="📅" title="No appointments found" />
          : <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Customer</th><th>Service</th><th>Business</th><th>Date & Time</th><th>Price</th><th>Status</th></tr></thead>
                <tbody>
                  {shown.map(a => (
                    <tr key={a.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{a.customer_name}</div>
                        <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>{a.customer_phone}</div>
                      </td>
                      <td>{a.service_name}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{a.business_name}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{fmtDate(a.date)}</div>
                        <div style={{ color: 'var(--primary)', fontSize: '.78rem' }}>{fmtTime(a.time)}</div>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--orange)' }}>{fmtPKR(a.price)}</td>
                      <td><StatusBadge status={a.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </div>
    </AppLayout>
  )
}
