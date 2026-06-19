import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/contexts/ThemeContext'
import { useToast } from '@/contexts/ToastContext'
import { imageServiceApi } from '@/services/imageServiceApi'
import { formatDateTime } from '@/utils/dateUtils'
import { Modal, Button, TableSkeleton } from '@/components/ui'
import { Users, Plus, Edit, Trash2, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-500/20 text-red-400',
  operator: 'bg-blue-500/20 text-blue-400',
  viewer: 'bg-gray-500/20 text-gray-400',
}

function emptyForm() {
  return { username: '', email: '', password: '', role: 'viewer' }
}

export default function UserManagement() {
  const { t, i18n } = useTranslation()
  const { themeConfig } = useTheme()
  const toast = useToast()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [sortCol, setSortCol] = useState('username')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [modal, setModal] = useState<{ open: boolean; item?: any | null }>({ open: false })
  const [form, setForm] = useState(emptyForm())
  const [submitting, setSubmitting] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['users', page],
    queryFn: async () => {
      const res = await imageServiceApi.getUsers({ page, limit: 20 })
      return { items: res.data ?? [], total: res.pagination?.total ?? 0, totalPages: res.pagination?.totalPages ?? 0 }
    },
    staleTime: 1000 * 30,
    placeholderData: (prev) => prev,
  })

  const items = data?.items ?? []
  const totalPages = data?.totalPages ?? 0

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
    setPage(1)
  }

  const openCreate = () => {
    setForm(emptyForm())
    setModal({ open: true, item: null })
  }

  const openEdit = (user: any) => {
    setForm({ username: user.username, email: user.email, password: '', role: user.role })
    setModal({ open: true, item: user })
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      if (modal.item) {
        const data: Record<string, unknown> = { email: form.email, role: form.role }
        if (form.password) data.password = form.password
        await imageServiceApi.updateUser(modal.item.id, data)
        toast.success(t('imageService.users.updated'))
      } else {
        await imageServiceApi.createUser(form)
        toast.success(t('imageService.users.created'))
      }
      setModal({ open: false })
      queryClient.invalidateQueries({ queryKey: ['users'] })
    } catch { toast.error(t('common.error')) }
    finally { setSubmitting(false) }
  }

  const handleDeactivate = async (id: string) => {
    try {
      await imageServiceApi.deactivateUser(id)
      toast.success(t('imageService.users.deactivated'))
      queryClient.invalidateQueries({ queryKey: ['users'] })
    } catch { toast.error(t('common.error')) }
  }

  const thCls = (col: string) =>
    `px-4 py-3 text-left text-sm font-semibold cursor-pointer select-none hover:text-cyan-300 ${themeConfig.text.primary}`

  const sorted = [...items].sort((a: any, b: any) => {
    const av = a[sortCol] ?? '', bv = b[sortCol] ?? ''
    return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
  })

  return (
    <div className="p-6">
      <div className="mb-6">
        <p className={`text-xs font-medium uppercase tracking-widest ${themeConfig.text.secondary}`}>
          Image Service · {t('imageService.users.title')}
        </p>
        <h1 className={`text-2xl font-bold ${themeConfig.text.primary}`}>{t('imageService.users.title')}</h1>
        <p className={`text-sm mt-1 ${themeConfig.text.secondary}`}>{t('imageService.users.subtitle')}</p>
      </div>

      <div className={`${themeConfig.card} rounded-lg p-4 mb-5 flex items-center justify-between`}>
        <span className={`text-xs ${themeConfig.text.secondary}`}>{t('imageService.users.totalUsers', { count: data?.total ?? 0 })}</span>
        <Button onClick={openCreate}>
          <Plus size={15} className="mr-1.5" /> {t('imageService.users.newUser')}
        </Button>
      </div>

      {isLoading ? <TableSkeleton rows={8} /> : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={themeConfig.tableHeader}>
                <tr>
                  <th className={`px-4 py-3 text-left text-sm font-semibold ${themeConfig.text.primary}`}>#</th>
                  <th onClick={() => handleSort('username')} className={thCls('username')}>
                    <div className="flex items-center gap-1">{t('imageService.users.username')}
                      {sortCol === 'username' ? sortDir === 'asc' ? <ChevronUp size={11} className="text-cyan-400" /> : <ChevronDown size={11} className="text-cyan-400" /> : <ChevronsUpDown size={11} className="opacity-25" />}</div>
                  </th>
                  <th onClick={() => handleSort('email')} className={thCls('email')}>
                    <div className="flex items-center gap-1">{t('imageService.users.email')}
                      {sortCol === 'email' ? sortDir === 'asc' ? <ChevronUp size={11} className="text-cyan-400" /> : <ChevronDown size={11} className="text-cyan-400" /> : <ChevronsUpDown size={11} className="opacity-25" />}</div>
                  </th>
                  <th className={`px-4 py-3 text-left text-sm font-semibold ${themeConfig.text.primary}`}>{t('imageService.users.role')}</th>
                  <th className={`px-4 py-3 text-left text-sm font-semibold ${themeConfig.text.primary}`}>{t('imageService.users.status')}</th>
                  <th onClick={() => handleSort('lastLogin')} className={thCls('lastLogin')}>
                    <div className="flex items-center gap-1">{t('imageService.users.lastLogin')}
                      {sortCol === 'lastLogin' ? sortDir === 'asc' ? <ChevronUp size={11} className="text-cyan-400" /> : <ChevronDown size={11} className="text-cyan-400" /> : <ChevronsUpDown size={11} className="opacity-25" />}</div>
                  </th>
                  <th className={`px-4 py-3 text-center text-sm font-semibold ${themeConfig.text.primary}`}>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${themeConfig.tableDivide}`}>
                {sorted.map((item: any, idx: number) => (
                  <tr key={item.id} className={`border-b ${themeConfig.tableBorder} ${themeConfig.tableRow}`}>
                    <td className={`px-4 py-3 text-sm ${themeConfig.text.primary}`}>{(page - 1) * 20 + idx + 1}</td>
                    <td className={`px-4 py-3 text-sm font-medium ${themeConfig.text.primary}`}>{item.username}</td>
                    <td className={`px-4 py-3 text-sm ${themeConfig.text.secondary}`}>{item.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[item.role] ?? 'bg-gray-500/20 text-gray-400'}`}>
                        {item.role}
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
                        <button onClick={() => openEdit(item)}
                          className="p-2 rounded-lg hover:bg-blue-500/20"><Edit size={15} className="text-blue-400" /></button>
                        {item.enabled && (
                          <button onClick={() => handleDeactivate(item.id)}
                            className="p-2 rounded-lg hover:bg-red-500/20"><Trash2 size={15} className="text-red-400" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {items.length === 0 && (
            <div className={`text-center py-12 ${themeConfig.text.secondary} text-sm`}>
              {t('imageService.users.noUsers')}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-5">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className={`px-3 py-1.5 rounded-lg text-xs border ${themeConfig.inputBorder} ${themeConfig.text.primary} disabled:opacity-30`}>
                {t('common.prev')}
              </button>
              <span className={`text-xs ${themeConfig.text.secondary}`}>{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                className={`px-3 py-1.5 rounded-lg text-xs border ${themeConfig.inputBorder} ${themeConfig.text.primary} disabled:opacity-30`}>
                {t('common.next')}
              </button>
            </div>
          )}
        </>
      )}

      <Modal isOpen={modal.open} onClose={() => setModal({ open: false })}
        title={modal.item ? t('imageService.users.editUser') : t('imageService.users.newUser')}>
        <div className="space-y-4 p-1">
          <div>
            <label className={`block text-sm font-medium mb-1 ${themeConfig.text.primary}`}>{t('imageService.users.username')}</label>
            <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              disabled={!!modal.item}
              className={`w-full px-3 py-2 rounded-md text-sm border ${themeConfig.inputBorder} ${themeConfig.inputBg} ${themeConfig.text.primary} focus:outline-none focus:ring-1 focus:ring-cyan-500/50 disabled:opacity-50`} />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${themeConfig.text.primary}`}>{t('imageService.users.email')}</label>
            <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className={`w-full px-3 py-2 rounded-md text-sm border ${themeConfig.inputBorder} ${themeConfig.inputBg} ${themeConfig.text.primary} focus:outline-none focus:ring-1 focus:ring-cyan-500/50`} />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${themeConfig.text.primary}`}>{t('imageService.users.password')}</label>
            <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder={modal.item ? t('imageService.users.leaveBlank') : ''}
              className={`w-full px-3 py-2 rounded-md text-sm border ${themeConfig.inputBorder} ${themeConfig.inputBg} ${themeConfig.text.primary} focus:outline-none focus:ring-1 focus:ring-cyan-500/50`} />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${themeConfig.text.primary}`}>{t('imageService.users.role')}</label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className={`w-full px-3 py-2 rounded-md text-sm border ${themeConfig.inputBorder} ${themeConfig.inputBg} ${themeConfig.text.primary} focus:outline-none focus:ring-1 focus:ring-cyan-500/50`}>
              <option value="admin">admin</option>
              <option value="operator">operator</option>
              <option value="viewer">viewer</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="secondary" onClick={() => setModal({ open: false })}>{t('common.cancel')}</Button>
            <Button onClick={handleSubmit} disabled={submitting || !form.username || !form.email}>
              {submitting ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
