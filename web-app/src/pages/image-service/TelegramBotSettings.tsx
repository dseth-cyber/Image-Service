import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { imageServiceApi } from '@/services/imageServiceApi';
import { Save, Send, Eye, EyeOff, MessageCircle, ExternalLink, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui';

const SETTINGS_KEY = 'image-service-telegram-settings';

export default function TelegramBotSettings() {
  const { t } = useTranslation();
  const { themeConfig } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['telegram-settings'],
    queryFn: async () => {
      const data = await imageServiceApi.getTelegramSettings();
      setBotToken(data.telegram_bot_token ?? '');
      setChatId(data.telegram_chat_id ?? '');
      setApiBaseUrl(data.telegram_api_base_url ?? '');
      setApiToken(data.telegram_api_token ?? '');
      return data;
    },
    staleTime: 1000 * 60,
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => imageServiceApi.updateTelegramSettings(data),
    onSuccess: () => {
      toast.success(t('common.saveSuccess'));
      queryClient.invalidateQueries({ queryKey: ['telegram-settings'] });
    },
    onError: (e: any) => { if (!e?._handled) toast.error(t('common.error')); },
  });

  const handleSave = () => {
    setSaving(true);
    saveMutation.mutate({
      telegram_bot_token: botToken,
      telegram_chat_id: chatId,
      telegram_api_base_url: apiBaseUrl,
      telegram_api_token: apiToken,
    }, { onSettled: () => setSaving(false) });
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const text = '✅ *Image Service* — Test connection successful!';
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
      });
      if (res.ok) {
        setTestResult({ ok: true, message: 'Message sent successfully! Check your Telegram group.' });
      } else {
        const err = await res.text();
        setTestResult({ ok: false, message: `Failed: ${err}` });
      }
    } catch (err: any) {
      setTestResult({ ok: false, message: err.message ?? 'Connection failed' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <p className={`text-xs font-medium uppercase tracking-widest ${themeConfig.text.secondary}`}>
          Image Service · {t('imageService.telegramBot.title')}
        </p>
        <h1 className={`text-2xl font-bold ${themeConfig.text.primary}`}>{t('imageService.telegramBot.title')}</h1>
        <p className={`text-sm mt-1 ${themeConfig.text.secondary}`}>
          {t('imageService.telegramBot.subtitle')}
        </p>
      </div>

      <div className={`${themeConfig.card} rounded-lg p-6 mb-5`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-sky-500/10">
            <MessageCircle size={18} className="text-sky-400" />
          </div>
          <div>
            <h3 className={`text-sm font-semibold ${themeConfig.text.primary}`}>{t('imageService.telegramBot.botConfiguration')}</h3>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${themeConfig.text.primary}`}>{t('imageService.telegramBot.botToken')}</label>
            <div className="relative">
              <input value={botToken} onChange={e => setBotToken(e.target.value)}
                type={showToken ? 'text' : 'password'} autoComplete="off"
                placeholder="1234567890:ABCdefGHIjklmNOPqrSTUvwxYZ"
                autoComplete="off" data-1p-ignore data-lpignore="true" data-form-type="other"
                className={`w-full px-4 py-2.5 rounded-md text-sm border font-mono ${themeConfig.inputBorder} ${themeConfig.inputBg} ${themeConfig.text.primary} focus:outline-none focus:ring-1 focus:ring-cyan-500/50 pr-10`} />
              <button onClick={() => setShowToken(!showToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1.5 ${themeConfig.text.primary}`}>{t('imageService.telegramBot.groupChatId')}</label>
            <input value={chatId} onChange={e => setChatId(e.target.value)}
              placeholder="-1003722831807"
              className={`w-full px-4 py-2.5 rounded-md text-sm border font-mono ${themeConfig.inputBorder} ${themeConfig.inputBg} ${themeConfig.text.primary} focus:outline-none focus:ring-1 focus:ring-cyan-500/50`} />
            <p className={`text-xs mt-1 ${themeConfig.text.secondary}`}>
              {t('imageService.telegramBot.groupIdHint')}
            </p>
          </div>

          <div className="border-t border-gray-700/30 pt-4 mt-6">
            <h4 className={`text-sm font-semibold mb-3 ${themeConfig.text.primary}`}>{t('imageService.telegramBot.callbackSettings')}</h4>

            <div className="mb-4">
              <label className={`block text-sm font-medium mb-1.5 ${themeConfig.text.primary}`}>{t('imageService.telegramBot.apiBaseUrl')}</label>
              <input value={apiBaseUrl} onChange={e => setApiBaseUrl(e.target.value)}
                placeholder="http://backend:3000"
                className={`w-full px-4 py-2.5 rounded-md text-sm border font-mono ${themeConfig.inputBorder} ${themeConfig.inputBg} ${themeConfig.text.primary} focus:outline-none focus:ring-1 focus:ring-cyan-500/50`} />
              <p className={`text-xs mt-1 ${themeConfig.text.secondary}`}>
                {t('imageService.telegramBot.apiBaseUrlHint')}
              </p>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1.5 ${themeConfig.text.primary}`}>{t('imageService.telegramBot.apiToken')}</label>
              <div className="relative">
                <input value={apiToken} onChange={e => setApiToken(e.target.value)}
                  type={showToken ? 'text' : 'password'} autoComplete="off"
                  placeholder="sk_..."
                  className={`w-full px-4 py-2.5 rounded-md text-sm border font-mono ${themeConfig.inputBorder} ${themeConfig.inputBg} ${themeConfig.text.primary} focus:outline-none focus:ring-1 focus:ring-cyan-500/50 pr-10`} />
                <button onClick={() => setShowToken(!showToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className={`text-xs mt-1 ${themeConfig.text.secondary}`}>
                {t('imageService.telegramBot.apiTokenHint')}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className={`${themeConfig.card} rounded-lg p-6 mb-5`}>
        <h4 className={`text-sm font-semibold mb-3 ${themeConfig.text.primary}`}>{t('imageService.telegramBot.howToGetToken')}</h4>
        <ol className={`text-sm space-y-2 ${themeConfig.text.secondary} list-decimal list-inside`}>
          <li>{t('imageService.telegramBot.step1')}</li>
          <li>{t('imageService.telegramBot.step2')}</li>
          <li>{t('imageService.telegramBot.step3')}</li>
          <li>{t('imageService.telegramBot.step4')}</li>
          <li>{t('imageService.telegramBot.step5')}</li>
        </ol>
      </div>

      {testResult && (
        <div className={`mb-5 px-4 py-3 rounded-lg flex items-center gap-2 ${testResult.ok ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
          {testResult.ok ? <CheckCircle size={16} /> : <XCircle size={16} />}
          <span className="text-sm">{testResult.message}</span>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          <Save size={16} className="mr-1.5" />
          {saving ? t('common.saving') : t('common.save')}
        </Button>
        <Button variant="secondary" onClick={handleTestConnection} disabled={testing || !botToken || !chatId}>
          <Send size={16} className="mr-1.5" />
          {testing ? t('imageService.telegramBot.testing') : t('imageService.telegramBot.testConnection')}
        </Button>
      </div>
    </div>
  );
}
