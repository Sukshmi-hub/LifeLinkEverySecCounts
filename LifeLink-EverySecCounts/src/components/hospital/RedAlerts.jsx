import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, Phone, MapPin, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const RedAlerts = ({ alerts, onResolve }) => {
  const activeAlerts = alerts.filter(a => a.status === 'active');

  const getCriticalityColor = (criticality) => {
    switch (criticality) {
      case 'Critical': return 'bg-destructive text-destructive-foreground animate-pulse';
      case 'High': return 'bg-warning text-warning-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-destructive animate-pulse" />
            Red Alerts
          </h2>
          <p className="text-muted-foreground">Emergency cases requiring immediate attention</p>
        </div>
        {activeAlerts.length > 0 && (
          <div className="bg-destructive/20 text-destructive px-4 py-2 rounded-lg font-medium animate-pulse">
            🚨 {activeAlerts.length} Active Emergency {activeAlerts.length === 1 ? 'Case' : 'Cases'}
          </div>
        )}
      </div>

      {activeAlerts.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-success" />
            </div>
            <h3 className="text-lg font-medium text-foreground">No Active Emergencies</h3>
            <p className="text-muted-foreground mt-2">All emergency cases have been resolved</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {activeAlerts.map((alert) => (
            <Card key={alert.id} className={cn(
              "border-2 transition-all duration-300",
              alert.criticality === 'Critical' ? "border-destructive bg-destructive/5" : "border-warning bg-warning/5"
            )}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      alert.criticality === 'Critical' ? "bg-destructive/20" : "bg-warning/20"
                    )}>
                      <AlertTriangle className={cn(
                        "w-5 h-5",
                        alert.criticality === 'Critical' ? "text-destructive animate-pulse" : "text-warning"
                      )} />
                    </div>
                    <div>
                      <span className="text-lg">{alert.patientName}</span>
                      <p className="text-sm font-normal text-muted-foreground">
                        {alert.organNeeded} • Blood Group: {alert.bloodGroup}
                      </p>
                    </div>
                  </CardTitle>
                  <span className={cn("px-3 py-1 rounded-full text-xs font-bold", getCriticalityColor(alert.criticality))}>
                    {alert.criticality.toUpperCase()}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{alert.hospital}, {alert.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>Logged {formatDistanceToNow(alert.timeLogged, { addSuffix: true })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                    <Phone className="w-4 h-4" />
                    <span>{alert.contactNumber}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button 
                    className="flex-1" 
                    variant="destructive"
                    onClick={() => window.open(`tel:${alert.contactNumber}`)}
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Call Now
                  </Button>
                  <Button 
                    className="flex-1" 
                    variant="outline"
                    onClick={() => onResolve(alert.id)}
                  >
                    Mark Resolved
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {alerts.filter(a => a.status === 'resolved').length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-muted-foreground">Resolved Emergencies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.filter(a => a.status === 'resolved').map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg text-sm">
                  <div>
                    <span className="font-medium">{alert.patientName}</span>
                    <span className="text-muted-foreground ml-2">• {alert.organNeeded}</span>
                  </div>
                  <span className="text-success text-xs">✓ Resolved</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RedAlerts;