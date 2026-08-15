'use client'

import { useEffect, useState } from 'react'
import { Download, Share } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface InstallAppButtonProps {
  variant?: 'pill' | 'block'
}

export function InstallAppButton({ variant = 'pill' }: InstallAppButtonProps) {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isInAppBrowser, setIsInAppBrowser] = useState(false)

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true
    setInstalled(isStandalone)

    // iOS/iPadOS never fires beforeinstallprompt — Add to Home Screen is manual only.
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

    // In-app browsers (WhatsApp, Messenger, Instagram...) generally hide the
    // share/install affordance — users need to reopen the link in Safari/Chrome.
    setIsInAppBrowser(/FBAN|FBAV|Instagram|Line\/|WhatsApp/i.test(navigator.userAgent))

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setInstallEvent(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setInstallEvent(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed) return null

  if (isIOS && variant === 'block') {
    return (
      <div className="w-full flex items-start gap-2.5 py-3 px-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
        <Share className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          {isInAppBrowser
            ? <>Pour installer l&apos;application : ouvrez ce lien dans <strong>Safari</strong> (bouton &laquo;&nbsp;•••&nbsp;&raquo; puis &laquo;&nbsp;Ouvrir dans Safari&nbsp;&raquo;), puis appuyez sur <strong>Partager</strong> → <strong>Sur l&apos;écran d&apos;accueil</strong>.</>
            : <>Pour installer l&apos;application : appuyez sur <strong>Partager</strong> puis <strong>Sur l&apos;écran d&apos;accueil</strong>.</>}
        </p>
      </div>
    )
  }

  if (!installEvent) return null

  const handleInstall = async () => {
    await installEvent.prompt()
    const { outcome } = await installEvent.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setInstallEvent(null)
  }

  if (variant === 'block') {
    return (
      <button
        onClick={handleInstall}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold rounded-lg transition"
      >
        <Download className="w-4 h-4" />
        Installer l&apos;application
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleInstall}
      className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
    >
      <Download className="w-4 h-4" />
      <span className="hidden sm:inline">Installer l&apos;application</span>
    </button>
  )
}
