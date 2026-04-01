import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import HospitalSidebar from '@/components/hospital/HospitalSidebar';
import HospitalDashboardOverview from '@/components/hospital/HospitalDashboardOverview';
import HospitalPayments from '@/components/hospital/HospitalPayments';
import ManageRequests from '@/components/hospital/ManageRequests';
import RedAlerts from '@/components/hospital/RedAlerts';
import HospitalMessages from '@/components/hospital/HospitalMessages';
import HospitalNotifications from '@/components/hospital/HospitalNotifications';
import HospitalProfile from '@/components/hospital/HospitalProfile';
import ErrorBoundary from '@/components/ErrorBoundary';
import { serverUrl } from '@/lib/serverConfig';

const HospitalDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  const [redAlerts, setRedAlerts] = useState([]);

  // fetch red alerts from backend and poll periodically
  React.useEffect(() => {
    let mounted = true
    const token = localStorage.getItem('token')
    const fetchAlerts = async () => {
      try {
        const resp = await fetch(`${serverUrl}/api/requests/red-alerts`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
        if (!resp.ok) return
        const json = await resp.json()
        if (json && json.success && mounted) {
          setRedAlerts(json.data || [])
        }
      } catch (e) {
        // ignore
      }
    }

    fetchAlerts()
    const id = setInterval(fetchAlerts, 7000) // poll every 7 seconds
    return () => { mounted = false; clearInterval(id) }
  }, [])

  const hasRedAlerts = redAlerts.some(a => a.status === 'active');
  const pendingVerifications = 2; // Simulated

  const handleResolveAlert = (alertId) => {
    // call API to mark resolved then update local list
    (async () => {
      try {
        const token = localStorage.getItem('token')
        const resp = await fetch(`${serverUrl}/api/requests/${alertId}/resolve`, {
          method: 'PUT',
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
        if (resp.ok) {
          setRedAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: 'resolved' } : a))
        }
      } catch (e) {
        // ignore
      }
    })()
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'payments':
        return <HospitalPayments />;
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
        return <ErrorBoundary><HospitalMessages /></ErrorBoundary>;
      case 'notifications':
        return <HospitalNotifications />;
      case 'profile':
        return <HospitalProfile />;
      default:
          return (
            <HospitalDashboardOverview 
              userName={user?.name || 'City General Hospital'} 
              pendingVerifications={pendingVerifications}
              redAlertsCount={redAlerts.filter(a => a.status === 'active').length}
            />
          );
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

