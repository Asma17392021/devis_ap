'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileText } from 'lucide-react'
import { api } from '@/lib/api'

interface CompanyInfo {
  name: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  postalCode: string | null
  country: string | null
}

export default function PrivacyPolicyPage() {
  const [company, setCompany] = useState<CompanyInfo | null>(null)

  useEffect(() => {
    api.get<{ data: CompanyInfo }>('/company-info')
      .then((res) => setCompany(res.data.data))
      .catch(() => setCompany(null))
  }, [])

  const companyName = company?.name || 'Autoclick Devis'
  const contactEmail = company?.email || 'contact@autoclickdevis.com'
  const addressLine = [company?.address, company?.postalCode, company?.city, company?.country]
    .filter(Boolean)
    .join(', ')
  const updatedDate = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date())

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Politique de confidentialité</h1>
            <p className="text-sm text-gray-500">{companyName} — mise à jour le {updatedDate}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-8 text-sm leading-relaxed text-gray-700">
          <section>
            <p>
              {companyName} (« nous ») édite l&apos;application et le site {companyName}, un outil de gestion
              de devis destiné aux professionnels et à leurs clients. Cette politique explique quelles données
              nous collectons, pourquoi, et comment vous pouvez exercer vos droits, conformément au Règlement
              Général sur la Protection des Données (RGPD).
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">1. Données que nous collectons</h2>
            <p className="mb-2"><strong>Si vous êtes client (vous demandez un devis) :</strong></p>
            <ul className="list-disc pl-5 space-y-1 mb-3">
              <li>Identité et contact : nom, prénom, adresse email, téléphone, nom de société (optionnel)</li>
              <li>Informations sur votre véhicule si vous soumettez une demande : marque, modèle, année,
                numéro VIN/châssis, kilométrage</li>
              <li>Le contenu de vos demandes (description, photos ou documents joints)</li>
              <li>Historique de vos devis et leur statut (envoyé, accepté, refusé)</li>
            </ul>
            <p className="mb-2"><strong>Si vous êtes un utilisateur de l&apos;équipe (admin/commercial) :</strong></p>
            <ul className="list-disc pl-5 space-y-1 mb-3">
              <li>Identité professionnelle : nom, prénom, adresse email</li>
              <li>Données d&apos;usage de l&apos;application (connexions, actions réalisées sur les devis)</li>
            </ul>
            <p>
              <strong>Automatiquement :</strong> adresse IP et informations techniques de connexion (pour la
              sécurité), cookies strictement nécessaires au fonctionnement (maintien de la session).
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">2. Pourquoi nous les utilisons</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Traiter vos demandes de devis et vous fournir le service (base légale : exécution d&apos;un contrat)</li>
              <li>Vous envoyer des notifications liées à vos devis ou demandes (email, notification dans
                l&apos;application)</li>
              <li>Assurer la sécurité du service et prévenir les fraudes (intérêt légitime)</li>
              <li>Respecter nos obligations légales et comptables (base légale : obligation légale)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">3. Avec qui nous les partageons</h2>
            <p className="mb-2">
              Nous ne vendons jamais vos données. Elles sont uniquement partagées avec les prestataires
              techniques nécessaires au fonctionnement du service, qui agissent comme sous-traitants :
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Supabase</strong> — hébergement de la base de données et des fichiers/pièces jointes</li>
              <li><strong>Vercel</strong> — hébergement du site et de l&apos;application</li>
              <li><strong>Render</strong> — hébergement du serveur applicatif</li>
              <li><strong>Resend</strong> — envoi des emails transactionnels (confirmations, notifications)</li>
              <li><strong>Google Play</strong> — distribution de l&apos;application Android</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">4. Durée de conservation</h2>
            <p>
              Vos données sont conservées pendant la durée de la relation commerciale, puis archivées selon
              les durées légales applicables (notamment les obligations comptables et fiscales), avant
              suppression ou anonymisation.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">5. Vos droits</h2>
            <p className="mb-2">
              Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement,
              de limitation, d&apos;opposition et de portabilité de vos données. Pour exercer ces droits,
              contactez-nous à l&apos;adresse ci-dessous. Vous pouvez également introduire une réclamation
              auprès de la CNIL (www.cnil.fr).
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">6. Sécurité</h2>
            <p>
              L&apos;accès à votre espace est protégé par mot de passe et session sécurisée. Les communications
              entre votre appareil et nos serveurs sont chiffrées (HTTPS).
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">7. Contact</h2>
            <p>
              Pour toute question concernant cette politique ou vos données personnelles :
              <br />
              <a href={`mailto:${contactEmail}`} className="text-blue-600 hover:underline">{contactEmail}</a>
              {addressLine && <><br />{addressLine}</>}
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">8. Modifications</h2>
            <p>
              Cette politique peut être mise à jour occasionnellement. La date de dernière mise à jour est
              indiquée en haut de cette page.
            </p>
          </section>
        </div>

        <p className="text-center mt-8">
          <Link href="/login" className="text-sm text-blue-600 hover:underline">Retour à l&apos;accueil</Link>
        </p>
      </div>
    </div>
  )
}
