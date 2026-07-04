export function StatusBadge({ status }) {
  const map = { pending:'⏳ Pending', confirmed:'✓ Confirmed', completed:'✔ Completed', cancelled:'✕ Cancelled' }
  return <span className={`badge badge-${status}`}>{map[status] || status}</span>
}

export function RoleBadge({ role }) {
  const labels = { super_admin:'Super Admin', business_owner:'Business Owner', staff:'Staff', customer:'Customer' }
  return <span className={`role-badge role-${role}`}>{labels[role] || role}</span>
}

export function Loader({ lg }) {
  return <div className="page-loader"><span className={`loader loader-dark${lg?' loader-lg':''}`}/></div>
}

export function EmptyState({ icon='📋', title, desc, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      {desc && <p>{desc}</p>}
      {action && <div style={{marginTop:16}}>{action}</div>}
    </div>
  )
}

export function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function ConfirmModal({ open, onClose, onConfirm, title, message, danger }) {
  return (
    <Modal open={open} onClose={onClose} title={title || 'Confirm'}>
      <p style={{color:'var(--text-muted)',marginBottom:20}}>{message}</p>
      <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className={`btn ${danger?'btn-danger':'btn-primary'}`} onClick={onConfirm}>Confirm</button>
      </div>
    </Modal>
  )
}
