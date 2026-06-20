import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { imageServiceApi } from '@/services/imageServiceApi';
import { Save, RotateCcw, RefreshCw, Settings, Database, HardDrive, Server, Bell, Image } from 'lucide-react';
import { Button } from '@/components/ui';

const CATEGORIES = [
  { key: 'retention', icon: Database, label: 'Retention', color: 'text-blue-400 bg-blue-500/10' },
  { key: 'compression', icon: Image, label: 'Compression', color: 'text-purple-400 bg-purple-500/10' },
  { key: 'thumbnail', icon: HardDrive, label: 'Thumbnail', color: 'text-amber-400 bg-amber-500/10' },
  { key: 'polling', icon: RefreshCw, label: 'Polling', color: 'text-green-400 bg-green-500/10' },
  { key: 'alert', icon: Bell, label: 'Alert', color: 'text-red-400 bg-red-500/10' },
];

export default function SystemConfigPage() {
  const { t } = useTranslation();
  const { themeConfig } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const { data: configs, isLoading } = useQuery({
    queryKey: ['system-config'],
    queryFn: async () => {
      const data = await imageServiceApi.getSystemConfigs();
      const init: Record<string, string> = {};
      for (const [key, cfg] of Object.entries(data)) {
        init[key] = String((cfg as any).value ?? '');
      }
      setValues(init);
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, string>) => imageServiceApi.updateSystemConfigs(data),
    onSuccess: () => {
      toast.success(t('common.saveSuccess'));
      queryClient.invalidateQueries({ queryKey: ['system-config'] });
    },
    onError: () => toast.error(t('common.error')),
  });

  const handleSave = () => {
    setSaving(true);
    saveMutation.mutate(values, { onSettled: () => setSaving(false) });
  };

  const handleReset = () => {
    if (configs) {
      const reset: Record<string, string> = {};
      for (const [key, cfg] of Object.entries(configs)) {
        reset[key] = String((cfg as any).value ?? '');
      }
      setValues(reset);
    }
  };

  const inputClass = `w-full px-3 py-2 rounded-md text-sm border ${themeConfig.inputBorder} ${themeConfig.inputBg} ${themeConfig.text.primary} focus:outline-none focus:ring-1 focus:ring-cyan-500/50`;

  const grouped: Record<string, [string, any][]> = {};
  if (configs) {
    for (const [key, cfg] of Object.entries(configs)) {
      const cat = (cfg as any).category ?? 'other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push([key, cfg]);
    }
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <p className={`text-xs font-medium uppercase tracking-widest ${themeConfig.text.secondary}`}>
          Image Service · System Config
        </p>
        <h1 className={`text-2xl font-bold ${themeConfig.text.primary}`}>System Configuration</h1>
        <p className={`text-sm mt-1 ${themeConfig.text.secondary}`}>
          Configure business rule thresholds and system parameters
        </p>
      </div>

      {isLoading ? (
        <div className={`${themeConfig.card} rounded-lg p-8 text-center text-sm ${themeConfig.text.secondary}`}>Loading...</div>
      ) : (
        <>
          {CATEGORIES.map(cat => {
            const items = grouped[cat.key];
            if (!items || items.length === 0) return null;
            const Icon = cat.icon;
            return (
              <div key={cat.key} className={`${themeConfig.card} rounded-lg p-6 mb-5`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-lg ${cat.color}`}>
                    <Icon size={18} />
                  </div>
                  <h3 className={`text-sm font-semibold ${themeConfig.text.primary}`}>{cat.label}</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {items.map(([key, cfg]) => (
                    <div key={key}>
                      <label className={`block text-sm font-medium mb-1.5 ${themeConfig.text.primary}`}>
                        {key.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </label>
                      <input type={(cfg as any).valueType === 'number' ? 'number' : 'text'}
                        value={values[key] ?? ''}
                        onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))}
                        className={inputClass} />
                      <p className={`text-xs mt-0.5 ${themeConfig.text.secondary}`}>{(cfg as any).description}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={saving}>
              <Save size={16} className="mr-1.5" />
              {saving ? t('common.saving') : t('common.save')}
            </Button>
            <Button variant="secondary" onClick={handleReset}>
              <RotateCcw size={16} className="mr-1.5" />
              Reset
            </Button>
            <Button variant="secondary" onClick={() => queryClient.invalidateQueries({ queryKey: ['system-config'] })}>
              <RefreshCw size={16} className="mr-1.5" />
              Refresh
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
