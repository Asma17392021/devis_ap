'use client'

import { useState } from 'react'
import { Plus, Edit2, Trash2, Loader2, X, Shield, User } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, useManagerStats, User as UserType } from '@/hooks/useUsers'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useAuthStore } from '@/stores/auth.store'
import { formatDate } from '@/lib/utils'

// ─── Schema ───────────────────────────────────────────────────────────────────

// Single schema — password optional (required only when creating)
const userFormSchema = z.object({
  firstName: z.string().min(1, 'Prénom requis'),
  lastName: z.string().min(1, 'Nom requis'),
  email: z.string().email('Email invalide'),
  password: z.string().optional(),
  role: z.enum(['ADMIN', 'MANAGER']),
  phone: z.string().optional().nullable(),
})

type UserFormValues = z.infer<typeof userFormSchema>

// ─── Modal ────────────────────────────────────────────────────────────────────

function UserModal({
  user,
  onClose,
}: {
  user?: UserType
  onClose: () => void
}) {
  const isEdit = !!user
  const createUser = useCreateUser()
  const updateUser = useUpdateUser(user?.id ?? '')

  // Refine schema at runtime: password required only for new users
  const schema = isEdit
    ? userFormSchema
    : userFormSchema.extend({ password: z.string().min(8, '8 caractères minimum') })

  const { register, handleSubmit, formState: { errors } } = useForm<UserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: user
      ? { firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role, phone: user.phone }
      : { role: 'MANAGER' },
  })

  const onSubmit = async (data: UserFormValues) => {
    try {
      if (isEdit) {
        await updateUser.mutateAsync(data)
        toast.success('Utilisateur mis à jour')
      } else {
        await createUser.mutateAsync(data)
        toast.success('Utilisateur créé. Partagez les identifiants.')
      }
      onClose()
    } catch {
      toast.error('Erreur lors de l\'enregistrement')
    }
  }

  const isPending = createUser.isPending || updateUser.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">
            {isEdit ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
              <input
                {...register('firstName')}
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.firstName && <p className="mt-1 text-xs text-red-500">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
              <input
                {...register('lastName')}
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.lastName && <p className="mt-1 text-xs text-red-500">{errors.lastName.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              {...register('email')}
              type="email"
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
          </div>

          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe *</label>
              <input
                {...register('password')}
                type="password"
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rôle *</label>
            <select
              {...register('role')}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="MANAGER">Manager</option>
              <option value="ADMIN">Administrateur</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
            <input
              {...register('phone')}
              type="tel"
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
            Annuler
          </button>
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-60"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? 'Mettre à jour' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const { user: currentUser } = useAuthStore()
  const { data: users, isLoading } = useUsers()
  const { data: stats } = useManagerStats()
  const deleteUser = useDeleteUser()

  const [modal, setModal] = useState<UserType | 'new' | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteUser.mutateAsync(deleteTarget.id)
      toast.success('Utilisateur supprimé')
    } catch {
      toast.error('Vous ne pouvez pas supprimer votre propre compte')
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
          {users && (
            <p className="text-sm text-gray-500 mt-0.5">{users.length} compte{users.length > 1 ? 's' : ''}</p>
          )}
        </div>
        <button
          onClick={() => setModal('new')}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
        >
          <Plus className="w-4 h-4" />
          Nouvel utilisateur
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">Chargement...</div>
        ) : !users?.length ? (
          <div className="p-12 text-center text-gray-400 text-sm">Aucun utilisateur</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nom</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rôle</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Activité</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Créé le</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                        {u.firstName[0]}{u.lastName[0]}
                      </div>
                      <span className="font-medium text-gray-900">
                        {u.firstName} {u.lastName}
                        {u.id === currentUser?.id && (
                          <span className="ml-2 text-xs text-gray-400">(vous)</span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${
                      u.role === 'ADMIN'
                        ? 'bg-purple-50 text-purple-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {u.role === 'ADMIN' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                      {u.role === 'ADMIN' ? 'Admin' : 'Manager'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const s = stats?.find((x) => x.id === u.id)
                      if (!s || (s.requestsHandled === 0 && s.quotesCreated === 0)) {
                        return <span className="text-gray-300 text-xs">—</span>
                      }
                      return (
                        <div className="text-xs text-gray-600 space-y-0.5">
                          <p>{s.requestsHandled} demande{s.requestsHandled > 1 ? 's' : ''} traitée{s.requestsHandled > 1 ? 's' : ''}</p>
                          <p className="text-gray-400">{s.quotesCreated} devis créé{s.quotesCreated > 1 ? 's' : ''} · {s.quotesAccepted} accepté{s.quotesAccepted > 1 ? 's' : ''}</p>
                        </div>
                      )
                    })()}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setModal(u)}
                        title="Modifier"
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {u.id !== currentUser?.id && (
                        <button
                          onClick={() => setDeleteTarget({ id: u.id, name: `${u.firstName} ${u.lastName}` })}
                          title="Supprimer"
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal !== null && (
        <UserModal
          user={modal === 'new' ? undefined : modal}
          onClose={() => setModal(null)}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Supprimer l'utilisateur ?"
        description={`Le compte de ${deleteTarget?.name} sera définitivement supprimé.`}
        confirmLabel="Supprimer"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
