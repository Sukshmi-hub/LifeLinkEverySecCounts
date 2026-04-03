import React, { useState } from 'react';
import DonorSidebar from '@/components/donor/DonorSidebar';
import DonorMessages from '@/components/donor/DonorMessages';
import { useDots } from '@/context/DotsContext';
import { useEffect } from 'react';

const DonorMessagesPage = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { clearDot } = useDots();

  useEffect(() => {
    // clear the messages dot when opening messages page
    try { clearDot('messages') } catch (e) {}
  }, [])

  return (
    <div className="h-screen bg-background overflow-hidden">
      <DonorSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      <main className="lg:ml-64 h-screen overflow-hidden flex flex-col">
        {/* Header */}
        <header className="shrink-0 bg-card border-b border-border px-6 py-4">
          <div className="ml-12 lg:ml-0">
            <h1 className="text-2xl font-bold text-foreground">Messages</h1>
            <p className="text-muted-foreground">Communicate with hospitals using predefined messages</p>
          </div>
        </header>

        <div className="p-6 flex-1 min-h-0 overflow-hidden">
          <DonorMessages />
        </div>
      </main>
    </div>
  );
};

export default DonorMessagesPage;
