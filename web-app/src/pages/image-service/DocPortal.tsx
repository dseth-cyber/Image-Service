import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/contexts/ThemeContext'
import {
  BookOpen, Terminal, Cpu, Database, Network, HardDrive, FileCode, Check, Copy, AlertTriangle, Lightbulb, Info, ArrowRight, ShieldCheck, Zap
} from 'lucide-react'

// Copy button component for code snippets
function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group my-4 rounded-lg overflow-hidden border border-white/10 bg-slate-950">
      <div className="flex items-center justify-between px-4 py-1.5 bg-slate-900 border-b border-white/5 text-[10px] font-mono text-slate-400">
        <span>{lang.toUpperCase()}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-white transition-colors"
        >
          {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  )
}

export default function DocPortal() {
  const { t } = useTranslation()
  const { themeConfig } = useTheme()
  const [activeTab, setActiveTab] = useState('getting-started')

  const docMenu = [
    { id: 'getting-started', label: 'Getting Started', icon: BookOpen },
    { id: 'architecture', label: 'Architecture', icon: Cpu },
    { id: 'deployment', label: 'Deployment Guide', icon: Terminal },
    { id: 'api-reference', label: 'API Reference', icon: FileCode },
    { id: 'event-catalog', label: 'Event Catalog', icon: Zap },
    { id: 'plugin-sdk', label: 'Plugin / Worker SDK', icon: Network },
    { id: 'database-schema', label: 'Database Schema', icon: Database },
    { id: 'storage-providers', label: 'Storage Providers', icon: HardDrive },
    { id: 'troubleshooting', label: 'Troubleshooting', icon: AlertTriangle },
    { id: 'best-practices', label: 'Best Practices', icon: ShieldCheck },
    { id: 'release-notes', label: 'Release Notes', icon: Info },
    { id: 'roadmap', label: 'Roadmap', icon: ArrowRight },
  ]

  // Copy-pasteable docker compose sample
  const dockerComposeCode = `version: '3.8'

services:
  image-postgres:
    image: postgres:15-alpine
    container_name: image-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres_secure_password
      POSTGRES_DB: image_service
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  image-redis:
    image: redis:7-alpine
    container_name: image-redis
    ports:
      - "6379:6379"

  image-api:
    image: image-service-image-api:latest
    container_name: image-api
    environment:
      DATABASE_URL: "postgresql://postgres:postgres_secure_password@image-postgres:5432/image_service?schema=public"
      REDIS_URL: "redis://image-redis:6379"
      JWT_SECRET: "your-highly-secure-jwt-secret-key"
      ENCRYPTION_KEY: "your-32-byte-encryption-key-for-smb"
    ports:
      - "3001:3001"
    depends_on:
      - image-postgres
      - image-redis`

  const apiRequestCode = `POST /api/v1/cameras
Authorization: Bearer <your_jwt_token>
Content-Type: application/json

{
  "name": "Line 1 Main Inspection",
  "ipAddress": "192.168.10.45",
  "cameraTypeCode": "DP_Camera",
  "smbSharePath": "//192.168.10.45/images",
  "smbUsername": "operator_user",
  "smbPassword": "operator_password_plain",
  "retentionPolicyId": "c7b6d192-349f-4318-8f83-c21ea602e11a"
}`

  const eventPayloadCode = `{
  "event": "image.processed",
  "timestamp": "2026-07-02T01:50:00.000Z",
  "payload": {
    "imageId": "f7d3a2b1-3e40-42da-898f-5182a9db432a",
    "cameraId": "ca720c15-4672-4e08-9df2-73bc442b109e",
    "cameraName": "Assembly Area 2 Camera",
    "filename": "defect_20260702_082103.tif",
    "originalSize": 1048576,
    "pngPath": "/storage/processed/2026-07-02/defect_20260702_082103.png",
    "thumbnailPath": "/storage/thumbnails/2026-07-02/defect_20260702_082103_thumb.png",
    "checksum": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "capturedAt": "2026-07-02T01:49:50.000Z"
  }
}`

  const pythonWorkerCode = `import shutil
import pika # For RabbitMQ or standard webhook post

def custom_image_processor(file_path: str, metadata: dict):
    """
    Image Service Worker SDK hook
    Runs on worker process after downloading image file.
    """
    print(f"Processing image {file_path} with metadata {metadata}")
    
    # Example: Perform OpenCV defect analysis
    # import cv2
    # img = cv2.imread(file_path)
    # result = model.predict(img)
    
    # Process return structure
    return {
        "success": True,
        "features": {
            "width": 1920,
            "height": 1080,
            "channels": 3,
            "dpi": 300
        },
        "annotations": [
            {"label": "defect_scratch", "confidence": 0.94, "box": [120, 240, 50, 100]}
        ]
    }`

  const prismaSchemaCode = `model Camera {
  id                String          @id @default(uuid())
  name              String
  ipAddress         String
  cameraTypeCode    String
  smbSharePath      String
  smbUsername       String
  smbPassword       String          // AES-256-GCM Encrypted
  status            String          @default("active") // active, maintenance, inactive, error
  pollInterval      Int             @default(10)
  lastPolledAt      DateTime?
  retentionPolicyId String
  retentionPolicy   RetentionPolicy @relation(fields: [retentionPolicyId], references: [id])
  imageFiles        ImageFile[]
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt
}`

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
          <BookOpen size={22} />
        </div>
        <div>
          <h1 className={`text-2xl font-bold ${themeConfig.text.primary}`}>{t('imageService.nav.docs', 'Product Documentation')}</h1>
          <p className={`text-xs mt-0.5 ${themeConfig.text.secondary}`}>
            Enterprise-grade developer portal, architecture breakdown, deployment instructions, and specifications.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar navigation topics */}
        <div className="lg:col-span-1 space-y-1 bg-white/5 p-3 rounded-lg border border-white/5 self-start">
          {docMenu.map((item) => {
            const Icon = item.icon
            const active = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                  active
                    ? 'bg-cyan-500/20 text-cyan-400 shadow-sm ring-1 ring-cyan-500/30'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={14} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>

        {/* Reading pane */}
        <div className={`lg:col-span-3 rounded-lg border border-white/5 p-6 bg-slate-900/40 min-h-[500px] leading-relaxed text-sm ${themeConfig.text.primary}`}>
          
          {/* Getting Started */}
          {activeTab === 'getting-started' && (
            <div>
              <h2 className="text-xl font-bold mb-4 border-b border-white/10 pb-2 text-cyan-400">📘 Getting Started</h2>
              <p className="mb-4">
                Welcome to the <strong>Image Service Documentation Portal</strong>. The Image Service is an enterprise-grade platform designed for automated capturing, processing, archiving, and monitoring of high-resolution camera feeds inside manufacturing execution systems (MES) and enterprise resource planning (ERP) environments.
              </p>
              
              <div className="my-4 p-4 rounded-lg bg-cyan-950/20 border-l-4 border-cyan-400 text-xs flex gap-3">
                <Info size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-cyan-400 block mb-1">Architecture Snapshot</strong>
                  The system runs decoupled using workers communicating via a Redis BullMQ message queue. Cameras upload images to network SMB folders, which are pulled, converted, indexed, and pushed to S3 object storage safely.
                </div>
              </div>

              <h3 className="text-md font-semibold mt-6 mb-2 text-white">System Prerequisites</h3>
              <ul className="list-disc pl-5 mb-4 space-y-1.5 text-xs text-gray-300">
                <li>Docker Engine v20.10+ &amp; Docker Compose v2.0+</li>
                <li>PostgreSQL v15+ (Database storage)</li>
                <li>Redis v7.0+ (Job Queueing)</li>
                <li>Network access to target camera shares (SMB/CIFS protocol)</li>
              </ul>

              <h3 className="text-md font-semibold mt-6 mb-2 text-white">Quick Start via Docker</h3>
              <p className="mb-2 text-xs text-gray-300">
                Run the docker container commands to fetch the workspace codebase and spin up:
              </p>
              <CodeBlock code="docker compose up -d" lang="bash" />
              <p className="text-xs text-gray-400">
                Default superuser account is <strong>admin</strong> with password <strong>admin123</strong>. Change these credentials immediately upon deployment.
              </p>
            </div>
          )}

          {/* Architecture */}
          {activeTab === 'architecture' && (
            <div>
              <h2 className="text-xl font-bold mb-4 border-b border-white/10 pb-2 text-cyan-400">🏗️ System Architecture</h2>
              <p className="mb-4">
                The Image Service follows a microservices pattern designed to process thousands of high-resolution industrial images per hour without throttling.
              </p>

              <h3 className="text-md font-semibold mt-6 mb-2 text-white">Data Flow Pipeline</h3>
              <div className="space-y-4 my-4 pl-4 border-l-2 border-white/10">
                <div>
                  <h4 className="text-xs font-bold text-cyan-400">1. Polling Phase (Sync Worker)</h4>
                  <p className="text-xs text-gray-300">
                    The Sync Worker polls cameras via SMB protocol. It scans for new TIFF/RAW files since the last checkpoint, downloads them to temporary storage, and posts job metadata to the Redis Queue.
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-cyan-400">2. Processing Phase (Processing Worker)</h4>
                  <p className="text-xs text-gray-300">
                    The processing workers pull jobs asynchronously. They calculate the SHA-256 hash (preventing duplicate processing), extract image dimensions/EXIF metadata, convert RAW images to PNG, and save highly compressed thumbnails.
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-cyan-400">3. Storage &amp; Database Indexing</h4>
                  <p className="text-xs text-gray-300">
                    Files are uploaded to a configured Storage Provider (SeaweedFS, MinIO, or Local Directory). Simultaneously, metadata indices are written back to PostgreSQL via the API server.
                  </p>
                </div>
              </div>

              <div className="my-4 p-4 rounded-lg bg-amber-500/10 border-l-4 border-amber-500 text-xs flex gap-3">
                <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-500 block mb-1">Scale Thresholds</strong>
                  For heavy loads, configure multiple replicas of the <strong>image-processing-worker</strong> to achieve high parallelization and load balance.
                </div>
              </div>
            </div>
          )}

          {/* Deployment Guide */}
          {activeTab === 'deployment' && (
            <div>
              <h2 className="text-xl font-bold mb-4 border-b border-white/10 pb-2 text-cyan-400">🚀 Deployment Guide</h2>
              <p className="mb-4">
                Recommended deployment instructions for VM and production servers.
              </p>

              <h3 className="text-md font-semibold mt-6 mb-2 text-white">Docker Compose Sample Configuration</h3>
              <p className="text-xs text-gray-400 mb-2">
                Save the following content to a `docker-compose.yml` file:
              </p>
              <CodeBlock code={dockerComposeCode} lang="yaml" />

              <h3 className="text-md font-semibold mt-6 mb-2 text-white">SSL/HTTPS Production Setup</h3>
              <p className="text-xs text-gray-300">
                To guarantee secure transmission of SMB credentials and API keys in enterprise production networks, HTTPS is enforced. Generates certificates using:
              </p>
              <CodeBlock code="./ssl/generate-cert.sh <YOUR_PRODUCTION_IP_ADDRESS>" lang="bash" />
            </div>
          )}

          {/* API Reference */}
          {activeTab === 'api-reference' && (
            <div>
              <h2 className="text-xl font-bold mb-4 border-b border-white/10 pb-2 text-cyan-400">🔌 API Reference</h2>
              <p className="mb-4">
                All write operations inside the API require Authentication and the corresponding Module Role Permission. Include the Bearer token in the header.
              </p>

              <h3 className="text-md font-semibold mt-6 mb-2 text-white">Create Camera Endpoint</h3>
              <p className="text-xs text-gray-300 mb-2">
                Create a new camera and configure its network share.
              </p>
              <CodeBlock code={apiRequestCode} lang="http" />

              <h3 className="text-md font-semibold mt-6 mb-2 text-white">Primary API Endpoints</h3>
              <div className="overflow-x-auto my-4 text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-cyan-400">
                      <th className="py-2">Method</th>
                      <th className="py-2">Path</th>
                      <th className="py-2">Required Permission</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300">
                    <tr>
                      <td className="py-2 font-mono text-green-400">GET</td>
                      <td className="py-2 font-mono">/api/v1/cameras</td>
                      <td className="py-2">`cameras:read`</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-mono text-blue-400">POST</td>
                      <td className="py-2 font-mono">/api/v1/cameras</td>
                      <td className="py-2">`cameras:create`</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-mono text-yellow-400">PATCH</td>
                      <td className="py-2 font-mono">/api/v1/cameras/:id</td>
                      <td className="py-2">`cameras:update`</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-mono text-red-500">DELETE</td>
                      <td className="py-2 font-mono">/api/v1/cameras/:id</td>
                      <td className="py-2">`cameras:delete`</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Event Catalog */}
          {activeTab === 'event-catalog' && (
            <div>
              <h2 className="text-xl font-bold mb-4 border-b border-white/10 pb-2 text-cyan-400">⚡ Event Catalog</h2>
              <p className="mb-4">
                The Image Service publishes events to Webhooks, WebSockets, and Kafka when operations complete. Integrators can subscribe to these topics to build custom notifications.
              </p>

              <h3 className="text-md font-semibold mt-6 mb-2 text-white">Event: `image.processed`</h3>
              <p className="text-xs text-gray-300 mb-2">
                Triggered automatically when a worker finishes checksum calculation, conversion, and uploads to storage.
              </p>
              <CodeBlock code={eventPayloadCode} lang="json" />

              <h3 className="text-md font-semibold mt-6 mb-2 text-white">Webhook Signing</h3>
              <p className="text-xs text-gray-300">
                To guarantee payloads have not been modified, Webhook headers include `X-Image-Service-Signature` using a pre-shared secret key hash (HMAC-SHA256).
              </p>
            </div>
          )}

          {/* Plugin SDK */}
          {activeTab === 'plugin-sdk' && (
            <div>
              <h2 className="text-xl font-bold mb-4 border-b border-white/10 pb-2 text-cyan-400">🔌 Worker &amp; Plugin SDK</h2>
              <p className="mb-4">
                The Image Processing Worker can be customized to perform real-time AI inspections, object detection, or face blurring on images before archiving.
              </p>

              <h3 className="text-md font-semibold mt-6 mb-2 text-white">Python Worker Hook Sample</h3>
              <p className="text-xs text-gray-300 mb-2">
                Implement a function inside the worker codebase to process downloaded files.
              </p>
              <CodeBlock code={pythonWorkerCode} lang="python" />

              <div className="my-4 p-4 rounded-lg bg-green-500/10 border-l-4 border-green-500 text-xs flex gap-3">
                <Lightbulb size={16} className="text-green-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-green-400 block mb-1">Did you know?</strong>
                  The plugin SDK runs on lightweight worker instances. Scale them horizontally to avoid interference with the main web portal response times.
                </div>
              </div>
            </div>
          )}

          {/* Database Schema */}
          {activeTab === 'database-schema' && (
            <div>
              <h2 className="text-xl font-bold mb-4 border-b border-white/10 pb-2 text-cyan-400">🗄️ Database Schema</h2>
              <p className="mb-4">
                The database schema uses PostgreSQL. Below is the main model representation in the Prisma configuration format:
              </p>

              <h3 className="text-md font-semibold mt-6 mb-2 text-white">Camera Prisma Configuration</h3>
              <CodeBlock code={prismaSchemaCode} lang="prisma" />

              <h3 className="text-md font-semibold mt-6 mb-2 text-white">Core Entities List</h3>
              <ul className="list-disc pl-5 mb-4 text-xs text-gray-300 space-y-1">
                <li><strong>Camera:</strong> Camera details, SMB paths, status.</li>
                <li><strong>ImageFile:</strong> Image records, size, status, file references.</li>
                <li><strong>RetentionPolicy:</strong> Storage settings, soft-delete rules.</li>
                <li><strong>AuditLog:</strong> System actions, IPs, user modifications history.</li>
              </ul>
            </div>
          )}

          {/* Storage Providers */}
          {activeTab === 'storage-providers' && (
            <div>
              <h2 className="text-xl font-bold mb-4 border-b border-white/10 pb-2 text-cyan-400">💾 Storage Providers</h2>
              <p className="mb-4">
                Image Service supports multiple storage backends. Change providers dynamically from the UI settings.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4 text-xs">
                <div className="p-4 rounded bg-white/5 border border-white/5">
                  <h4 className="font-bold text-cyan-400 mb-1">Local Disk</h4>
                  <p className="text-gray-400">Simple file mounts. Best for local development and direct VM hosting.</p>
                </div>
                <div className="p-4 rounded bg-white/5 border border-white/5">
                  <h4 className="font-bold text-cyan-400 mb-1">MinIO (S3 Compatible)</h4>
                  <p className="text-gray-400">Enterprise standard object storage. Supports cloud hosting and cluster nodes.</p>
                </div>
                <div className="p-4 rounded bg-white/5 border border-white/5">
                  <h4 className="font-bold text-cyan-400 mb-1">SeaweedFS</h4>
                  <p className="text-gray-400">Ultra-fast distributed storage optimized for billions of small images.</p>
                </div>
              </div>
            </div>
          )}

          {/* Troubleshooting */}
          {activeTab === 'troubleshooting' && (
            <div>
              <h2 className="text-xl font-bold mb-4 border-b border-white/10 pb-2 text-cyan-400">⚠️ Troubleshooting</h2>
              <p className="mb-4">
                Quick diagnostic steps for operational issues.
              </p>

              <h3 className="text-md font-semibold mt-6 mb-2 text-white">Camera goes Offline/Error status</h3>
              <p className="text-xs text-gray-300 mb-2">
                1. Verify the physical camera IP is pingable from the host machine VM.<br />
                2. Test the connection in the Camera Settings dialog to verify SMB credentials are valid.<br />
                3. Ensure user account passwords are correct and have not expired in active directory.
              </p>

              <h3 className="text-md font-semibold mt-6 mb-2 text-white">BullMQ queue length is piling up</h3>
              <p className="text-xs text-gray-300">
                If the queue wait list is growing rapidly, it means the processing workers cannot handle the incoming flow. Check the processing worker container logs for errors, or spin up more worker instances using the docker compose scale command.
              </p>
            </div>
          )}

          {/* Best Practices */}
          {activeTab === 'best-practices' && (
            <div>
              <h2 className="text-xl font-bold mb-4 border-b border-white/10 pb-2 text-cyan-400">🛡️ Best Practices</h2>
              <p className="mb-4">
                Operational recommendations for production environments.
              </p>

              <h3 className="text-md font-semibold mt-6 mb-2 text-white">Security &amp; Encryption</h3>
              <ul className="list-disc pl-5 text-xs text-gray-300 space-y-1.5">
                <li>Change default secrets (`JWT_SECRET`, `ENCRYPTION_KEY`) before staging.</li>
                <li>Restrict backend access using local firewall networks. Only allow scrapers to read the Prometheus metrics endpoint.</li>
                <li>Establish separate API keys for external applications; avoid sharing administrator JWT tokens.</li>
              </ul>
            </div>
          )}

          {/* Release Notes */}
          {activeTab === 'release-notes' && (
            <div>
              <h2 className="text-xl font-bold mb-4 border-b border-white/10 pb-2 text-cyan-400">📋 Release Notes</h2>
              <p className="mb-4">
                Version details and changelog logs.
              </p>

              <div className="space-y-4 text-xs">
                <div className="p-4 rounded bg-white/5 border border-white/5">
                  <span className="bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded text-[10px] font-bold">v1.1.0 (Current)</span>
                  <p className="mt-2 text-gray-300">
                    - Added 5-language internationalization (TH/EN/CN/MM/JP).<br />
                    - Integrated system verification end-to-end API checking tool.<br />
                    - Added camera soft-delete recycle bin mechanism with password confirmation logs.
                  </p>
                </div>
                <div className="p-4 rounded bg-white/5 border border-white/5">
                  <span className="bg-gray-500/20 text-gray-400 px-2 py-0.5 rounded text-[10px] font-bold">v1.0.0</span>
                  <p className="mt-2 text-gray-400">
                    - Initial production build release with SMB polling, worker queue management, and SeaweedFS/MinIO storage options.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Roadmap */}
          {activeTab === 'roadmap' && (
            <div>
              <h2 className="text-xl font-bold mb-4 border-b border-white/10 pb-2 text-cyan-400">🗺️ Product Roadmap</h2>
              <p className="mb-4">
                Upcoming development plan details aligned with core development phases:
              </p>

              <div className="relative border-l-2 border-white/10 pl-6 space-y-6 text-xs text-gray-300 my-4">
                <div className="relative">
                  <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-cyan-400 flex items-center justify-center text-[8px] font-bold text-black">1</span>
                  <h4 className="font-bold text-cyan-400">Phase 1: Advanced AI Inspections (Q3 2026)</h4>
                  <p className="text-gray-400">Integrate real-time anomaly detection, pattern matching, and OCR hooks directly into processing workers.</p>
                </div>
                <div className="relative">
                  <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-cyan-400 flex items-center justify-center text-[8px] font-bold text-black">2</span>
                  <h4 className="font-bold text-cyan-400">Phase 2: Predictive Camera Diagnostics (Q4 2026)</h4>
                  <p className="text-gray-400">Leverage AI anomaly scoring to predict camera lens degradation, focus errors, or connectivity drops beforehand.</p>
                </div>
                <div className="relative">
                  <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[8px] font-bold text-gray-400">3</span>
                  <h4 className="font-bold text-gray-500">Phase 3: Deep ERP Integration (Q1 2027)</h4>
                  <p className="text-gray-400">Fully synchronize metadata indexes directly into standard SAP/Oracle MES tracking lots systems.</p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
