import React, { useState } from 'react'
import PatientSidebar from '@/components/patient/PatientSidebar'
import HealthChatAssistant from '@/components/patient/HealthChatAssistant'

const PatientHealthChatPage = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background overflow-x-hidden overflow-y-auto">
      <div className="flex min-h-screen overflow-hidden">
        <PatientSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 lg:ml-64 p-4 md:p-6 min-h-screen min-h-0 overflow-y-auto">
          <HealthChatAssistant />
        </main>
      </div>
    </div>
  )
}

export default PatientHealthChatPage
