import React, { useState } from 'react';
import Header from '@/components/Header';
import PatientSidebar from '@/components/patient/PatientSidebar';
import PatientMessages from '@/components/patient/PatientMessages';

const PatientMessagesPage = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <PatientSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 lg:ml-64 p-6">
          <PatientMessages />
        </main>
      </div>
    </div>
  );
};

export default PatientMessagesPage;