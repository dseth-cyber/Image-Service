import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/contexts/ThemeContext'
import { useToast } from '@/contexts/ToastContext'
import { imageServiceApi } from '@/services/imageServiceApi'
import { formatDateTime } from '@/utils/dateUtils'
import { Modal, Button, SearchableSelect, TableSkeleton } from '@/components/ui'
import { Users, Plus, Edit, Trash2, ChevronUp, ChevronDown, ChevronsUpDown, ShieldAlert, Key, Globe, Layout, CheckSquare, Square, Info, ToggleLeft, ToggleRight } from 'lucide-react'

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-500/20 text-red-400 border border-red-500/30',
  operator: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  viewer: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
}

const PERMISSION_MODULES = [
  {
    key: 'overview',
    labelTh: 'ภาพรวม',
    labelEn: 'Overview',
    permissions: [
      { key: 'overview:read', labelTh: 'ดูหน้าแดชบอร์ด', labelEn: 'View Dashboard' }
    ]
  },
  {
    key: 'cameras',
    labelTh: 'กล้อง',
    labelEn: 'Cameras',
    permissions: [
      { key: 'cameras:read', labelTh: 'ดูรายการกล้อง', labelEn: 'View Cameras' },
      { key: 'cameras:create', labelTh: 'เพิ่มกล้องใหม่', labelEn: 'Create Camera' },
      { key: 'cameras:update', labelTh: 'แก้ไขกล้อง', labelEn: 'Update Camera' },
      { key: 'cameras:delete', labelTh: 'ลบกล้อง (Deactivate)', labelEn: 'Delete/Deactivate Camera' }
    ]
  },
  {
    key: 'search',
    labelTh: 'ค้นหา',
    labelEn: 'Search',
    permissions: [
      { key: 'search:read', labelTh: 'ค้นหารูปภาพ / ดาวน์โหลด', labelEn: 'Search & Download Images' },
      { key: 'search:update', labelTh: 'แก้ไขแท็ก / เมทาดาตา', labelEn: 'Update Tags / Metadata' },
      { key: 'search:delete', labelTh: 'ลบรูปภาพ', labelEn: 'Delete Image' }
    ]
  },
  {
    key: 'processing',
    labelTh: 'ประมวลผล',
    labelEn: 'Processing',
    permissions: [
      { key: 'processing:read', labelTh: 'ดูสถานะการประมวลผล', labelEn: 'View Processing Status' },
      { key: 'processing:create', labelTh: 'สั่งประมวลผลซ้ำ / ปฏิเสธงาน', labelEn: 'Retry / Reject Jobs' }
    ]
  },
  {
    key: 'dead-letter',
    labelTh: 'คิวงานเสีย',
    labelEn: 'Dead Letter Queue',
    permissions: [
      { key: 'dead-letter:read', labelTh: 'ดูรายการ DLQ', labelEn: 'View DLQ' },
      { key: 'dead-letter:create', labelTh: 'สั่งประมวลผลซ้ำ / ล้างคิว', labelEn: 'Retry / Clear DLQ' }
    ]
  },
  {
    key: 'storage',
    labelTh: 'พื้นที่เก็บ / ผู้ให้บริการจัดเก็บ / โปรไฟล์จัดเก็บ',
    labelEn: 'Storage / Providers / Profiles',
    permissions: [
      { key: 'storage:read', labelTh: 'ดูสถิติพื้นที่ / Providers / Profiles / Migrations', labelEn: 'View Storage Stats / Providers / Profiles / Migrations' },
      { key: 'storage:create', labelTh: 'เพิ่ม Provider / Profile / สร้าง Migration', labelEn: 'Create Provider / Profile / Migration' },
      { key: 'storage:update', labelTh: 'แก้ไข Provider / Profile / รัน Migration', labelEn: 'Update Provider / Profile / Run Migration' },
      { key: 'storage:delete', labelTh: 'ลบ Provider / Profile', labelEn: 'Delete Provider / Profile' }
    ]
  },
  {
    key: 'logs',
    labelTh: 'บันทึก',
    labelEn: 'Logs',
    permissions: [
      { key: 'logs:read', labelTh: 'ดูรายการ Logs', labelEn: 'View Logs' }
    ]
  },
  {
    key: 'audit-log',
    labelTh: 'บันทึกการตรวจสอบ',
    labelEn: 'Audit Log',
    permissions: [
      { key: 'audit-log:read', labelTh: 'ดู Audit Logs', labelEn: 'View Audit Logs' }
    ]
  },
  {
    key: 'backup',
    labelTh: 'สำรองข้อมูล',
    labelEn: 'Backup',
    permissions: [
      { key: 'backup:read', labelTh: 'ดูประวัติสำรองข้อมูล', labelEn: 'View Backup History' },
      { key: 'backup:create', labelTh: 'สั่งสำรองข้อมูล / ทดสอบกู้คืน', labelEn: 'Run Backup / Restore Test' }
    ]
  },
  {
    key: 'retention',
    labelTh: 'นโยบาย',
    labelEn: 'Retention',
    permissions: [
      { key: 'retention:read', labelTh: 'ดูนโยบาย', labelEn: 'View Policies' },
      { key: 'retention:create', labelTh: 'สร้างนโยบายใหม่', labelEn: 'Create Policy' },
      { key: 'retention:update', labelTh: 'แก้ไขนโยบาย', labelEn: 'Update Policy' },
      { key: 'retention:delete', labelTh: 'ลบนโยบาย', labelEn: 'Delete Policy' }
    ]
  },
  {
    key: 'alerts',
    labelTh: 'การแจ้งเตือน',
    labelEn: 'Alerts',
    permissions: [
      { key: 'alerts:read', labelTh: 'ดูการแจ้งเตือน', labelEn: 'View Alerts & Rules' },
      { key: 'alerts:create', labelTh: 'เพิ่มกฎแจ้งเตือนใหม่', labelEn: 'Create Alert Rule' },
      { key: 'alerts:update', labelTh: 'รับทราบ / เคลียร์การแจ้งเตือน', labelEn: 'Acknowledge / Resolve Alerts' }
    ]
  },
  {
    key: 'masterdata',
    labelTh: 'ข้อมูลหลัก',
    labelEn: 'Masterdata',
    permissions: [
      { key: 'masterdata:read', labelTh: 'ดูข้อมูลหลัก', labelEn: 'View Masterdata' },
      { key: 'masterdata:create', labelTh: 'เพิ่มข้อมูลหลัก', labelEn: 'Create Masterdata' },
      { key: 'masterdata:update', labelTh: 'แก้ไขข้อมูลหลัก', labelEn: 'Update Masterdata' },
      { key: 'masterdata:delete', labelTh: 'ลบข้อมูลหลัก', labelEn: 'Delete Masterdata' }
    ]
  },
  {
    key: 'api-keys',
    labelTh: 'คีย์ API',
    labelEn: 'API Keys',
    permissions: [
      { key: 'api-keys:read', labelTh: 'ดูรายการ API Keys', labelEn: 'View API Keys' },
      { key: 'api-keys:create', labelTh: 'สร้าง API Key', labelEn: 'Create API Key' },
      { key: 'api-keys:update', labelTh: 'แก้ไข API Key', labelEn: 'Update API Key' },
      { key: 'api-keys:delete', labelTh: 'ลบ API Key', labelEn: 'Delete API Key' }
    ]
  },
  {
    key: 'telegram-bot',
    labelTh: 'Telegram Bot',
    labelEn: 'Telegram Bot',
    permissions: [
      { key: 'telegram-bot:read', labelTh: 'ดูการตั้งค่าบอท', labelEn: 'View Telegram Bot' },
      { key: 'telegram-bot:update', labelTh: 'แก้ไขการตั้งค่าบอท', labelEn: 'Update Telegram Bot' }
    ]
  },
  {
    key: 'settings',
    labelTh: 'ตั้งค่า',
    labelEn: 'Settings',
    permissions: [
      { key: 'settings:read', labelTh: 'ดูตั้งค่า', labelEn: 'View Settings' },
      { key: 'settings:update', labelTh: 'แก้ไขตั้งค่า', labelEn: 'Update Settings' }
    ]
  },
  {
    key: 'system-config',
    labelTh: 'ตั้งค่าระบบ',
    labelEn: 'System Config',
    permissions: [
      { key: 'system-config:read', labelTh: 'ดูตั้งค่าระบบ', labelEn: 'View System Config' },
      { key: 'system-config:update', labelTh: 'แก้ไขตั้งค่าระบบ', labelEn: 'Update System Config' }
    ]
  },
  {
    key: 'users',
    labelTh: 'ผู้ใช้',
    labelEn: 'Users',
    permissions: [
      { key: 'users:read', labelTh: 'ดูรายชื่อผู้ใช้งานและบทบาท', labelEn: 'View Users & Roles' },
      { key: 'users:create', labelTh: 'สร้างผู้ใช้งานและบทบาทใหม่', labelEn: 'Create Users & Roles' },
      { key: 'users:update', labelTh: 'แก้ไขผู้ใช้งานและบทบาท', labelEn: 'Update Users & Roles' },
      { key: 'users:delete', labelTh: 'ลบผู้ใช้งานและบทบาท', labelEn: 'Delete Users & Roles' }
    ]
  },
  {
    key: 'roadmap',
    labelTh: 'โรดแมป',
    labelEn: 'Roadmap',
    permissions: [
      { key: 'roadmap:read', labelTh: 'ดูแผนการพัฒนา', labelEn: 'View Roadmap' }
    ]
  },
  {
    key: 'health',
    labelTh: 'สถานะระบบและบริการ',
    labelEn: 'System Health & Services',
    permissions: [
      { key: 'health:read', labelTh: 'ดูสถานะเซิร์ฟเวอร์', labelEn: 'View System Health' }
    ]
  }
]

function emptyUserForm() {
  return { username: '', email: '', password: '', role: 'viewer', customPermissions: [] as string[] }
}

function emptyRoleForm() {
  return {
    code: '',
    nameTh: '',
    nameEn: '',
    nameCn: '',
    nameMm: '',
    nameJp: '',
    description: '',
    permissions: [] as string[],
    sortOrder: 0,
    isActive: true,
  }
}

export default function UserManagement() {
  const { t, i18n } = useTranslation()
  const { themeConfig } = useTheme()
  const toast = useToast()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users')

  // Users Page/Sort state
  const [userSearch] = useState(() => new URLSearchParams(window.location.search).get('q') || '')
  const [userPage, setUserPage] = useState(1)
  const [userSortCol, setUserSortCol] = useState('username')
  const [userSortDir, setUserSortDir] = useState<'asc' | 'desc'>('asc')
  const [userModal, setUserModal] = useState<{ open: boolean; item?: any | null }>({ open: false })
  const [userForm, setUserForm] = useState(emptyUserForm())
  const [submittingUser, setSubmittingUser] = useState(false)

  // Roles Page/Sort state
  const [roleModal, setRoleModal] = useState<{ open: boolean; item?: any | null }>({ open: false })
  const [roleForm, setRoleForm] = useState(emptyRoleForm())
  const [submittingRole, setSubmittingRole] = useState(false)

  // Load Users Query
  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users', userPage],
    queryFn: async () => {
      const res = await imageServiceApi.getUsers({ page: userPage, limit: 20 })
      return { items: res.data ?? [], total: res.pagination?.total ?? 0, totalPages: res.pagination?.totalPages ?? 0 }
    },
    staleTime: 1000 * 30,
    placeholderData: (prev) => prev,
    enabled: activeTab === 'users',
  })

  const filteredUsers = userSearch
    ? (usersData?.items ?? []).filter((u: any) => u.username?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase()))
    : (usersData?.items ?? [])

  // Load Roles Query (Cached/Fetched small payload)
  const { data: rolesData, isLoading: isLoadingRoles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => imageServiceApi.getRoles(),
    staleTime: 1000 * 30,
  })

  const usersList = filteredUsers
  const usersTotalPages = usersData?.totalPages ?? 0
  const rolesList = rolesData ?? []

  const handleUserSort = (col: string) => {
    if (userSortCol === col) setUserSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setUserSortCol(col); setUserSortDir('asc') }
    setUserPage(1)
  }

  // Get dynamic local language name of dynamic Role
  const getRoleName = (roleObj: any) => {
    if (!roleObj) return ''
    if (i18n.language === 'th') return roleObj.nameTh || roleObj.nameEn || roleObj.code
    if (i18n.language === 'cn') return roleObj.nameCn || roleObj.nameEn || roleObj.code
    if (i18n.language === 'mm') return roleObj.nameMm || roleObj.nameEn || roleObj.code
    if (i18n.language === 'jp') return roleObj.nameJp || roleObj.nameEn || roleObj.code
    return roleObj.nameEn || roleObj.code
  }

  const getRoleObjByCode = (code: string) => {
    return rolesList.find((r: any) => r.code === code)
  }

  // Check if a permission is implicitly granted by the chosen role
  const isPermissionInherited = (roleCode: string, permKey: string) => {
    const roleObj = getRoleObjByCode(roleCode)
    if (!roleObj) return false
    if (roleObj.permissions?.includes('*') || roleObj.permissions?.includes(permKey)) return true
    return false
  }

  // User Actions
  const openCreateUser = () => {
    setUserForm(emptyUserForm())
    setUserModal({ open: true, item: null })
  }

  const openEditUser = (user: any) => {
    setUserForm({
      username: user.username,
      email: user.email,
      password: '',
      role: user.role,
      customPermissions: Array.isArray(user.customPermissions) ? user.customPermissions : [],
    })
    setUserModal({ open: true, item: user })
  }

  const handleUserSubmit = async () => {
    setSubmittingUser(true)
    try {
      if (userModal.item) {
        const payload: Record<string, unknown> = {
          email: userForm.email,
          role: userForm.role,
          customPermissions: userForm.customPermissions,
        }
        if (userForm.password) payload.password = userForm.password
        await imageServiceApi.updateUser(userModal.item.id, payload)
        toast.success(t('imageService.users.updated'))
      } else {
        await imageServiceApi.createUser(userForm)
        toast.success(t('imageService.users.created'))
      }
      setUserModal({ open: false })
      queryClient.invalidateQueries({ queryKey: ['users'] })
    } catch (e: any) { if (!e?._handled) toast.error(t('common.error')) }
    finally { setSubmittingUser(false) }
  }

  const handleToggleUser = async (id: string, currentEnabled: boolean) => {
    try {
      await imageServiceApi.updateUser(id, { enabled: !currentEnabled })
      toast.success(!currentEnabled ? t('imageService.users.activated') : t('imageService.users.deactivated'))
      queryClient.invalidateQueries({ queryKey: ['users'] })
    } catch (e: any) { if (!e?._handled) toast.error(t('common.error')) }
  }

  const handleDeleteUser = async (id: string) => {
    try {
      await imageServiceApi.deactivateUser(id)
      toast.success(t('imageService.users.deleted'))
      queryClient.invalidateQueries({ queryKey: ['users'] })
    } catch (e: any) { if (!e?._handled) toast.error(t('common.error')) }
  }

  const handleUserPermissionToggle = (permKey: string, checked: boolean) => {
    setUserForm(prev => {
      const current = [...prev.customPermissions]
      if (checked) {
        if (!current.includes(permKey)) current.push(permKey)
      } else {
        const idx = current.indexOf(permKey)
        if (idx !== -1) current.splice(idx, 1)
      }
      return { ...prev, customPermissions: current }
    })
  }

  // Role Actions
  const openCreateRole = () => {
    setRoleForm(emptyRoleForm())
    setRoleModal({ open: true, item: null })
  }

  const openEditRole = (role: any) => {
    setRoleForm({
      code: role.code,
      nameTh: role.nameTh || '',
      nameEn: role.nameEn || '',
      nameCn: role.nameCn || '',
      nameMm: role.nameMm || '',
      nameJp: role.nameJp || '',
      description: role.description || '',
      permissions: Array.isArray(role.permissions) ? role.permissions : [],
      sortOrder: role.sortOrder || 0,
      isActive: role.isActive ?? true,
    })
    setRoleModal({ open: true, item: role })
  }

  const handleRoleSubmit = async () => {
    setSubmittingRole(true)
    try {
      if (roleModal.item) {
        await imageServiceApi.updateRole(roleModal.item.id, roleForm)
        toast.success(t('common.saveSuccess') || 'Role updated successfully')
      } else {
        await imageServiceApi.createRole(roleForm)
        toast.success(t('common.saveSuccess') || 'Role created successfully')
      }
      setRoleModal({ open: false })
      queryClient.invalidateQueries({ queryKey: ['roles'] })
    } catch (e: any) {
      if (!e?._handled) toast.error(e.response?.data?.message || t('common.error'))
    } finally { setSubmittingRole(false) }
  }

  const handleDeleteRole = async (id: string) => {
    try {
      await imageServiceApi.deleteRole(id)
      toast.success(t('common.saveSuccess') || 'Role deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['roles'] })
    } catch (e: any) {
      if (!e?._handled) toast.error(e.response?.data?.message || t('common.error'))
    }
  }

  const handleRolePermissionToggle = (permKey: string, checked: boolean) => {
    setRoleForm(prev => {
      const current = [...prev.permissions]
      if (checked) {
        if (!current.includes(permKey)) current.push(permKey)
      } else {
        const idx = current.indexOf(permKey)
        if (idx !== -1) current.splice(idx, 1)
      }
      return { ...prev, permissions: current }
    })
  }

  const sortedUsers = [...usersList].sort((a: any, b: any) => {
    const av = a[userSortCol] ?? '', bv = b[userSortCol] ?? ''
    return userSortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
  })

  const thCls = (col: string) =>
    `px-4 py-3 text-left text-sm font-semibold cursor-pointer select-none hover:text-cyan-300 ${themeConfig.text.primary}`

  return (
    <div className="p-6">
      {/* Title block */}
      <div className="mb-6">
        <p className={`text-xs font-medium uppercase tracking-widest ${themeConfig.text.secondary}`}>
          Image Service · {t('imageService.users.title')}
        </p>
        <h1 className={`text-2xl font-bold ${themeConfig.text.primary}`}>{t('imageService.users.title')}</h1>
        <p className={`text-sm mt-1 ${themeConfig.text.secondary}`}>{t('imageService.users.subtitle')}</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 mb-6 gap-6">
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'users' ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Users size={16} />
          {t('imageService.users.title') || 'Users'}
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`pb-3 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'roles' ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <ShieldAlert size={16} />
          {t('imageService.users.tabs.roles') || 'Roles & Permissions'}
        </button>
      </div>

      {/* Users Tab Panel */}
      {activeTab === 'users' && (
        <>
          <div className={`${themeConfig.card} rounded-lg p-4 mb-5 flex items-center justify-between`}>
            <span className={`text-xs ${themeConfig.text.secondary}`}>
              {t('imageService.users.totalUsers', { count: usersData?.total ?? 0 })}
            </span>
            <Button onClick={openCreateUser}>
              <Plus size={15} className="mr-1.5" /> {t('imageService.users.newUser')}
            </Button>
          </div>

          {isLoadingUsers ? <TableSkeleton rows={8} /> : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={themeConfig.tableHeader}>
                    <tr>
                      <th className={`px-4 py-3 text-left text-sm font-semibold ${themeConfig.text.primary}`}>#</th>
                      <th onClick={() => handleUserSort('username')} className={thCls('username')}>
                        <div className="flex items-center gap-1">
                          {t('imageService.users.username')}
                          {userSortCol === 'username' ? (
                            userSortDir === 'asc' ? <ChevronUp size={11} className="text-cyan-400" /> : <ChevronDown size={11} className="text-cyan-400" />
                          ) : <ChevronsUpDown size={11} className="opacity-25" />}
                        </div>
                      </th>
                      <th onClick={() => handleUserSort('email')} className={thCls('email')}>
                        <div className="flex items-center gap-1">
                          {t('imageService.users.email')}
                          {userSortCol === 'email' ? (
                            userSortDir === 'asc' ? <ChevronUp size={11} className="text-cyan-400" /> : <ChevronDown size={11} className="text-cyan-400" />
                          ) : <ChevronsUpDown size={11} className="opacity-25" />}
                        </div>
                      </th>
                      <th className={`px-4 py-3 text-left text-sm font-semibold ${themeConfig.text.primary}`}>{t('imageService.users.role')}</th>
                      <th className={`px-4 py-3 text-left text-sm font-semibold ${themeConfig.text.primary}`}>{t('imageService.users.status')}</th>
                      <th onClick={() => handleUserSort('lastLogin')} className={thCls('lastLogin')}>
                        <div className="flex items-center gap-1">
                          {t('imageService.users.lastLogin')}
                          {userSortCol === 'lastLogin' ? (
                            userSortDir === 'asc' ? <ChevronUp size={11} className="text-cyan-400" /> : <ChevronDown size={11} className="text-cyan-400" />
                          ) : <ChevronsUpDown size={11} className="opacity-25" />}
                        </div>
                      </th>
                      <th className={`px-4 py-3 text-center text-sm font-semibold ${themeConfig.text.primary}`}>{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${themeConfig.tableDivide}`}>
                    {sortedUsers.map((item: any, idx: number) => {
                      const roleObj = getRoleObjByCode(item.role)
                      return (
                        <tr key={item.id} className={`border-b ${themeConfig.tableBorder} ${themeConfig.tableRow}`}>
                          <td className={`px-4 py-3 text-sm ${themeConfig.text.primary}`}>{(userPage - 1) * 20 + idx + 1}</td>
                          <td className={`px-4 py-3 text-sm font-medium ${themeConfig.text.primary}`}>{item.username}</td>
                          <td className={`px-4 py-3 text-sm ${themeConfig.text.secondary}`}>{item.email}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[item.role] ?? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'}`}>
                              {getRoleName(roleObj)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.enabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                              {item.enabled ? t('imageService.users.active') : t('imageService.users.disabled')}
                            </span>
                          </td>
                          <td className={`px-4 py-3 text-sm ${themeConfig.text.secondary}`}>
                            {item.lastLogin ? formatDateTime(item.lastLogin, i18n.language) : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => openEditUser(item)}
                                className="p-2 rounded-lg hover:bg-blue-500/20" title={t('common.edit')}><Edit size={15} className="text-blue-400" /></button>
                              <button onClick={() => handleToggleUser(item.id, item.enabled)}
                                className={`p-2 rounded-lg ${item.enabled ? 'hover:bg-yellow-500/20' : 'hover:bg-green-500/20'}`}
                                title={item.enabled ? t('imageService.users.disable') : t('imageService.users.enable')}>
                                {item.enabled
                                  ? <ToggleRight size={15} className="text-green-400" />
                                  : <ToggleLeft size={15} className="text-gray-400" />}
                              </button>
                              <button onClick={() => handleDeleteUser(item.id)}
                                className="p-2 rounded-lg hover:bg-red-500/20" title={t('imageService.users.deleteUser')}><Trash2 size={15} className="text-red-400" /></button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {usersList.length === 0 && (
                <div className={`text-center py-12 ${themeConfig.text.secondary} text-sm`}>
                  {t('imageService.users.noUsers')}
                </div>
              )}

              {usersTotalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-5">
                  <button disabled={userPage <= 1} onClick={() => setUserPage(p => p - 1)}
                    className={`px-3 py-1.5 rounded-lg text-xs border ${themeConfig.inputBorder} ${themeConfig.text.primary} disabled:opacity-30`}>
                    {t('common.prev')}
                  </button>
                  <span className={`text-xs ${themeConfig.text.secondary}`}>{userPage} / {usersTotalPages}</span>
                  <button disabled={userPage >= usersTotalPages} onClick={() => setUserPage(p => p + 1)}
                    className={`px-3 py-1.5 rounded-lg text-xs border ${themeConfig.inputBorder} ${themeConfig.text.primary} disabled:opacity-30`}>
                    {t('common.next')}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Roles Tab Panel */}
      {activeTab === 'roles' && (
        <>
          <div className={`${themeConfig.card} rounded-lg p-4 mb-5 flex items-center justify-between`}>
            <span className={`text-xs ${themeConfig.text.secondary}`}>
              {t('imageService.users.totalRoles', { count: rolesList.length }) || `Total: ${rolesList.length} Roles`}
            </span>
            <Button onClick={openCreateRole}>
              <Plus size={15} className="mr-1.5" /> {t('imageService.users.roles.newRole') || 'Add New Role'}
            </Button>
          </div>

          {isLoadingRoles ? <TableSkeleton rows={5} /> : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={themeConfig.tableHeader}>
                  <tr>
                    <th className={`px-4 py-3 text-left text-sm font-semibold ${themeConfig.text.primary}`}>#</th>
                    <th className={`px-4 py-3 text-left text-sm font-semibold ${themeConfig.text.primary}`}>{t('imageService.users.roles.roleCode') || 'Role Code'}</th>
                    <th className={`px-4 py-3 text-left text-sm font-semibold ${themeConfig.text.primary}`}>{t('imageService.users.role') || 'Role Name'}</th>
                    <th className={`px-4 py-3 text-left text-sm font-semibold ${themeConfig.text.primary}`}>{t('imageService.retention.description') || 'Description'}</th>
                    <th className={`px-4 py-3 text-center text-sm font-semibold ${themeConfig.text.primary}`}>{t('imageService.users.roles.assignedUsers') || 'Assigned Users'}</th>
                    <th className={`px-4 py-3 text-center text-sm font-semibold ${themeConfig.text.primary}`}>{t('imageService.users.status') || 'Status'}</th>
                    <th className={`px-4 py-3 text-center text-sm font-semibold ${themeConfig.text.primary}`}>{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${themeConfig.tableDivide}`}>
                  {rolesList.map((item: any, idx: number) => (
                    <tr key={item.id} className={`border-b ${themeConfig.tableBorder} ${themeConfig.tableRow}`}>
                      <td className={`px-4 py-3 text-sm ${themeConfig.text.primary}`}>{idx + 1}</td>
                      <td className={`px-4 py-3 text-sm font-mono ${themeConfig.text.primary}`}>{item.code}</td>
                      <td className={`px-4 py-3 text-sm font-medium ${themeConfig.text.primary}`}>{getRoleName(item)}</td>
                      <td className={`px-4 py-3 text-sm ${themeConfig.text.secondary}`}>{item.description || '—'}</td>
                      <td className={`px-4 py-3 text-center text-sm font-semibold ${themeConfig.text.primary}`}>{item._count?.users ?? 0}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {item.isActive ? t('imageService.users.active') : t('imageService.users.disabled')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEditRole(item)}
                            className="p-2 rounded-lg hover:bg-blue-500/20"><Edit size={15} className="text-blue-400" /></button>
                          {item.code !== 'admin' && item._count?.users === 0 && (
                            <button onClick={() => handleDeleteRole(item.id)}
                              className="p-2 rounded-lg hover:bg-red-500/20"><Trash2 size={15} className="text-red-400" /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* User Create/Edit Modal */}
      <Modal isOpen={userModal.open} onClose={() => setUserModal({ open: false })} size="2xl"
        title={userModal.item ? t('imageService.users.editUser') : t('imageService.users.newUser')}>
        <div className="space-y-4 p-1">
          <div>
            <label className={`block text-sm font-medium mb-1 ${themeConfig.text.primary}`}>{t('imageService.users.username')}</label>
            <input value={userForm.username} onChange={e => setUserForm(f => ({ ...f, username: e.target.value }))}
              disabled={!!userModal.item}
              className={`w-full px-3 py-2 rounded-md text-sm border ${themeConfig.inputBorder} ${themeConfig.inputBg} ${themeConfig.text.primary} focus:outline-none focus:ring-1 focus:ring-cyan-500/50 disabled:opacity-50`} />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${themeConfig.text.primary}`}>{t('imageService.users.email')}</label>
            <input value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))}
              className={`w-full px-3 py-2 rounded-md text-sm border ${themeConfig.inputBorder} ${themeConfig.inputBg} ${themeConfig.text.primary} focus:outline-none focus:ring-1 focus:ring-cyan-500/50`} />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${themeConfig.text.primary}`}>{t('imageService.users.password')}</label>
            <input type="password" value={userForm.password} onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))}
              placeholder={userModal.item ? t('imageService.users.leaveBlank') : ''}
              className={`w-full px-3 py-2 rounded-md text-sm border ${themeConfig.inputBorder} ${themeConfig.inputBg} ${themeConfig.text.primary} focus:outline-none focus:ring-1 focus:ring-cyan-500/50`} />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${themeConfig.text.primary}`}>{t('imageService.users.role')}</label>
            <SearchableSelect value={userForm.role} onChange={v => setUserForm(f => ({ ...f, role: v }))}
              options={rolesList.map((r: any) => ({ value: r.code, label: getRoleName(r) }))} />
          </div>

          {/* User Permissions Grid Override */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Key size={14} className="text-cyan-400" />
              <label className={`block text-sm font-medium ${themeConfig.text.primary}`}>
                {t('imageService.users.roles.extraPermissions') || 'Additional / Override Permissions'}
              </label>
            </div>
            
            <div className="space-y-4 max-h-[300px] overflow-y-auto border border-white/10 rounded-lg p-3 bg-black/20">
              {PERMISSION_MODULES.map(mod => {
                const modLabel = t(`imageService.permissions.modules.${mod.key}`) || mod.labelEn;
                return (
                  <div key={mod.key} className="space-y-2 border-b border-white/5 pb-2 last:border-b-0 last:pb-0">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-cyan-300">{modLabel}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-2">
                      {mod.permissions.map(perm => {
                        const permLabel = t(`imageService.permissions.actions.${perm.key.replace(':', '_')}`) || perm.labelEn;
                        const isInherited = isPermissionInherited(userForm.role, perm.key);
                        const isChecked = isInherited || userForm.customPermissions.includes(perm.key);
                        
                        return (
                          <label 
                            key={perm.key} 
                            className={`flex items-start gap-2.5 p-1.5 rounded hover:bg-white/5 cursor-pointer text-xs ${isInherited ? 'opacity-80' : ''}`}
                          >
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              disabled={isInherited}
                              onChange={(e) => handleUserPermissionToggle(perm.key, e.target.checked)}
                              className="mt-0.5 rounded border-white/30 bg-white/10 text-cyan-500 focus:ring-cyan-500/50" 
                            />
                            <div className="flex flex-col">
                              <span className={themeConfig.text.primary}>{permLabel}</span>
                              {isInherited && (
                                <span className="text-[10px] text-cyan-400 italic font-semibold">
                                  ({t('imageService.users.roles.fromRole') || 'Inherited from Role'})
                                </span>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button variant="secondary" onClick={() => setUserModal({ open: false })}>{t('common.cancel')}</Button>
            <Button onClick={handleUserSubmit} disabled={submittingUser || !userForm.username || !userForm.email}>
              {submittingUser ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Role Create/Edit Modal */}
      <Modal isOpen={roleModal.open} onClose={() => setRoleModal({ open: false })} size="2xl"
        title={roleModal.item ? t('imageService.users.roles.editRole') || 'Edit Role' : t('imageService.users.roles.newRole') || 'New Role'}>
        <div className="space-y-4 p-1">
          <div>
            <label className={`block text-sm font-medium mb-1 ${themeConfig.text.primary}`}>{t('imageService.users.roles.roleCode') || 'Role Code'}</label>
            <input value={roleForm.code} onChange={e => setRoleForm(f => ({ ...f, code: e.target.value }))}
              placeholder="e.g. operator"
              disabled={!!roleModal.item}
              className={`w-full px-3 py-2 rounded-md text-sm border ${themeConfig.inputBorder} ${themeConfig.inputBg} ${themeConfig.text.primary} focus:outline-none focus:ring-1 focus:ring-cyan-500/50 disabled:opacity-50 font-mono`} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-sm font-medium mb-1 ${themeConfig.text.primary}`}>{t('imageService.masterdataManagement.nameLabel', { lang: 'TH' }) || 'Name (TH)'}</label>
              <input value={roleForm.nameTh} onChange={e => setRoleForm(f => ({ ...f, nameTh: e.target.value }))}
                className={`w-full px-3 py-2 rounded-md text-sm border ${themeConfig.inputBorder} ${themeConfig.inputBg} ${themeConfig.text.primary} focus:outline-none focus:ring-1 focus:ring-cyan-500/50`} />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${themeConfig.text.primary}`}>{t('imageService.masterdataManagement.nameLabel', { lang: 'EN' }) || 'Name (EN)'}</label>
              <input value={roleForm.nameEn} onChange={e => setRoleForm(f => ({ ...f, nameEn: e.target.value }))}
                className={`w-full px-3 py-2 rounded-md text-sm border ${themeConfig.inputBorder} ${themeConfig.inputBg} ${themeConfig.text.primary} focus:outline-none focus:ring-1 focus:ring-cyan-500/50`} />
            </div>
          </div>

          <div className="flex items-center gap-1 my-1">
            <Globe size={14} className="text-gray-400" />
            <span className="text-xs text-gray-400 font-semibold">{t('imageService.users.roles.optionalLanguages')}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 bg-black/10 p-2.5 rounded-lg border border-white/5">
            <div>
              <label className={`block text-[11px] font-medium mb-1 text-gray-300`}>CN</label>
              <input value={roleForm.nameCn} onChange={e => setRoleForm(f => ({ ...f, nameCn: e.target.value }))}
                className={`w-full px-2 py-1 rounded text-xs border ${themeConfig.inputBorder} ${themeConfig.inputBg} ${themeConfig.text.primary} focus:outline-none`} />
            </div>
            <div>
              <label className={`block text-[11px] font-medium mb-1 text-gray-300`}>MM</label>
              <input value={roleForm.nameMm} onChange={e => setRoleForm(f => ({ ...f, nameMm: e.target.value }))}
                className={`w-full px-2 py-1 rounded text-xs border ${themeConfig.inputBorder} ${themeConfig.inputBg} ${themeConfig.text.primary} focus:outline-none`} />
            </div>
            <div>
              <label className={`block text-[11px] font-medium mb-1 text-gray-300`}>JP</label>
              <input value={roleForm.nameJp} onChange={e => setRoleForm(f => ({ ...f, nameJp: e.target.value }))}
                className={`w-full px-2 py-1 rounded text-xs border ${themeConfig.inputBorder} ${themeConfig.inputBg} ${themeConfig.text.primary} focus:outline-none`} />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${themeConfig.text.primary}`}>{t('imageService.retention.description') || 'Description'}</label>
            <textarea value={roleForm.description} onChange={e => setRoleForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              className={`w-full px-3 py-2 rounded-md text-sm border ${themeConfig.inputBorder} ${themeConfig.inputBg} ${themeConfig.text.primary} focus:outline-none focus:ring-1 focus:ring-cyan-500/50`} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-sm font-medium mb-1 ${themeConfig.text.primary}`}>{t('imageService.masterdataManagement.formSortOrder') || 'Sort Order'}</label>
              <input type="number" value={roleForm.sortOrder} onChange={e => setRoleForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                className={`w-full px-3 py-2 rounded-md text-sm border ${themeConfig.inputBorder} ${themeConfig.inputBg} ${themeConfig.text.primary} focus:outline-none focus:ring-1 focus:ring-cyan-500/50`} />
            </div>
            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                <input type="checkbox" checked={roleForm.isActive} onChange={e => setRoleForm(f => ({ ...f, isActive: e.target.checked }))}
                  className="rounded border-white/30 bg-white/10 text-cyan-500 focus:ring-cyan-500/50" />
                <span className={themeConfig.text.primary}>{t('imageService.masterdataManagement.formActive') || 'Active'}</span>
              </label>
            </div>
          </div>

          {/* Role Permissions Default Matrix */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Layout size={14} className="text-cyan-400" />
              <label className={`block text-sm font-medium ${themeConfig.text.primary}`}>
                {t('imageService.users.roles.permissions') || 'Default Permissions'}
              </label>
            </div>
            
            {roleForm.code === 'admin' ? (
              <div className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 p-3 rounded-lg flex items-start gap-2">
                <Info size={16} className="mt-0.5 flex-shrink-0" />
                <p className="text-xs">
                  {t('imageService.users.roles.adminBypass') || 'Administrator role automatically possesses all permissions (*) and bypasses RBAC access controls. Specific permission overrides are not required.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[300px] overflow-y-auto border border-white/10 rounded-lg p-3 bg-black/20">
                {PERMISSION_MODULES.map(mod => {
                  const modLabel = t(`imageService.permissions.modules.${mod.key}`) || mod.labelEn;
                  return (
                    <div key={mod.key} className="space-y-2 border-b border-white/5 pb-2 last:border-b-0 last:pb-0">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-cyan-300">{modLabel}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-2">
                        {mod.permissions.map(perm => {
                          const permLabel = t(`imageService.permissions.actions.${perm.key.replace(':', '_')}`) || perm.labelEn;
                          const isChecked = roleForm.permissions.includes(perm.key);
                          
                          return (
                            <label key={perm.key} className="flex items-center gap-2.5 p-1 hover:bg-white/5 cursor-pointer text-xs">
                              <input 
                                type="checkbox" 
                                checked={isChecked}
                                onChange={(e) => handleRolePermissionToggle(perm.key, e.target.checked)}
                                className="rounded border-white/30 bg-white/10 text-cyan-500 focus:ring-cyan-500/50" 
                              />
                              <span className={themeConfig.text.primary}>{permLabel}</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button variant="secondary" onClick={() => setRoleModal({ open: false })}>{t('common.cancel')}</Button>
            <Button onClick={handleRoleSubmit} disabled={submittingRole || !roleForm.code || !roleForm.nameTh || !roleForm.nameEn}>
              {submittingRole ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
