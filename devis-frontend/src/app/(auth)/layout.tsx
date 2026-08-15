import { InstallAppButton } from '@/components/layout/InstallAppButton'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="fixed top-4 right-4">
        <InstallAppButton />
      </div>
      {children}
    </div>
  )
}
