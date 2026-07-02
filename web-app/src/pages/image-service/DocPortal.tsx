import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/contexts/ThemeContext'
import {
  BookOpen, Terminal, Cpu, Database, Network, HardDrive, FileCode, Check, Copy, AlertTriangle, Lightbulb, Info, ArrowRight, ShieldCheck, Zap, Kanban
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
    { id: 'getting-started', label: t('imageService.docs.menu.gettingStarted', 'Getting Started'), icon: BookOpen },
    { id: 'architecture', label: t('imageService.docs.menu.architecture', 'Architecture'), icon: Cpu },
    { id: 'deployment', label: t('imageService.docs.menu.deployment', 'Deployment Guide'), icon: Terminal },
    { id: 'api-reference', label: t('imageService.docs.menu.apiReference', 'API Reference'), icon: FileCode },
    { id: 'event-catalog', label: t('imageService.docs.menu.eventCatalog', 'Event Catalog'), icon: Zap },
    { id: 'plugin-sdk', label: t('imageService.docs.menu.pluginSdk', 'Plugin / Worker SDK'), icon: Network },
    { id: 'database-schema', label: t('imageService.docs.menu.databaseSchema', 'Database Schema'), icon: Database },
    { id: 'storage-providers', label: t('imageService.docs.menu.storageProviders', 'Storage Providers'), icon: HardDrive },
    { id: 'troubleshooting', label: t('imageService.docs.menu.troubleshooting', 'Troubleshooting'), icon: AlertTriangle },
    { id: 'best-practices', label: t('imageService.docs.menu.bestPractices', 'Best Practices'), icon: ShieldCheck },
    { id: 'user-guide', label: t('imageService.docs.menu.userGuide', 'User Guide & Graphs'), icon: Kanban },
    { id: 'release-notes', label: t('imageService.docs.menu.releaseNotes', 'Release Notes'), icon: Info },
    { id: 'roadmap', label: t('imageService.docs.menu.roadmap', 'Roadmap'), icon: ArrowRight },
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
          <h1 className={`text-2xl font-bold ${themeConfig.text.primary}`}>
            {t('imageService.docs.title', 'Product Documentation')}
          </h1>
          <p className={`text-xs mt-0.5 ${themeConfig.text.secondary}`}>
            {t('imageService.docs.subtitle', 'Enterprise-grade developer portal, architecture breakdown, deployment instructions, and specifications.')}
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
              <h2 className="text-xl font-bold mb-4 border-b border-white/10 pb-2 text-cyan-400">
                📘 {t('imageService.docs.gettingStarted.title', 'Getting Started')}
              </h2>
              <p className="mb-4">
                {t('imageService.docs.gettingStarted.p1')}
              </p>
              
              <div className="my-4 p-4 rounded-lg bg-cyan-950/20 border-l-4 border-cyan-400 text-xs flex gap-3">
                <Info size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-cyan-400 block mb-1">
                    {t('imageService.docs.gettingStarted.noteTitle', 'Architecture Snapshot')}
                  </strong>
                  {t('imageService.docs.gettingStarted.noteBody')}
                </div>
              </div>

              <h3 className="text-md font-semibold mt-6 mb-2 text-white">
                {t('imageService.docs.gettingStarted.preTitle', 'System Prerequisites')}
              </h3>
              <ul className="list-disc pl-5 mb-4 space-y-1.5 text-xs text-gray-300">
                <li>{t('imageService.docs.gettingStarted.preItem1')}</li>
                <li>{t('imageService.docs.gettingStarted.preItem2')}</li>
                <li>{t('imageService.docs.gettingStarted.preItem3')}</li>
                <li>{t('imageService.docs.gettingStarted.preItem4')}</li>
              </ul>

              <h3 className="text-md font-semibold mt-6 mb-2 text-white">
                {t('imageService.docs.gettingStarted.dockerTitle', 'Quick Start via Docker')}
              </h3>
              <p className="mb-2 text-xs text-gray-300">
                {t('imageService.docs.gettingStarted.dockerBody')}
              </p>
              <CodeBlock code="docker compose up -d" lang="bash" />
              <p className="text-xs text-gray-400">
                {t('imageService.docs.gettingStarted.dockerWarning')}
              </p>

              {/* Scaling section */}
              <h3 className="text-md font-semibold mt-8 mb-2 text-white border-t border-white/5 pt-6">
                🚀 {t('imageService.docs.gettingStarted.scaleTitle', 'Scaling & Performance Optimization')}
              </h3>
              <p className="mb-4 text-xs text-gray-300">
                {t('imageService.docs.gettingStarted.scaleBody')}
              </p>
              <div className="space-y-4 text-xs">
                <div>
                  <strong className="text-cyan-400 block mb-1">
                    {t('imageService.docs.gettingStarted.scaleStep1')}
                  </strong>
                  <CodeBlock code="docker compose up -d --scale image-processing-worker=3 --no-recreate" lang="bash" />
                  <p className="text-gray-400 italic" dangerouslySetInnerHTML={{ __html: t('imageService.docs.gettingStarted.scaleStep1Desc') }} />
                </div>
                <div className="border-t border-white/5 pt-3">
                  <strong className="text-cyan-400 block mb-1">
                    {t('imageService.docs.gettingStarted.scaleStep2')}
                  </strong>
                  <p className="text-gray-300">
                    {t('imageService.docs.gettingStarted.scaleStep2Desc')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Architecture */}
          {activeTab === 'architecture' && (
            <div>
              <h2 className="text-xl font-bold mb-4 border-b border-white/10 pb-2 text-cyan-400">
                🏗️ {t('imageService.docs.architecture.title', 'System Architecture')}
              </h2>
              <p className="mb-4">
                {t('imageService.docs.architecture.p1')}
              </p>

              <h3 className="text-md font-semibold mt-6 mb-2 text-white">
                {t('imageService.docs.architecture.flowTitle', 'Data Flow Pipeline')}
              </h3>
              <div className="space-y-4 my-4 pl-4 border-l-2 border-white/10">
                <div>
                  <h4 className="text-xs font-bold text-cyan-400">
                    {t('imageService.docs.architecture.flow1Title', '1. Polling Phase (Sync Worker)')}
                  </h4>
                  <p className="text-xs text-gray-300">
                    {t('imageService.docs.architecture.flow1Body')}
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-cyan-400">
                    {t('imageService.docs.architecture.flow2Title', '2. Processing Phase (Processing Worker)')}
                  </h4>
                  <p className="text-xs text-gray-300">
                    {t('imageService.docs.architecture.flow2Body')}
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-cyan-400">
                    {t('imageService.docs.architecture.flow3Title', '3. Storage & Database Indexing')}
                  </h4>
                  <p className="text-xs text-gray-300">
                    {t('imageService.docs.architecture.flow3Body')}
                  </p>
                </div>
              </div>

              <div className="my-4 p-4 rounded-lg bg-amber-500/10 border-l-4 border-amber-500 text-xs flex gap-3">
                <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-500 block mb-1">
                    {t('imageService.docs.architecture.warnTitle', 'Scale Thresholds')}
                  </strong>
                  {t('imageService.docs.architecture.warnBody')}
                </div>
              </div>
            </div>
          )}

          {/* Deployment Guide */}
          {activeTab === 'deployment' && (
            <div>
              <h2 className="text-xl font-bold mb-4 border-b border-white/10 pb-2 text-cyan-400">
                🚀 {t('imageService.docs.deployment.title', 'Deployment Guide')}
              </h2>
              <p className="mb-4">
                {t('imageService.docs.deployment.p1')}
              </p>

              <h3 className="text-md font-semibold mt-6 mb-2 text-white">
                {t('imageService.docs.deployment.composeTitle', 'Docker Compose Sample Configuration')}
              </h3>
              <p className="text-xs text-gray-400 mb-2">
                {t('imageService.docs.deployment.composeSub')}
              </p>
              <CodeBlock code={dockerComposeCode} lang="yaml" />

              <h3 className="text-md font-semibold mt-6 mb-2 text-white">
                {t('imageService.docs.deployment.sslTitle', 'SSL/HTTPS Production Setup')}
              </h3>
              <p className="text-xs text-gray-300">
                {t('imageService.docs.deployment.sslBody')}
              </p>
              <CodeBlock code="./ssl/generate-cert.sh <YOUR_PRODUCTION_IP_ADDRESS>" lang="bash" />
            </div>
          )}

          {/* API Reference */}
          {activeTab === 'api-reference' && (
            <div>
              <h2 className="text-xl font-bold mb-4 border-b border-white/10 pb-2 text-cyan-400">
                🔌 {t('imageService.docs.apiReference.title', 'API Reference')}
              </h2>
              <p className="mb-4">
                {t('imageService.docs.apiReference.p1')}
              </p>

              <h3 className="text-md font-semibold mt-6 mb-2 text-white">
                {t('imageService.docs.apiReference.createTitle', 'Create Camera Endpoint')}
              </h3>
              <p className="text-xs text-gray-300 mb-2">
                {t('imageService.docs.apiReference.createSub')}
              </p>
              <CodeBlock code={apiRequestCode} lang="http" />

              <h3 className="text-md font-semibold mt-6 mb-2 text-white">
                {t('imageService.docs.apiReference.primaryTitle', 'Primary API Endpoints')}
              </h3>
              <div className="overflow-x-auto my-4 text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-cyan-400">
                      <th className="py-2">{t('imageService.docs.apiReference.thMethod', 'Method')}</th>
                      <th className="py-2">{t('imageService.docs.apiReference.thPath', 'Path')}</th>
                      <th className="py-2">{t('imageService.docs.apiReference.thPermission', 'Required Permission')}</th>
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
              <h2 className="text-xl font-bold mb-4 border-b border-white/10 pb-2 text-cyan-400">
                ⚡ {t('imageService.docs.eventCatalog.title', 'Event Catalog')}
              </h2>
              <p className="mb-4">
                {t('imageService.docs.eventCatalog.p1')}
              </p>

              <h3 className="text-md font-semibold mt-6 mb-2 text-white">
                {t('imageService.docs.eventCatalog.triggerTitle', 'Event: image.processed')}
              </h3>
              <p className="text-xs text-gray-300 mb-2">
                {t('imageService.docs.eventCatalog.triggerSub')}
              </p>
              <CodeBlock code={eventPayloadCode} lang="json" />

              <h3 className="text-md font-semibold mt-6 mb-2 text-white">
                {t('imageService.docs.eventCatalog.signingTitle', 'Webhook Signing')}
              </h3>
              <p className="text-xs text-gray-300">
                {t('imageService.docs.eventCatalog.signingBody')}
              </p>
            </div>
          )}

          {/* Plugin SDK */}
          {activeTab === 'plugin-sdk' && (
            <div>
              <h2 className="text-xl font-bold mb-4 border-b border-white/10 pb-2 text-cyan-400">
                🔌 {t('imageService.docs.pluginSdk.title', 'Worker & Plugin SDK')}
              </h2>
              <p className="mb-4">
                {t('imageService.docs.pluginSdk.p1')}
              </p>

              <h3 className="text-md font-semibold mt-6 mb-2 text-white">
                {t('imageService.docs.pluginSdk.hookTitle', 'Python Worker Hook Sample')}
              </h3>
              <p className="text-xs text-gray-300 mb-2">
                {t('imageService.docs.pluginSdk.hookSub')}
              </p>
              <CodeBlock code={pythonWorkerCode} lang="python" />

              <div className="my-4 p-4 rounded-lg bg-green-500/10 border-l-4 border-green-500 text-xs flex gap-3">
                <Lightbulb size={16} className="text-green-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-green-400 block mb-1">
                    {t('imageService.docs.pluginSdk.tipTitle', 'Did you know?')}
                  </strong>
                  {t('imageService.docs.pluginSdk.tipBody')}
                </div>
              </div>
            </div>
          )}

          {/* Database Schema */}
          {activeTab === 'database-schema' && (
            <div>
              <h2 className="text-xl font-bold mb-4 border-b border-white/10 pb-2 text-cyan-400">
                🗄️ {t('imageService.docs.databaseSchema.title', 'Database Schema')}
              </h2>
              <p className="mb-4">
                {t('imageService.docs.databaseSchema.p1')}
              </p>

              <h3 className="text-md font-semibold mt-6 mb-2 text-white">
                {t('imageService.docs.databaseSchema.prismaTitle', 'Camera Prisma Configuration')}
              </h3>
              <CodeBlock code={prismaSchemaCode} lang="prisma" />

              <h3 className="text-md font-semibold mt-6 mb-2 text-white">
                {t('imageService.docs.databaseSchema.entitiesTitle', 'Core Entities List')}
              </h3>
              <ul className="list-disc pl-5 mb-4 text-xs text-gray-300 space-y-1.5">
                <li><strong>{t('imageService.docs.databaseSchema.entityCamera')}</strong></li>
                <li><strong>{t('imageService.docs.databaseSchema.entityImage')}</strong></li>
                <li><strong>{t('imageService.docs.databaseSchema.entityPolicy')}</strong></li>
                <li><strong>{t('imageService.docs.databaseSchema.entityAudit')}</strong></li>
              </ul>
            </div>
          )}

          {/* Storage Providers */}
          {activeTab === 'storage-providers' && (
            <div>
              <h2 className="text-xl font-bold mb-4 border-b border-white/10 pb-2 text-cyan-400">
                💾 {t('imageService.docs.storageProviders.title', 'Storage Providers')}
              </h2>
              <p className="mb-4">
                {t('imageService.docs.storageProviders.p1')}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4 text-xs">
                <div className="p-4 rounded bg-white/5 border border-white/5">
                  <h4 className="font-bold text-cyan-400 mb-1">
                    {t('imageService.docs.storageProviders.localTitle', 'Local Disk')}
                  </h4>
                  <p className="text-gray-400">{t('imageService.docs.storageProviders.localBody')}</p>
                </div>
                <div className="p-4 rounded bg-white/5 border border-white/5">
                  <h4 className="font-bold text-cyan-400 mb-1">
                    {t('imageService.docs.storageProviders.minioTitle', 'MinIO (S3 Compatible)')}
                  </h4>
                  <p className="text-gray-400">{t('imageService.docs.storageProviders.minioBody')}</p>
                </div>
                <div className="p-4 rounded bg-white/5 border border-white/5">
                  <h4 className="font-bold text-cyan-400 mb-1">
                    {t('imageService.docs.storageProviders.seaweedTitle', 'SeaweedFS')}
                  </h4>
                  <p className="text-gray-400">{t('imageService.docs.storageProviders.seaweedBody')}</p>
                </div>
              </div>
            </div>
          )}

          {/* Troubleshooting */}
          {activeTab === 'troubleshooting' && (
            <div>
              <h2 className="text-xl font-bold mb-4 border-b border-white/10 pb-2 text-cyan-400">
                ⚠️ {t('imageService.docs.troubleshooting.title', 'Troubleshooting')}
              </h2>
              <p className="mb-4">
                {t('imageService.docs.troubleshooting.p1')}
              </p>

              <h3 className="text-md font-semibold mt-6 mb-2 text-white">
                {t('imageService.docs.troubleshooting.cameraTitle', 'Camera goes Offline/Error status')}
              </h3>
              <p className="text-xs text-gray-300 leading-loose whitespace-pre-line">
                {t('imageService.docs.troubleshooting.cameraSteps')}
              </p>

              <h3 className="text-md font-semibold mt-6 mb-2 text-white">
                {t('imageService.docs.troubleshooting.queueTitle', 'BullMQ queue length is piling up')}
              </h3>
              <p className="text-xs text-gray-300">
                {t('imageService.docs.troubleshooting.queueBody')}
              </p>
            </div>
          )}

          {/* Best Practices */}
          {activeTab === 'best-practices' && (
            <div>
              <h2 className="text-xl font-bold mb-4 border-b border-white/10 pb-2 text-cyan-400">
                🛡️ {t('imageService.docs.bestPractices.title', 'Best Practices')}
              </h2>
              <p className="mb-4">
                {t('imageService.docs.bestPractices.p1')}
              </p>

              <h3 className="text-md font-semibold mt-6 mb-2 text-white">
                {t('imageService.docs.bestPractices.securityTitle', 'Security & Encryption')}
              </h3>
              <ul className="list-disc pl-5 text-xs text-gray-300 space-y-1.5">
                <li>{t('imageService.docs.bestPractices.securityItem1')}</li>
                <li>{t('imageService.docs.bestPractices.securityItem2')}</li>
                <li>{t('imageService.docs.bestPractices.securityItem3')}</li>
              </ul>
            </div>
          )}

          {/* User Guide & Graphs */}
          {activeTab === 'user-guide' && (
            <div>
              <h2 className="text-xl font-bold mb-4 border-b border-white/10 pb-2 text-cyan-400">
                📊 {t('imageService.docs.userGuide.title', 'User Guide & Dashboard Interpretations')}
              </h2>
              <p className="mb-4">
                {t('imageService.docs.userGuide.p1')}
              </p>

              <h3 className="text-md font-semibold mt-6 mb-2 text-white">
                {t('imageService.docs.userGuide.analyticsTitle', '1. Interpreting Camera Health Analytics')}
              </h3>
              <p className="text-xs text-gray-300 mb-4 leading-relaxed whitespace-pre-line">
                {t('imageService.docs.userGuide.analyticsBody')}
              </p>

              <h3 className="text-md font-semibold mt-6 mb-2 text-white">
                {t('imageService.docs.userGuide.monitorTitle', '2. Processing Monitor Graphs & Toggles')}
              </h3>
              <p className="text-xs text-gray-300 mb-4 leading-relaxed whitespace-pre-line">
                {t('imageService.docs.userGuide.monitorBody')}
              </p>
            </div>
          )}

          {/* Release Notes */}
          {activeTab === 'release-notes' && (
            <div>
              <h2 className="text-xl font-bold mb-4 border-b border-white/10 pb-2 text-cyan-400">
                📋 {t('imageService.docs.releaseNotes.title', 'Release Notes')}
              </h2>
              <p className="mb-4">
                {t('imageService.docs.releaseNotes.p1')}
              </p>

              <div className="space-y-4 text-xs">
                <div className="p-4 rounded bg-white/5 border border-white/5">
                  <span className="bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded text-[10px] font-bold">
                    {t('imageService.docs.releaseNotes.v110Title', 'v1.1.0 (Current)')}
                  </span>
                  <p className="mt-2 text-gray-300 whitespace-pre-line">
                    {t('imageService.docs.releaseNotes.v110Body')}
                  </p>
                </div>
                <div className="p-4 rounded bg-white/5 border border-white/5">
                  <span className="bg-gray-500/20 text-gray-400 px-2 py-0.5 rounded text-[10px] font-bold">
                    {t('imageService.docs.releaseNotes.v100Title', 'v1.0.0')}
                  </span>
                  <p className="mt-2 text-gray-400 whitespace-pre-line">
                    {t('imageService.docs.releaseNotes.v100Body')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Roadmap */}
          {activeTab === 'roadmap' && (
            <div>
              <h2 className="text-xl font-bold mb-4 border-b border-white/10 pb-2 text-cyan-400">
                🗺️ {t('imageService.docs.roadmap.title', 'Product Roadmap')}
              </h2>
              <p className="mb-4">
                {t('imageService.docs.roadmap.p1')}
              </p>

              <div className="relative border-l-2 border-white/10 pl-6 space-y-6 text-xs text-gray-300 my-4">
                <div className="relative">
                  <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-cyan-400 flex items-center justify-center text-[8px] font-bold text-black">1</span>
                  <h4 className="font-bold text-cyan-400">{t('imageService.docs.roadmap.phase1Title')}</h4>
                  <p className="text-gray-400">{t('imageService.docs.roadmap.phase1Body')}</p>
                </div>
                <div className="relative">
                  <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-cyan-400 flex items-center justify-center text-[8px] font-bold text-black">2</span>
                  <h4 className="font-bold text-cyan-400">{t('imageService.docs.roadmap.phase2Title')}</h4>
                  <p className="text-gray-400">{t('imageService.docs.roadmap.phase2Body')}</p>
                </div>
                <div className="relative">
                  <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[8px] font-bold text-gray-400">3</span>
                  <h4 className="font-bold text-gray-500">{t('imageService.docs.roadmap.phase3Title')}</h4>
                  <p className="text-gray-400">{t('imageService.docs.roadmap.phase3Body')}</p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
