import { DashboardNav } from '@/components/dashboard-nav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <main className="pb-20">
        {children}
      </main>
      <DashboardNav />
    </div>
  )
}
