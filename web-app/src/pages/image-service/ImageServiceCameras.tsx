import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { imageServiceApi } from '@/services/imageServiceApi';
import { formatDateTime } from '@/utils/dateUtils';
import { Search, Plus, ChevronUp, ChevronDown, ChevronsUpDown,
  Edit, Trash2, Eye, Camera, Activity, Wifi, WifiOff, AlertTriangle, Wrench } from 'lucide-react';
import { Modal, Button, SearchableSelect, TableSkeleton, ColumnSelector } from '@/components/ui';
import { getLocalizedValue } from '@/utils/textUtils';

const CAMERA_STATUS_STYLES: Record<string, { bg: string; icon: any }> = {
  active: { bg: 'bg-green-500/20 text-green-400', icon: Wifi },
  inactive: { bg: 'bg-gray-500/20 text-gray-400', icon: WifiOff },
  error: { bg: 'bg-red-500/20 text-red-400', icon: AlertTriangle },
  maintenance: { bg: 'bg-yellow-500/20 text-yellow-400', icon: Wrench },
};

const emptyForm = () => ({
  name: '', ipAddress: '', smbSharePath: '', smbDomain: '',
  smbUsername: '', smbPasswordEncrypted: '',
  pollIntervalSeconds: 30, captureMode: 'periodic',
  retentionPolicyId: '', description: '',
});

export default function ImageServiceCameras() {
  const { t, i18n } = useTranslation();
  const { themeConfig } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortCol, setSortCol] = useState('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [modal, setModal] = useState<{ open: boolean; item?: any | null }>({ open: false });
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);

  const { data: cameras = [], isLoading } = useQuery({
    queryKey: ['cameras-list', search, statusFilter],
    queryFn: () => imageServiceApi.getCameras({ status: statusFilter || undefined }),
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 30,
  });

  const { data: policies = [] } = useQuery({
    queryKey: ['retention-policies'],
    queryFn: () => imageServiceApi.getRetentionPolicies(),
    staleTime: 1000 * 60 * 5,
  });

  const handleSort = (col: string) => {
    if (col === 'actions' || col === 'no') return;
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const openCreate = () => { setForm(emptyForm()); setModal({ open: true, item: null }); };
  const openEdit = (item: any) => {
    setForm({
      name: item.name, ipAddress: item.ipAddress, smbSharePath: item.smbSharePath,
      smbDomain: item.smbDomain ?? '', smbUsername: item.smbUsername,
      smbPasswordEncrypted: '', pollIntervalSeconds: item.pollIntervalSeconds,
      captureMode: item.captureMode, retentionPolicyId: item.retentionPolicyId,
      description: item.description ?? '',
    });
    setModal({ open: true, item });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.ipAddress || !form.smbSharePath || !form.smbUsername || !form.retentionPolicyId) {
      toast.warning(t('common.requiredFields')); return;
    }
    try {
      setSubmitting(true);
      if (modal.item) {
        await imageServiceApi.updateCamera(modal.item.id, form);
        toast.success(t('imageService.cameras.updated'));
      } else {
        await imageServiceApi.createCamera(form);
        toast.success(t('imageService.cameras.created'));
      }
      queryClient.invalidateQueries({ queryKey: ['cameras-list'] });
      setModal({ open: false });
    } catch { toast.error(t('common.error')); }
    finally { setSubmitting(false); }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await imageServiceApi.deactivateCamera(id);
      toast.success(t('imageService.cameras.deactivated'));
      queryClient.invalidateQueries({ queryKey: ['cameras-list'] });
    } catch { toast.error(t('common.error')); }
  };

  const filtered = cameras.filter((c: any) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()));

  const sorted = [...filtered].sort((a: any, b: any) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return (a[sortCol] ?? '') > (b[sortCol] ?? '') ? dir : -dir;
  });

  const thCls = (col: string) =>
    `px-4 py-3 text-left text-sm font-semibold cursor-pointer select-none hover:text-cyan-300 ${themeConfig.text.primary}`;

  return (
    <div className="p-6">
      <div className="mb-6">
        <p className={`text-xs font-medium uppercase tracking-widest ${themeConfig.text.secondary}`}>
          Image Service · {t('imageService.cameras.title')}
        </p>
        <h1 className={`text-2xl font-bold ${themeConfig.text.primary}`}>{t('imageService.cameras.title')}</h1>
        <p className={`text-sm mt-1 ${themeConfig.text.secondary}`}>{t('imageService.cameras.subtitle')}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${themeConfig.text.secondary}`} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={t('common.search')}
              className={`pl-8 pr-3 py-1.5 rounded-lg text-sm border ${themeConfig.inputBorder} ${themeConfig.inputBg} ${themeConfig.text.primary} w-52`} />
          </div>
          <div className="w-36">
            <SearchableSelect value={statusFilter} onChange={setStatusFilter}
              placeholder={t('imageService.search.allStatus')}
              options={['active', 'inactive', 'error', 'maintenance'].map(s => ({
                value: s, label: t(`imageService.cameras.${s}`),
              }))} />
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} className="mr-1.5" /> {t('imageService.cameras.newCamera')}
        </Button>
      </div>

      {isLoading ? <TableSkeleton rows={8} /> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={themeConfig.tableHeader}>
              <tr>
                <th className={`px-4 py-3 text-left text-sm font-semibold ${themeConfig.text.primary}`}>#</th>
                <th onClick={() => handleSort('name')} className={thCls('name')}>
                  <div className="flex items-center gap-1">{t('imageService.cameras.cameraName')}
                    {sortCol === 'name' ? sortDir === 'asc' ? <ChevronUp size={11} className="text-cyan-400" /> : <ChevronDown size={11} className="text-cyan-400" /> : <ChevronsUpDown size={11} className="opacity-25" />}</div>
                </th>
                <th onClick={() => handleSort('ipAddress')} className={thCls('ipAddress')}>{t('imageService.cameras.ipAddress')}
                  {sortCol === 'ipAddress' && (sortDir === 'asc' ? <ChevronUp size={11} className="text-cyan-400" /> : <ChevronDown size={11} className="text-cyan-400" />)}</th>
                <th className={`px-4 py-3 text-left text-sm font-semibold ${themeConfig.text.primary}`}>{t('imageService.cameras.status')}</th>
                <th className={`px-4 py-3 text-left text-sm font-semibold ${themeConfig.text.primary}`}>{t('imageService.cameras.lastPoll')}</th>
                <th className={`px-4 py-3 text-right text-sm font-semibold ${themeConfig.text.primary}`}>{t('imageService.cameras.totalImages')}</th>
                <th className={`px-4 py-3 text-center text-sm font-semibold ${themeConfig.text.primary}`}>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${themeConfig.tableDivide}`}>
              {sorted.map((camera: any, idx: number) => {
                const statusStyle = CAMERA_STATUS_STYLES[camera.status] ?? CAMERA_STATUS_STYLES.inactive;
                const StatusIcon = statusStyle.icon;
                return (
                  <tr key={camera.id} className={`border-b ${themeConfig.tableBorder} ${themeConfig.tableRow}`}>
                    <td className={`px-4 py-3 text-sm ${themeConfig.text.primary}`}>{idx + 1}</td>
                    <td className={`px-4 py-3 text-sm font-medium ${themeConfig.text.primary}`}>
                      <div className="flex items-center gap-2">
                        <Camera size={14} className="text-cyan-400" />
                        {camera.name}
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-sm ${themeConfig.text.secondary}`}>{camera.ipAddress}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1 ${statusStyle.bg}`}>
                        <StatusIcon size={11} />
                        {t(`imageService.cameras.${camera.status}`)}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-sm ${themeConfig.text.secondary}`}>
                      {camera.lastPolledAt ? formatDateTime(camera.lastPolledAt, i18n.language) : '—'}
                    </td>
                    <td className={`px-4 py-3 text-sm text-right ${themeConfig.text.primary}`}>
                      {Number(camera.totalImagesCount ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(camera)}
                          className="p-2 rounded-lg hover:bg-yellow-500/20"><Edit size={15} className="text-yellow-500" /></button>
                        <button onClick={() => handleDeactivate(camera.id)}
                          className="p-2 rounded-lg hover:bg-red-500/20"><Trash2 size={15} className="text-red-500" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={modal.open} onClose={() => setModal({ open: false })}
        title={modal.item ? t('imageService.cameras.editCamera') : t('imageService.cameras.newCamera')}>
        <form onSubmit={handleSubmit} className="space-y-4 p-1 max-w-lg">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={`block text-sm font-medium mb-1.5 ${themeConfig.text.primary}`}>
                {t('imageService.cameras.cameraName')} <span className="text-red-400">*</span>
              </label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className={`w-full px-4 py-2.5 rounded-md ${themeConfig.inputBg} border ${themeConfig.inputBorder} ${themeConfig.text.primary}`} required />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${themeConfig.text.primary}`}>
                {t('imageService.cameras.ipAddress')} <span className="text-red-400">*</span>
              </label>
              <input value={form.ipAddress} onChange={e => setForm(p => ({ ...p, ipAddress: e.target.value }))}
                className={`w-full px-4 py-2.5 rounded-md ${themeConfig.inputBg} border ${themeConfig.inputBorder} ${themeConfig.text.primary}`} required />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${themeConfig.text.primary}`}>
                {t('imageService.cameras.smbPath')} <span className="text-red-400">*</span>
              </label>
              <input value={form.smbSharePath} onChange={e => setForm(p => ({ ...p, smbSharePath: e.target.value }))}
                className={`w-full px-4 py-2.5 rounded-md ${themeConfig.inputBg} border ${themeConfig.inputBorder} ${themeConfig.text.primary}`} required />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${themeConfig.text.primary}`}>
                {t('imageService.cameras.captureMode')}
              </label>
              <SearchableSelect value={form.captureMode} onChange={v => setForm(p => ({ ...p, captureMode: v }))}
                placeholder={t('common.select')}
                options={['periodic', 'on_demand', 'continuous'].map(m => ({ value: m, label: t(`imageService.cameras.captureMode${m.charAt(0).toUpperCase() + m.slice(1)}`) }))} />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${themeConfig.text.primary}`}>
                {t('imageService.cameras.pollInterval')}
              </label>
              <input type="number" value={form.pollIntervalSeconds}
                onChange={e => setForm(p => ({ ...p, pollIntervalSeconds: parseInt(e.target.value) || 30 }))}
                className={`w-full px-4 py-2.5 rounded-md ${themeConfig.inputBg} border ${themeConfig.inputBorder} ${themeConfig.text.primary}`} />
            </div>
            <div className="col-span-2">
              <label className={`block text-sm font-medium mb-1.5 ${themeConfig.text.primary}`}>
                {t('imageService.cameras.smbUsername')} <span className="text-red-400">*</span>
              </label>
              <input value={form.smbUsername} onChange={e => setForm(p => ({ ...p, smbUsername: e.target.value }))}
                className={`w-full px-4 py-2.5 rounded-md ${themeConfig.inputBg} border ${themeConfig.inputBorder} ${themeConfig.text.primary}`} required />
            </div>
            <div className="col-span-2">
              <label className={`block text-sm font-medium mb-1.5 ${themeConfig.text.primary}`}>
                {t('imageService.cameras.retentionPolicy')} <span className="text-red-400">*</span>
              </label>
              <SearchableSelect value={form.retentionPolicyId} onChange={v => setForm(p => ({ ...p, retentionPolicyId: v }))}
                placeholder={t('common.select')}
                options={policies.map((p: any) => ({ value: p.id, label: p.name }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <Button variant="secondary" type="button" onClick={() => setModal({ open: false })}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={submitting}>{submitting ? t('common.saving') : t('common.save')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
