'use client';

import React, { useState } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { ToastProvider } from '@/components/shared/ToastProvider';
import '@/styles/admin.css';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ToastProvider>
      <div className="admin-body" suppressHydrationWarning>
        <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="admin-main">
          <AdminHeader onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
          <main className="admin-content">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
