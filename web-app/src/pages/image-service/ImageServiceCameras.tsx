import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/App';
import { imageServiceApi } from '@/services/imageServiceApi';
import { formatDateTime } from '@/utils/dateUtils';
import { Search, Plus, ChevronUp, ChevronDown, ChevronsUpDown,
  Edit, Trash2, Eye, Camera, Activity, Wifi, WifiOff, AlertTriangle, Wrench,
  FolderOpen, RefreshCw, CheckCircle, XCircle, ExternalLink, ChevronRight, Play, Undo2 } from 'lucide-react';
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const canUpdate = hasPermission(user, 'cameras:update');
  const canDelete = hasPermission(user, 'cameras:delete');

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortCol, setSortCol] = useState('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [modal, setModal] = useState<{ open: boolean; item?: any | null }>({ open: false });
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [testResult, setTestResult] = useState<{ loading: boolean; success?: boolean; message?: string }>({ loading: false });
  const [browseOpen, setBrowseOpen] = useState(false);
  const [browseItems, setBrowseItems] = useState<Array<{ name: string; isDirectory: boolean }>>([]);
  const [browsePath, setBrowsePath] = useState('');
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseShares, setBrowseShares] = useState<Array<{ name: string; description: string }>>([]);
  const [browseStep, setBrowseStep] = useState<'shares' | 'files'>('shares');

  // Delete camera state
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; camera?: any }>({ open: false });
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Camera trash state
  const [trashOpen, setTrashOpen] = useState(false);
  const [trashData, setTrashData] = useState<any[]>([]);
  const [trashLoading, setTrashLoading] = useState(false);
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);
  const [emptyTrashPassword, setEmptyTrashPassword] = useState('');

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
        const payload = { ...form };
        if (!payload.smbPasswordEncrypted) delete payload.smbPasswordEncrypted;
        if (!payload.smbDomain) delete payload.smbDomain;
        await imageServiceApi.updateCamera(modal.item.id, payload);
        toast.success(t('imageService.cameras.updated'));
      } else {
        await imageServiceApi.createCamera(form);
        toast.success(t('imageService.cameras.created'));
      }
      queryClient.invalidateQueries({ queryKey: ['cameras-list'] });
      setModal({ open: false });
    } catch (e: any) { if (!e?._handled) toast.error(t('common.error')); }
    finally { setSubmitting(false); }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await imageServiceApi.deactivateCamera(id);
      toast.success(t('imageService.cameras.deactivated'));
      queryClient.invalidateQueries({ queryKey: ['cameras-list'] });
    } catch (e: any) { if (!e?._handled) toast.error(t('common.error')); }
  };

  const openDeleteModal = (camera: any) => {
    setDeletePassword('');
    setDeleteModal({ open: true, camera });
  };

  const handleDeleteCamera = useCallback(async () => {
    if (!deleteModal.camera || !deletePassword) return;
    setDeleting(true);
    try {
      await imageServiceApi.deleteCamera(deleteModal.camera.id, deletePassword);
      toast.success(t('imageService.cameras.deleteCameraSuccess'));
      setDeleteModal({ open: false });
      setDeletePassword('');
      queryClient.invalidateQueries({ queryKey: ['cameras-list'] });
    } catch (e: any) {
      if (e?.response?.status === 401) {
        toast.error(t('imageService.cameras.wrongPassword'));
      } else if (!e?._handled) {
        toast.error(t('common.error'));
      }
    } finally { setDeleting(false); }
  }, [deleteModal.camera, deletePassword, t, toast, queryClient]);

  const fetchCameraTrash = useCallback(async () => {
    setTrashLoading(true);
    try {
      const result = await imageServiceApi.getDeletedCameras();
      setTrashData(result);
    } catch (e: any) { if (!e?._handled) toast.error(t('common.error')); }
    finally { setTrashLoading(false); }
  }, [t, toast]);

  const handleOpenCameraTrash = useCallback(() => {
    setTrashOpen(true);
    setShowEmptyConfirm(false);
    setEmptyTrashPassword('');
    fetchCameraTrash();
  }, [fetchCameraTrash]);

  const handleRestoreCamera = useCallback(async (id: string) => {
    try {
      await imageServiceApi.restoreCamera(id);
      toast.success(t('imageService.cameras.restoreCameraSuccess'));
      fetchCameraTrash();
      queryClient.invalidateQueries({ queryKey: ['cameras-list'] });
    } catch (e: any) { if (!e?._handled) toast.error(t('common.error')); }
  }, [t, toast, queryClient, fetchCameraTrash]);

  const handleEmptyCameraTrash = useCallback(async () => {
    if (!emptyTrashPassword) return;
    try {
      const result = await imageServiceApi.emptyCameraTrash(emptyTrashPassword);
      toast.success(t('imageService.cameras.emptyCameraTrashSuccess', { count: result.deleted }));
      setShowEmptyConfirm(false);
      setEmptyTrashPassword('');
      fetchCameraTrash();
      queryClient.invalidateQueries({ queryKey: ['cameras-list'] });
    } catch (e: any) {
      if (e?.response?.status === 401) {
        toast.error(t('imageService.cameras.wrongPassword'));
      } else if (!e?._handled) {
        toast.error(t('common.error'));
      }
    }
  }, [emptyTrashPassword, t, toast, queryClient, fetchCameraTrash]);

  const [statusDropdownId, setStatusDropdownId] = useState<string | null>(null);
  const [changingStatus, setChangingStatus] = useState<Set<string>>(new Set());

  const STATUS_OPTIONS: { value: string; label: string; bg: string; icon: any }[] = [
    { value: 'active', label: t('imageService.cameras.active'), bg: 'bg-green-500/20 text-green-400 hover:bg-green-500/30', icon: Wifi },
    { value: 'maintenance', label: t('imageService.cameras.maintenance'), bg: 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30', icon: Wrench },
    { value: 'inactive', label: t('imageService.cameras.inactive'), bg: 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30', icon: WifiOff },
  ];

  const handleChangeStatus = async (id: string, newStatus: string) => {
    setChangingStatus(prev => new Set(prev).add(id));
    setStatusDropdownId(null);
    try {
      await imageServiceApi.updateCamera(id, { status: newStatus });
      toast.success(t('imageService.cameras.statusChanged'));
      queryClient.invalidateQueries({ queryKey: ['cameras-list'] });
    } catch (e: any) { if (!e?._handled) toast.error(t('common.error')); }
    finally {
      setChangingStatus(prev => { const next = new Set(prev); next.delete(id); return next; });
    }
  };

  const [scanning, setScanning] = useState(false);
  const [scanningCameras, setScanningCameras] = useState<Set<string>>(new Set());

  const handleScanNow = async () => {
    setScanning(true);
    try {
      await imageServiceApi.scanNow();
      toast.success(t('imageService.cameras.scanTriggered'));
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['cameras-list'] }), 3000);
    } catch (e: any) { if (!e?._handled) toast.error(t('common.error')); }
    finally { setScanning(false); }
  };

  const handleScanCamera = async (id: string) => {
    setScanningCameras(prev => new Set(prev).add(id));
    try {
      await imageServiceApi.scanCamera(id);
      toast.success(t('imageService.cameras.scanTriggered'));
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['cameras-list'] }), 3000);
    } catch (e: any) { if (!e?._handled) toast.error(t('common.error')); }
    finally {
      setScanningCameras(prev => { const next = new Set(prev); next.delete(id); return next; });
    }
  };

  const handleTestConnection = async () => {
    if (!form.smbSharePath || !form.smbUsername) { toast.warning(t('common.requiredFields')); return; }
    setTestResult({ loading: true });
    try {
      const res = await imageServiceApi.testSmbConnection({
        smbSharePath: form.smbSharePath,
        smbUsername: form.smbUsername,
        smbPasswordEncrypted: form.smbPasswordEncrypted || 'test',
        smbDomain: form.smbDomain || undefined,
      });
      setTestResult({ loading: false, success: res.success, message: res.message });
      if (res.success) toast.success(res.message);
      else toast.error(res.message);
    } catch {
      setTestResult({ loading: false, success: false, message: 'Connection failed' });
      toast.error(t('common.error'));
    }
  };

  const openBrowse = async () => {
    if (!form.ipAddress || !form.smbUsername) { toast.warning(t('common.requiredFields')); return; }
    setBrowseOpen(true);
    if (form.smbSharePath) {
      setBrowseStep('files');
      setBrowsePath('');
      setBrowseLoading(true);
      try {
        const parts = form.smbSharePath.replace(/^\/\//, '').split('/');
        const share = parts[1];
        const subPath = parts.slice(2).join('/');
        const res = await imageServiceApi.browseSmb({
          smbSharePath: form.smbSharePath,
          smbUsername: form.smbUsername,
          smbPasswordEncrypted: form.smbPasswordEncrypted || 'test',
          smbDomain: form.smbDomain || undefined,
          path: subPath || undefined,
        });
        setBrowseItems(res.entries ?? []);
        setBrowsePath(parts.slice(1).join('/') + '/');
      } catch (e: any) { if (!e?._handled) toast.error(t('common.error')); }
      finally { setBrowseLoading(false); }
    } else {
      setBrowseStep('shares');
      setBrowseLoading(true);
      try {
        const res = await imageServiceApi.listSmbShares({
          host: form.ipAddress,
          smbUsername: form.smbUsername,
          smbPasswordEncrypted: form.smbPasswordEncrypted || 'test',
          smbDomain: form.smbDomain || undefined,
        });
        setBrowseShares(res.shares ?? []);
      } catch (e: any) { if (!e?._handled) toast.error(t('common.error')); }
      finally { setBrowseLoading(false); }
    }
  };

  const browseShare = async (share: string) => {
    const path = `//${form.ipAddress}/${share}`;
    setBrowseStep('files');
    setBrowsePath('');
    setBrowseLoading(true);
    try {
      const res = await imageServiceApi.browseSmb({
        smbSharePath: path,
        smbUsername: form.smbUsername,
        smbPasswordEncrypted: form.smbPasswordEncrypted || 'test',
        smbDomain: form.smbDomain || undefined,
      });
      setBrowseItems(res.entries ?? []);
      setBrowsePath(share + '/');
    } catch (e: any) { if (!e?._handled) toast.error(t('common.error')); }
    finally { setBrowseLoading(false); }
  };

  const browseFolder = async (folder: string) => {
    const parts = browsePath.split('/').filter(Boolean);
    const newPath = [...parts, folder].join('/');
    const share = parts[0];
    const subPath = parts.slice(1).concat(folder).join('/');
    setBrowseLoading(true);
    try {
      const res = await imageServiceApi.browseSmb({
        smbSharePath: `//${form.ipAddress}/${share}`,
        smbUsername: form.smbUsername,
        smbPasswordEncrypted: form.smbPasswordEncrypted || 'test',
        smbDomain: form.smbDomain || undefined,
        path: subPath,
      });
      setBrowseItems(res.entries ?? []);
      setBrowsePath(newPath + '/');
    } catch (e: any) { if (!e?._handled) toast.error(t('common.error')); }
    finally { setBrowseLoading(false); }
  };

  const selectBrowsePath = (folder: string) => {
    const share = browsePath.split('/').filter(Boolean)[0];
    const subPath = browsePath.endsWith('/') ? browsePath.slice(0, -1) : browsePath;
    const fullPath = subPath.split('/').slice(1).join('/');
    const smbPath = fullPath ? `//${form.ipAddress}/${share}/${fullPath}` : `//${form.ipAddress}/${share}`;
    setForm(p => ({ ...p, smbSharePath: smbPath }));
    setBrowseOpen(false);
  };

  const goBackShares = () => {
    setBrowseStep('shares');
    setBrowseItems([]);
    setBrowsePath('');
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
        <div className="flex items-center gap-2">
          <Button onClick={openCreate}>
            <Plus size={16} className="mr-1.5" /> {t('imageService.cameras.newCamera')}
          </Button>
          <Button variant="secondary" onClick={handleScanNow} disabled={scanning}>
            <RefreshCw size={16} className={`mr-1.5 ${scanning ? 'animate-spin' : ''}`} />
            {t('imageService.cameras.scanNow')}
          </Button>
          {canDelete && (
            <button onClick={handleOpenCameraTrash}
              className="px-3 py-2 rounded-md text-xs flex items-center gap-1.5 border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors">
              <Trash2 size={13} /> {t('imageService.cameras.cameraTrash')}
            </button>
          )}
        </div>
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
                        <button onClick={() => navigate(`/image-service/cameras/${camera.id}`)}
                          className="hover:text-cyan-300 transition-colors text-left">
                          {camera.name}
                        </button>
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-sm ${themeConfig.text.secondary}`}>{camera.ipAddress}</td>
                    <td className="px-4 py-3">
                      <div className="relative">
                        <button
                          data-status-btn={camera.id}
                          onClick={() => canUpdate && setStatusDropdownId(statusDropdownId === camera.id ? null : camera.id)}
                          disabled={changingStatus.has(camera.id) || !canUpdate}
                          className={`px-2 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1 transition-all ${canUpdate ? 'cursor-pointer hover:ring-1 hover:ring-white/20' : 'cursor-default'} ${statusStyle.bg}`}
                          title={canUpdate ? t('imageService.cameras.changeStatus') : ''}
                        >
                          {changingStatus.has(camera.id) ? (
                            <RefreshCw size={11} className="animate-spin" />
                          ) : (
                            <StatusIcon size={11} />
                          )}
                          {t(`imageService.cameras.${camera.status}`)}
                          {canUpdate && <ChevronDown size={10} className="ml-0.5 opacity-60" />}
                        </button>
                        {statusDropdownId === camera.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setStatusDropdownId(null)} />
                            <div className="fixed z-50 rounded-lg border border-white/20 bg-slate-800 shadow-2xl min-w-[180px] py-1"
                              style={{ top: (document.querySelector(`[data-status-btn="${camera.id}"]`) as HTMLElement)?.getBoundingClientRect().bottom + 4, left: (document.querySelector(`[data-status-btn="${camera.id}"]`) as HTMLElement)?.getBoundingClientRect().left }}>
                              {STATUS_OPTIONS.map(opt => {
                                const OptIcon = opt.icon;
                                const isCurrent = camera.status === opt.value;
                                return (
                                  <button
                                    key={opt.value}
                                    onClick={() => !isCurrent && handleChangeStatus(camera.id, opt.value)}
                                    disabled={isCurrent}
                                    className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors ${isCurrent ? 'opacity-50 cursor-default' : 'hover:bg-white/5 cursor-pointer'}`}
                                  >
                                    <span className={`inline-flex items-center gap-1.5 ${opt.bg.split(' ').filter(c => c.startsWith('text-')).join(' ')}`}>
                                      <OptIcon size={12} />
                                      {opt.label}
                                    </span>
                                    {isCurrent && <CheckCircle size={11} className="ml-auto text-cyan-400" />}
                                  </button>
                                );
                              })}
                              {camera.status !== 'maintenance' && (
                                <div className={`px-3 py-1.5 text-[10px] border-t border-white/5 ${themeConfig.text.secondary}`}>
                                  {t('imageService.cameras.maintenanceDesc')}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-sm ${themeConfig.text.secondary}`}>
                      {camera.lastPolledAt ? formatDateTime(camera.lastPolledAt, i18n.language) : '—'}
                    </td>
                    <td className={`px-4 py-3 text-sm text-right ${themeConfig.text.primary}`}>
                      {Number(camera.totalImagesCount ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handleScanCamera(camera.id)}
                          disabled={scanningCameras.has(camera.id)}
                          className="p-2 rounded-lg hover:bg-green-500/20">
                          <RefreshCw size={15} className={`${scanningCameras.has(camera.id) ? 'animate-spin text-green-400' : 'text-green-500'}`} />
                        </button>
                        <button onClick={() => openEdit(camera)}
                          className="p-2 rounded-lg hover:bg-yellow-500/20"><Edit size={15} className="text-yellow-500" /></button>
                        {canDelete && (
                          <button onClick={() => openDeleteModal(camera)}
                            className="p-2 rounded-lg hover:bg-red-500/20"
                            title={t('imageService.cameras.deleteCamera')}>
                            <Trash2 size={15} className="text-red-500" />
                          </button>
                        )}
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
            <div className="col-span-2">
              <label className={`block text-sm font-medium mb-1.5 ${themeConfig.text.primary}`}>
                {t('imageService.cameras.smbPath')} <span className="text-red-400">*</span>
              </label>
              <div className="flex gap-2">
                <input value={form.smbSharePath} onChange={e => setForm(p => ({ ...p, smbSharePath: e.target.value }))}
                  className={`flex-1 px-4 py-2.5 rounded-md ${themeConfig.inputBg} border ${themeConfig.inputBorder} ${themeConfig.text.primary}`} required />
                <button type="button" onClick={handleTestConnection} disabled={testResult.loading}
                  className={`px-3 py-2 rounded-md text-xs font-medium border ${themeConfig.inputBorder} ${themeConfig.text.primary} hover:bg-white/5`}>
                  {testResult.loading ? <RefreshCw size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                  <span className="ml-1 hidden sm:inline">{t('imageService.cameras.testConnection')}</span>
                </button>
                <button type="button" onClick={openBrowse}
                  className={`px-3 py-2 rounded-md text-xs font-medium border ${themeConfig.inputBorder} ${themeConfig.text.primary} hover:bg-white/5`}>
                  <FolderOpen size={14} /><span className="ml-1 hidden sm:inline">{t('common.browse')}</span>
                </button>
              </div>
              {testResult.message && (
                <p className={`text-xs mt-1 ${testResult.success ? 'text-green-400' : 'text-red-400'}`}>
                  {testResult.success ? <CheckCircle size={12} className="inline mr-1" /> : <XCircle size={12} className="inline mr-1" />}
                  {testResult.message}
                </p>
              )}
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
                {t('imageService.cameras.smbPassword')}
              </label>
              <input type="password" value={form.smbPasswordEncrypted}
                onChange={e => setForm(p => ({ ...p, smbPasswordEncrypted: e.target.value }))}
                className={`w-full px-4 py-2.5 rounded-md ${themeConfig.inputBg} border ${themeConfig.inputBorder} ${themeConfig.text.primary}`} />
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

      <Modal isOpen={browseOpen} onClose={() => setBrowseOpen(false)}
        title={t('imageService.cameras.browseSmb')}>
        <div className="max-h-80 overflow-y-auto p-1 space-y-1">
          {browseLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw size={20} className="animate-spin text-cyan-400" />
            </div>
          ) : browseStep === 'shares' ? (
            browseShares.length === 0 ? (
              <p className={`text-sm text-center py-4 ${themeConfig.text.secondary}`}>{t('common.noData')}</p>
            ) : (
              browseShares.map(s => (
                <button key={s.name} onClick={() => browseShare(s.name)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center justify-between hover:bg-white/5 ${themeConfig.text.primary}`}>
                  <span className="flex items-center gap-2"><FolderOpen size={15} />{s.name}</span>
                  <span className={`text-xs ${themeConfig.text.secondary}`}>{s.description}</span>
                </button>
              ))
            )
          ) : (
            <>
              <div className="flex items-center gap-1.5 mb-2 text-xs">
                <button onClick={goBackShares} className="text-cyan-400 hover:underline">{t('imageService.cameras.shares')}</button>
                <ChevronRight size={10} className={themeConfig.text.secondary} />
                <span className={themeConfig.text.secondary}>{browsePath}</span>
              </div>
              <button onClick={() => selectBrowsePath('')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm border border-dashed hover:bg-white/5 ${themeConfig.text.primary} ${themeConfig.inputBorder}`}>
                {t('imageService.cameras.useCurrentFolder')}
              </button>
              {browseItems.filter(e => e.isDirectory).map(e => (
                <div key={e.name} className="flex items-center gap-1">
                  <button onClick={() => browseFolder(e.name)}
                    className={`flex-1 text-left px-3 py-2 rounded-lg text-sm hover:bg-white/5 ${themeConfig.text.primary}`}>
                    <span className="flex items-center gap-2"><FolderOpen size={14} />{e.name}</span>
                  </button>
                  <button onClick={() => selectBrowsePath(e.name)}
                    className="px-2 py-2 rounded text-xs text-cyan-400 hover:bg-white/5"
                    title={t('common.select')}><CheckCircle size={14} /></button>
                </div>
              ))}
            </>
          )}
        </div>
      </Modal>

      {/* Delete Camera Confirmation Modal */}
      <Modal isOpen={deleteModal.open} onClose={() => { setDeleteModal({ open: false }); setDeletePassword(''); }}
        title={t('imageService.cameras.deleteCamera')}>
        <div className="space-y-4 p-1">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className={`text-sm ${themeConfig.text.primary}`}>
                {deleteModal.camera?.name}
              </p>
              <p className={`text-xs mt-1 ${themeConfig.text.secondary}`}>
                {t('imageService.cameras.deleteCameraConfirm')}
              </p>
            </div>
          </div>
          <input
            type="password"
            value={deletePassword}
            onChange={e => setDeletePassword(e.target.value)}
            placeholder={t('common.enterPassword')}
            className={`w-full px-3 py-2 rounded-md text-sm border ${themeConfig.inputBorder} ${themeConfig.inputBg} ${themeConfig.text.primary} focus:outline-none focus:ring-1 focus:ring-red-500/50`}
            onKeyDown={e => { if (e.key === 'Enter' && deletePassword) handleDeleteCamera(); }}
          />
          <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <Button variant="secondary" onClick={() => { setDeleteModal({ open: false }); setDeletePassword(''); }}>
              {t('common.cancel')}
            </Button>
            <button onClick={handleDeleteCamera} disabled={!deletePassword || deleting}
              className="px-4 py-2 rounded-md text-sm font-medium bg-red-600 hover:bg-red-700 text-white disabled:opacity-40 flex items-center gap-1.5 transition-colors">
              <Trash2 size={14} /> {deleting ? t('common.saving') : t('imageService.cameras.deleteCamera')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Camera Trash Modal */}
      <Modal isOpen={trashOpen} onClose={() => { setTrashOpen(false); setShowEmptyConfirm(false); setEmptyTrashPassword(''); }}
        title={t('imageService.cameras.cameraTrash')}>
        <div className="space-y-4 p-1">
          {trashLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw size={20} className="animate-spin text-cyan-400" />
            </div>
          ) : trashData.length > 0 ? (
            <>
              <p className={`text-xs ${themeConfig.text.secondary}`}>
                {t('imageService.cameras.cameraTrashCount', { count: trashData.length })}
              </p>
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full">
                  <thead className={themeConfig.tableHeader}>
                    <tr>
                      <th className={`px-3 py-2 text-left text-xs font-semibold ${themeConfig.text.primary}`}>{t('imageService.cameras.cameraName')}</th>
                      <th className={`px-3 py-2 text-left text-xs font-semibold ${themeConfig.text.primary}`}>{t('imageService.cameras.ipAddress')}</th>
                      <th className={`px-3 py-2 text-left text-xs font-semibold ${themeConfig.text.primary}`}>{t('imageService.cameras.deleteCamera')}</th>
                      <th className={`px-3 py-2 text-center text-xs font-semibold ${themeConfig.text.primary}`}>{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${themeConfig.tableDivide}`}>
                    {trashData.map((item: any) => (
                      <tr key={item.id} className={themeConfig.tableRow}>
                        <td className={`px-3 py-2 text-sm ${themeConfig.text.primary}`}>{item.name}</td>
                        <td className={`px-3 py-2 text-sm ${themeConfig.text.secondary}`}>{item.ipAddress}</td>
                        <td className={`px-3 py-2 text-xs ${themeConfig.text.secondary}`}>
                          {item.deletedAt ? formatDateTime(item.deletedAt, i18n.language) : '—'}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-center">
                            <button onClick={() => handleRestoreCamera(item.id)}
                              className="p-1.5 rounded-lg hover:bg-green-500/20 text-green-400"
                              title={t('imageService.cameras.restoreCamera')}>
                              <Undo2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {showEmptyConfirm && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <p className={`text-xs ${themeConfig.text.secondary}`}>
                      {t('imageService.cameras.emptyCameraTrashConfirm')}
                    </p>
                  </div>
                  <input
                    type="password"
                    value={emptyTrashPassword}
                    onChange={e => setEmptyTrashPassword(e.target.value)}
                    placeholder={t('common.enterPassword')}
                    className={`w-full px-3 py-2 rounded-md text-sm border ${themeConfig.inputBorder} ${themeConfig.inputBg} ${themeConfig.text.primary} focus:outline-none focus:ring-1 focus:ring-red-500/50`}
                    onKeyDown={e => { if (e.key === 'Enter' && emptyTrashPassword) handleEmptyCameraTrash(); }}
                  />
                  <div className="flex gap-2">
                    <button onClick={() => { setShowEmptyConfirm(false); setEmptyTrashPassword(''); }}
                      className={`px-3 py-1.5 rounded-md text-xs ${themeConfig.text.secondary} hover:bg-white/5`}>
                      {t('common.cancel')}
                    </button>
                    <button onClick={handleEmptyCameraTrash} disabled={!emptyTrashPassword}
                      className="px-3 py-1.5 rounded-md text-xs font-medium bg-red-600 hover:bg-red-700 text-white disabled:opacity-40 flex items-center gap-1.5">
                      <Trash2 size={12} /> {t('imageService.cameras.emptyCameraTrash')}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <Button variant="secondary" onClick={() => { setTrashOpen(false); setShowEmptyConfirm(false); setEmptyTrashPassword(''); }}>
                  {t('common.close')}
                </Button>
                {canDelete && !showEmptyConfirm && (
                  <button onClick={() => setShowEmptyConfirm(true)}
                    className="px-4 py-2 rounded-md text-sm font-medium bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5 transition-colors">
                    <Trash2 size={14} /> {t('imageService.cameras.emptyCameraTrash')}
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className={`text-center py-12 ${themeConfig.text.secondary}`}>
              <Trash2 size={48} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">{t('imageService.cameras.cameraTrashEmpty')}</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
