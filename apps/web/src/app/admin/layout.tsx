import { redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs';
import AdminSidebar from '@/components/admin/AdminSidebar';

export const metadata = {
  title: 'Admin Panel | RemoteDevAI',
  description: 'Administration panel for RemoteDevAI',
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();

  if (!user) {
    redirect('/sign-in');
  }

  // Check if user is admin
  // Note: You'll need to implement this check based on your user role system
  // For now, we'll check if the user email is in an admin list or has admin metadata
  const isAdmin =
    user.publicMetadata?.role === 'ADMIN' ||
    user.publicMetadata?.role === 'SUPER_ADMIN';

  if (!isAdmin) {
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <AdminSidebar />
      <main className="flex-1 overflow-x-hidden">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
