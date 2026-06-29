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

### requirePermission() on ALL Write Endpoints
ทุก POST/PUT/PATCH/DELETE **ต้องมี** `requirePermission('module:action')` ใน route preHandler — **ห้ามมี write endpoint ที่ใช้แค่ `authenticate` อย่างเดียว**
```ts
✅ app.post('/', { preHandler: [app.authenticate, requirePermission('cameras:create')] }, handler)
❌ app.post('/', { preHandler: [app.authenticate] }, handler)
```
Permission keys ที่ใช้: `overview:read`, `cameras:read/create/update/delete`, `search:read/update/delete`, `processing:read/create`, `dead-letter:read/create`, `storage:read/create/update/delete`, `logs:read`, `audit-log:read`, `backup:read/create`, `retention:read/create/update/delete`, `alerts:read/create/update`, `masterdata:read/create/update/delete`, `api-keys:read/create/update/delete`, `telegram-bot:read/update`, `system-config:read/update`, `settings:read/update`, `users:read/create/update/delete`, `health:read`, `roadmap:read`

### UI Permission Check
ปุ่ม/ฟอร์มที่ต้องมีสิทธิ์ **ต้องซ่อน** เมื่อ user ไม่มีสิทธิ์ — ใช้ `hasPermission(user, 'module:action')` เช็คก่อนแสดง
```tsx
✅ {hasPermission(user, 'cameras:delete') && <Button>ลบ</Button>}
❌ <Button>ลบ</Button>  // แสดงทุกคน รอ 403 ทีหลัง
```

### 403 Handling
Axios interceptor เช็ค 403 → แสดง toast "ไม่มีสิทธิ์" + set `error._handled = true` → catch blocks ต้องเช็ค `if (!e?._handled)` ก่อนแสดง toast ซ้ำ
```tsx
✅ } catch (e: any) { if (!e?._handled) toast.error(t('common.error')); }
❌ } catch { toast.error(t('common.error')); }
```

### Soft Delete + Trash + Password Confirmation
ข้อมูลที่ลบได้ใช้ `deletedAt` + trash/restore — **ไม่ hard delete** ยกเว้น "ล้างถังขยะ"
- ✅ Cameras → soft delete (`deletedAt`) + trash + restore
- ✅ Images → soft delete (`status='deleted'`) + trash + restore
- ลบ + ล้างถังขยะ **ต้องยืนยันรหัสผ่าน** ผ่าน `authService.login()`
- Empty trash = hard delete จริง + ต้อง audit log

### Audit Log
ทุกการดำเนินการสำคัญต้องบันทึก `createAuditLog()` — ใช้ `.catch(() => {})` (fire-and-forget ไม่ block):
```ts
createAuditLog({
  userId: user?.id,
  action: 'camera_status_change',  // action name
  entity: 'camera',                // entity type
  entityId: id,                    // entity ID
  description: `...`,             // human-readable
  metadata: { ... },              // structured data
  ipAddress: request.ip,
}).catch(() => {});
```
Actions ที่ต้อง log: create, update, delete, status_change, restore, bulk_delete, trash_empty, reprocess, login, logout, password_change, file_download

### Alert & Notification
เหตุการณ์สำคัญต้องสร้าง Alert ผ่าน `createAlert()`:
- Camera offline/online/status change → `alertType: 'camera_offline'`
- Storage เกิน threshold → `alertType: 'storage_warning'` / `'disk_space'`
- Bulk delete → `alertType: 'storage_warning'` severity: info
- Alert dedup: ไม่สร้างซ้ำภายใน 30 นาทีสำหรับ source+type เดียวกัน (ยกเว้น `skipDedup: true`)
- กระดิ่ง navbar นับจาก `acknowledgedAt IS NULL`

### Webhook
เหตุการณ์สำคัญ fire-and-forget `sendWebhook(event, payload)`:
- `image.processed` — เมื่อ image process เสร็จ
- `camera.status_changed` — เมื่อเปลี่ยนสถานะกล้อง
- `images.bulk_deleted` — เมื่อ bulk delete
- Config: `webhook_url` + `webhook_secret` (HMAC-SHA256) ในหน้าตั้งค่าระบบ

### Security Rules (P15)
- **SMB passwords** ต้องเข้ารหัส AES-256-GCM ก่อนเก็บ DB — ใช้ `encrypt()` / `decrypt()` จาก `lib/encryption.ts`
- **JWT_SECRET / ENCRYPTION_KEY** ห้ามใช้ค่า default ใน production — ระบบจะ log WARNING
- **/metrics endpoint** ต้องมี auth (Prometheus UA / Service API Key / JWT)
- **Login rate limit** 10 ครั้ง/นาที
- **Security headers** ต้องมีใน nginx: HSTS, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy
- **CORS** ตอนนี้ `origin: true` สำหรับ LAN — production ต้องจำกัด domain

### i18n Integrity
เมื่อ agent copy `th.json` / `en.json` จาก worktree **ต้องเช็คว่า health keys ยังครบ** หลัง merge ทุกครั้ง:
`serverResources`, `memory`, `disk`, `queueStatus`, `queueJobs`, `systemInfo`, `verification`, `runVerification`, `verificationMethod`, `verificationHint`

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
ทุกภาพต้องมี record ใน `image_files` พร้อม `storageProviderId` — ห้ามเป็น NULL สำหรับไฟล์ใหม่
- FileType รองรับ: raw, processed, thumbnail, ai, ocr, face_blur, custom
- `submitProcessingResult` ต้อง auto-assign S3 provider เมื่อ worker ไม่ได้ระบุ

### Storage Provider Rule
- Worker ดึง default provider config จาก API ตอน startup + refresh ทุก 5 นาที
- เปลี่ยน default provider จาก UI ได้ — worker ไม่ต้อง restart
- Provider ทุกตัวต้องมี `capacityBytes` ตั้งค่าได้จาก UI (Local Disk อ่าน auto)
- Metric collector ทุก 15 นาที + alert เมื่อ usage > 75% (warning) / 90% (critical)

### Camera Health Rule
- Camera health monitor ทุก 1 นาที — ตรวจ `lastPolledAt` + `status`
- Offline > `camera_offline_threshold_minutes` (default 5) → alert + CameraEvent
- เปลี่ยนสถานะกล้อง (active/maintenance/inactive) → audit log + alert + webhook
- กล้อง maintenance → sync worker หยุด poll อัตโนมัติ

### Traceability Rule
ทุกภาพต้อง Trace กลับได้ว่า: Camera → Machine → Lot → Operator → Shift มาจากไหน.

### Event Rule
เมื่อประมวลผลเสร็จ ต้อง emit: Kafka event + Webhook + Alert (ถ้าตั้งค่าไว้)

### Observability Rule
- Prometheus scrape `/api/v1/metrics` ทุก 15 วินาที (24+ metrics)
- Grafana 4 dashboards: Overview, Camera, Storage, System
- Per-camera metrics: status, images_total, last_poll_seconds
- System metrics: CPU, RAM, disk, DB connections, process memory

---

## Docker & Deployment
- Image Service รันบน dedicated VM แยกจาก ERP Platform
- 20+ containers จัดการด้วย docker-compose + health checks
- DB isolation: แต่ละ service เป็นเจ้าของ DB ของตัวเอง
- HTTPS: self-signed cert สำหรับ LAN + เปลี่ยน IP ด้วย `./ssl/generate-cert.sh <IP>`
- Grafana + Prometheus + Loki สำหรับ monitoring

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
