import { useState, useRef, useEffect } from 'react'
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useTheme, themes } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useQuery } from '@tanstack/react-query'
import { imageServiceApi } from '@/services/imageServiceApi'
import { Button, Modal } from '@/components/ui'
import LoginPage from '@/pages/auth/LoginPage'
import ImageServiceOverview from '@/pages/image-service/ImageServiceOverview'
import ImageServiceCameras from '@/pages/image-service/ImageServiceCameras'
import ImageServiceCameraDetail from '@/pages/image-service/ImageServiceCameraDetail'
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
  Globe, Palette, User, ChevronDown, LogOut, Lock, Bell, Users, HeartPulse, Key, MessageCircle, BookText, Sliders, AlertTriangle, History, Info,
} from 'lucide-react'

export function hasPermission(user: any, permission: string): boolean {
  if (!user) return false
  if (user.role === 'admin' || user.role === 'system') return true
  if (!user.permissions) return false
  return user.permissions.includes(permission) || user.permissions.includes('*')
}

function UnauthorizedPage() {
  const { t } = useTranslation()
  const { themeConfig } = useTheme()
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center min-h-[50vh]">
      <AlertTriangle size={56} className="text-red-400 mb-4 animate-pulse" />
      <h3 className={`text-xl font-bold ${themeConfig.text.primary}`}>
        {t('imageService.auth.unauthorized') || 'Access Denied'}
      </h3>
      <p className={`text-sm mt-2 max-w-md ${themeConfig.text.secondary}`}>
        {t('imageService.auth.unauthorizedDesc') || 'You do not have permission to view this resource. Please contact system administrator.'}
      </p>
    </div>
  )
}

const navItems = [
  { path: '/image-service/overview', labelKey: 'nav.overview', icon: LayoutDashboard, permission: 'overview:read' },
  { path: '/image-service/cameras', labelKey: 'nav.cameras', icon: Camera, permission: 'cameras:read' },
  { path: '/image-service/search', labelKey: 'nav.search', icon: Search, permission: 'search:read' },
  { path: '/image-service/processing', labelKey: 'nav.processing', icon: Activity, permission: 'processing:read' },
  { path: '/image-service/storage', labelKey: 'nav.storage', icon: HardDrive, permission: 'storage:read' },
  { path: '/image-service/logs', labelKey: 'nav.logs', icon: FileText, permission: 'logs:read' },
  { path: '/image-service/dead-letter', labelKey: 'nav.deadLetter', icon: AlertTriangle, permission: 'dead-letter:read' },
  { path: '/image-service/audit-log', labelKey: 'nav.auditLog', icon: History, permission: 'audit-log:read' },
  { path: '/image-service/backup', labelKey: 'nav.backup', icon: Shield, permission: 'backup:read' },
  { path: '/image-service/retention', labelKey: 'nav.retention', icon: Shield, permission: 'retention:read' },
  { path: '/image-service/alerts', labelKey: 'nav.alerts', icon: Bell, permission: 'alerts:read' },
  { path: '/image-service/masterdata', labelKey: 'nav.masterdata', icon: BookText, permission: 'masterdata:read' },
]

const settingsSubItems = [
  { path: '/image-service/settings', labelKey: 'nav.settings', icon: Settings, permission: 'settings:read' },
  { path: '/image-service/roadmap', labelKey: 'nav.roadmap', icon: Map, permission: 'roadmap:read' },
  { path: '/image-service/api-keys', labelKey: 'nav.apiKeys', icon: Key, permission: 'api-keys:read' },
  { path: '/image-service/telegram-bot', labelKey: 'nav.telegramBot', icon: MessageCircle, permission: 'telegram-bot:read' },
  { path: '/image-service/system-config', labelKey: 'nav.systemConfig', icon: Sliders, permission: 'system-config:read' },
  { path: '/image-service/users', labelKey: 'nav.users', icon: Users, permission: 'users:read' },
  { path: '/image-service/health', labelKey: 'nav.health', icon: HeartPulse, permission: 'health:read' },
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

function ProfileMenu({ username, role, onLogout, onChangePassword, onAbout }: { username: string; role: string; onLogout: () => void; onChangePassword: () => void; onAbout: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { t } = useTranslation()

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
        <div className="absolute right-0 mt-1 w-44 rounded-md border border-white/20 bg-slate-800 shadow-xl z-50 overflow-hidden">
          <div className="px-3 py-2 text-[11px] text-gray-400 border-b border-white/10">{role}</div>
          <button onClick={() => { onChangePassword(); setOpen(false) }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-white/10 transition-colors">
            <Lock size={13} />
            {t('imageService.auth.changePassword')}
          </button>
          <button onClick={() => { onAbout(); setOpen(false) }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-white/10 transition-colors">
            <Info size={13} />
            {t('imageService.about.title')}
          </button>
          <button onClick={() => { onLogout(); setOpen(false) }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-white/10 transition-colors">
            <LogOut size={13} />
            {t('imageService.auth.logout')}
          </button>
        </div>
      )}
    </div>
  )
}

function SettingsNavGroup({ settingsSubItems, locationPath, t }: {
  settingsSubItems: { path: string; labelKey: string; icon: any; permission: string }[]
  locationPath: string
  t: (key: string) => string
}) {
  const { user } = useAuth()
  const [open, setOpen] = useState(true)
  
  const visibleItems = settingsSubItems.filter(item => hasPermission(user, item.permission))
  if (visibleItems.length === 0) return null

  const isInSettings = visibleItems.some(item => locationPath === item.path)
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
          {visibleItems.map(item => {
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

function AboutModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const { themeConfig } = useTheme()
  const { data: configs } = useQuery({
    queryKey: ['system-config'],
    queryFn: () => imageServiceApi.getSystemConfigs(),
    enabled: isOpen,
  })
  const configMap: Record<string, any> = configs ?? {}
  const version = configMap.system_version?.value ?? '1.0.0'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Info size={16} className="text-cyan-400" />
          <span>{t('imageService.about.title')}</span>
        </div>
      }
    >
      <div className="flex flex-col items-center pt-2">
        {/* Logo */}
        {configMap.system_logo?.value ? (
          <img src={configMap.system_logo.value} alt="Logo" className="h-16 w-auto object-contain mb-4" />
        ) : (
          <Camera size={48} className="text-cyan-400 mb-4" />
        )}

        {/* Title */}
        <h3 className={`text-xl font-bold text-center tracking-wide ${themeConfig.text.primary}`}>
          {configMap.system_name?.value ?? 'Image Service'}
        </h3>

        {/* Subtitle */}
        <p className="text-[10px] font-bold tracking-wider text-center text-gray-400 uppercase mt-1">
          {configMap.system_description?.value ?? 'Enterprise Image Management System'}
        </p>

        {/* Version Pill */}
        <div className="mt-4">
          <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-gray-300">
            Version {version}
          </span>
        </div>

        {/* Divider */}
        <div className="w-full border-t border-white/10 my-6"></div>

        {/* Footer / Developer Copyright */}
        <p className="text-xs text-center text-gray-400">
          {configMap.system_copyright?.value ?? `© ${new Date().getFullYear()} Image Service. All rights reserved.`}
        </p>
      </div>
    </Modal>
  )
}

function ChangePasswordModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const { changePassword } = useAuth()
  const toast = useToast()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (newPassword !== confirmPassword) { toast.error(t('imageService.auth.passwordMismatch')); return }
    if (newPassword.length < 6) { toast.error(t('imageService.auth.passwordTooShort')); return }
    setSubmitting(true)
    try {
      await changePassword(currentPassword, newPassword)
      toast.success(t('imageService.auth.passwordChanged'))
      onClose()
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    } catch { toast.error(t('common.error')) }
    finally { setSubmitting(false) }
  }

  const inputClass = `w-full px-3 py-2 rounded-md text-sm border border-white/30 bg-white/10 backdrop-blur-md text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50`

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('imageService.auth.changePassword')}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white mb-1">{t('imageService.auth.currentPassword')}</label>
          <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-white mb-1">{t('imageService.auth.newPassword')}</label>
          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-white mb-1">{t('imageService.auth.confirmPassword')}</label>
          <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputClass} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={handleSubmit} disabled={submitting || !currentPassword || !newPassword || !confirmPassword}>
            {submitting ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default function App() {
  const { t, i18n } = useTranslation()
  const { themeConfig, theme, setTheme } = useTheme()
  const { isAuthenticated, user, logout } = useAuth()
  const toast = useToast()
  const location = useLocation()
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [aboutModalOpen, setAboutModalOpen] = useState(false)

  // Synchronize theme based on login status and user preference
  useEffect(() => {
    if (isAuthenticated && user?.username) {
      const userTheme = localStorage.getItem(`image-service-theme:${user.username}`) || 'modern'
      if (userTheme !== theme) {
        setTheme(userTheme)
      }
    } else if (!isAuthenticated) {
      if (theme !== 'modern') {
        setTheme('modern')
      }
    }
  }, [isAuthenticated, user?.username, theme, setTheme])
  const { data: sysConfig } = useQuery({
    queryKey: ['system-config'],
    queryFn: () => imageServiceApi.getSystemConfigs(),
  })
  const configMap: Record<string, any> = sysConfig ?? {}
  const logoBase64 = configMap.system_logo?.value

  // Dynamically update browser tab title and favicon based on system configuration
  useEffect(() => {
    const systemName = configMap.system_name?.value || 'Image Service';
    document.title = systemName;

    let faviconLink = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
    if (!faviconLink) {
      faviconLink = document.createElement('link');
      faviconLink.rel = 'icon';
      document.head.appendChild(faviconLink);
    }
    if (logoBase64) {
      faviconLink.href = logoBase64;
    } else {
      faviconLink.href = '/vite.svg';
    }
  }, [configMap.system_name?.value, logoBase64]);

  if (!isAuthenticated) return <LoginPage logoBase64={logoBase64} />

  return (
    <div className={`min-h-screen flex flex-col ${themeConfig.background} ${themeConfig.text.primary}`}>
      {/* Top Navbar */}
      <header className={`${themeConfig.navBar} px-5 py-2.5 flex items-center justify-between flex-shrink-0 z-40`}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {logoBase64 ? (
              <img src={logoBase64} alt="Logo" className="h-7 w-7 rounded object-contain" />
            ) : (
              <Camera size={22} className="text-cyan-400" />
            )}
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
            onChangePassword={() => setPasswordModalOpen(true)}
            onAbout={() => setAboutModalOpen(true)}
          />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={`w-56 flex-shrink-0 ${themeConfig.sidebar} flex flex-col overflow-y-auto`}>
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.filter(item => hasPermission(user, item.permission)).map(item => {
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
            <Route path="/image-service/overview" element={
              hasPermission(user, 'overview:read') ? <ImageServiceOverview /> : <UnauthorizedPage />
            } />
            <Route path="/image-service/cameras" element={
              hasPermission(user, 'cameras:read') ? <ImageServiceCameras /> : <UnauthorizedPage />
            } />
            <Route path="/image-service/cameras/:id" element={
              hasPermission(user, 'cameras:read') ? <ImageServiceCameraDetail /> : <UnauthorizedPage />
            } />
            <Route path="/image-service/search" element={
              hasPermission(user, 'search:read') ? <ImageServiceSearch /> : <UnauthorizedPage />
            } />
            <Route path="/image-service/processing" element={
              hasPermission(user, 'processing:read') ? <ImageServiceProcessingMonitor /> : <UnauthorizedPage />
            } />
            <Route path="/image-service/storage" element={
              hasPermission(user, 'storage:read') ? <ImageServiceStorage /> : <UnauthorizedPage />
            } />
            <Route path="/image-service/logs" element={
              hasPermission(user, 'logs:read') ? <ImageServiceProcessingLogs /> : <UnauthorizedPage />
            } />
            <Route path="/image-service/dead-letter" element={
              hasPermission(user, 'dead-letter:read') ? <DeadLetterQueue /> : <UnauthorizedPage />
            } />
            <Route path="/image-service/audit-log" element={
              hasPermission(user, 'audit-log:read') ? <AuditLogViewer /> : <UnauthorizedPage />
            } />
            <Route path="/image-service/backup" element={
              hasPermission(user, 'backup:read') ? <BackupDashboard /> : <UnauthorizedPage />
            } />
            <Route path="/image-service/retention" element={
              hasPermission(user, 'retention:read') ? <ImageServiceRetention /> : <UnauthorizedPage />
            } />
            <Route path="/image-service/roadmap" element={
              hasPermission(user, 'roadmap:read') ? <ImageServiceRoadmap /> : <UnauthorizedPage />
            } />
            <Route path="/image-service/alerts" element={
              hasPermission(user, 'alerts:read') ? <AlertManagement /> : <UnauthorizedPage />
            } />
            <Route path="/image-service/users" element={
              hasPermission(user, 'users:read') ? <UserManagement /> : <UnauthorizedPage />
            } />
            <Route path="/image-service/health" element={
              hasPermission(user, 'health:read') ? <HealthStatus /> : <UnauthorizedPage />
            } />
            <Route path="/image-service/api-keys" element={
              hasPermission(user, 'api-keys:read') ? <ApiKeysManagement /> : <UnauthorizedPage />
            } />
            <Route path="/image-service/telegram-bot" element={
              hasPermission(user, 'telegram-bot:read') ? <TelegramBotSettings /> : <UnauthorizedPage />
            } />
            <Route path="/image-service/masterdata" element={
              hasPermission(user, 'masterdata:read') ? <MasterdataManagement /> : <UnauthorizedPage />
            } />
            <Route path="/image-service/system-config" element={
              hasPermission(user, 'system-config:read') ? <SystemConfigPage /> : <UnauthorizedPage />
            } />
            <Route path="/image-service/settings" element={
              hasPermission(user, 'settings:read') ? <ImageServiceSettings /> : <UnauthorizedPage />
            } />
            <Route path="/" element={<Navigate to="/image-service/overview" replace />} />
            <Route path="*" element={<Navigate to="/image-service/overview" replace />} />
          </Routes>
        </main>
      </div>
      <ChangePasswordModal isOpen={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} />
      <AboutModal isOpen={aboutModalOpen} onClose={() => setAboutModalOpen(false)} />
    </div>
  )
}
