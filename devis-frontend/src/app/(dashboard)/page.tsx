'use client'

import { FileText, Clock, TrendingUp, CheckCircle } from 'lucide-react'
import { useDashboardStats } from '@/hooks/useDashboard'
import { KPICard, KPICardSkeleton } from '@/components/dashboard/KPICard'
import { RecentQuotesList, RecentQuotesListSkeleton } from '@/components/dashboard/RecentQuotesList'
import { ExpiringAlert } from '@/components/dashboard/ExpiringAlert'
import { formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'

export default function DashboardPage() {
  const { data, isLoading } = useDashboardStats()
  const { user } = useAuthStore()

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Bonjour'
    if (h < 18) return 'Bon après-midi'
    return 'Bonsoir'
  })()

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting}{user?.firstName ? `, ${user.firstName}` : ''} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Voici un aperçu de votre activité du mois
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            <KPICardSkeleton />
            <KPICardSkeleton />
            <KPICardSkeleton />
            <KPICardSkeleton />
          </>
        ) : data ? (
          <>
            <KPICard
              title="Devis ce mois"
              value={data.quotesThisMonth}
              subtitle="créés ce mois-ci"
              icon={FileText}
              color="blue"
            />
            <KPICard
              title="En attente"
              value={data.pendingQuotes}
              subtitle={data.pendingQuotes === 1 ? 'devis envoyé' : 'devis envoyés'}
              icon={Clock}
              color="orange"
            />
            <KPICard
              title="CA signé ce mois"
              value={formatCurrency(data.signedRevenueThisMonth)}
              subtitle="devis acceptés"
              icon={TrendingUp}
              color="green"
            />
            <KPICard
              title="Taux d'acceptation"
              value={`${data.acceptanceRate}%`}
              subtitle="sur tous les devis décidés"
              icon={CheckCircle}
              color="purple"
            />
          </>
        ) : null}
      </div>

      {/* Main content — 2 columns on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent quotes — takes 2/3 */}
        <div className="lg:col-span-2">
          {isLoading ? (
            <RecentQuotesListSkeleton />
          ) : data ? (
            <RecentQuotesList quotes={data.recentQuotes} />
          ) : null}
        </div>

        {/* Right column — expiring alerts */}
        <div className="space-y-4">
          {data && <ExpiringAlert quotes={data.expiringQuotes} />}

          {/* Quick actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Actions rapides</h3>
            <div className="space-y-2">
              <a
                href="/quotes/new"
                className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
              >
                <FileText className="w-4 h-4" />
                Nouveau devis
              </a>
              <a
                href="/clients"
                className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
              >
                <CheckCircle className="w-4 h-4" />
                Gérer les clients
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
