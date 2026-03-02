import React, { useState } from 'react';
import { systemAlerts } from '@/data/notificationsData'; // Removed SystemAlert type import
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Shield, 
  Activity,
  Bell,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';

const AdminAlerts = () => {
  // Removed <SystemAlert[]> generic
  const [alerts, setAlerts] = useState(systemAlerts);

  const handleResolve = (alertId) => {
    setAlerts(prev => prev.map(alert =>
      alert.id === alertId ? { ...alert, resolved: true } : alert
    ));
    toast.success('Alert marked as resolved');
  };

  const handleMarkAsRead = (alertId) => {
    toast.info('Alert marked as read');
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'critical':
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Critical</Badge>;
      case 'high':
        return <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">High</Badge>;
      case 'medium':
        return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Medium</Badge>;
      case 'low':
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Low</Badge>;
      default:
        return <Badge variant="secondary">{severity}</Badge>;
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'verification_pending':
        return <Clock className="h-5 w-5 text-amber-600" />;
      case 'suspicious_activity':
        return <Shield className="h-5 w-5 text-red-600" />;
      case 'failed_action':
        return <XCircle className="h-5 w-5 text-orange-600" />;
      case 'emergency_spike':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'system_health':
        return <Activity className="h-5 w-5 text-green-600" />;
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const unresolvedAlerts = alerts.filter(a => !a.resolved);
  const resolvedAlerts = alerts.filter(a => a.resolved);

  return (
    <div className="space-y-6">
      {/* Unresolved Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Active System Alerts
          </CardTitle>
          <CardDescription>
            System-generated alerts requiring attention
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {unresolvedAlerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
              <p>No active alerts</p>
            </div>
          ) : (
            unresolvedAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow"
              >
                <div className="p-2 rounded-lg bg-muted">
                  {getTypeIcon(alert.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-sm">{alert.title}</h4>
                    {getSeverityBadge(alert.severity)}
                  </div>
                  <p className="text-sm text-muted-foreground">{alert.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">{alert.timestamp}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleMarkAsRead(alert.id)}
                  >
                    Mark Read
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleResolve(alert.id)}
                  >
                    Resolve
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Resolved Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Resolved Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {resolvedAlerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30 opacity-70"
            >
              <div className="p-2 rounded-lg bg-muted">
                {getTypeIcon(alert.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm">{alert.title}</h4>
                  <Badge variant="secondary">Resolved</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{alert.description}</p>
                <p className="text-xs text-muted-foreground mt-1">{alert.timestamp}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAlerts;