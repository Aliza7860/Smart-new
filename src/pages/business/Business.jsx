import { useState, useEffect } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import { StatusBadge, EmptyState, Modal, ConfirmModal } from '../../components/ui'
import { useToast } from '../../context/ToastContext'
import { fmtDate, fmtTime, fmtPKR, catEmoji } from '../../utils'
import api from '../../api/axios'

function getBid() {
  try {
    const token = localStorage.getItem('sb_token')
    if (!token) return null
    return JSON.parse(atob(token.split('.')[1])).businessId
  } catch { return null }
}

// ── Business Dashboard ────────────────────────────────────────
export function BusinessDashboard() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const bid = getBid()
    if (!bid) { setLoading(false); return }
    api.get(`/businesses/${bid}/analytics`)
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <AppLayout title="Dashboard"><div className="page-loader"><span className="loader loader-dark loader-lg" /></div></AppLayout>

  const CARDS = [
    { label: 'Total Bookings', val: data?.total,     bg: '#eff6ff', color: '#2563eb', icon: '📊' },
    { label: 'Upcoming',       val: data?.upcoming,  bg: '#fef9c3', color: '#a16207', icon: '📅' },
    { label: 'Completed',      val: data?.completed, bg: '#dcfce7', color: '#166534', icon: '✅' },
    { label: 'Total Revenue',  val: fmtPKR(data?.revenue), bg: '#f0fdf4', color: '#166534', icon: '💰' },
  ]

  return (
    <AppLayout title="Business Dashboard" subtitle="Your business performance at a glance">
      <div className="stats-grid">
        {CARDS.map(c => (
          <div key={c.label} className="stat-card">
            <div className="stat-icon" style={{ background: c.bg }}>
              <span style={{ fontSize: '1.4rem' }}>{c.icon}</span>
            </div>
            <div>
              <div className="stat-num" style={{ color: c.color, fontSize: c.label === 'Total Revenue' ? '1.2rem' : '1.8rem' }}>{c.val ?? '—'}</div>
              <div className="stat-label">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
        <div className="card">
          <div className="card-title">Recent Appointments</div>
          {!data?.recentAppointments?.length
            ? <EmptyState icon="📅" title="No appointments yet" desc="Appointments will appear here when customers book your services." />
            : <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Customer</th><th>Service</th><th>Date & Time</th><th>Price</th><th>Status</th></tr></thead>
                  <tbody>
                    {data.recentAppointments.map(a => (
                      <tr key={a.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{a.customer_name}</div>
                          <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>{a.customer_phone}</div>
                        </td>
                        <td>{a.service_name}</td>
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-title">Summary</div>
            {[
              { label: 'Total Customers', val: data?.customers },
              { label: 'Cancelled',       val: data?.cancelled },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>{r.label}</span>
                <span style={{ fontWeight: 700 }}>{r.val ?? '—'}</span>
              </div>
            ))}
          </div>
          {data?.topServices?.length > 0 && (
            <div className="card">
              <div className="card-title">Top Services</div>
              {data.topServices.map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: '.83rem' }}>
                  <span>{s.name}</span>
                  <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{s.bookings} bookings</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}

// ── Business Appointments ─────────────────────────────────────
export function BusinessAppointments() {
  const [appts, setAppts]     = useState([])
  const [filter, setFilter]   = useState('all')
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [actionId, setActionId]       = useState(null)
  const [actionStatus, setActionStatus] = useState('')
  const { toast } = useToast()

  const load = () => {
    setLoading(true)
    api.get('/appointments')
      .then(({ data }) => setAppts(Array.isArray(data) ? data : []))
      .catch(() => setAppts([]))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const updateStatus = async () => {
    try {
      await api.patch(`/appointments/${actionId}/status`, { status: actionStatus })
      toast(`Appointment ${actionStatus}!`)
      load()
    } catch (e) { toast(e.response?.data?.error || 'Failed', 'error') }
    setActionId(null)
  }

  const act = (id, status) => { setActionId(id); setActionStatus(status) }

  const FILTERS = ['all', 'pending', 'confirmed', 'completed', 'cancelled']
  const counts  = FILTERS.reduce((acc, f) => { acc[f] = f === 'all' ? appts.length : appts.filter(a => a.status === f).length; return acc }, {})

  const shown = appts.filter(a => {
    const matchStatus = filter === 'all' || a.status === filter
    const matchSearch = !search ||
      a.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.service_name?.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  return (
    <AppLayout title="Appointments" subtitle="Manage all customer bookings for your business">
      {/* Filters + search */}
      <div className="card" style={{ marginBottom: 16, padding: '14px 20px' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="tab-row" style={{ flex: 1 }}>
            {FILTERS.map(f => (
              <button key={f} className={`tab-btn${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                <span style={{ marginLeft: 6, background: filter === f ? 'rgba(255,255,255,.3)' : 'var(--border)', borderRadius: 99, padding: '1px 7px', fontSize: '.72rem', fontWeight: 700 }}>
                  {counts[f]}
                </span>
              </button>
            ))}
          </div>
          <div className="search-box">
            <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
            <input type="text" placeholder="Search customer or service..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card">
        {loading
          ? <div className="page-loader"><span className="loader loader-dark" /></div>
          : shown.length === 0
          ? <EmptyState icon="📅" title="No appointments found"
              desc={appts.length === 0 ? 'Customers have not booked any appointments yet.' : 'No appointments match your search.'} />
          : <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Service</th>
                    <th>Staff</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map(a => (
                    <tr key={a.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{a.customer_name}</div>
                        <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>{a.customer_phone}</div>
                        {a.customer_email && <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>{a.customer_email}</div>}
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{a.service_name}</div>
                        {a.notes && <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>"{a.notes}"</div>}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '.83rem' }}>{a.staff_name || '—'}</td>
                      <td style={{ fontWeight: 500 }}>{fmtDate(a.date)}</td>
                      <td style={{ color: 'var(--primary)', fontWeight: 600 }}>{fmtTime(a.time)}</td>
                      <td style={{ fontWeight: 700, color: 'var(--orange)' }}>{fmtPKR(a.price)}</td>
                      <td><StatusBadge status={a.status} /></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {a.status === 'pending'   && <button className="btn btn-success btn-sm" onClick={() => act(a.id, 'confirmed')}>✓ Confirm</button>}
                          {a.status === 'confirmed' && <button className="btn btn-primary btn-sm" onClick={() => act(a.id, 'completed')}>✔ Complete</button>}
                          {(a.status === 'pending' || a.status === 'confirmed') &&
                            <button className="btn btn-danger btn-sm" onClick={() => act(a.id, 'cancelled')}>✕ Cancel</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </div>

      <ConfirmModal
        open={!!actionId}
        onClose={() => setActionId(null)}
        onConfirm={updateStatus}
        title={`${actionStatus?.charAt(0).toUpperCase() + actionStatus?.slice(1)} Appointment`}
        message={`Are you sure you want to mark this appointment as "${actionStatus}"?`}
        danger={actionStatus === 'cancelled'}
      />
    </AppLayout>
  )
}

// ── Services Management ───────────────────────────────────────
export function BusinessServices() {
  const [services, setServices]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [deleteId, setDeleteId]   = useState(null)
  const [saving, setSaving]       = useState(false)
  const [form, setForm] = useState({ name: '', description: '', category: 'General', duration_min: 60, price: '' })
  const { toast } = useToast()

  const load = () => {
    const bid = getBid()
    if (!bid) return
    setLoading(true)
    api.get('/services?business_id=' + bid)
      .then(({ data }) => setServices(Array.isArray(data) ? data : []))
      .catch(() => setServices([]))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const openNew  = () => { setEditing(null); setForm({ name: '', description: '', category: 'General', duration_min: 60, price: '' }); setModalOpen(true) }
  const openEdit = s  => { setEditing(s); setForm({ name: s.name, description: s.description || '', category: s.category || 'General', duration_min: s.duration_min, price: s.price }); setModalOpen(true) }

  const save = async e => {
    e.preventDefault(); setSaving(true)
    try {
      if (editing) { await api.put(`/services/${editing.id}`, form); toast('Service updated!') }
      else         { await api.post('/services', form);              toast('Service added!')   }
      setModalOpen(false); load()
    } catch (e) { toast(e.response?.data?.error || 'Failed to save', 'error') }
    finally { setSaving(false) }
  }

  const del = async () => {
    try { await api.delete(`/services/${deleteId}`); toast('Service deleted'); load() }
    catch (e) { toast(e.response?.data?.error || 'Failed', 'error') }
    setDeleteId(null)
  }

  const CATS = ['General','Hair','Skin','Nails','Dental','Medical','Fitness','Training','Classes','Nutrition','Legal','Automotive','Home','Wellness','Beauty','Creative','Portrait','Wedding','Therapy','Coaching']

  return (
    <AppLayout title="Services" subtitle="Manage your business services"
      action={<button className="btn btn-primary btn-sm" onClick={openNew}>+ Add Service</button>}>
      <div className="card">
        {loading
          ? <div className="page-loader"><span className="loader loader-dark" /></div>
          : services.length === 0
          ? <EmptyState icon="📋" title="No services yet" desc="Add your first service so customers can book you."
              action={<button className="btn btn-primary" onClick={openNew}>+ Add Your First Service</button>} />
          : <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Service</th><th>Category</th><th>Duration</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {services.map(s => (
                    <tr key={s.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--primary-light)', display: 'grid', placeItems: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                            {catEmoji(s.category)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{s.name}</div>
                            <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>{s.description?.slice(0, 55)}{s.description?.length > 55 ? '…' : ''}</div>
                          </div>
                        </div>
                      </td>
                      <td><span style={{ fontSize: '.75rem', background: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>{s.category}</span></td>
                      <td>{s.duration_min} min</td>
                      <td style={{ fontWeight: 700, color: 'var(--orange)' }}>{fmtPKR(s.price)}</td>
                      <td><span className={`badge ${s.is_active ? 'badge-confirmed' : 'badge-cancelled'}`}>{s.is_active ? 'Active' : 'Inactive'}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(s)}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(s.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Service' : 'Add New Service'}>
        <form onSubmit={save}>
          <div className="form-group">
            <label className="form-label">Service Name</label>
            <input className="form-control" required value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Haircut & Style" />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-control" rows="2" value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="What does this service include?" />
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-control" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                {CATS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Duration (minutes)</label>
              <input type="number" className="form-control" required min="5" value={form.duration_min}
                onChange={e => setForm(p => ({ ...p, duration_min: parseInt(e.target.value) || 60 }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Price (£)</label>
            <input type="number" className="form-control" required min="0" value={form.price}
              onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="e.g. 35" />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="loader" /> : editing ? 'Save Changes' : 'Add Service'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={del}
        title="Delete Service" message="This will deactivate the service. Existing bookings will not be affected." danger />
    </AppLayout>
  )
}

// ── Staff Management ──────────────────────────────────────────
export function BusinessStaff() {
  const [staff, setStaff]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [deleteId, setDeleteId]   = useState(null)
  const [saving, setSaving]       = useState(false)
  const [form, setForm] = useState({ name: '', title: '', bio: '', email: '', phone: '' })
  const { toast } = useToast()

  const load = () => {
    const bid = getBid()
    if (!bid) return
    api.get('/staff?business_id=' + bid)
      .then(({ data }) => setStaff(Array.isArray(data) ? data : []))
      .catch(() => setStaff([]))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const openNew  = () => { setEditing(null); setForm({ name: '', title: '', bio: '', email: '', phone: '' }); setModalOpen(true) }
  const openEdit = s  => { setEditing(s); setForm({ name: s.name, title: s.title||'', bio: s.bio||'', email: s.email||'', phone: s.phone||'' }); setModalOpen(true) }

  const save = async e => {
    e.preventDefault(); setSaving(true)
    try {
      if (editing) { await api.put(`/staff/${editing.id}`, form); toast('Staff updated!') }
      else         { await api.post('/staff', form);               toast('Staff added!')   }
      setModalOpen(false); load()
    } catch (e) { toast(e.response?.data?.error || 'Failed', 'error') }
    finally { setSaving(false) }
  }

  const remove = async () => {
    try { await api.delete(`/staff/${deleteId}`); toast('Staff removed'); load() }
    catch (e) { toast(e.response?.data?.error || 'Failed', 'error') }
    setDeleteId(null)
  }

  return (
    <AppLayout title="Staff" subtitle="Manage your team members"
      action={<button className="btn btn-primary btn-sm" onClick={openNew}>+ Add Staff</button>}>
      <div className="card">
        {loading
          ? <div className="page-loader"><span className="loader loader-dark" /></div>
          : staff.length === 0
          ? <EmptyState icon="👤" title="No staff members yet" desc="Add staff so customers can book specific team members."
              action={<button className="btn btn-primary" onClick={openNew}>+ Add First Staff Member</button>} />
          : <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Name</th><th>Title</th><th>Contact</th><th>Bio</th><th>Actions</th></tr></thead>
                <tbody>
                  {staff.map(s => (
                    <tr key={s.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="avatar">{s.name[0]}</div>
                          <span style={{ fontWeight: 600 }}>{s.name}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{s.title || '—'}</td>
                      <td style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>
                        {s.email && <div>✉ {s.email}</div>}
                        {s.phone && <div>📞 {s.phone}</div>}
                      </td>
                      <td style={{ fontSize: '.8rem', color: 'var(--text-muted)', maxWidth: 200 }}>{s.bio?.slice(0, 60) || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(s)}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(s.id)}>Remove</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Staff Member' : 'Add Staff Member'}>
        <form onSubmit={save}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-control" required value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Staff member's name" />
          </div>
          <div className="form-group">
            <label className="form-label">Title / Role</label>
            <input className="form-control" value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Senior Stylist" />
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-control" value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="staff@example.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-control" value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+44 7700 900000" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Bio <span className="form-hint">(optional)</span></label>
            <textarea className="form-control" rows="2" value={form.bio}
              onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} placeholder="Brief experience description..." />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="loader" /> : editing ? 'Save Changes' : 'Add Staff'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={remove}
        title="Remove Staff Member" message="Are you sure you want to remove this staff member?" danger />
    </AppLayout>
  )
}
