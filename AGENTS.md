# Image Service — System Rules & Conventions

ยึดมาตรฐานเดียวกับ ERP/MES ตั้งแต่วันแรก เพื่อลดงาน Integration ตอนย้ายเข้าระบบจริง.

## Priority 1 — ใช้ทันที 100%

### Shared Layout
ทุกหน้าต้องห่อด้วย `<Layout>` component กลาง — Header, Sidebar, Theme, Language, Profile เหมือน ERP ทุกหน้า.
```tsx
<Layout>
  <ImageServiceOverview />
</Layout>
```

### Central Dialog
ทุก Dialog/Popup ใช้ `<Modal>` / `<ConfirmDialog>` กลางเท่านั้น — **ห้าม** `alert()` / `confirm()` / `window.prompt()`.

### 5-Language i18n
ทุกข้อความ UI ใช้ `t('key')` และต้องมีครบ 5 ภาษา (th/en/cn/mm/jp). ห้าม hardcode ข้อความตรง ๆ.
```tsx
✅ <h1>{t('imageService.search.title')}</h1>
❌ <h1>Search</h1>
```

### Theme Tokens
ทุก styling ที่ขึ้นกับ theme ต้องมาจาก `themeConfig` — **ห้าม hardcode สี** หรือใช้ className สีตรง ๆ สำหรับพื้นหลัง/ข้อความ/เส้นขอบ.
```tsx
✅ className={themeConfig.card}
✅ style={{ color: themeConfig.text.primary }}
❌ className="bg-blue-500"
❌ style={{ background: '#2563eb' }}
```

### SearchableSelect
Dropdown ทุกจุดใช้ `<SearchableSelect>` เท่านั้น — **ห้าม** `<select>` native.

### React Query
ทุกหน้าที่ดึงข้อมูล API ใช้ `useQuery` + `invalidateQueries` หลัง mutation — **ห้าม** `useEffect` + `useState` สำหรับ data fetching.
```tsx
✅ useQuery({ queryKey: ['cameras'], queryFn: () => api.getCameras() })
❌ useEffect(() => { axios.get(...).then(setData) }, [])
```

### Date Display
ใช้ `formatDate(date, i18n.language)` เสมอ — ภาษาไทย = พ.ศ. (th-TH), ภาษาอื่น = ค.ศ. — **ห้าม** inline `toLocaleDateString`.

### Table UX
ทุกตารางต้องมี: `<TableSkeleton>` (loading), sortable columns (ChevronUp/Down), `<ColumnSelector>` (gear), soft-delete trash toggle, pagination.

---

## Priority 2 — ใช้เมื่อมี CRUD / Auth

### authorize() on Write
ทุก POST/PUT/PATCH/DELETE ต้องมี `authorize([PERMISSIONS.X])` ตรง domain layer — ห้าม authorize เฉพาะ route.
```ts
authorize([PERMISSIONS.CAMERA_CREATE, PERMISSIONS.CAMERA_UPDATE])
```

### Soft Delete
ข้อมูลที่ลบได้ใช้ `deletedAt` + trash/restore — **ไม่ hard delete**.
- ✅ Cameras, Retention Policies → soft delete
- ❌ Images → ยังไม่ต้อง (ไฟล์มีขนาดใหญ่)

---

## Priority 3 — ค่อยใช้ตอน Phase 2+

### Low-Code Config
ทุก business rule ที่อาจเปลี่ยนต้องตั้งค่าได้ผ่าน Admin UI — **ห้าม hardcode** threshold/rate/template ในโค้ด.
```tsx
❌ const RETRY_COUNT = 3
✅ เก็บใน System Settings / Low-Code Config UI
```
เหมาะกับ: Retention Days, Compression Quality, Thumbnail Size, Polling Interval, Retry Count, Alert Threshold.

---

## Priority 4 — สำหรับ Masterdata Entity

### Masterdata Fields
ทุก masterdata entity ต้องมีฟิลด์ครบ: `code @unique`, `name` / `nameTh` / `nameEn` / `nameCn` / `nameMm` / `nameJp`, `description`, `sortOrder`, `isActive` — **ห้าม** สร้าง entity ที่ขาดฟิลด์พื้นฐาน.
- ✅ Camera Type, Image Category, Defect Type, Inspection Type → ต้องมีครบ
- ❌ Image Entity → ไม่ต้อง (เป็นไฟล์ภาพ ไม่ใช่ masterdata)

---

## Priority 5 — เมื่อเข้า ERP Integration

### Kafka Event Standard
เมื่อประมวลผลเสร็จ เตรียมรองรับ Kafka Event:
```json
{
  "event": "image.processed",
  "imageId": "...",
  "cameraId": "...",
  "filename": "...",
  "pngPath": "...",
  "thumbnailPath": "...",
  "capturedAt": "..."
}
```
Consumer ในอนาคต: vision-service, predictive-service, historian-service, production-service.

---

## Image Service — กฎเฉพาะ

### Image Storage Rule
ทุกภาพต้องมี record ใน `image_files` ครบ 3 ประเภท: Original TIFF (raw), PNG (processed), Thumbnail (thumbnail).

### Traceability Rule
ทุกภาพต้อง Trace กลับได้ว่า: Camera → Machine → Lot → Operator → Shift มาจากไหน.

### Event Rule
เมื่อประมวลผลเสร็จ ต้อง emit event ให้ services อื่นนำไปใช้ต่อ.

---

## Docker & Deployment
- ERP Platform รันบน 3-VM (App / DB / Infra)
- Image Service รันบน dedicated VM ของตัวเอง แยกจาก ERP Platform
- DB isolation: แต่ละ service เป็นเจ้าของ DB ของตัวเอง — แยก schema/table ได้ง่าย

## Charts & Dataviz
- ใช้ Recharts สำหรับ data visualization
- ใช้ react-grid-layout สำหรับ draggable/resizable dashboard widgets
