// src/app/page.js
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Loader2, LogIn, Download, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // --- ESTADO PARA LA INSTALACIÓN (PWA) ---
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstallable, setIsInstallable] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) redirigirUsuario(session.user.id)
    }
    checkSession()

    const handleInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }

    window.addEventListener('beforeinstallprompt', handleInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      setIsInstallable(false)
    }
  }

  const redirigirUsuario = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('perfiles_usuarios')
        .select('rol')
        .eq('id', userId)
        .single()

      if (error) throw error

      if (data?.rol === 'admin') {
        router.push('/admin')
      } else {
        router.push('/chat')
      }
    } catch (err) {
      console.error('Error verificando rol:', err)
      router.push('/chat')
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      await redirigirUsuario(data.user.id)
    } catch (err) {
      setError('Correo o contraseña incorrectos. Intenta de nuevo.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: '#F1EFE8' }}
    >
      <div
        className="max-w-md w-full rounded-2xl p-8 space-y-6 relative overflow-hidden"
        style={{
          backgroundColor: '#7A1020',
          boxShadow: '0 8px 40px rgba(90, 10, 20, 0.25)',
        }}
      >
        {/* Círculo decorativo de fondo */}
        <div
          style={{
            position: 'absolute',
            top: '-60px',
            right: '-60px',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.05)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-80px',
            left: '-50px',
            width: '240px',
            height: '240px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.04)',
            pointerEvents: 'none',
          }}
        />

        {/* Encabezado */}
        <div className="text-center relative">
          {isInstallable && (
            <button
              onClick={handleInstallClick}
              className="absolute top-0 right-0 p-2 rounded-full transition"
              style={{ color: '#EF9F27', backgroundColor: 'rgba(255,255,255,0.1)' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.18)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
              title="Instalar App"
            >
              <Download size={20} />
            </button>
          )}

          {/* Línea dorada superior */}
          <div className="flex justify-center mb-4">
            <div style={{ height: '3px', width: '48px', borderRadius: '99px', backgroundColor: '#EF9F27' }} />
          </div>

          <h1 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>
            Sistema virtual de la Escuela de Guayaquil
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Portal de Atención Virtual
          </p>

          {isInstallable && (
            <p
              className="text-xs mt-2 cursor-pointer hover:underline"
              style={{ color: '#EF9F27' }}
              onClick={handleInstallClick}
            >
              ¡Instala nuestra aplicación!
            </p>
          )}
        </div>

        {/* Formulario */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'rgba(255,255,255,0.8)' }}>
              Correo Electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="padre@ejemplo.com"
              className="w-full px-4 py-2 rounded-lg outline-none transition"
              style={{
                backgroundColor: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#FFFFFF',
              }}
              onFocus={e => {
                e.target.style.backgroundColor = 'rgba(255,255,255,0.18)'
                e.target.style.border = '1px solid #EF9F27'
                e.target.style.boxShadow = '0 0 0 3px rgba(239,159,39,0.2)'
              }}
              onBlur={e => {
                e.target.style.backgroundColor = 'rgba(255,255,255,0.12)'
                e.target.style.border = '1px solid rgba(255,255,255,0.2)'
                e.target.style.boxShadow = 'none'
              }}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'rgba(255,255,255,0.8)' }}>
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 pr-10 rounded-lg outline-none transition"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#FFFFFF',
                }}
                onFocus={e => {
                  e.target.style.backgroundColor = 'rgba(255,255,255,0.18)'
                  e.target.style.border = '1px solid #EF9F27'
                  e.target.style.boxShadow = '0 0 0 3px rgba(239,159,39,0.2)'
                }}
                onBlur={e => {
                  e.target.style.backgroundColor = 'rgba(255,255,255,0.12)'
                  e.target.style.border = '1px solid rgba(255,255,255,0.2)'
                  e.target.style.boxShadow = 'none'
                }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 focus:outline-none transition"
                style={{ color: 'rgba(255,255,255,0.5)' }}
                onMouseEnter={e => e.currentTarget.style.color = '#EF9F27'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <div
              className="p-3 text-sm rounded-lg"
              style={{
                backgroundColor: 'rgba(0,0,0,0.25)',
                color: '#FCA5A5',
                border: '1px solid rgba(252,165,165,0.3)',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center font-semibold py-3 rounded-lg transition"
            style={{
              backgroundColor: '#EF9F27',
              color: '#7A1020',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.75 : 1,
              fontWeight: '700',
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = '#BA7517' }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.backgroundColor = '#EF9F27' }}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin mr-2 h-5 w-5" />
                Iniciando sesión...
              </>
            ) : (
              <>
                <LogIn className="mr-2 h-5 w-5" />
                Ingresar
              </>
            )}
          </button>
        </form>

        {/* Línea dorada inferior */}
        <div className="flex justify-center pt-1">
          <div style={{ height: '3px', width: '48px', borderRadius: '99px', backgroundColor: '#EF9F27' }} />
        </div>

      </div>
    </div>
  )
}