import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import Header from '@/components/Header';
import DashboardCard from '@/components/DashboardCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HandHeart, Users, DollarSign, MessageCircle, Heart, Bell, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const NgoDashboard = () => {
  const { user } = useAuth();
  const { fundRequests, notifications, getUnreadCount, markAsRead, updateFundRequestStatus } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);

  const ngoNotifications = notifications.filter(n => n.targetRole === 'ngo');
  const unreadCount = getUnreadCount('ngo');

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{user?.name}</h1>
            <p className="text-muted-foreground">NGO Support Dashboard</p>
          </div>
          <div className="relative">
            <Button variant="ghost" size="icon" onClick={() => setShowNotifications(!showNotifications)}>
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">{unreadCount}</span>}
            </Button>
            {showNotifications && (
              <div className="absolute right-0 top-12 w-80 bg-card border border-border rounded-lg shadow-lg z-50">
                <div className="p-4 border-b border-border"><h3 className="font-semibold">Notifications</h3></div>
                <div className="max-h-64 overflow-y-auto">
                  {ngoNotifications.length === 0 ? <p className="p-4 text-center text-muted-foreground">No notifications</p> : ngoNotifications.slice(0, 5).map(n => (
                    <div key={n.id} className={cn("p-4 border-b border-border cursor-pointer hover:bg-muted/50", !n.read && "bg-primary/5")} onClick={() => markAsRead(n.id)}>
                      <p className="font-medium text-sm">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{n.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <DashboardCard icon={Users} title="Fund Requests" value={String(fundRequests.length)} variant="primary" />
          <DashboardCard icon={DollarSign} title="Pending" value={String(fundRequests.filter(r => r.status === 'Pending').length)} variant="warning" />
          <DashboardCard icon={HandHeart} title="Approved" value={String(fundRequests.filter(r => r.status === 'Approved').length)} variant="success" />
          <DashboardCard icon={Heart} title="Total Amount" value={`₹${fundRequests.filter(r => r.status === 'Approved').reduce((s, r) => s + r.amount, 0).toLocaleString()}`} variant="success" />
        </div>

        <Card className="mb-8">
          <CardHeader><CardTitle>Patient Fund Requests</CardTitle></CardHeader>
          <CardContent>
            {fundRequests.length === 0 ? <p className="text-center py-8 text-muted-foreground">No fund requests yet</p> : (
              <div className="space-y-4">
                {fundRequests.map(req => (
                  <div key={req.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                    <div>
                      <h4 className="font-medium">{req.patientName}</h4>
                      <p className="text-sm text-muted-foreground">₹{req.amount.toLocaleString()} • {req.reason}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("px-3 py-1 rounded-full text-xs font-medium", req.status === 'Approved' ? 'bg-success/20 text-success' : req.status === 'Rejected' ? 'bg-destructive/20 text-destructive' : 'bg-warning/20 text-warning')}>{req.status}</span>
                      {req.status === 'Pending' && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => updateFundRequestStatus(req.id, 'Approved')}><Check className="w-4 h-4" /></Button>
                          <Button size="sm" variant="outline" onClick={() => updateFundRequestStatus(req.id, 'Rejected')}><X className="w-4 h-4" /></Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link to="/ngo/support"><Button variant="default" className="w-full h-24 flex-col gap-2"><HandHeart className="h-6 w-6" />Financial Support</Button></Link>
          <Link to="/ngo/chat"><Button variant="outline" className="w-full h-24 flex-col gap-2"><MessageCircle className="h-6 w-6" />Messages</Button></Link>
        </div>
      </main>
    </div>
  );
};

export default NgoDashboard;