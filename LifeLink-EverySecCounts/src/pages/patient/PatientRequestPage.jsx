import React, { useState } from 'react';
import PatientSidebar from '@/components/patient/PatientSidebar';
import OrganRequestModal from '@/components/patient/OrganRequestModal';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, FileText, Clock, Heart, AlertTriangle, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const PatientRequestPage = () => {
  const { user } = useAuth();
  const { organRequests, notifications, getUnreadCount, markAsRead } = useNotifications();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const patientRequests = organRequests.filter(r => r.patientId === user?.id || r.patientName === user?.name);
  const patientNotifications = notifications.filter(n => n.targetRole === 'patient');
  const unreadCount = getUnreadCount('patient');

  const getStatusColor = (status) => {
    switch (status) {
      case 'Accepted':
      case 'Donor Matched':
        return 'bg-success/20 text-success';
      case 'Rejected':
        return 'bg-destructive/20 text-destructive';
      case 'In Progress':
        return 'bg-warning/20 text-warning';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PatientSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      <main className="lg:ml-64 min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="ml-12 lg:ml-0">
              <h1 className="text-2xl font-bold text-foreground">Organ Request</h1>
              <p className="text-muted-foreground">Submit and track your organ requests</p>
            </div>
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 top-12 w-80 bg-card border border-border rounded-lg shadow-lg z-50">
                  <div className="p-4 border-b border-border">
                    <h3 className="font-semibold">Notifications</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {patientNotifications.length === 0 ? (
                      <p className="p-4 text-center text-muted-foreground">No notifications</p>
                    ) : (
                      patientNotifications.slice(0, 5).map(notif => (
                        <div
                          key={notif.id}
                          className={cn(
                            "p-4 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors",
                            !notif.read && "bg-primary/5"
                          )}
                          onClick={() => markAsRead(notif.id)}
                        >
                          <p className="font-medium text-sm">{notif.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{notif.message}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatDistanceToNow(notif.timestamp, { addSuffix: true })}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="p-6">
          {/* New Request Button */}
          <Button onClick={() => setShowRequestModal(true)} className="mb-6">
            <Plus className="w-4 h-4 mr-2" />
            New Request
          </Button>

          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{patientRequests.length}</p>
                  <p className="text-muted-foreground text-sm">Total Requests</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {patientRequests.filter(r => r.status === 'Pending – Hospital Review').length}
                  </p>
                  <p className="text-muted-foreground text-sm">Pending</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
                  <Heart className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {patientRequests.filter(r => r.status === 'Accepted' || r.status === 'Donor Matched').length}
                  </p>
                  <p className="text-muted-foreground text-sm">Accepted</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {patientRequests.filter(r => r.urgency === 'High').length}
                  </p>
                  <p className="text-muted-foreground text-sm">High Urgency</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Requests List */}
          <Card>
            <CardHeader>
              <CardTitle>Your Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {patientRequests.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">No requests yet</h3>
                  <p className="text-muted-foreground mb-4">Submit your first organ request to get started.</p>
                  <Button onClick={() => setShowRequestModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Request
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {patientRequests.map(request => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-4 bg-muted/30 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <Heart className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium">{request.organType}</h4>
                          <p className="text-sm text-muted-foreground">
                            Urgency: <span className={
                              request.urgency === 'High' ? 'text-destructive font-medium' :
                              request.urgency === 'Medium' ? 'text-warning font-medium' :
                              'text-muted-foreground'
                            }>{request.urgency}</span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={cn("px-3 py-1 rounded-full text-xs font-medium", getStatusColor(request.status))}>
                          {request.status}
                        </span>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDistanceToNow(request.createdAt, { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <OrganRequestModal 
        isOpen={showRequestModal} 
        onClose={() => setShowRequestModal(false)} 
      />
    </div>
  );
};

export default PatientRequestPage;