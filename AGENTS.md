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

---

## Critical Fixes History

### 2026-06-24 — Frontend changes not visible after code edit (Docker rebuild required)

**Problem:** After editing frontend source code, changes were not reflected in the live UI at http://localhost:5173.
- Caused by manually running a Vite dev server (`npm run dev`) which was killed by Ctrl+C but the actual serving was done by a **Docker container** (`image-web-app`).
- Subsequent `npm run dev` started a new Vite dev server, but it conflicted with or was shadowed by the Docker container still running on port 5173.

**Fix:** 
- The frontend runs via **Docker** (`image-web-app` container), not the Vite dev server.
- After any frontend code change, must rebuild the Docker image and restart:
  ```bash
  docker compose build web-app
  docker compose up -d --no-deps web-app
  ```
- Same applies to backend (`image-api`):
  ```bash
  docker compose build image-api
  docker compose up -d --no-deps image-api
  ```
- Verify by checking the JS bundle hash in the served `index.html` or grepping for new strings in the built JS.

**Lesson:** Always check which process is actually serving the frontend (Docker vs dev server) before debugging. `docker ps` and `curl http://localhost:5173/ | Select-String "index-"` to confirm.

### 2026-06-24 — scan-now infinite loop + processing-worker SMB access

**Problem 1: scan-now infinite loop**
- `updateHandler` in `cameras.controller.ts` set `sync:scan-now = 'all'` on EVERY update
- sync-worker's `updateCameraPoll` called `PATCH /cameras/:id` every cycle → re-triggered scan-now → worker never slept
- **Fix:** Removed `redis.set('sync:scan-now', ...)` from `updateHandler`. Users click "Scan Now" manually.

**Problem 2: processing-worker file access via mount volume**
- processing-worker relied on CIFS mount at `/mnt/smb/host/share/` per camera
- Adding new cameras required docker-compose volume changes → not scalable
- **Fix:** processing-worker now uses `smbclient` CLI to download TIFF files (same pattern as sync-worker)
  - `worker.py:_resolve_file()` fetches camera config from `GET /api/v1/cameras/:id`
  - Uses `smbclient //share -U user%pass -c 'get "relative/path" /tmp/file.tif'`
  - Deletes temp file after processing
  - Added `smbclient` to Docker image
  - Added `api_client.py:get_camera()` for camera config fetch

**Problem 3: stale Redis keys after clear-all-data**
- `clear-all-data` didn't clear `sync:scan-now`, `sync:scan-now:ids`, `sync:camera:*`, `sync:processed:*` keys
- **Fix:** Added cleanup of all `sync:*` and `bull:*` keys in `admin.service.ts:clearAllData()`

**Problem 4: `lastPolledAt` silently dropped on camera update**
- `updateCameraSchema` didn't include `lastPolledAt` → Zod stripped it
- **Fix:** Added `lastPolledAt: z.string().datetime().optional()` to schema and `updateCamera()` service
