const express    = require('express');
const cors       = require('cors');
const { Pool }   = require('pg');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');

// ── Database ────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3
});

async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}
const dbGet = async (sql, p) => (await query(sql, p)).rows[0] || null;
const dbAll = async (sql, p) => (await query(sql, p)).rows;
const dbRun = async (sql, p) => (await query(sql, p)).rows[0]?.id || null;

// ── JWT ─────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'smartbook-dev-secret';
const signToken  = payload => jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

// ── Auth Middleware ──────────────────────────────────────────
function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(header.split(' ')[1], JWT_SECRET);
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) return res.status(403).json({ error: 'Access denied' });
    next();
  };
}

// ── DB Init ─────────────────────────────────────────────────
let dbReady = false;
async function ensureDB() {
  if (dbReady) return;
  await query(`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, phone TEXT,
    role TEXT NOT NULL DEFAULT 'customer' CHECK(role IN ('super_admin','business_owner','staff','customer')),
    is_active INTEGER NOT NULL DEFAULT 1, created_at TIMESTAMPTZ DEFAULT NOW())`);
  await query(`CREATE TABLE IF NOT EXISTS businesses (
    id SERIAL PRIMARY KEY, owner_id INTEGER NOT NULL REFERENCES users(id),
    name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, description TEXT, category TEXT,
    phone TEXT, email TEXT, address TEXT,
    is_active INTEGER NOT NULL DEFAULT 1, created_at TIMESTAMPTZ DEFAULT NOW())`);
  await query(`CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY, business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL, description TEXT, category TEXT,
    duration_min INTEGER NOT NULL DEFAULT 60, price NUMERIC(10,2) NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1, created_at TIMESTAMPTZ DEFAULT NOW())`);
  await query(`CREATE TABLE IF NOT EXISTS staff (
    id SERIAL PRIMARY KEY, business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id), name TEXT NOT NULL, title TEXT, bio TEXT,
    email TEXT, phone TEXT, is_active INTEGER NOT NULL DEFAULT 1, created_at TIMESTAMPTZ DEFAULT NOW())`);
  await query(`CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY, business_id INTEGER NOT NULL REFERENCES businesses(id),
    service_id INTEGER NOT NULL REFERENCES services(id), staff_id INTEGER REFERENCES staff(id),
    customer_id INTEGER NOT NULL REFERENCES users(id), date TEXT NOT NULL, time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','completed','cancelled')),
    notes TEXT, price NUMERIC(10,2), created_at TIMESTAMPTZ DEFAULT NOW())`);
  await query(`CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL, is_read INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW())`);

  const count = await dbGet('SELECT COUNT(*) as c FROM users', []);
  if (parseInt(count.c) === 0) await seedDB();
  dbReady = true;
}

async function seedDB() {
  const h = s => bcrypt.hashSync(s, 10);
  const q = async (sql, p) => (await query(sql, p)).rows[0]?.id;

  await q(`INSERT INTO users(name,email,password,role) VALUES($1,$2,$3,$4) RETURNING id`,
    ['Super Admin','admin@smartbook.com',h('admin123'),'super_admin']);

  // Salon
  const so = await q(`INSERT INTO users(name,email,password,role) VALUES($1,$2,$3,$4) RETURNING id`,
    ['Sarah Thompson','sara@citysalon.com',h('owner123'),'business_owner']);
  const s1 = await q(`INSERT INTO businesses(owner_id,name,slug,description,category,phone,email,address) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [so,'The Mayfair Hair Studio','mayfair-hair-studio','Premium hair styling and beauty services in the heart of London.','Beauty','+44 20 7946 0958','sara@citysalon.com','14 Mount Street, Mayfair, London W1K 2RP']);
  for (const [n,d,c,dur,p] of [
    ['Haircut & Style','Professional cut and blow-dry by expert stylists','Hair',60,35],
    ['Hair Colour','Full colour, highlights, balayage and ombre treatments','Hair',120,85],
    ['Keratin Treatment','Smoothing keratin treatment for frizz-free, shiny hair','Hair',180,140],
    ['Hair Spa','Deep conditioning treatment to restore moisture and shine','Hair',90,55],
    ['Blow Dry & Styling','Professional blow-dry with heat styling','Hair',45,25],
    ['Bridal Hair Package','Complete bridal hair styling with extensions','Hair',240,280],
    ['Facial','Deep cleansing facial with premium skincare products','Skin',60,45],
    ['Gold Facial','Luxurious 24K gold facial for radiant glowing skin','Skin',75,80],
    ['Manicure & Pedicure','Complete nail care with gel polish and massage','Nails',90,40],
    ['Full Body Waxing','Professional waxing with premium hard and soft wax','Skin',90,50],
  ]) await q(`INSERT INTO services(business_id,name,description,category,duration_min,price) VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,[s1,n,d,c,dur,p]);
  await q(`INSERT INTO staff(business_id,name,title,bio) VALUES($1,$2,$3,$4) RETURNING id`,[s1,'Zara Bennett','Master Stylist','15 years experience in cuts and colour.']);
  await q(`INSERT INTO staff(business_id,name,title,bio) VALUES($1,$2,$3,$4) RETURNING id`,[s1,'Rachel Mitchell','Colour Specialist','Expert in balayage and highlights.']);

  // Dental
  const do_ = await q(`INSERT INTO users(name,email,password,role) VALUES($1,$2,$3,$4) RETURNING id`,
    ['Dr. James Whitfield','khalid@smileclinic.com',h('owner123'),'business_owner']);
  const s2 = await q(`INSERT INTO businesses(owner_id,name,slug,description,category,phone,email,address) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [do_,'Smile Dental Clinic','smile-dental-clinic','Advanced dental care with modern equipment.','Dental','+44 161 496 0213','khalid@smileclinic.com','52 Deansgate, Manchester M3 2BW']);
  for (const [n,d,c,dur,p] of [
    ['Teeth Cleaning','Professional scaling and polishing','Preventive',45,60],
    ['Dental Checkup','Comprehensive oral examination with X-rays','Preventive',30,40],
    ['Tooth Filling','Tooth-coloured composite filling','Restorative',60,90],
    ['Root Canal Treatment','Pain-free root canal therapy','Restorative',90,220],
    ['Teeth Whitening','Professional laser whitening','Cosmetic',90,195],
    ['Dental Crown','Porcelain or zirconia crown','Restorative',60,320],
    ['Tooth Extraction','Safe and gentle tooth removal','Surgery',45,85],
    ['Braces Consultation','Orthodontic assessment and planning','Orthodontics',60,50],
    ['Dental Implant Consult','Full assessment for tooth replacement','Implants',60,65],
    ['Kids Dental Checkup','Friendly checkup for children aged 3-12','Pediatric',30,30],
  ]) await q(`INSERT INTO services(business_id,name,description,category,duration_min,price) VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,[s2,n,d,c,dur,p]);
  await q(`INSERT INTO staff(business_id,name,title,bio) VALUES($1,$2,$3,$4) RETURNING id`,[s2,'Dr. James Whitfield','Dental Surgeon','Expert in restorative and cosmetic dentistry.']);
  await q(`INSERT INTO staff(business_id,name,title,bio) VALUES($1,$2,$3,$4) RETURNING id`,[s2,'Dr. Olivia Carter','Periodontist','Specialist in gum health and whitening.']);

  // Gym
  const go_ = await q(`INSERT INTO users(name,email,password,role) VALUES($1,$2,$3,$4) RETURNING id`,
    ['Daniel Walker','ahmed@fitpro.com',h('owner123'),'business_owner']);
  const s3 = await q(`INSERT INTO businesses(owner_id,name,slug,description,category,phone,email,address) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [go_,'FitPro Gym','fitpro-gym','State-of-the-art fitness facility with certified personal trainers.','Fitness','+44 121 643 8820','ahmed@fitpro.com','78 Broad Street, Birmingham B1 2HF']);
  for (const [n,d,c,dur,p] of [
    ['Personal Training','One-on-one session with a certified trainer','Training',60,45],
    ['HIIT Class','High-intensity interval training group class','Classes',45,18],
    ['Yoga Session','Mindful yoga for flexibility and balance','Classes',60,20],
    ['Strength Training','Guided weight training to build muscle','Training',60,38],
    ['Cardio Blast Class','High-energy cardio group class','Classes',45,16],
    ['Pilates Session','Core-strengthening pilates for toning','Classes',60,22],
    ['Nutrition Consultation','Personalised diet plan from a nutritionist','Nutrition',45,35],
    ['Body Composition Test','Full BMI and body fat assessment','Assessment',30,25],
    ['Zumba Dance Class','Fun dance fitness class for all levels','Classes',60,15],
    ['Boxing Fitness','Boxing drills to improve strength and agility','Training',60,30],
  ]) await q(`INSERT INTO services(business_id,name,description,category,duration_min,price) VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,[s3,n,d,c,dur,p]);
  await q(`INSERT INTO staff(business_id,name,title,bio) VALUES($1,$2,$3,$4) RETURNING id`,[s3,'Daniel Walker','Head Trainer','8 years experience in HIIT and functional fitness.']);
  await q(`INSERT INTO staff(business_id,name,title,bio) VALUES($1,$2,$3,$4) RETURNING id`,[s3,'Emily Stevens','Yoga Coach','Specialised in yoga and pilates programmes.']);

  // Photography
  const po_ = await q(`INSERT INTO users(name,email,password,role) VALUES($1,$2,$3,$4) RETURNING id`,
    ['Charlotte Hughes','kamran@elitephoto.com',h('owner123'),'business_owner']);
  const s4 = await q(`INSERT INTO businesses(owner_id,name,slug,description,category,phone,email,address) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [po_,'Elite Photography Studio','elite-photography-studio','Professional photography for portraits, weddings and events.','Creative','+44 117 925 4471','kamran@elitephoto.com','9 Park Street, Bristol BS1 5NB']);
  for (const [n,d,c,dur,p] of [
    ['Portrait Session','Studio portrait with professional lighting','Portrait',60,120],
    ['Wedding Photography','Full-day wedding coverage with 300+ edited photos','Wedding',480,1200],
    ['Pre-Wedding Shoot','Romantic pre-wedding photography session','Wedding',180,350],
    ['Baby & Newborn Shoot','Safe newborn photography session','Family',90,150],
    ['Family Portrait','Professional family photo session','Family',90,180],
    ['Corporate Headshots','Professional headshots for LinkedIn','Corporate',45,85],
    ['Product Photography','High-quality photos for e-commerce','Commercial',120,250],
    ['Birthday Event Coverage','Photography for birthday parties','Event',180,300],
    ['Real Estate Photos','Property photography for listings','Commercial',120,200],
    ['Passport & CV Photos','Official passport photos, same-day delivery','Document',15,12],
  ]) await q(`INSERT INTO services(business_id,name,description,category,duration_min,price) VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,[s4,n,d,c,dur,p]);
  await q(`INSERT INTO staff(business_id,name,title,bio) VALUES($1,$2,$3,$4) RETURNING id`,[s4,'Charlotte Hughes','Lead Photographer','Award-winning photographer, 12 years experience.']);

  // Wellness
  const wo_ = await q(`INSERT INTO users(name,email,password,role) VALUES($1,$2,$3,$4) RETURNING id`,
    ['Dr. Hannah Cooper','farah@mindcarepk.com',h('owner123'),'business_owner']);
  const s5 = await q(`INSERT INTO businesses(owner_id,name,slug,description,category,phone,email,address) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [wo_,'MindCare Wellness Centre','mindcare-wellness','Holistic mental health and wellness services in a safe, confidential space.','Wellness','+44 131 225 3344','farah@mindcarepk.com','3rd Floor, George Street, Edinburgh EH2 2PA']);
  for (const [n,d,c,dur,p] of [
    ['Individual Therapy','One-on-one counselling with a licensed psychologist','Therapy',60,70],
    ['Couples Therapy','Joint counselling for relationship support','Therapy',90,95],
    ['Child Therapy','Age-appropriate therapy for children 5-16','Therapy',45,60],
    ['Anxiety Management','CBT-based session for anxiety and panic','Therapy',60,70],
    ['Depression Counselling','Supportive counselling for depression','Therapy',60,70],
    ['Stress Management','Techniques for managing workplace stress','Wellness',60,55],
    ['Guided Meditation','Mindfulness and meditation session','Wellness',45,40],
    ['Sleep Therapy','Assessment and treatment for insomnia','Therapy',60,65],
    ['Life Coaching','Goal-setting and motivation coaching','Coaching',60,60],
    ['Group Therapy Session','Group therapy for social anxiety','Therapy',90,30],
  ]) await q(`INSERT INTO services(business_id,name,description,category,duration_min,price) VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,[s5,n,d,c,dur,p]);
  await q(`INSERT INTO staff(business_id,name,title,bio) VALUES($1,$2,$3,$4) RETURNING id`,[s5,'Dr. Hannah Cooper','Clinical Psychologist','PhD in Clinical Psychology, 10 years experience.']);

  // Demo customer
  const cu = await q(`INSERT INTO users(name,email,password,role,phone) VALUES($1,$2,$3,$4,$5) RETURNING id`,
    ['Jack Robinson','ali@customer.com',h('customer123'),'customer','+44 7700 900123']);
  await q(`INSERT INTO appointments(business_id,service_id,customer_id,date,time,status,price) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`,[s1,1,cu,'2025-09-15','10:00','confirmed',35]);
  await q(`INSERT INTO appointments(business_id,service_id,customer_id,date,time,status,price) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`,[s2,11,cu,'2025-09-20','11:00','pending',60]);
  await q(`INSERT INTO appointments(business_id,service_id,customer_id,date,time,status,price) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`,[s3,21,cu,'2025-09-10','09:00','completed',45]);
  await q(`INSERT INTO notifications(user_id,message) VALUES($1,$2) RETURNING id`,[cu,'Welcome to SmartBook! Browse businesses and book your first appointment.']);
  await q(`INSERT INTO notifications(user_id,message) VALUES($1,$2) RETURNING id`,[so,'Welcome Sarah! Your Mayfair Hair Studio is live on SmartBook.']);

  console.log('✅ Database seeded: 5 businesses, 50 services');
}

// ── Express App ──────────────────────────────────────────────
const app = express();
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// Ensure DB on every cold start
app.use(async (req, res, next) => {
  try { await ensureDB(); next(); }
  catch (e) { res.status(500).json({ error: 'Database error: ' + e.message }); }
});

// ── AUTH ────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone, role, businessName, businessCategory } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const userRole = ['customer','business_owner'].includes(role) ? role : 'customer';
    const existing = await dbGet('SELECT id FROM users WHERE email=$1', [email.toLowerCase()]);
    if (existing) return res.status(409).json({ error: 'Email already registered' });
    const hash   = bcrypt.hashSync(password, 10);
    const userId = await dbRun('INSERT INTO users(name,email,password,phone,role) VALUES($1,$2,$3,$4,$5) RETURNING id',
      [name.trim(), email.toLowerCase(), hash, phone||null, userRole]);
    let businessId = null;
    if (userRole === 'business_owner') {
      const bname = (businessName || name + "'s Business").trim();
      const slug  = bname.toLowerCase().replace(/[^a-z0-9]+/g,'-') + '-' + userId;
      businessId  = await dbRun('INSERT INTO businesses(owner_id,name,slug,category) VALUES($1,$2,$3,$4) RETURNING id',
        [userId, bname, slug, businessCategory||'General']);
    }
    await dbRun('INSERT INTO notifications(user_id,message) VALUES($1,$2) RETURNING id', [userId, `Welcome to SmartBook, ${name}!`]);
    const user  = await dbGet('SELECT id,name,email,phone,role FROM users WHERE id=$1', [userId]);
    const token = signToken({ sub: userId, role: userRole, name: name.trim(), businessId });
    res.status(201).json({ token, user: { ...user, businessId } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const user = await dbGet('SELECT * FROM users WHERE email=$1', [email.toLowerCase()]);
    if (!user)             return res.status(401).json({ error: 'No account found with this email' });
    if (!user.is_active)   return res.status(403).json({ error: 'Account suspended' });
    if (!bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Incorrect password' });
    let businessId = null;
    if (user.role === 'business_owner') {
      const biz = await dbGet('SELECT id FROM businesses WHERE owner_id=$1', [user.id]);
      businessId = biz?.id || null;
    }
    const token = signToken({ sub: user.id, role: user.role, name: user.name, businessId });
    res.json({ token, user: { id:user.id, name:user.name, email:user.email, phone:user.phone, role:user.role, businessId } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    const user = await dbGet('SELECT id,name,email,phone,role,created_at FROM users WHERE id=$1', [req.user.sub]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ ...user, businessId: req.user.businessId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── BUSINESSES ───────────────────────────────────────────────
app.get('/api/businesses', async (req, res) => {
  try {
    res.json(await dbAll(`SELECT b.*,u.name as owner_name,
      (SELECT COUNT(*) FROM services s WHERE s.business_id=b.id AND s.is_active=1) as service_count,
      (SELECT COUNT(*) FROM appointments a WHERE a.business_id=b.id) as booking_count
      FROM businesses b JOIN users u ON b.owner_id=u.id WHERE b.is_active=1 ORDER BY b.name`));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/businesses/:id', async (req, res) => {
  try {
    const biz = await dbGet('SELECT b.*,u.name as owner_name FROM businesses b JOIN users u ON b.owner_id=u.id WHERE b.id=$1', [req.params.id]);
    if (!biz) return res.status(404).json({ error: 'Not found' });
    const services = await dbAll('SELECT * FROM services WHERE business_id=$1 AND is_active=1', [req.params.id]);
    const staff    = await dbAll('SELECT * FROM staff WHERE business_id=$1 AND is_active=1', [req.params.id]);
    res.json({ ...biz, services, staff });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/businesses/:id', authenticate, authorize('business_owner','super_admin'), async (req, res) => {
  try {
    const biz = await dbGet('SELECT * FROM businesses WHERE id=$1', [req.params.id]);
    if (!biz) return res.status(404).json({ error: 'Not found' });
    if (req.user.role !== 'super_admin' && biz.owner_id !== req.user.sub)
      return res.status(403).json({ error: 'Not your business' });
    const { name,description,category,phone,email,address } = req.body;
    await dbRun('UPDATE businesses SET name=$1,description=$2,category=$3,phone=$4,email=$5,address=$6 WHERE id=$7 RETURNING id',
      [name||biz.name,description||biz.description,category||biz.category,phone||biz.phone,email||biz.email,address||biz.address,req.params.id]);
    res.json(await dbGet('SELECT * FROM businesses WHERE id=$1', [req.params.id]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/businesses/:id/analytics', authenticate, authorize('business_owner','super_admin'), async (req, res) => {
  try {
    const bid = req.params.id;
    if (req.user.role !== 'super_admin' && req.user.businessId !== parseInt(bid))
      return res.status(403).json({ error: 'Not your business' });
    const [total,upcoming,completed,cancelled,revenue,customers,topServices,recentAppointments] = await Promise.all([
      dbGet('SELECT COUNT(*) as c FROM appointments WHERE business_id=$1',[bid]),
      dbGet("SELECT COUNT(*) as c FROM appointments WHERE business_id=$1 AND status IN ('pending','confirmed') AND date>=CURRENT_DATE::text",[bid]),
      dbGet("SELECT COUNT(*) as c FROM appointments WHERE business_id=$1 AND status='completed'",[bid]),
      dbGet("SELECT COUNT(*) as c FROM appointments WHERE business_id=$1 AND status='cancelled'",[bid]),
      dbGet("SELECT COALESCE(SUM(price),0) as total FROM appointments WHERE business_id=$1 AND status='completed'",[bid]),
      dbGet('SELECT COUNT(DISTINCT customer_id) as c FROM appointments WHERE business_id=$1',[bid]),
      dbAll(`SELECT s.name,COUNT(a.id) as bookings FROM appointments a JOIN services s ON a.service_id=s.id WHERE a.business_id=$1 GROUP BY s.id,s.name ORDER BY bookings DESC LIMIT 5`,[bid]),
      dbAll(`SELECT a.*,s.name as service_name,u.name as customer_name,u.phone as customer_phone,st.name as staff_name
        FROM appointments a JOIN services s ON a.service_id=s.id JOIN users u ON a.customer_id=u.id LEFT JOIN staff st ON a.staff_id=st.id
        WHERE a.business_id=$1 ORDER BY a.created_at DESC LIMIT 10`,[bid]),
    ]);
    res.json({ total:total.c,upcoming:upcoming.c,completed:completed.c,cancelled:cancelled.c,
      revenue:revenue.total,customers:customers.c,topServices,recentAppointments });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── SERVICES ─────────────────────────────────────────────────
app.get('/api/services', async (req, res) => {
  try {
    const { business_id } = req.query;
    if (business_id) return res.json(await dbAll('SELECT * FROM services WHERE business_id=$1 AND is_active=1 ORDER BY category,name',[business_id]));
    res.json(await dbAll('SELECT s.*,b.name as business_name FROM services s JOIN businesses b ON s.business_id=b.id WHERE s.is_active=1 ORDER BY s.name'));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/services/:id', async (req, res) => {
  try {
    const svc = await dbGet('SELECT s.*,b.name as business_name FROM services s JOIN businesses b ON s.business_id=b.id WHERE s.id=$1',[req.params.id]);
    if (!svc) return res.status(404).json({ error: 'Not found' });
    res.json(svc);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/services', authenticate, authorize('business_owner','super_admin'), async (req, res) => {
  try {
    const { name,description,category,duration_min,price } = req.body;
    if (!name || price===undefined) return res.status(400).json({ error: 'Name and price required' });
    const businessId = req.user.businessId;
    if (!businessId) return res.status(400).json({ error: 'No business found' });
    const id = await dbRun('INSERT INTO services(business_id,name,description,category,duration_min,price) VALUES($1,$2,$3,$4,$5,$6) RETURNING id',
      [businessId,name.trim(),description||'',category||'General',parseInt(duration_min)||60,parseFloat(price)]);
    res.status(201).json(await dbGet('SELECT * FROM services WHERE id=$1',[id]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/services/:id', authenticate, authorize('business_owner','super_admin'), async (req, res) => {
  try {
    const svc = await dbGet('SELECT * FROM services WHERE id=$1',[req.params.id]);
    if (!svc) return res.status(404).json({ error: 'Not found' });
    if (req.user.role !== 'super_admin' && svc.business_id !== req.user.businessId)
      return res.status(403).json({ error: 'Not your service' });
    const { name,description,category,duration_min,price,is_active } = req.body;
    await dbRun('UPDATE services SET name=$1,description=$2,category=$3,duration_min=$4,price=$5,is_active=$6 WHERE id=$7 RETURNING id',
      [name||svc.name,description!==undefined?description:svc.description,category||svc.category,
       parseInt(duration_min)||svc.duration_min,parseFloat(price)||svc.price,
       is_active!==undefined?(is_active?1:0):svc.is_active,req.params.id]);
    res.json(await dbGet('SELECT * FROM services WHERE id=$1',[req.params.id]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/services/:id', authenticate, authorize('business_owner','super_admin'), async (req, res) => {
  try {
    const svc = await dbGet('SELECT * FROM services WHERE id=$1',[req.params.id]);
    if (!svc) return res.status(404).json({ error: 'Not found' });
    if (req.user.role !== 'super_admin' && svc.business_id !== req.user.businessId)
      return res.status(403).json({ error: 'Not your service' });
    await dbRun('UPDATE services SET is_active=0 WHERE id=$1 RETURNING id',[req.params.id]);
    res.json({ message: 'Service deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── STAFF ────────────────────────────────────────────────────
app.get('/api/staff', async (req, res) => {
  try {
    const { business_id } = req.query;
    if (business_id) return res.json(await dbAll('SELECT * FROM staff WHERE business_id=$1 AND is_active=1',[business_id]));
    res.json(await dbAll('SELECT * FROM staff WHERE is_active=1'));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/staff', authenticate, authorize('business_owner','super_admin'), async (req, res) => {
  try {
    const { name,title,bio,email,phone } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const id = await dbRun('INSERT INTO staff(business_id,name,title,bio,email,phone) VALUES($1,$2,$3,$4,$5,$6) RETURNING id',
      [req.user.businessId,name,title||'',bio||'',email||'',phone||'']);
    res.status(201).json(await dbGet('SELECT * FROM staff WHERE id=$1',[id]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/staff/:id', authenticate, authorize('business_owner','super_admin'), async (req, res) => {
  try {
    const s = await dbGet('SELECT * FROM staff WHERE id=$1',[req.params.id]);
    if (!s) return res.status(404).json({ error: 'Not found' });
    if (req.user.role !== 'super_admin' && s.business_id !== req.user.businessId)
      return res.status(403).json({ error: 'Not your staff' });
    const { name,title,bio,email,phone } = req.body;
    await dbRun('UPDATE staff SET name=$1,title=$2,bio=$3,email=$4,phone=$5 WHERE id=$6 RETURNING id',
      [name||s.name,title??s.title,bio??s.bio,email??s.email,phone??s.phone,req.params.id]);
    res.json(await dbGet('SELECT * FROM staff WHERE id=$1',[req.params.id]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/staff/:id', authenticate, authorize('business_owner','super_admin'), async (req, res) => {
  try {
    const s = await dbGet('SELECT * FROM staff WHERE id=$1',[req.params.id]);
    if (!s) return res.status(404).json({ error: 'Not found' });
    if (req.user.role !== 'super_admin' && s.business_id !== req.user.businessId)
      return res.status(403).json({ error: 'Not your staff' });
    await dbRun('UPDATE staff SET is_active=0 WHERE id=$1 RETURNING id',[req.params.id]);
    res.json({ message: 'Staff removed' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── APPOINTMENTS ─────────────────────────────────────────────
app.get('/api/appointments', authenticate, async (req, res) => {
  try {
    const { role,sub,businessId } = req.user;
    let rows;
    if (role === 'super_admin') {
      rows = await dbAll(`SELECT a.*,s.name as service_name,s.price,b.name as business_name,
        u.name as customer_name,u.phone as customer_phone,st.name as staff_name
        FROM appointments a JOIN services s ON a.service_id=s.id JOIN businesses b ON a.business_id=b.id
        JOIN users u ON a.customer_id=u.id LEFT JOIN staff st ON a.staff_id=st.id ORDER BY a.date DESC,a.time DESC`);
    } else if (role === 'business_owner') {
      rows = await dbAll(`SELECT a.*,s.name as service_name,s.price,b.name as business_name,
        u.name as customer_name,u.phone as customer_phone,u.email as customer_email,st.name as staff_name
        FROM appointments a JOIN services s ON a.service_id=s.id JOIN businesses b ON a.business_id=b.id
        JOIN users u ON a.customer_id=u.id LEFT JOIN staff st ON a.staff_id=st.id
        WHERE a.business_id=$1 ORDER BY a.date DESC,a.time DESC`,[businessId]);
    } else {
      rows = await dbAll(`SELECT a.*,s.name as service_name,s.price,s.duration_min,
        b.name as business_name,b.address,st.name as staff_name
        FROM appointments a JOIN services s ON a.service_id=s.id JOIN businesses b ON a.business_id=b.id
        LEFT JOIN staff st ON a.staff_id=st.id WHERE a.customer_id=$1 ORDER BY a.date DESC,a.time DESC`,[sub]);
    }
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/appointments/stats', authenticate, async (req, res) => {
  try {
    const { sub,role,businessId } = req.user;
    const id = role === 'business_owner' ? businessId : sub;
    const col = role === 'business_owner' ? 'business_id' : 'customer_id';
    const [total,upcoming,completed,cancelled] = await Promise.all([
      dbGet(`SELECT COUNT(*) as c FROM appointments WHERE ${col}=$1`,[id]),
      dbGet(`SELECT COUNT(*) as c FROM appointments WHERE ${col}=$1 AND status IN ('pending','confirmed') AND date>=CURRENT_DATE::text`,[id]),
      dbGet(`SELECT COUNT(*) as c FROM appointments WHERE ${col}=$1 AND status='completed'`,[id]),
      dbGet(`SELECT COUNT(*) as c FROM appointments WHERE ${col}=$1 AND status='cancelled'`,[id]),
    ]);
    res.json({ total:total.c,upcoming:upcoming.c,completed:completed.c,cancelled:cancelled.c });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/appointments/slots', async (req, res) => {
  try {
    const { business_id,service_id,date } = req.query;
    if (!business_id||!service_id||!date) return res.status(400).json({ error: 'Missing params' });
    const service = await dbGet('SELECT * FROM services WHERE id=$1',[service_id]);
    if (!service) return res.status(404).json({ error: 'Service not found' });
    const dur = parseInt(service.duration_min)||60;
    const slots = [];
    let start = 9*60;
    while (start+dur <= 18*60) {
      slots.push(`${String(Math.floor(start/60)).padStart(2,'0')}:${String(start%60).padStart(2,'0')}`);
      start += dur;
    }
    const booked = await dbAll(`SELECT time FROM appointments WHERE business_id=$1 AND service_id=$2 AND date=$3 AND status!='cancelled'`,[business_id,service_id,date]);
    res.json(slots.filter(s => !booked.map(b=>b.time).includes(s)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/appointments', authenticate, authorize('customer','super_admin'), async (req, res) => {
  try {
    let { business_id,service_id,staff_id,date,time,notes } = req.body;
    business_id=parseInt(business_id); service_id=parseInt(service_id); staff_id=staff_id?parseInt(staff_id):null;
    if (!business_id||!service_id||!date||!time) return res.status(400).json({ error: 'Missing required fields' });
    const conflict = await dbGet(`SELECT id FROM appointments WHERE business_id=$1 AND service_id=$2 AND date=$3 AND time=$4 AND status!='cancelled'`,[business_id,service_id,date,time]);
    if (conflict) return res.status(409).json({ error: 'This slot is no longer available.' });
    const service  = await dbGet('SELECT * FROM services WHERE id=$1',[service_id]);
    const business = await dbGet('SELECT * FROM businesses WHERE id=$1',[business_id]);
    if (!service||!business) return res.status(404).json({ error: 'Not found' });
    const apptId = await dbRun(`INSERT INTO appointments(business_id,service_id,staff_id,customer_id,date,time,notes,price) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [business_id,service_id,staff_id,req.user.sub,date,time,notes||null,service.price]);
    await dbRun('INSERT INTO notifications(user_id,message) VALUES($1,$2) RETURNING id',[business.owner_id,`New booking: ${service.name} on ${date} at ${time}`]);
    await dbRun('INSERT INTO notifications(user_id,message) VALUES($1,$2) RETURNING id',[req.user.sub,`Booking confirmed: ${service.name} at ${business.name} on ${date} at ${time}`]);
    res.status(201).json(await dbGet(`SELECT a.*,s.name as service_name,b.name as business_name FROM appointments a JOIN services s ON a.service_id=s.id JOIN businesses b ON a.business_id=b.id WHERE a.id=$1`,[apptId]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/appointments/:id/status', authenticate, async (req, res) => {
  try {
    const appt = await dbGet('SELECT * FROM appointments WHERE id=$1',[req.params.id]);
    if (!appt) return res.status(404).json({ error: 'Not found' });
    const { role,sub,businessId } = req.user;
    const { status } = req.body;
    if (!['pending','confirmed','completed','cancelled'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    if (role==='customer') {
      if (appt.customer_id!==sub) return res.status(403).json({ error: 'Not your appointment' });
      if (status!=='cancelled')   return res.status(403).json({ error: 'Customers can only cancel' });
    }
    if (role==='business_owner' && appt.business_id!==businessId) return res.status(403).json({ error: 'Not your appointment' });
    await dbRun('UPDATE appointments SET status=$1 WHERE id=$2 RETURNING id',[status,req.params.id]);
    const svc = await dbGet('SELECT name FROM services WHERE id=$1',[appt.service_id]);
    const msgs = { confirmed:`Your appointment for ${svc?.name} is confirmed!`, completed:`Your ${svc?.name} appointment is complete!`, cancelled:`Your ${svc?.name} appointment was cancelled.` };
    if (msgs[status]) await dbRun('INSERT INTO notifications(user_id,message) VALUES($1,$2) RETURNING id',[appt.customer_id,msgs[status]]);
    res.json(await dbGet('SELECT * FROM appointments WHERE id=$1',[req.params.id]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── ADMIN ────────────────────────────────────────────────────
app.get('/api/admin/stats', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const [users,businesses,appts,revenue,customers,owners] = await Promise.all([
      dbGet('SELECT COUNT(*) as c FROM users',[]),
      dbGet('SELECT COUNT(*) as c FROM businesses WHERE is_active=1',[]),
      dbGet('SELECT COUNT(*) as c FROM appointments',[]),
      dbGet("SELECT COALESCE(SUM(price),0) as t FROM appointments WHERE status='completed'",[]),
      dbGet("SELECT COUNT(*) as c FROM users WHERE role='customer'",[]),
      dbGet("SELECT COUNT(*) as c FROM users WHERE role='business_owner'",[]),
    ]);
    res.json({ totalUsers:users.c,totalBusinesses:businesses.c,totalAppointments:appts.c,totalRevenue:revenue.t,totalCustomers:customers.c,totalOwners:owners.c });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/businesses', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    res.json(await dbAll(`SELECT b.*,u.name as owner_name,u.email as owner_email,
      (SELECT COUNT(*) FROM services s WHERE s.business_id=b.id AND s.is_active=1) as services,
      (SELECT COUNT(*) FROM appointments a WHERE a.business_id=b.id) as bookings
      FROM businesses b JOIN users u ON b.owner_id=u.id ORDER BY b.created_at DESC`));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/admin/businesses/:id/suspend', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const biz = await dbGet('SELECT * FROM businesses WHERE id=$1',[req.params.id]);
    if (!biz) return res.status(404).json({ error: 'Not found' });
    const s = biz.is_active ? 0 : 1;
    await dbRun('UPDATE businesses SET is_active=$1 WHERE id=$2 RETURNING id',[s,req.params.id]);
    res.json({ message: s ? 'Business reactivated' : 'Business suspended', is_active: s });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/users', authenticate, authorize('super_admin'), async (req, res) => {
  try { res.json(await dbAll('SELECT id,name,email,phone,role,is_active,created_at FROM users ORDER BY created_at DESC')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/admin/users/:id/toggle', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const user = await dbGet('SELECT * FROM users WHERE id=$1',[req.params.id]);
    if (!user) return res.status(404).json({ error: 'Not found' });
    if (user.role==='super_admin') return res.status(403).json({ error: 'Cannot suspend admin' });
    await dbRun('UPDATE users SET is_active=$1 WHERE id=$2 RETURNING id',[user.is_active?0:1,req.params.id]);
    res.json({ message: user.is_active ? 'User suspended' : 'User reactivated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── MISC ─────────────────────────────────────────────────────
app.get('/api/notifications', authenticate, async (req, res) => {
  try {
    const notifs = await dbAll('SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20',[req.user.sub]);
    const unread  = await dbGet('SELECT COUNT(*) as c FROM notifications WHERE user_id=$1 AND is_read=0',[req.user.sub]);
    res.json({ notifications:notifs, unreadCount:unread.c });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/notifications/read', authenticate, async (req, res) => {
  try {
    await dbRun('UPDATE notifications SET is_read=1 WHERE user_id=$1 RETURNING id',[req.user.sub]);
    res.json({ message: 'Marked as read' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/profile', authenticate, async (req, res) => {
  try {
    const user = await dbGet('SELECT id,name,email,phone,role,created_at FROM users WHERE id=$1',[req.user.sub]);
    res.json({ ...user, businessId: req.user.businessId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/profile', authenticate, async (req, res) => {
  try {
    const { name,phone } = req.body;
    const user = await dbGet('SELECT * FROM users WHERE id=$1',[req.user.sub]);
    await dbRun('UPDATE users SET name=$1,phone=$2 WHERE id=$3 RETURNING id',[name||user.name,phone||user.phone,req.user.sub]);
    res.json(await dbGet('SELECT id,name,email,phone,role FROM users WHERE id=$1',[req.user.sub]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

module.exports = app;
