import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { imageServiceApi } from '@/services/imageServiceApi';
import { formatDateTime } from '@/utils/dateUtils';
import { Modal, Button, SearchableSelect, TableSkeleton } from '@/components/ui';
import {
  Search, ChevronUp, ChevronDown, ChevronsUpDown, Eye, Trash2,
  Download, Image, FileImage, Tag, Info, X, Filter, Plus,
} from 'lucide-react';

const FILE_TYPE_ORDER: Record<string, number> = { raw: 0, thumbnail: 1, processed: 2 };

const IMAGE_STATUS_COLORS: Record<string, string> = {
  completed: 'bg-green-500/20 text-green-400',
  processing: 'bg-blue-500/20 text-blue-400',
  pending: 'bg-yellow-500/20 text-yellow-400',
  failed: 'bg-red-500/20 text-red-400',
  deleted: 'bg-gray-500/20 text-gray-400',
  queued: 'bg-cyan-500/20 text-cyan-400',
};

export default function ImageServiceSearch() {
  const { t, i18n } = useTranslation();
  const { themeConfig } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [cameraId, setCameraId] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sortCol, setSortCol] = useState('capturedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [tagKey, setTagKey] = useState('');
  const [tagValue, setTagValue] = useState('');
  const [newTagKey, setNewTagKey] = useState('');
  const [newTagValue, setNewTagValue] = useState('');
  const [thumbError, setThumbError] = useState(false);
  const [thumbSrc, setThumbSrc] = useState<string | null>(null);

  const { data: cameras = [] } = useQuery({
    queryKey: ['cameras'],
    queryFn: () => imageServiceApi.getCameras(),
    staleTime: 1000 * 60 * 5,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['images', page, search, cameraId, status, from, to, tagKey, tagValue, sortCol, sortDir],
    queryFn: async () => {
      const res = await imageServiceApi.getImages({
        page, limit: 20, cameraId: cameraId || undefined,
        status: status || undefined, q: search || undefined,
        from: from || undefined, to: to || undefined,
        tagKey: tagKey || undefined, tagValue: tagValue || undefined,
        sort: sortCol, order: sortDir,
      });
      return {
        items: res.data ?? [],
        total: res.pagination?.total ?? 0,
        totalPages: res.pagination?.totalPages ?? 0,
      };
    },
    staleTime: 1000 * 30,
    placeholderData: (prev) => prev,
  });

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 0;

  const { data: detail } = useQuery({
    queryKey: ['image-detail', detailId],
    queryFn: () => { setThumbError(false); setThumbSrc(null); return imageServiceApi.getImage(detailId!); },
    enabled: !!detailId,
  });

  useEffect(() => {
    if (!detail?.id || !detail.imageFiles?.some((f: any) => f.fileType === 'thumbnail')) return;
    let cancelled = false;
    const blobUrls: string[] = [];
    (async () => {
      try {
        const blob = await imageServiceApi.getImageFileBlob(detail.id, 'thumbnail');
        if (!cancelled) { const url = URL.createObjectURL(blob); blobUrls.push(url); setThumbSrc(url); }
      } catch { if (!cancelled) setThumbError(true); }
    })();
    return () => { cancelled = true; blobUrls.forEach(u => URL.revokeObjectURL(u)); };
  }, [detail?.id]);

  const handleSort = (col: string) => {
    if (col === 'actions' || col === 'no') return;
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
    setPage(1);
  };

  const handleDownload = useCallback(async (id: string, fileType: string) => {
    const token = localStorage.getItem('accessToken');
    const base = (window as any).__API_BASE__ ?? '/image-service';
    try {
      const res = await fetch(`${base}/api/v1/images/${id}/files/${fileType}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) {
        if (res.status === 500) toast.error(t('imageService.search.fileExpired'));
        else toast.error(t('common.error'));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${id}-${fileType}.tif`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t('common.error'));
    }
  }, [t, toast]);

  const handleDelete = async (id: string) => {
    try {
      await imageServiceApi.deleteImage(id);
      toast.success(t('imageService.search.deleteSuccess'));
      queryClient.invalidateQueries({ queryKey: ['images'] });
    } catch { toast.error(t('common.error')); }
  };

  const thCls = (col: string) =>
    `px-4 py-3 text-left text-sm font-semibold cursor-pointer select-none hover:text-cyan-300 ${themeConfig.text.primary}`;

  const statusOptions = ['pending', 'queued', 'processing', 'completed', 'failed', 'deleted', 'archived'].map(s => ({
    value: s, label: t(`common.${s}`) ?? s,
  }));

  return (
    <div className="p-6">
      <div className="mb-6">
        <p className={`text-xs font-medium uppercase tracking-widest ${themeConfig.text.secondary}`}>
          Image Service · {t('imageService.search.title')}
        </p>
        <h1 className={`text-2xl font-bold ${themeConfig.text.primary}`}>{t('imageService.search.title')}</h1>
        <p className={`text-sm mt-1 ${themeConfig.text.secondary}`}>{t('imageService.search.subtitle')}</p>
      </div>

      <div className={`${themeConfig.card} rounded-lg p-4 mb-5`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${themeConfig.text.secondary}`} />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder={t('imageService.search.searchPlaceholder')}
              className={`w-full pl-9 pr-3 py-2 rounded-md text-sm border ${themeConfig.inputBorder} ${themeConfig.inputBg} ${themeConfig.text.primary} focus:outline-none focus:ring-1 focus:ring-cyan-500/50`} />
          </div>
          <div className="w-44">
            <SearchableSelect value={cameraId} onChange={v => { setCameraId(v); setPage(1); }}
              placeholder={t('imageService.search.allCameras')}
              options={cameras.map((c: any) => ({ value: c.id, label: c.name }))} />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 rounded-md text-xs flex items-center gap-1.5 border ${themeConfig.inputBorder} ${themeConfig.text.primary}`}>
            <Filter size={13} /> {t('imageService.search.filter')}
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t" style={{ borderColor: trackColor }}>
            <div className="w-40">
              <SearchableSelect value={status} onChange={v => { setStatus(v); setPage(1); }}
                placeholder={t('imageService.search.allStatus')} options={statusOptions} />
            </div>
            <div>
              <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }}
                className={`px-3 py-2 rounded-md text-sm border ${themeConfig.inputBorder} ${themeConfig.inputBg} ${themeConfig.text.primary}`} />
            </div>
            <span className={`text-xs ${themeConfig.text.secondary}`}>—</span>
            <div>
              <input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1); }}
                className={`px-3 py-2 rounded-md text-sm border ${themeConfig.inputBorder} ${themeConfig.inputBg} ${themeConfig.text.primary}`} />
            </div>
            <div className="w-32">
              <input value={tagKey} onChange={e => { setTagKey(e.target.value); setPage(1); }}
                placeholder={t('imageService.search.tagKey')}
                className={`w-full px-3 py-2 rounded-md text-sm border ${themeConfig.inputBorder} ${themeConfig.inputBg} ${themeConfig.text.primary}`} />
            </div>
            <div className="w-32">
              <input value={tagValue} onChange={e => { setTagValue(e.target.value); setPage(1); }}
                placeholder={t('imageService.search.tagValue')}
                className={`w-full px-3 py-2 rounded-md text-sm border ${themeConfig.inputBorder} ${themeConfig.inputBg} ${themeConfig.text.primary}`} />
            </div>
            {(tagKey || tagValue) && (
              <button onClick={() => { setTagKey(''); setTagValue(''); setPage(1); }}
                className="px-2 py-2 rounded-md text-xs text-red-400 hover:bg-red-500/10">
                <X size={13} />
              </button>
            )}
          </div>
        )}
      </div>

      {isLoading ? <TableSkeleton rows={8} /> : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={themeConfig.tableHeader}>
                <tr>
                  <th className={`px-4 py-3 text-left text-sm font-semibold ${themeConfig.text.primary}`}>#</th>
                  <th onClick={() => handleSort('originalFilename')} className={thCls('originalFilename')}>
                    <div className="flex items-center gap-1">{t('imageService.cameras.cameraName')}
                      {sortCol === 'originalFilename' ? sortDir === 'asc' ? <ChevronUp size={11} className="text-cyan-400" /> : <ChevronDown size={11} className="text-cyan-400" /> : <ChevronsUpDown size={11} className="opacity-25" />}</div>
                  </th>
                  <th className={`px-4 py-3 text-left text-sm font-semibold ${themeConfig.text.primary}`}>{t('imageService.cameras.status')}</th>
                  <th onClick={() => handleSort('fileSizeBytes')} className={thCls('fileSizeBytes')}>
                    <div className="flex items-center gap-1">{t('imageService.storage.totalSize')}
                      {sortCol === 'fileSizeBytes' ? sortDir === 'asc' ? <ChevronUp size={11} className="text-cyan-400" /> : <ChevronDown size={11} className="text-cyan-400" /> : <ChevronsUpDown size={11} className="opacity-25" />}</div>
                  </th>
                  <th className={`px-4 py-3 text-left text-sm font-semibold ${themeConfig.text.primary}`}>
                    {t('imageService.search.processedSize')}
                  </th>
                  <th onClick={() => handleSort('capturedAt')} className={thCls('capturedAt')}>
                    <div className="flex items-center gap-1">{t('imageService.search.fromDate')}
                      {sortCol === 'capturedAt' ? sortDir === 'asc' ? <ChevronUp size={11} className="text-cyan-400" /> : <ChevronDown size={11} className="text-cyan-400" /> : <ChevronsUpDown size={11} className="opacity-25" />}</div>
                  </th>
                  <th className={`px-4 py-3 text-center text-sm font-semibold ${themeConfig.text.primary}`}>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${themeConfig.tableDivide}`}>
                {items.map((item: any, idx: number) => (
                  <tr key={item.id} className={`border-b ${themeConfig.tableBorder} ${themeConfig.tableRow}`}>
                    <td className={`px-4 py-3 text-sm ${themeConfig.text.primary}`}>{(page - 1) * 20 + idx + 1}</td>
                    <td className={`px-4 py-3 text-sm ${themeConfig.text.primary}`}>{item.originalFilename}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${IMAGE_STATUS_COLORS[item.status] ?? 'bg-gray-500/20 text-gray-400'}`}>
                        {t('common.' + item.status) ?? item.status}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-sm ${themeConfig.text.secondary}`}>
                      {item.fileSizeBytes ? (item.fileSizeBytes / 1024 / 1024).toFixed(1) + ' MB' : '—'}
                    </td>
                    <td className={`px-4 py-3 text-sm ${themeConfig.text.secondary}`}>
                      {item.processedFileSizeBytes ? (item.processedFileSizeBytes / 1024 / 1024).toFixed(1) + ' MB' : '—'}
                    </td>
                    <td className={`px-4 py-3 text-sm ${themeConfig.text.secondary}`}>
                      {item.capturedAt ? formatDateTime(item.capturedAt, i18n.language) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setDetailId(item.id)}
                          className="p-2 rounded-lg hover:bg-blue-500/20"><Eye size={15} className="text-blue-500" /></button>
                        <button onClick={() => handleDelete(item.id)}
                          className="p-2 rounded-lg hover:bg-red-500/20"><Trash2 size={15} className="text-red-500" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {items.length === 0 && (
            <div className={`text-center py-12 ${themeConfig.text.secondary} text-sm`}>
              {t('imageService.search.noResults')}
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

      <Modal isOpen={!!detailId} onClose={() => setDetailId(null)} title={t('imageService.search.imageDetail')}>
        {detail && (
          <div className="space-y-5 p-1 max-w-2xl">
            <div className="flex items-center gap-4">
              <div className="w-32 h-32 rounded-lg overflow-hidden flex-shrink-0">
                {thumbSrc
                  ? <img src={thumbSrc}
                      alt={detail.originalFilename}
                      className="w-full h-full object-cover"
                      onError={() => { setThumbSrc(null); setThumbError(true); }} />
                  : thumbError
                    ? <div className="w-32 h-32 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                        <Image size={48} className="text-cyan-400/60" />
                      </div>
                    : <div className="w-32 h-32 rounded-lg bg-white/5 flex items-center justify-center">
                        <div className="animate-pulse w-8 h-8 rounded-full bg-white/10" />
                      </div>}
              </div>
              <div className="flex-1">
                <h3 className={`text-lg font-semibold ${themeConfig.text.primary}`}>{detail.originalFilename}</h3>
                <p className={`text-xs ${themeConfig.text.secondary}`}>ID: {detail.id}</p>
                <span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${IMAGE_STATUS_COLORS[detail.status]}`}>{t('common.' + detail.status) ?? detail.status}</span>
              </div>
            </div>

            <div>
              <h4 className={`text-sm font-semibold mb-2 flex items-center gap-1.5 ${themeConfig.text.primary}`}>
                <Info size={14} /> {t('imageService.search.metadata')}
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  [t('imageService.search.dimensions'), detail.widthPx && detail.heightPx ? `${detail.widthPx} × ${detail.heightPx}` : '—'],
                  [t('imageService.search.bitDepth'), detail.bitDepth ?? '—'],
                  [t('imageService.search.colorSpace'), detail.colorSpace ?? '—'],
                  [t('imageService.search.compression'), detail.compressionType ?? '—'],
                  [t('imageService.search.fileSize'), detail.fileSizeBytes ? (detail.fileSizeBytes / 1024 / 1024).toFixed(2) + ` ${t('common.mb')}` : '—'],
                  [t('imageService.search.sha256'), detail.checksumSha256 ? detail.checksumSha256.slice(0, 16) + '...' : '—'],
                  [t('imageService.search.captured'), detail.capturedAt ? formatDateTime(detail.capturedAt, i18n.language) : '—'],
                  [t('imageService.search.processed'), detail.processedAt ? formatDateTime(detail.processedAt, i18n.language) : '—'],
                ].map(([k, v], i) => (
                  <div key={i} className={`px-3 py-2 rounded-lg ${themeConfig.card}`}>
                    <span className={themeConfig.text.secondary}>{k}</span>
                    <p className={`font-medium mt-0.5 ${themeConfig.text.primary}`}>{v}</p>
                  </div>
                ))}
              </div>
            </div>

            {detail.imageFiles?.length > 0 && (
              <div>
                <h4 className={`text-sm font-semibold mb-2 flex items-center gap-1.5 ${themeConfig.text.primary}`}>
                  <FileImage size={14} /> {t('imageService.search.files')}
                </h4>
                <div className="flex gap-2 flex-wrap">
                  {[...detail.imageFiles].sort((a: any, b: any) =>
                    (FILE_TYPE_ORDER[a.fileType] ?? 99) - (FILE_TYPE_ORDER[b.fileType] ?? 99)
                  ).map((f: any) => (
                    <button key={f.id} onClick={() => handleDownload(detail.id, f.fileType)}
                      className={`px-3 py-2 rounded-md text-xs flex items-center gap-1.5 border ${themeConfig.inputBorder} ${themeConfig.text.primary} hover:bg-white/5 transition-colors cursor-pointer`}>
                      <Download size={12} /> {t(`imageService.search.fileType${f.fileType.charAt(0).toUpperCase() + f.fileType.slice(1)}`)}
                      {f.fileSizeBytes ? ` (${(f.fileSizeBytes / 1024 / 1024).toFixed(1)} MB)` : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className={`text-sm font-semibold mb-2 flex items-center gap-1.5 ${themeConfig.text.primary}`}>
                <Tag size={14} /> {t('imageService.search.tags')}
              </h4>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {(detail.imageTags ?? []).map((tag: any) => (
                    <span key={tag.key} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-cyan-500/10 text-cyan-400">
                      {tag.key}: {tag.value}
                      <button onClick={async () => {
                        try {
                          await imageServiceApi.deleteImageTag(detail.id, tag.key);
                          toast.success(t('imageService.search.tagDeleted'));
                          queryClient.invalidateQueries({ queryKey: ['image-detail', detailId] });
                          queryClient.invalidateQueries({ queryKey: ['images'] });
                        } catch { toast.error(t('common.error')); }
                      }}
                        className="hover:text-red-400 transition-colors">
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input value={newTagKey} onChange={e => setNewTagKey(e.target.value)}
                    placeholder={t('imageService.search.tagKeyPlaceholder')}
                    className={`w-28 px-2 py-1.5 rounded-md text-xs border ${themeConfig.inputBorder} ${themeConfig.inputBg} ${themeConfig.text.primary} focus:outline-none focus:ring-1 focus:ring-cyan-500/50`} />
                  <input value={newTagValue} onChange={e => setNewTagValue(e.target.value)}
                    placeholder={t('imageService.search.tagValuePlaceholder')}
                    className={`w-32 px-2 py-1.5 rounded-md text-xs border ${themeConfig.inputBorder} ${themeConfig.inputBg} ${themeConfig.text.primary} focus:outline-none focus:ring-1 focus:ring-cyan-500/50`}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter' && newTagKey && newTagValue) {
                        try {
                          await imageServiceApi.upsertImageTags(detail.id, { [newTagKey]: newTagValue });
                          toast.success(t('imageService.search.tagAdded'));
                          setNewTagKey('');
                          setNewTagValue('');
                          queryClient.invalidateQueries({ queryKey: ['image-detail', detailId] });
                          queryClient.invalidateQueries({ queryKey: ['images'] });
                        } catch { toast.error(t('common.error')); }
                      }
                    }} />
                  <button onClick={async () => {
                    if (!newTagKey || !newTagValue) return;
                    try {
                      await imageServiceApi.upsertImageTags(detail.id, { [newTagKey]: newTagValue });
                      toast.success(t('imageService.search.tagAdded'));
                      setNewTagKey('');
                      setNewTagValue('');
                      queryClient.invalidateQueries({ queryKey: ['image-detail', detailId] });
                      queryClient.invalidateQueries({ queryKey: ['images'] });
                    } catch { toast.error(t('common.error')); }
                  }}
                    className="p-1.5 rounded-md bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors disabled:opacity-30"
                    disabled={!newTagKey || !newTagValue}>
                    <Plus size={13} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: trackColor }}>
              <Button variant="secondary" onClick={() => setDetailId(null)}>{t('common.close')}</Button>
              <Button onClick={() => handleDelete(detail.id)} className="!bg-red-600 hover:!bg-red-700 text-white">
                <Trash2 size={14} className="mr-1.5" /> {t('imageService.search.deleteImage')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

const trackColor = 'rgba(255,255,255,0.08)';
