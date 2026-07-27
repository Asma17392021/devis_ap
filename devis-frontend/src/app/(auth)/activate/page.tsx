'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, FileText, Lock, ShieldCheck } from 'lucide-react'
import { api, setAccessToken } from '@/lib/api'
import { useAuthStore, AuthUser } from '@/stores/auth.store'

const activateSchema = z
  .object({
    password: z.string().min(8, '8 caractères minimum'),
    confirmPassword: z.string().min(1, 'Confirmation requise'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  })
type ActivateForm = z.infer<typeof activateSchema>

function ActivateFormContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const setUser = useAuthStore((s) => s.setUser)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ActivateForm>({ resolver: zodResolver(activateSchema) })

  const onSubmit = async (data: ActivateForm) => {
    if (!token) {
      toast.error('Lien d\'activation invalide')
      return
    }
    setIsLoading(true)
    try {
      const res = await api.post<{ data: { accessToken: string; user: AuthUser } }>(
        '/auth/activate',
        { token, password: data.password }
      )
      setAccessToken(res.data.data.accessToken)
      setUser(res.data.data.user)
      toast.success('Compte activé, bienvenue !')
      router.push('/')
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Ce lien est invalide ou a expiré'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4 shadow-lg">
          <FileText className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Devis Pro</h1>
        <p className="text-gray-500 mt-1">Activez votre compte</p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        {!token ? (
          <p className="text-sm text-red-600 text-center">
            Lien d'activation manquant ou invalide. Demandez à votre administrateur de vous renvoyer une invitation.
          </p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
              Choisissez un mot de passe pour finaliser la création de votre compte.
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  {...register('password')}
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition"
                />
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmer le mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  {...register('confirmPassword')}
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition"
                />
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLoading ? 'Activation...' : 'Activer mon compte'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function ActivatePage() {
  return (
    <Suspense fallback={null}>
      <ActivateFormContent />
    </Suspense>
  )
}
