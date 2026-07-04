export const fmtDate = s => s ? new Date(s + 'T12:00:00').toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', year:'numeric' }) : ''
export const fmtTime = s => { if (!s) return ''; const [h,m]=s.split(':').map(Number); return `${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}` }
export const fmtPKR  = n => `£${Number(n||0).toLocaleString()}`
export const timeAgo = s => { const d=Math.floor((Date.now()-new Date(s))/1000); if(d<60)return 'just now'; if(d<3600)return `${Math.floor(d/60)}m ago`; if(d<86400)return `${Math.floor(d/3600)}h ago`; return `${Math.floor(d/86400)}d ago` }
export const minDate = () => new Date().toISOString().split('T')[0]
export const maxDate = () => { const d=new Date(); d.setDate(d.getDate()+60); return d.toISOString().split('T')[0] }
export const catEmoji = c => ({'Beauty':'💇','Dental':'🦷','Fitness':'🏋️','Medical':'🩺','Legal':'⚖️','Automotive':'🔧','Home':'🧹','Creative':'📷','Wellness':'💆','Hair':'✂️','Skin':'✨','Nails':'💅','Training':'🏃','Classes':'🧘','Nutrition':'🥗','General':'📋'}[c] || '📋')
