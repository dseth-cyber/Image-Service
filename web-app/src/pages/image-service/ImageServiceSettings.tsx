import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { imageServiceApi } from '@/services/imageServiceApi';
import {
  Save, RotateCcw, Eye, EyeOff, RefreshCw, Bell,
  Shield, Database, Server,
} from 'lucide-react';
import { Button } from '@/components/ui';

const SETTINGS_KEY = 'image-service-settings';

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

function saveSettings(settings: Record<string, unknown>) {
  const existing = loadSettings();
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...existing, ...settings }));
}

export default function ImageServiceSettings() {
  const { t, i18n } = useTranslation();
  const { themeConfig, theme, setTheme } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [pollInterval, setPollInterval] = useState(() => loadSettings().pollInterval ?? 30);
  const [retryMax, setRetryMax] = useState(() => loadSettings().retryMax ?? 3);
  const [alertEmail, setAlertEmail] = useState(() => loadSettings().alertEmail ?? '');
  const [webhookUrl, setWebhookUrl] = useState(() => loadSettings().webhookUrl ?? '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: overview } = useQuery({
    queryKey: ['image-service-overview'],
    queryFn: () => imageServiceApi.getOverview(),
    staleTime: 1000 * 60 * 5,
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts-settings'],
    queryFn: () => imageServiceApi.getAlerts(),
    staleTime: 1000 * 60,
  });

  const alertsArr = Array.isArray(alerts?.data) ? alerts.data : (Array.isArray(alerts) ? alerts : []);

  const handleSaveGeneral = async () => {
    try {
      setSaving(true);
      saveSettings({ pollInterval, retryMax, alertEmail, webhookUrl });
      toast.success(t('common.saveSuccess'));
    } catch { toast.error(t('common.error')); }
    finally { setSaving(false); }
  };

  const handleResetAll = () => {
    localStorage.removeItem('image_service_overview_layout_v1');
    localStorage.removeItem('image-service-theme');
    localStorage.removeItem('i18nextLng');
    localStorage.removeItem(SETTINGS_KEY);
    setPollInterval(30);
    setRetryMax(3);
    setAlertEmail('');
    setWebhookUrl('');
    setTheme('modern');
    i18n.changeLanguage('th');
    queryClient.invalidateQueries();
    toast.success(t('imageService.settings.resetSuccess'));
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <p className={`text-xs font-medium uppercase tracking-widest ${themeConfig.text.secondary}`}>
          Image Service · {t('imageService.settings.title')}
        </p>
        <h1 className={`text-2xl font-bold ${themeConfig.text.primary}`}>{t('imageService.settings.title')}</h1>
        <p className={`text-sm mt-1 ${themeConfig.text.secondary}`}>{t('imageService.settings.subtitle')}</p>
      </div>



      {/* Notification */}
      <div className={`${themeConfig.card} rounded-lg p-6 mb-5`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-cyan-500/10">
            <Bell size={18} className="text-cyan-400" />
          </div>
          <div>
            <h3 className={`text-sm font-semibold ${themeConfig.text.primary}`}>{t('imageService.settings.notifications')}</h3>
            <p className={`text-xs ${themeConfig.text.secondary}`}>{t('imageService.settings.notificationsDesc')}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${themeConfig.text.primary}`}>Email {t('imageService.settings.alertEmail')}</label>
            <input value={alertEmail} onChange={e => setAlertEmail(e.target.value)}
              placeholder="admin@example.com"
              className={`w-full px-4 py-2.5 rounded-md text-sm border ${themeConfig.inputBorder} ${themeConfig.inputBg} ${themeConfig.text.primary} focus:outline-none focus:ring-1 focus:ring-cyan-500/50`} />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${themeConfig.text.primary}`}>Webhook URL</label>
            <input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)}
              placeholder="https://hooks.example.com/alerts"
              className={`w-full px-4 py-2.5 rounded-md text-sm border ${themeConfig.inputBorder} ${themeConfig.inputBg} ${themeConfig.text.primary} focus:outline-none focus:ring-1 focus:ring-cyan-500/50`} />
          </div>
        </div>
      </div>

      {/* Processing */}
      <div className={`${themeConfig.card} rounded-lg p-6 mb-5`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-amber-500/10">
            <Server size={18} className="text-amber-400" />
          </div>
          <div>
            <h3 className={`text-sm font-semibold ${themeConfig.text.primary}`}>{t('imageService.settings.processing')}</h3>
            <p className={`text-xs ${themeConfig.text.secondary}`}>{t('imageService.settings.processingDesc')}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${themeConfig.text.primary}`}>{t('imageService.settings.pollInterval')}</label>
            <input type="number" value={pollInterval} onChange={e => setPollInterval(parseInt(e.target.value) || 30)}
              min={5} max={300}
              className={`w-full px-4 py-2.5 rounded-md text-sm border ${themeConfig.inputBorder} ${themeConfig.inputBg} ${themeConfig.text.primary} focus:outline-none focus:ring-1 focus:ring-cyan-500/50`} />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${themeConfig.text.primary}`}>{t('imageService.settings.retryMax')}</label>
            <input type="number" value={retryMax} onChange={e => setRetryMax(parseInt(e.target.value) || 3)}
              min={0} max={10}
              className={`w-full px-4 py-2.5 rounded-md text-sm border ${themeConfig.inputBorder} ${themeConfig.inputBg} ${themeConfig.text.primary} focus:outline-none focus:ring-1 focus:ring-cyan-500/50`} />
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className={`${themeConfig.card} rounded-lg p-6 mb-5`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Database size={18} className="text-blue-400" />
          </div>
          <div>
            <h3 className={`text-sm font-semibold ${themeConfig.text.primary}`}>{t('imageService.settings.systemInfo')}</h3>
            <p className={`text-xs ${themeConfig.text.secondary}`}>{t('imageService.settings.systemInfoDesc')}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className={themeConfig.text.secondary}>{t('imageService.settings.totalImages')}:</span>
            <span className={`ml-2 font-medium ${themeConfig.text.primary}`}>{overview?.totalImages?.toLocaleString() ?? '—'}</span>
          </div>
          <div>
            <span className={themeConfig.text.secondary}>{t('imageService.settings.activeCameras')}:</span>
            <span className={`ml-2 font-medium ${themeConfig.text.primary}`}>{overview?.activeCameras ?? '—'}</span>
          </div>
          <div>
            <span className={themeConfig.text.secondary}>{t('imageService.settings.totalAlerts')}:</span>
            <span className={`ml-2 font-medium ${themeConfig.text.primary}`}>{alertsArr.length}</span>
          </div>
          <div>
            <span className={themeConfig.text.secondary}>API Key:</span>
            <span className={`ml-2 font-mono text-xs ${themeConfig.text.primary}`}>
              {showApiKey ? 'sk-••••••••••••••••' : '••••••••••••••••'}
              <button onClick={() => setShowApiKey(!showApiKey)} className="ml-1 align-middle">
                {showApiKey ? <EyeOff size={13} className="text-gray-400" /> : <Eye size={13} className="text-gray-400" />}
              </button>
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSaveGeneral} disabled={saving}>
          <Save size={16} className="mr-1.5" />
          {saving ? t('common.saving') : t('common.save')}
        </Button>
        <Button variant="secondary" onClick={() => queryClient.invalidateQueries()}>
          <RefreshCw size={16} className="mr-1.5" />
          {t('imageService.settings.refreshData')}
        </Button>
        <Button variant="secondary" onClick={handleResetAll} className="text-red-400 border-red-500/30 hover:bg-red-500/10 ml-auto">
          <RotateCcw size={16} className="mr-1.5" />
          {t('imageService.settings.resetAll')}
        </Button>
      </div>
    </div>
  );
}
