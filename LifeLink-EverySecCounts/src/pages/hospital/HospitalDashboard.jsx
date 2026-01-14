import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import HospitalSidebar from '@/components/hospital/HospitalSidebar';
import HospitalDashboardOverview from '@/components/hospital/HospitalDashboardOverview';
import ManageRequests from '@/components/hospital/ManageRequests';
import RedAlerts from '@/components/hospital/RedAlerts';
import HospitalMessages from '@/components/hospital/HospitalMessages';
import HospitalNotifications from '@/components/hospital/HospitalNotifications';
import HospitalProfile from '@/components/hospital/HospitalProfile';
import HospitalSettings from '@/components/hospital/HospitalSettings';

const HospitalDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  const [redAlerts, setRedAlerts] = useState([
    {
      id: 'ra1',
      patientName: 'Amit Sharma',
      organNeeded: 'Kidney',
      bloodGroup: 'O+',
      criticality: 'Critical',
      hospital: 'City General Hospital',
      location: 'Mumbai',
      contactNumber: '+91 98765 43210',
      timeLogged: new Date(Date.now() - 3600000),
      status: 'active',
    },
    {
      id: 'ra2',
      patientName: 'Priya Patel',
      organNeeded: 'Liver',
      bloodGroup: 'A+',
      criticality: 'High',
      hospital: 'City General Hospital',
      location: 'Mumbai',
      contactNumber: '+91 98765 43211',
      timeLogged: new Date(Date.now() - 7200000),
      status: 'active',
    },
  ]);

  const hasRedAlerts = redAlerts.some(a => a.status === 'active');
  const pendingVerifications = 2; // Simulated

  const handleResolveAlert = (alertId) => {
    setRedAlerts(prev => prev.map(a => 
      a.id === alertId ? { ...a, status: 'resolved' } : a
    ));
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <HospitalDashboardOverview 
            userName={user?.name || 'City General Hospital'} 
            pendingVerifications={pendingVerifications}
            redAlertsCount={redAlerts.filter(a => a.status === 'active').length}
          />
        );
      case 'requests':
        return <ManageRequests />;
      case 'red-alerts':
        return <RedAlerts alerts={redAlerts} onResolve={handleResolveAlert} />;
      case 'messages':
        return <HospitalMessages />;
      case 'notifications':
        return <HospitalNotifications />;
      case 'profile':
        return <HospitalProfile />;
      case 'settings':
        return <HospitalSettings />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <HospitalSidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        hasRedAlerts={hasRedAlerts}
      />
      <main className="flex-1 p-8 overflow-auto">
        {renderContent()}
      </main>
    </div>
  );
};

export default HospitalDashboard;