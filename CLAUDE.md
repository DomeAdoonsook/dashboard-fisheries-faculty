# Dashboard งานคณะ — คณะเทคโนโลยีการประมงและทรัพยากรทางน้ำ มหาวิทยาลัยแม่โจ้

## สภาพแวดล้อม
- OS: Windows 11, Shell: PowerShell
- Python: ใช้ `py` (ไม่ใช่ `python`) เพราะเป็น Windows Store alias
- ต้องใช้ `io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')` เมื่อ print ภาษาไทยใน PowerShell
- หรือเขียน output ออกเป็นไฟล์ก่อนแล้วค่อย `Get-Content` เพื่อแสดงผลภาษาไทย
- path ไฟล์มีภาษาไทย → ใช้ PowerShell เสมอ (Bash tool รับ path ไทยไม่ได้)

## ไฟล์หลัก
- `รายงานตัวชี้วัดภาระกิจประจำ.xlsx` — 46 ตัวชี้วัด 5 ยุทธศาสตร์
- `รายงานตัวชี้วัดเชิงรุก.xlsx` — 10 ตัวชี้วัด 5 ยุทธศาสตร์

## Firebase / Firestore
- Project: `dashboard-fisheries` (Spark free plan, asia-southeast1)
- GitHub Pages URL: `https://domeadoonsook.github.io/dashboard-fisheries-faculty/`
- **ข้อมูลทั้งหมดอยู่ใน Firestore** (ไม่ใช้ localStorage แล้ว ยกเว้น auth/session)
- Firebase SDK v12.15.0 via CDN (gstatic)
- `app/firebase.js` — shared config (ไม่ได้ใช้ตรงๆ — แต่ละหน้า inline module script เอง)

### Pattern: Firebase module script (ใส่ใน `<head>` ทุกหน้า)
```html
<script type="module">
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
  import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
  const cfg = { apiKey:"AIzaSyDK--LHu280flT2UBqQc85cZAgZ0gSu7m4", authDomain:"dashboard-fisheries.firebaseapp.com",
    projectId:"dashboard-fisheries", storageBucket:"dashboard-fisheries.firebasestorage.app",
    messagingSenderId:"1002413057784", appId:"1:1002413057784:web:c6cba7563409e62cbcfd0d" };
  const _db = getFirestore(initializeApp(cfg));
  window._fsGet = async (col, id) => { const s = await getDoc(doc(_db,col,id)); return s.exists()?s.data():null; };
  window._fsSet = async (col, id, data) => { await setDoc(doc(_db,col,id), data); };
  window._firebaseReady = true;
  window.dispatchEvent(new Event('firebase-ready'));
</script>
```

### Pattern: รอ Firebase ก่อน init
```js
async function _init() {
  if (!window._firebaseReady)
    await new Promise(r => window.addEventListener('firebase-ready', r, {once:true}));
  // โหลด data จาก Firestore แล้วค่อย render
}
_init();
```

### Firestore Collections
| Collection | Document | เนื้อหา |
|---|---|---|
| `mission` | `2569` | `{ kpis: [...46 items] }` |
| `proactive` | `2569` | `{ kpis: [...10 items] }` |
| `mission_meta` | `strategies_2569` | `{ list: [...5 strategies] }` |
| `proactive_meta` | `strategies_2569` | `{ list: [...5 strategies] }` |
| `app_meta` | `kpi_years` | `{ years: [2569] }` |
| `farm` | `dirt_ponds` | `{ data: [...53 บ่อ] }` |
| `farm` | `dirt_cycles` | `{ data: [...] }` |
| `farm` | `dirt_logs` | `{ data: [...] }` |
| `farm` | `dirt_feed_cfg` | `{ data: [...] }` |
| `farm` | `dirt_med_cfg` | `{ data: [...] }` |
| `farm` | `dirt_cost_cfg` | `{ data: [...] }` |
| `farm` | `dirt_species` | `{ data: [...] }` |
| `farm` | `sab_ponds` | `{ data: [...27 บ่อ] }` |
| `farm` | `sao_ponds` | `{ data: [...24 บ่อ] }` |
| `farm` | `sab_cycles/logs/feed_cfg/...` | เหมือน dirt |
| `farm` | `sao_cycles/logs/feed_cfg/...` | เหมือน dirt |
| `hr` | `personnel` | `{ data: [...] }` — ทำเนียบบุคลากร |
| `hr` | `academic_positions` | `{ data: [...] }` — ตำแหน่งวิชาการ |
| `hr` | `retirement_plan` | `{ data: [...] }` — แผนเกษียณอายุ |
| `hr` | `support_position_plan` | `{ data: [...], years: [2569,2570,2571] }` — แผนตำแหน่งสนับสนุน |

### Pattern: In-memory cache + async Firestore save
```js
let _dataCache = { kpis: [] };
function getData() { return _dataCache; }
function saveData(data) {
  _dataCache = data;
  window._fsSet('mission', String(getCurrentYear()), data).catch(console.error);
}
async function initData() {
  const fs = await window._fsGet('mission', String(getCurrentYear()));
  if (fs && fs.kpis) _dataCache = fs;
}
```

### Seeder
- `app/seed-firestore.html` — เปิดครั้งเดียวเพื่อ seed ข้อมูลจาก Excel เข้า Firestore
- Seed แล้ว: Mission 46 KPI (Q1=Q2, Q2, Q3), Proactive 10 KPI (Q1=Q2=Q3), บ่อดิน 53, SAB 27, SAO 24

## โครงสร้างตัวชี้วัด

### ภาระกิจประจำ — 46 ตัวชี้วัด, 5 ยุทธศาสตร์
- Q1=ต.ค.-ธ.ค. 68 / Q2=ต.ค.-มี.ค. 69 / Q3=ต.ค.-มิ.ย. 69 / Q4=ต.ค.-ก.ย. 69
- แต่ละ KPI: `{ code, name, unit, target, strategy, criteria, quarters: { Q1,Q2,Q3,Q4 } }`
- แต่ละ quarter: `{ result, percent, detail, link, userLink }`
- `link` = URL จาก ERP (seed จาก Excel), `userLink` = URL ที่ admin กรอกเอง

### เชิงรุก — 10 ตัวชี้วัด, 5 ยุทธศาสตร์
- Q1=ต.ค. / Q2=ม.ค. / Q3=เม.ย. / Q4=ก.ค.
- แต่ละ KPI: `{ code, name, unit, target, strategy, quarters: { Q1,Q2,Q3,Q4 } }`
- แต่ละ quarter: `{ score, percent, detail, owner, link, userLink }`

## Git & GitHub
- Remote: https://github.com/DomeAdoonsook/dashboard-fisheries-faculty (private)
- **ทุกครั้งที่จบ session ให้ remind user commit และ push เสมอ**
- คำสั่ง: `git add -A && git commit -m "..." && git push`

---

## แผนหน้าทั้งหมด

### ข้อตกลงการออกแบบ
- **Tech:** HTML + JavaScript + Firestore
- **เปิดด้วย:** `start.bat` → Python http.server → เปิด browser อัตโนมัติ
- **ธีม:** น้ำเงิน-ขาว (`#1e3a5f` / `#2563eb`), Modern/Clean, Liquid Glass card
- **Login:** 2 role — `admin` (กรอก/แก้ไขได้) / `executive` (ดูได้อย่างเดียว)
- **หลักฐาน:** ใช้ `userLink` (URL) แทน PDF upload

### Workflow แยกตาม Role
**เจ้าหน้าที่ (admin)** → `dashboard-main.html` → เลือกระบบ
- ภาระกิจประจำ → `mission-admin.html`
- เชิงรุก → `proactive-admin.html`
- ฟาร์มประมง → `farm-admin.html` / `farm-sab.html` / `farm-sao.html`

**ผู้บริหาร (executive)** → `executive-main.html` → เลือก dashboard
- ภาระกิจประจำ → `mission-dashboard.html`
- เชิงรุก → `proactive-dashboard.html`

### หน้าทั้งหมด
- [x] หน้า 1: `index.html` — Login (admin / executive)
- [x] หน้า 2: `dashboard-main.html` — เจ้าหน้าที่เลือกระบบ
- [x] หน้า 3: `executive-main.html` — ผู้บริหารเลือก dashboard (ภาพรวมองค์กร)
- [ ] หน้า 4: `mission-dashboard.html` — ผู้บริหารดู ภาระกิจประจำ (กราฟ/สถานะ)
- [x] หน้า 5: `mission-admin.html` — เจ้าหน้าที่จัดการ ภาระกิจ (กรอก/แนบลิงก์)
- [ ] หน้า 6: `proactive-dashboard.html` — ผู้บริหารดู เชิงรุก (กราฟ/สถานะ)
- [x] หน้า 7: `proactive-admin.html` — เจ้าหน้าที่จัดการ เชิงรุก (กรอก/แนบลิงก์)
- [x] หน้า 8: `start.bat` — ไฟล์เปิดระบบ
- [x] หน้า 9: `farm-admin.html` — จัดการฟาร์ม บ่อดิน (53 บ่อ)
- [x] หน้า 10: `farm-sab.html` — จัดการฟาร์ม SAB (27 บ่อ)
- [x] หน้า 11: `farm-sao.html` — จัดการฟาร์ม SAO (24 บ่อ)
- [x] หน้า 12: `seed-firestore.html` — Seeder (ใช้ครั้งเดียว)
- [x] หน้า 13: `hr-admin.html` — จัดการข้อมูลบุคลากร (ทำเนียบ/ตำแหน่งวิชาการ/แผนเกษียณ/แผนตำแหน่งสนับสนุน)
- [x] หน้า 14: `seed-hr.html` — Seeder ข้อมูล HR จากไฟล์ Word (ใช้ครั้งเดียว, seed แล้ว)

หมายเหตุ: การ์ด "การเงินและบัญชี" เดิมในหน้า 2 (`dashboard-main.html`) ถูกแทนที่ด้วยการ์ด "ทรัพยากรบุคคล" ชี้ไป `hr-admin.html`

### สิ่งที่ยังต้องทำ
- [ ] `mission-dashboard.html` — executive view ภาระกิจ (กราฟ Bar/Donut/Radar, traffic light, filter ยุทธศาสตร์)
- [ ] `proactive-dashboard.html` — executive view เชิงรุก (คะแนน 1-5, กราฟ radar)
- [ ] ผังองค์กรแบบ dynamic ในหน้าผู้บริหาร — ดึงชื่อ-ตำแหน่งจริงจาก `hr/personnel` (field `adminRole`) มาวาด org chart ตามโครงสร้างคงที่จาก "โครงสร้างส่วนงาน 69.pdf" (คณบดี → รองคณบดี 3 ฝ่าย + ผอ.สำนักงาน → หัวหน้างาน 5 งาน + ศูนย์ความเป็นเลิศ)

### กฎสำคัญสำหรับ Claude
1. ทุก session อ่าน CLAUDE.md ก่อนเสมอ
2. เมื่อหน้าไหนเสร็จ ให้ติ๊ก [x] ใน CLAUDE.md
3. ทุกหน้าใช้ธีม/สี/สไตล์เดียวกัน
4. ใช้ PowerShell เสมอ (path มีภาษาไทย)
5. เมื่อจบ session remind user: `git add -A && git commit -m "..." && git push`
