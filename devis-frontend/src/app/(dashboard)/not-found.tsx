import Link from 'next/link'
import { FileQuestion } from 'lucide-react'

export default function DashboardNotFound() {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <FileQuestion className="w-7 h-7 text-gray-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Page introuvable</h2>
        <p className="text-sm text-gray-500 mb-6">
          Cette page n'existe pas ou vous n'y avez pas accès.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
          >
            Tableau de bord
          </Link>
          <Link
            href="/quotes"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            Devis
          </Link>
        </div>
      </div>
    </div>
  )
}
