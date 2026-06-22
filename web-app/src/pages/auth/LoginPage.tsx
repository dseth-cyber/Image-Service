import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { Camera, Eye, EyeOff, LogIn } from 'lucide-react'

export default function LoginPage({ logoBase64 }: { logoBase64?: string }) {
  const { t } = useTranslation()
  const { themeConfig } = useTheme()
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!username || !password) { setError(t('imageService.auth.required')); return }
    setLoading(true)
    try {
      await login(username, password)
      navigate('/image-service/overview', { replace: true })
    } catch {
      setError(t('imageService.auth.invalid'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`min-h-screen flex items-center justify-center ${themeConfig.background}`}>
      <div className={`w-full max-w-sm p-8 rounded-xl ${themeConfig.card}`}>
        <div className="flex items-center justify-center gap-2 mb-2">
          {logoBase64 ? (
            <img src={logoBase64} alt="Logo" className="h-9 w-9 rounded object-contain" />
          ) : (
            <Camera size={28} className="text-cyan-400" />
          )}
          <span className={`text-lg font-bold ${themeConfig.text.primary}`}>Image Service</span>
        </div>
        <p className={`text-center text-xs mb-6 ${themeConfig.text.secondary}`}>{t('imageService.auth.subtitle')}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`text-xs font-medium ${themeConfig.text.secondary} block mb-1`}>{t('imageService.auth.username')}</label>
            <input
              value={username} onChange={(e) => setUsername(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg text-sm border ${themeConfig.inputBorder} ${themeConfig.inputBg} ${themeConfig.text.primary} outline-none focus:border-cyan-400/50 transition-colors`}
              autoFocus
            />
          </div>
          <div>
            <label className={`text-xs font-medium ${themeConfig.text.secondary} block mb-1`}>{t('imageService.auth.password')}</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password} onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-3 py-2 pr-9 rounded-lg text-sm border ${themeConfig.inputBorder} ${themeConfig.inputBg} ${themeConfig.text.primary} outline-none focus:border-cyan-400/50 transition-colors`}
              />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className={`absolute right-2.5 top-1/2 -translate-y-1/2 ${themeConfig.text.secondary} hover:text-cyan-400`}>
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold bg-cyan-500 hover:bg-cyan-400 text-white transition-colors disabled:opacity-50">
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <LogIn size={15} />
            )}
            {t('imageService.auth.login')}
          </button>
        </form>
      </div>
    </div>
  )
}
