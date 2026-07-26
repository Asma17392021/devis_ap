'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { toast } from 'sonner'
import { QuoteForm, QuoteFormValues } from '@/components/quotes/QuoteForm'
import { useCreateQuote, useSendQuote } from '@/hooks/useQuotes'

export default function NewQuotePage() {
  const router = useRouter()
  const createQuote = useCreateQuote()
  const sendQuote = useSendQuote()

  const handleSaveDraft = async (data: QuoteFormValues) => {
    try {
      const quote = await createQuote.mutateAsync(data)
      toast.success('Devis enregistré en brouillon')
      router.push(`/quotes/${quote.id}`)
    } catch {
      toast.error('Erreur lors de la création du devis')
    }
  }

  const handleSendToClient = async (data: QuoteFormValues) => {
    try {
      // Create draft first, then send
      const quote = await createQuote.mutateAsync(data)
      await sendQuote.mutateAsync(quote.id)
      toast.success(`Devis ${quote.number} envoyé au client`)
      router.push(`/quotes/${quote.id}`)
    } catch {
      toast.error('Erreur lors de l\'envoi du devis')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/quotes"
          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nouveau devis</h1>
          <p className="text-sm text-gray-500 mt-0.5">Remplissez les informations ci-dessous</p>
        </div>
      </div>

      <QuoteForm
        onSaveDraft={handleSaveDraft}
        onSendToClient={handleSendToClient}
        isSaving={createQuote.isPending && !sendQuote.isPending}
        isSending={sendQuote.isPending}
      />
    </div>
  )
}
