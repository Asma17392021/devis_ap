import Link from 'next/link'
import { ShieldOff } from 'lucide-react'

export default function Unauthorized() {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <ShieldOff className="w-7 h-7 text-orange-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Accès refusé</h2>
        <p className="text-sm text-gray-500 mb-6">
          Vous n'avez pas les droits nécessaires pour accéder à cette page.
          Contactez votre administrateur si vous pensez qu'il s'agit d'une erreur.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
        >
          Retour au tableau de bord
        </Link>
      </div>
    </div>
  )
}
