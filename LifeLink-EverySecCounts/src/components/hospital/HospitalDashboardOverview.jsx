import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DashboardCard from '@/components/DashboardCard';
import { FileText, AlertTriangle, Activity, UserCheck, Clock, TrendingUp, Heart } from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const HospitalDashboardOverview = ({
  userName,
  pendingVerifications,
  redAlertsCount,
}) => {
  const { organRequests } = useNotifications();

  // Calculate stats based on the context data
  const pendingRequests = organRequests.filter(r => r.status === 'Pending – Hospital Review').length;
  const emergencies = organRequests.filter(r => r.urgency === 'High').length;
  const matchedCount = organRequests.filter(r => r.status === 'Donor Matched').length;
  
  // Static mock data for recent timeline
  const recentActivities = [
    { id: 1, action: 'Patient verification pending', time: new Date(Date.now() - 1800000), type: 'warning' },
    { id: 2, action: 'New organ request received', time: new Date(Date.now() - 3600000), type: 'info' },
    { id: 3, action: 'Donor matched successfully', time: new Date(Date.now() - 7200000), type: 'success' },
    { id: 4, action: 'Emergency case escalated', time: new Date(Date.now() - 14400000), type: 'error' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{userName}</h1>
        <p className="text-muted-foreground">Hospital Management Dashboard</p>
      </div>

      {/* Stats Cards Row */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard 
          icon={FileText} 
          title="Pending Requests" 
          value={String(pendingRequests)} 
          variant="warning" 
        />
        <DashboardCard 
          icon={AlertTriangle} 
          title="Red Alerts" 
          value={String(redAlertsCount)} 
          variant="critical" 
        />
        <DashboardCard 
          icon={UserCheck} 
          title="Pending Verifications" 
          value={String(pendingVerifications)} 
          variant="primary" 
        />
        <DashboardCard 
          icon={Activity} 
          title="Matched Donors" 
          value={String(matchedCount)} 
          variant="success" 
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Organ Requests Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-destructive" />
              Recent Organ Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            {organRequests.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No requests yet</p>
            ) : (
              <div className="space-y-4">
                {organRequests.slice(0, 4).map(req => (
                  <div key={req.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <h4 className="font-medium text-sm">{req.patientName}</h4>
                      <p className="text-xs text-muted-foreground">
                        {req.organType} • <span className={req.urgency === 'High' ? 'text-destructive' : ''}>{req.urgency}</span>
                      </p>
                    </div>
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium",
                      req.status === 'Donor Matched' ? 'bg-success/20 text-success' :
                      req.status === 'Accepted' ? 'bg-primary/20 text-primary' :
                      'bg-muted text-muted-foreground'
                    )}>
                      {req.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity Timeline Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map(activity => (
                <div key={activity.id} className="flex items-center gap-3">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    activity.type === 'success' ? 'bg-success' :
                    activity.type === 'warning' ? 'bg-warning' :
                    activity.type === 'error' ? 'bg-destructive' :
                    'bg-primary'
                  )} />
                  <div className="flex-1">
                    <p className="text-sm">{activity.action}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(activity.time, { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Numerical Summary Section */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold text-primary">{organRequests.length}</p>
              <p className="text-sm text-muted-foreground">Total Requests</p>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold text-success">{matchedCount}</p>
              <p className="text-sm text-muted-foreground">Successful Matches</p>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold text-warning">{pendingVerifications}</p>
              <p className="text-sm text-muted-foreground">Pending Verifications</p>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold text-destructive">{emergencies}</p>
              <p className="text-sm text-muted-foreground">High Urgency Cases</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HospitalDashboardOverview;