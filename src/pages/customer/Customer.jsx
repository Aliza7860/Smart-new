import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import { StatusBadge, EmptyState, ConfirmModal } from '../../components/ui'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import { fmtDate, fmtTime, fmtPKR, minDate, maxDate, catEmoji } from '../../utils'
import api from '../../api/axios'

// ── Customer Dashboard ────────────────────────────────────────
export function CustomerDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ total: 0, upcoming: 0, completed: 0, cancelled: 0 })
  const [appts, setAppts] = useState([])
  const hr = new Date().getHours()
  const greeting = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening'

  useEffect(() => {
    api.get('/appointments/stats').then(({ data }) => setStats(data)).catch(() => {})
    api.get('/appointments').then(({ data }) => setAppts(Array.isArray(data) ? data.slice(0, 5) : [])).catch(() => {})
  }, [])

  const CARDS = [
    { key: 'total',     label: 'Total Bookings', bg: '#eff6ff', color: '#2563eb', icon: '📊' },
    { key: 'upcoming',  label: 'Upcoming',       bg: '#fef9c3', color: '#a16207', icon: '📅' },
    { key: 'completed', label: 'Completed',      bg: '#dcfce7', color: '#166534', icon: '✅' },
    { key: 'cancelled', label: 'Cancelled',      bg: '#fee2e2', color: '#991b1b', icon: '❌' },
  ]

  return (
    <AppLayout title="My Dashboard" subtitle={`${greeting}, ${user?.name?.split(' ')[0]}!`}
      action={<Link to="/book" className="btn btn-primary btn-sm">+ Book Now</Link>}>

      <div className="stats-grid">
        {CARDS.map(c => (
          <div key={c.key} className="stat-card">
            <div className="stat-icon" style={{ background: c.bg }}>
              <span style={{ fontSize: '1.4rem' }}>{c.icon}</span>
            </div>
            <div>
              <div className="stat-num" style={{ color: c.color }}>{stats[c.key] ?? 0}</div>
              <div className="stat-label">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 20 }}>
        <div className="card">
          <div className="card-title">
            Recent Bookings
            <Link to="/my-appointments" style={{ marginLeft: 'auto', fontSize: '.76rem', color: 'var(--primary)' }}>
              View all →
            </Link>
          </div>
          {appts.length === 0
            ? <EmptyState icon="📅" title="No bookings yet" desc="Browse businesses and book your first appointment."
                action={<Link to="/businesses" className="btn btn-primary">Browse Businesses</Link>} />
            : <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Service</th><th>Business</th><th>Date & Time</th><th>Price</th><th>Status</th></tr></thead>
                  <tbody>
                    {appts.map(a => (
                      <tr key={a.id}>
                        <td><strong>{a.service_name}</strong></td>
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-title">Quick Actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link to="/businesses" className="btn btn-primary btn-full">🏢 Browse Businesses</Link>
              <Link to="/book"       className="btn btn-secondary btn-full">+ Book Appointment</Link>
              <Link to="/my-appointments" className="btn btn-secondary btn-full">📅 All My Bookings</Link>
            </div>
          </div>
          <div className="card" style={{ background: 'linear-gradient(135deg,#eff6ff,#f0fdf4)' }}>
            <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--primary)' }}>💡 Tip</div>
            <p style={{ fontSize: '.82rem', color: 'var(--text-muted)', lineHeight: 1.65 }}>
              Book services in advance for the best slot availability.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

// ── My Appointments ───────────────────────────────────────────
export function MyAppointments() {
  const [appts, setAppts]     = useState([])
  const [filter, setFilter]   = useState('all')
  const [loading, setLoading] = useState(true)
  const [cancelId, setCancelId] = useState(null)
  const { toast } = useToast()

  const load = () => {
    setLoading(true)
    api.get('/appointments')
      .then(({ data }) => setAppts(Array.isArray(data) ? data : []))
      .catch(() => setAppts([]))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const cancel = async () => {
    try {
      await api.patch(`/appointments/${cancelId}/status`, { status: 'cancelled' })
      toast('Appointment cancelled')
      load()
    } catch (e) { toast(e.response?.data?.error || 'Failed to cancel', 'error') }
    setCancelId(null)
  }

  const FILTERS = ['all', 'pending', 'confirmed', 'completed', 'cancelled']
  const shown = filter === 'all' ? appts : appts.filter(a => a.status === filter)
  const counts = FILTERS.reduce((acc, f) => {
    acc[f] = f === 'all' ? appts.length : appts.filter(a => a.status === f).length
    return acc
  }, {})

  return (
    <AppLayout title="My Appointments" subtitle="All your bookings in one place"
      action={<Link to="/book" className="btn btn-primary btn-sm">+ New Booking</Link>}>

      {/* Filter tabs */}
      <div className="card" style={{ marginBottom: 16, padding: '14px 20px' }}>
        <div className="tab-row">
          {FILTERS.map(f => (
            <button key={f} className={`tab-btn${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              <span style={{ marginLeft: 6, background: filter === f ? 'rgba(255,255,255,.3)' : 'var(--border)', borderRadius: 99, padding: '1px 7px', fontSize: '.72rem', fontWeight: 700 }}>
                {counts[f]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        {loading
          ? <div className="page-loader"><span className="loader loader-dark" /></div>
          : shown.length === 0
          ? <EmptyState icon="📅"
              title={filter === 'all' ? 'No appointments yet' : `No ${filter} appointments`}
              desc={filter === 'all' ? 'Browse businesses and book your first service.' : 'Try a different filter above.'}
              action={filter === 'all' && <Link to="/businesses" className="btn btn-primary">Browse Businesses</Link>} />
          : <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Business</th>
                    <th>Staff</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map(a => (
                    <tr key={a.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{a.service_name}</div>
                        <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>{a.duration_min} min</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{a.business_name}</div>
                        {a.address && <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>📍 {a.address}</div>}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '.83rem' }}>{a.staff_name || 'Any'}</td>
                      <td style={{ fontWeight: 500 }}>{fmtDate(a.date)}</td>
                      <td style={{ color: 'var(--primary)', fontWeight: 600 }}>{fmtTime(a.time)}</td>
                      <td style={{ fontWeight: 700, color: 'var(--orange)' }}>{fmtPKR(a.price)}</td>
                      <td><StatusBadge status={a.status} /></td>
                      <td>
                        {(a.status === 'pending' || a.status === 'confirmed') && (
                          <button className="btn btn-danger btn-sm" onClick={() => setCancelId(a.id)}>
                            Cancel
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

      <ConfirmModal
        open={!!cancelId}
        onClose={() => setCancelId(null)}
        onConfirm={cancel}
        title="Cancel Appointment"
        message="Are you sure you want to cancel this appointment? This cannot be undone."
        danger
      />
    </AppLayout>
  )
}

// ── Book Appointment (4-step wizard) ─────────────────────────
export function Book() {
  const [step, setStep]       = useState(1)
  const [businesses, setBusinesses] = useState([])
  const [services, setServices]     = useState([])
  const [staff, setStaff]           = useState([])
  const [slots, setSlots]           = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [sel, setSel] = useState({ business: null, service: null, staff: null, date: '', time: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)
  const { toast }   = useToast()
  const navigate    = useNavigate()
  const [params]    = useSearchParams()

  useEffect(() => {
    api.get('/businesses')
      .then(({ data }) => {
        setBusinesses(Array.isArray(data) ? data : [])
        const bid = params.get('business')
        if (bid) {
          const b = data.find(x => String(x.id) === String(bid))
          if (b) selectBusiness(b, data)
        }
      })
      .catch(() => {})
  }, [])

  const selectBusiness = async (b) => {
    setSel({ business: b, service: null, staff: null, date: '', time: '', notes: '' })
    setSlots([])
    const [svcs, stf] = await Promise.all([
      api.get('/services?business_id=' + b.id).then(r => r.data).catch(() => []),
      api.get('/staff?business_id=' + b.id).then(r => r.data).catch(() => []),
    ])
    setServices(Array.isArray(svcs) ? svcs : [])
    setStaff(Array.isArray(stf) ? stf : [])
    const sid = params.get('service')
    if (sid) {
      const s = (Array.isArray(svcs) ? svcs : []).find(x => String(x.id) === String(sid))
      if (s) { setSel(p => ({ ...p, business: b, service: s })); setStep(3); return }
    }
    setStep(2)
  }

  const selectService = (s) => {
    setSel(p => ({ ...p, service: s, date: '', time: '' }))
    setSlots([])
    setStep(3)
  }

  useEffect(() => {
    if (!sel.date || !sel.service || !sel.business) return
    setSlotsLoading(true)
    setSlots([])
    setSel(p => ({ ...p, time: '' }))
    api.get('/appointments/slots', {
      params: { business_id: sel.business.id, service_id: sel.service.id, date: sel.date }
    })
      .then(({ data }) => setSlots(Array.isArray(data) ? data : []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false))
  }, [sel.date, sel.service?.id, sel.business?.id])

  const submit = async () => {
    if (!sel.business || !sel.service || !sel.date || !sel.time) {
      toast('Please complete all steps before confirming', 'error')
      return
    }
    setSubmitting(true)
    try {
      await api.post('/appointments', {
        business_id: sel.business.id,
        service_id:  sel.service.id,
        staff_id:    sel.staff?.id || null,
        date:        sel.date,
        time:        sel.time,
        notes:       sel.notes,
      })
      toast('Appointment booked successfully! 🎉')
      navigate('/my-appointments')
    } catch (e) {
      toast(e.response?.data?.error || 'Booking failed. Please try again.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const STEPS = ['Choose Business', 'Pick Service', 'Date & Time', 'Confirm']

  return (
    <AppLayout title="Book Appointment" subtitle="Find a business and book your slot">
      {/* Stepper */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
        {STEPS.map((label, i) => {
          const n = i + 1, active = step === n, done = step > n
          return (
            <div key={n} style={{ display: 'flex', alignItems: 'center', flex: n < STEPS.length ? 1 : 'none' }}>
              <div className={`step-item${active ? ' active' : ''}${done ? ' done' : ''}`}>
                <div className="step-circle">{done ? '✓' : n}</div>
                <div className="step-label">{label}</div>
              </div>
              {n < STEPS.length && <div className={`step-line${done ? ' done' : ''}`} style={{ flex: 1 }} />}
            </div>
          )
        })}
      </div>

      {/* ── Step 1: Choose Business ── */}
      {step === 1 && (
        <div className="card">
          <div className="card-title">Choose a Business</div>
          {businesses.length === 0
            ? <EmptyState icon="🏢" title="No businesses found" />
            : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 16 }}>
                {businesses.map(b => (
                  <div key={b.id} className="biz-card" style={{ cursor: 'pointer' }} onClick={() => selectBusiness(b)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="biz-icon" style={{ width: 44, height: 44, fontSize: '1.3rem' }}>{catEmoji(b.category)}</div>
                      <div>
                        <h3 style={{ fontWeight: 700, fontSize: '.95rem' }}>{b.name}</h3>
                        <span style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>{b.category} · {b.service_count} services</span>
                      </div>
                    </div>
                    {b.address && <p style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>📍 {b.address}</p>}
                    <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }}>Select →</button>
                  </div>
                ))}
              </div>
          }
        </div>
      )}

      {/* ── Step 2: Choose Service ── */}
      {step === 2 && sel.business && (
        <>
          <div className="card" style={{ marginBottom: 16, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="biz-icon" style={{ width: 40, height: 40, fontSize: '1.2rem' }}>{catEmoji(sel.business.category)}</div>
            <div style={{ flex: 1 }}>
              <strong>{sel.business.name}</strong>
              <span style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginLeft: 8 }}>{sel.business.category}</span>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => { setStep(1); setSel(p => ({ ...p, service: null })) }}>← Change</button>
          </div>
          <div className="card">
            <div className="card-title">Select a Service ({services.length} available)</div>
            {services.length === 0
              ? <EmptyState icon="📋" title="No services available" desc="This business has no active services." />
              : <div className="svc-grid">
                  {services.map(s => (
                    <div key={s.id} className="service-card service-card-select" onClick={() => selectService(s)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                        <div className="svc-icon" style={{ background: 'var(--primary-light)' }}>{catEmoji(s.category)}</div>
                        <h3 style={{ fontWeight: 700, fontSize: '.95rem' }}>{s.name}</h3>
                      </div>
                      <p style={{ fontSize: '.83rem', color: 'var(--text-muted)', flex: 1, marginBottom: 12, lineHeight: 1.5 }}>{s.description}</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>⏱ {s.duration_min} min</span>
                        <span style={{ fontWeight: 800, color: 'var(--orange)', fontSize: '1rem' }}>{fmtPKR(s.price)}</span>
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>
        </>
      )}

      {/* ── Step 3: Date, Staff & Time ── */}
      {step === 3 && sel.service && (
        <>
          {/* Service + Business breadcrumb */}
          <div className="card" style={{ marginBottom: 16, padding: '14px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="svc-icon" style={{ background: 'var(--primary-light)', width: 42, height: 42 }}>{catEmoji(sel.service.category)}</div>
              <div style={{ flex: 1 }}>
                <strong>{sel.service.name}</strong> at <strong>{sel.business.name}</strong>
                <div style={{ fontSize: '.78rem', color: 'var(--orange)', fontWeight: 600, marginTop: 2 }}>
                  {fmtPKR(sel.service.price)} · {sel.service.duration_min} min
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => { setStep(2); setSel(p => ({ ...p, date: '', time: '' })) }}>← Change</button>
            </div>
          </div>

          {/* Staff picker */}
          {staff.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-title">Select Staff <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '.8rem' }}>(optional)</span></div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className={`tab-btn${!sel.staff ? ' active' : ''}`} onClick={() => setSel(p => ({ ...p, staff: null, time: '' }))}>
                  Any Available
                </button>
                {staff.map(s => (
                  <button key={s.id} className={`tab-btn${sel.staff?.id === s.id ? ' active' : ''}`}
                    onClick={() => setSel(p => ({ ...p, staff: s, time: '' }))}>
                    {s.name}{s.title ? ` — ${s.title}` : ''}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Date + Time */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="form-grid">
              <div>
                <label className="form-label">Select Date</label>
                <input type="date" className="form-control" min={minDate()} max={maxDate()}
                  value={sel.date}
                  onChange={e => setSel(p => ({ ...p, date: e.target.value, time: '' }))} />
              </div>
              <div>
                <label className="form-label">Available Time Slots</label>
                {!sel.date
                  ? <p style={{ color: 'var(--text-muted)', fontSize: '.83rem', paddingTop: 10 }}>← Select a date first</p>
                  : slotsLoading
                  ? <div style={{ paddingTop: 10 }}><span className="loader loader-dark" /></div>
                  : slots.length === 0
                  ? <div className="alert alert-info" style={{ margin: 0 }}>No slots available on this date. Try another date.</div>
                  : <div className="slots-grid">
                      {slots.map(s => (
                        <button key={s} className={`slot-btn${sel.time === s ? ' selected' : ''}`}
                          onClick={() => setSel(p => ({ ...p, time: s }))}>
                          {fmtTime(s)}
                        </button>
                      ))}
                    </div>
                }
              </div>
            </div>
          </div>

          <div className="card">
            <div className="form-group">
              <label className="form-label">Notes <span className="form-hint">(optional)</span></label>
              <textarea className="form-control" rows="2"
                placeholder="Anything the staff should know (e.g. allergies, preferences)..."
                value={sel.notes} onChange={e => setSel(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <button className="btn btn-primary" onClick={() => setStep(4)} disabled={!sel.date || !sel.time}>
              Review Booking →
            </button>
          </div>
        </>
      )}

      {/* ── Step 4: Confirm ── */}
      {step === 4 && sel.service && (
        <div className="card" style={{ maxWidth: 560 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 20, fontSize: '1.1rem' }}>📋 Booking Summary</h3>
          {[
            { l: 'Business',  v: sel.business?.name },
            { l: 'Service',   v: sel.service?.name },
            { l: 'Duration',  v: sel.service?.duration_min + ' minutes' },
            { l: 'Staff',     v: sel.staff?.name || 'Any available staff' },
            { l: 'Date',      v: fmtDate(sel.date) },
            { l: 'Time',      v: fmtTime(sel.time) },
            { l: 'Price',     v: fmtPKR(sel.service?.price), highlight: true },
            sel.notes && { l: 'Notes', v: sel.notes },
          ].filter(Boolean).map(row => (
            <div key={row.l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '.88rem' }}>{row.l}</span>
              <span style={{ fontWeight: row.highlight ? 800 : 600, color: row.highlight ? 'var(--orange)' : 'var(--text)', fontSize: row.highlight ? '1.05rem' : '.9rem', textAlign: 'right', maxWidth: '60%' }}>
                {row.v}
              </span>
            </div>
          ))}

          <div style={{ marginTop: 24, padding: '14px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0', marginBottom: 20 }}>
            <p style={{ fontSize: '.82rem', color: '#166534' }}>
              ✅ By confirming, you agree to attend at the scheduled time. You can cancel from My Appointments if needed.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-secondary" onClick={() => setStep(3)}>← Back</button>
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}
              onClick={submit} disabled={submitting}>
              {submitting ? <span className="loader" /> : '✓ Confirm Booking'}
            </button>
          </div>
        </div>
      )}
    </AppLayout>
  )
}

// ── Profile ───────────────────────────────────────────────────
export function Profile() {
  const { user, loadUser } = useAuth()
  const { toast }          = useToast()
  const [f, setF]          = useState({ name: '', phone: '' })
  const [loading, setLoading] = useState(false)
  const [stats, setStats]  = useState(null)

  useEffect(() => {
    if (user) setF({ name: user.name || '', phone: user.phone || '' })
    api.get('/appointments/stats').then(({ data }) => setStats(data)).catch(() => {})
  }, [user])

  const save = async e => {
    e.preventDefault(); setLoading(true)
    try {
      await api.put('/profile', f)
      await loadUser()
      toast('Profile updated!')
    } catch (e) { toast(e.response?.data?.error || 'Failed', 'error') }
    finally { setLoading(false) }
  }

  return (
    <AppLayout title="My Profile" subtitle="Manage your account information">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
            <div className="avatar" style={{ width: 64, height: 64, borderRadius: 14, fontSize: '1.6rem' }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>{user?.name}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '.85rem', textTransform: 'capitalize' }}>{user?.role}</div>
              <div style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>{user?.email}</div>
            </div>
          </div>

          <h3 style={{ fontWeight: 700, marginBottom: 18 }}>Edit Information</h3>
          <form onSubmit={save}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-control" required value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Email <span className="form-hint">(cannot change)</span></label>
                <input className="form-control" value={user?.email || ''} disabled style={{ background: 'var(--bg)', cursor: 'not-allowed' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-control" value={f.phone} onChange={e => setF(p => ({ ...p, phone: e.target.value }))} placeholder="+44 7700 900000" />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <input className="form-control" value={user?.role?.replace(/_/g, ' ') || ''} disabled style={{ background: 'var(--bg)', textTransform: 'capitalize', cursor: 'not-allowed' }} />
              </div>
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? <span className="loader" /> : 'Save Changes'}
            </button>
          </form>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {stats && (
            <div className="card">
              <div className="card-title">My Stats</div>
              {[
                { label: 'Total Bookings', val: stats.total,     bg: '#eff6ff', color: '#2563eb' },
                { label: 'Upcoming',       val: stats.upcoming,  bg: '#fef9c3', color: '#a16207' },
                { label: 'Completed',      val: stats.completed, bg: '#dcfce7', color: '#166534' },
                { label: 'Cancelled',      val: stats.cancelled, bg: '#fee2e2', color: '#991b1b' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>{s.label}</span>
                  <span style={{ fontWeight: 800, fontSize: '1.1rem', background: s.bg, color: s.color, padding: '2px 10px', borderRadius: 99 }}>{s.val}</span>
                </div>
              ))}
            </div>
          )}
          <div className="card" style={{ background: '#f0fdf4' }}>
            <div style={{ fontWeight: 700, marginBottom: 8, color: '#166534' }}>🔒 Account Security</div>
            <p style={{ fontSize: '.82rem', color: 'var(--text-muted)', marginBottom: 12 }}>Your account is password-protected.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.82rem' }}>
              <span>●</span><span style={{ color: '#166534', fontWeight: 600 }}>Account is Active & Secure</span>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
