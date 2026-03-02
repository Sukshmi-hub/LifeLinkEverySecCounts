import React, { useState } from 'react';
import DonorSidebar from '@/components/donor/DonorSidebar';
import UserSettings from '@/components/settings/UserSettings';

const DonorSettingsPage = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <DonorSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      <main className="lg:ml-64 min-h-screen">
        <header className="sticky top-0 z-20 bg-card border-b border-border px-6 py-4">
          <div className="ml-12 lg:ml-0">
            <h1 className="text-2xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground">Manage your account preferences</p>
          </div>
        </header>

        <div className="p-6">
          <UserSettings role="donor" />
        </div>
      </main>
    </div>
  );
};

export default DonorSettingsPage;