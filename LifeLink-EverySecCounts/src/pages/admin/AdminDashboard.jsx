import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '@/components/Header';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminStatCard from '@/components/admin/AdminStatCard';
import AdminUserManagement from '@/components/admin/AdminUserManagement';
import AdminRequestsView from '@/components/admin/AdminRequestsView';
import AdminAlerts from '@/components/admin/AdminAlerts';
import AdminTributes from '@/components/admin/AdminTributes';
import FlaggedUsers from '@/components/admin/FlaggedUsers';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Users, Activity, Loader2 } from 'lucide-react';
import { serverUrl } from '@/lib/serverConfig';

const AdminDashboard = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch dashboard data on component mount
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await fetch(`${serverUrl}/api/admin/dashboard`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }

        const result = await response.json();
        if (result.success) {
          setDashboardData(result.data);
          setError(null);
        } else {
          setError(result.message || 'Failed to fetch data');
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Format time ago from timestamp
  const formatTimeAgo = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes} ${minutes === 1 ? 'min' : 'mins'} ago`;
    if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    if (days < 7) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    return date.toLocaleDateString();
  };

  // Get color for activity type
  const getActivityColor = (type) => {
    const colorMap = {
      'success': 'bg-green-500',
      'error': 'bg-red-500',
      'warning': 'bg-amber-500',
      'info': 'bg-blue-500',
      'default': 'bg-purple-500'
    };
    return colorMap[type] || colorMap['default'];
  };

  const renderContent = () => {
    switch (currentPath) {
      case '/admin/users':
        return <AdminUserManagement />;
      case '/admin/requests':
        return <AdminRequestsView />;
      case '/admin/alerts':
        return <AdminAlerts />;
      case '/admin/tributes':
        return <AdminTributes />;
      case '/admin/moderation':
        return <FlaggedUsers />;
      default:
        if (loading) {
          return (
            <div className="flex items-center justify-center h-96">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading dashboard data...</p>
              </div>
            </div>
          );
        }

        if (error) {
          return (
            <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
              <p className="text-destructive">Error: {error}</p>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            {/* Welcome Section */}
            <div>
              <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-muted-foreground">Platform overview and system management</p>
            </div>

            {/* System Overview Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <AdminStatCard
                title="Total Users"
                subtitle="All registered users in system"
                value={dashboardData?.totalUsers?.toString() || '0'}
                icon={Users}
                variant="primary"
              />
              <AdminStatCard
                title="System Health"
                subtitle="Overall platform performance"
                value={`${dashboardData?.systemHealth || 100}%`}
                icon={Activity}
                variant="success"
              />
            </div>

            {/* Flagged Users Section */}
            <div>
              <FlaggedUsers />
            </div>

            {/* Quick Stats Grid */}
            <div className="grid gap-6 lg:grid-cols-1">
              {/* User Distribution */}
              <div className="rounded-xl border bg-card p-6">
                <h3 className="text-lg font-semibold mb-4">User Distribution</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Patients</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all duration-300"
                          style={{ width: `${dashboardData?.userPercentages?.patients || 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{dashboardData?.userPercentages?.patients || 0}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Donors</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 transition-all duration-300"
                          style={{ width: `${dashboardData?.userPercentages?.donors || 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{dashboardData?.userPercentages?.donors || 0}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Hospitals</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-500 transition-all duration-300"
                          style={{ width: `${dashboardData?.userPercentages?.hospitals || 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{dashboardData?.userPercentages?.hospitals || 0}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">NGOs</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-500 transition-all duration-300"
                          style={{ width: `${dashboardData?.userPercentages?.ngos || 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{dashboardData?.userPercentages?.ngos || 0}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* System Status */}
            <div className="rounded-xl border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4">System Status</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-400">Database</span>
                  </div>
                  <p className="text-xs text-green-600 dark:text-green-500">Operational</p>
                </div>
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-400">Authentication</span>
                  </div>
                  <p className="text-xs text-green-600 dark:text-green-500">Operational</p>
                </div>
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-400">Notifications</span>
                  </div>
                  <p className="text-xs text-green-600 dark:text-green-500">Operational</p>
                </div>
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-400">File Storage</span>
                  </div>
                  <p className="text-xs text-green-600 dark:text-green-500">Operational</p>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <div className="flex items-center gap-2 px-6 py-2 border-b bg-muted/30">
            <SidebarTrigger />
            <span className="text-sm text-muted-foreground">Admin Panel</span>
          </div>
          <main className="flex-1 p-6 overflow-auto">
            {renderContent()}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;
