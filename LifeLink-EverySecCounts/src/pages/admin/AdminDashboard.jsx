import React from 'react';
import { useLocation } from 'react-router-dom';
import Header from '@/components/Header';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminStatCard from '@/components/admin/AdminStatCard';
import AdminUserManagement from '@/components/admin/AdminUserManagement';
import AdminRequestsView from '@/components/admin/AdminRequestsView';
import AdminAlerts from '@/components/admin/AdminAlerts';
import AdminTributes from '@/components/admin/AdminTributes';
import AdminSettings from '@/components/admin/AdminSettings';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Users, FileText, Bell, Activity } from 'lucide-react';

const AdminDashboard = () => {
  const location = useLocation();
  const currentPath = location.pathname;

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
      case '/admin/settings':
        return <AdminSettings />;
      default:
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
                value="1,234"
                icon={Users}
                variant="primary"
              />
              <AdminStatCard
                title="Active Requests"
                subtitle="Pending and in-progress requests"
                value="89"
                icon={FileText}
                variant="warning"
              />
              <AdminStatCard
                title="Pending Alerts"
                subtitle="System alerts requiring attention"
                value="5"
                icon={Bell}
                variant="critical"
              />
              <AdminStatCard
                title="System Health"
                subtitle="Overall platform performance"
                value="98%"
                icon={Activity}
                variant="success"
              />
            </div>

            {/* Quick Stats Grid */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* User Distribution */}
              <div className="rounded-xl border bg-card p-6">
                <h3 className="text-lg font-semibold mb-4">User Distribution</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Patients</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: '45%' }} />
                      </div>
                      <span className="text-sm font-medium">45%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Donors</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500" style={{ width: '30%' }} />
                      </div>
                      <span className="text-sm font-medium">30%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Hospitals</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-teal-500" style={{ width: '15%' }} />
                      </div>
                      <span className="text-sm font-medium">15%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">NGOs</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-orange-500" style={{ width: '10%' }} />
                      </div>
                      <span className="text-sm font-medium">10%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="rounded-xl border bg-card p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                    <div className="h-2 w-2 rounded-full bg-green-500 mt-2" />
                    <div>
                      <p className="text-sm">New hospital registered: Metro Life Hospital</p>
                      <p className="text-xs text-muted-foreground">5 mins ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                    <div className="h-2 w-2 rounded-full bg-blue-500 mt-2" />
                    <div>
                      <p className="text-sm">User verification completed: Sunita Singh (Donor)</p>
                      <p className="text-xs text-muted-foreground">15 mins ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                    <div className="h-2 w-2 rounded-full bg-amber-500 mt-2" />
                    <div>
                      <p className="text-sm">Alert resolved: Database backup complete</p>
                      <p className="text-xs text-muted-foreground">1 hour ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                    <div className="h-2 w-2 rounded-full bg-purple-500 mt-2" />
                    <div>
                      <p className="text-sm">Tribute approved: Ramesh Kumar memorial</p>
                      <p className="text-xs text-muted-foreground">2 hours ago</p>
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
