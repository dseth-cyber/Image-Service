import { useState, useRef, useEffect } from 'react'
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useTheme, themes } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import LoginPage from '@/pages/auth/LoginPage'
import ImageServiceOverview from '@/pages/image-service/ImageServiceOverview'
import ImageServiceCameras from '@/pages/image-service/ImageServiceCameras'
import ImageServiceSearch from '@/pages/image-service/ImageServiceSearch'
import ImageServiceProcessingMonitor from '@/pages/image-service/ImageServiceProcessingMonitor'
import ImageServiceStorage from '@/pages/image-service/ImageServiceStorage'
import ImageServiceProcessingLogs from '@/pages/image-service/ImageServiceProcessingLogs'
import ImageServiceRetention from '@/pages/image-service/ImageServiceRetention'
import ImageServiceRoadmap from '@/pages/image-service/ImageServiceRoadmap'
import ImageServiceSettings from '@/pages/image-service/ImageServiceSettings'
import AlertManagement from '@/pages/image-service/AlertManagement'
import UserManagement from '@/pages/image-service/UserManagement'
import HealthStatus from '@/pages/image-service/HealthStatus'
import TelegramBotSettings from '@/pages/image-service/TelegramBotSettings'
import ApiKeysManagement from '@/pages/image-service/ApiKeysManagement'
import MasterdataManagement from '@/pages/image-service/MasterdataManagement'
import SystemConfigPage from '@/pages/image-service/SystemConfigPage'
import DeadLetterQueue from '@/pages/image-service/DeadLetterQueue'
import AuditLogViewer from '@/pages/image-service/AuditLogViewer'
import BackupDashboard from '@/pages/image-service/BackupDashboard'
import {
  Camera, LayoutDashboard, Search, Activity, HardDrive, FileText, Shield, Settings, Map,
  Globe, Palette, User, ChevronDown, LogOut, Bell, Users, HeartPulse, Key, MessageCircle, BookText, Sliders, AlertTriangle, History,
} from 'lucide-react'

const navItems = [
  { path: '/image-service/overview', labelKey: 'nav.overview', icon: LayoutDashboard },
  { path: '/image-service/cameras', labelKey: 'nav.cameras', icon: Camera },
  { path: '/image-service/search', labelKey: 'nav.search', icon: Search },
  { path: '/image-service/processing', labelKey: 'nav.processing', icon: Activity },
  { path: '/image-service/storage', labelKey: 'nav.storage', icon: HardDrive },
  { path: '/image-service/logs', labelKey: 'nav.logs', icon: FileText },
  { path: '/image-service/dead-letter', labelKey: 'nav.deadLetter', icon: AlertTriangle },
  { path: '/image-service/audit-log', labelKey: 'nav.auditLog', icon: History },
  { path: '/image-service/backup', labelKey: 'nav.backup', icon: Shield },
  { path: '/image-service/retention', labelKey: 'nav.retention', icon: Shield },
  { path: '/image-service/alerts', labelKey: 'nav.alerts', icon: Bell },
  { path: '/image-service/masterdata', labelKey: 'nav.masterdata', icon: BookText },
]

const settingsSubItems = [
  { path: '/image-service/settings', labelKey: 'nav.settings', icon: Settings },
  { path: '/image-service/roadmap', labelKey: 'nav.roadmap', icon: Map },
  { path: '/image-service/api-keys', labelKey: 'nav.apiKeys', icon: Key },
  { path: '/image-service/telegram-bot', labelKey: 'nav.telegramBot', icon: MessageCircle },
  { path: '/image-service/system-config', labelKey: 'nav.systemConfig', icon: Sliders },
  { path: '/image-service/users', labelKey: 'nav.users', icon: Users },
  { path: '/image-service/health', labelKey: 'nav.health', icon: HeartPulse },
]

const LANG_OPTIONS = [
  { value: 'th', label: 'TH' },
  { value: 'en', label: 'EN' },
  { value: 'cn', label: 'CN' },
  { value: 'mm', label: 'MM' },
  { value: 'jp', label: 'JP' },
]

const THEME_OPTIONS = [
  { value: 'modern', label: 'Modern' },
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
]

function Dropdown({ icon: Icon, options, value, onChange }: {
  icon: any
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium hover:bg-white/10 transition-colors"
      >
        <Icon size={15} />
        <span>{options.find(o => o.value === value)?.label}</span>
        <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-32 rounded-md border border-white/20 bg-slate-800 shadow-xl z-50 overflow-hidden">
          {options.map(o => (
            <button
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                value === o.value ? 'bg-cyan-500/20 text-cyan-300' : 'text-gray-200 hover:bg-white/10'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ProfileMenu({ username, role, onLogout }: { username: string; role: string; onLogout: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium hover:bg-white/10 transition-colors">
        <User size={15} />
        <span>{username}</span>
        <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-40 rounded-md border border-white/20 bg-slate-800 shadow-xl z-50 overflow-hidden">
          <div className="px-3 py-2 text-[11px] text-gray-400 border-b border-white/10">{role}</div>
          <button onClick={() => { onLogout(); setOpen(false) }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-white/10 transition-colors">
            <LogOut size={13} />
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}

function SettingsNavGroup({ settingsSubItems, locationPath, t }: {
  settingsSubItems: { path: string; labelKey: string; icon: any }[]
  locationPath: string
  t: (key: string) => string
}) {
  const [open, setOpen] = useState(true)
  const isInSettings = settingsSubItems.some(item => locationPath === item.path)
  const SettingsIcon = settingsSubItems[0].icon

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isInSettings ? 'bg-cyan-500/15 text-cyan-300' : 'text-gray-300 hover:bg-white/5 hover:text-white'
        }`}
      >
        <SettingsIcon size={16} />
        <span className="flex-1 text-left">{t(`imageService.${settingsSubItems[0].labelKey}`)}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="ml-3 mt-0.5 space-y-0.5 border-l border-white/10 pl-2">
          {settingsSubItems.map(item => {
            const Icon = item.icon
            const isActive = locationPath === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-300'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={14} />
                {t(`imageService.${item.labelKey}`)}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function App() {
  const { t, i18n } = useTranslation()
  const { themeConfig, theme, setTheme } = useTheme()
  const { isAuthenticated, user, logout } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) return <LoginPage />

  return (
    <div className={`min-h-screen flex flex-col ${themeConfig.background} ${themeConfig.text.primary}`}>
      {/* Top Navbar */}
      <header className={`${themeConfig.navBar} px-5 py-2.5 flex items-center justify-between flex-shrink-0 z-40`}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Camera size={22} className="text-cyan-400" />
            <span className="text-sm font-bold tracking-tight">Image Service</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Dropdown
            icon={Globe}
            options={LANG_OPTIONS}
            value={i18n.language}
            onChange={v => { i18n.changeLanguage(v); localStorage.setItem('i18nextLng', v) }}
          />
          <button
            onClick={() => {
              const keys = Object.keys(themes)
              const idx = keys.indexOf(theme)
              setTheme(keys[(idx + 1) % keys.length])
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium hover:bg-white/10 transition-colors"
            title={t('imageService.settings.theme')}
          >
            <Palette size={15} />
            <span>{THEME_OPTIONS.find(o => o.value === theme)?.label}</span>
          </button>
          <div className="w-px h-5 mx-1 bg-white/10" />
          <ProfileMenu
            username={user?.username ?? 'admin'}
            role={user?.role ?? 'viewer'}
            onLogout={logout}
          />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={`w-56 flex-shrink-0 ${themeConfig.sidebar} flex flex-col overflow-y-auto`}>
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map(item => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-300'
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon size={16} />
                  {t(`imageService.${item.labelKey}`)}
                </Link>
              )
            })}
            <SettingsNavGroup
              settingsSubItems={settingsSubItems}
              locationPath={location.pathname}
              t={t}
            />
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/image-service/overview" element={<ImageServiceOverview />} />
            <Route path="/image-service/cameras" element={<ImageServiceCameras />} />
            <Route path="/image-service/search" element={<ImageServiceSearch />} />
            <Route path="/image-service/processing" element={<ImageServiceProcessingMonitor />} />
            <Route path="/image-service/storage" element={<ImageServiceStorage />} />
            <Route path="/image-service/logs" element={<ImageServiceProcessingLogs />} />
            <Route path="/image-service/dead-letter" element={<DeadLetterQueue />} />
            <Route path="/image-service/audit-log" element={<AuditLogViewer />} />
            <Route path="/image-service/backup" element={<BackupDashboard />} />
            <Route path="/image-service/retention" element={<ImageServiceRetention />} />
            <Route path="/image-service/roadmap" element={<ImageServiceRoadmap />} />
            <Route path="/image-service/alerts" element={<AlertManagement />} />
            <Route path="/image-service/users" element={<UserManagement />} />
            <Route path="/image-service/health" element={<HealthStatus />} />
            <Route path="/image-service/api-keys" element={<ApiKeysManagement />} />
            <Route path="/image-service/telegram-bot" element={<TelegramBotSettings />} />
            <Route path="/image-service/masterdata" element={<MasterdataManagement />} />
            <Route path="/image-service/system-config" element={<SystemConfigPage />} />
            <Route path="/image-service/settings" element={<ImageServiceSettings />} />
            <Route path="/" element={<Navigate to="/image-service/overview" replace />} />
            <Route path="*" element={<Navigate to="/image-service/overview" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
