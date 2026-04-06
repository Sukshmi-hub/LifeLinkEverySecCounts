import React, { useState } from 'react'
import PatientSidebar from '@/components/patient/PatientSidebar'
import HealthChatAssistant from '@/components/patient/HealthChatAssistant'

const PatientHealthChatPage = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="h-screen bg-background overflow-hidden">
      <div className="flex h-full overflow-hidden">
        <PatientSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 lg:ml-64 p-4 md:p-6 h-full min-h-0 overflow-hidden">
          <HealthChatAssistant />
        </main>
      </div>
    </div>
  )
}

export default PatientHealthChatPage
