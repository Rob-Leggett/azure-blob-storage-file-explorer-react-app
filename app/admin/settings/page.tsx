import AdminSettingsPage from '@/app/admin/settings/client'

export const dynamic = 'force-dynamic' // auth flow depends on runtime state

export default async function AdminSettingsSSRPage() {
  return <AdminSettingsPage />
}
