import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, Check, CheckCheck, User, Heart, Building2, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/context/NotificationContext';
import { formatDistanceToNow } from 'date-fns';

const HospitalNotifications = () => {
  const { notifications, markAsRead, markAllAsRead, getUnreadCount } = useNotifications();
  
  const hospitalNotifications = notifications.filter(n => n.targetRole === 'hospital');
  const unreadCount = getUnreadCount('hospital');

  const getNotificationIcon = (type, title) => {
    if (title.toLowerCase().includes('patient')) return <User className="w-5 h-5" />;
    if (title.toLowerCase().includes('donor')) return <Heart className="w-5 h-5" />;
    if (title.toLowerCase().includes('emergency') || title.toLowerCase().includes('alert')) return <AlertTriangle className="w-5 h-5" />;
    if (title.toLowerCase().includes('hospital')) return <Building2 className="w-5 h-5" />;
    return <Bell className="w-5 h-5" />;
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'success': return 'bg-success/20 text-success';
      case 'warning': return 'bg-warning/20 text-warning';
      case 'error': return 'bg-destructive/20 text-destructive';
      default: return 'bg-primary/20 text-primary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Notifications</h2>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={() => markAllAsRead('hospital')}>
            <CheckCheck className="w-4 h-4 mr-2" />
            Mark All Read
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hospitalNotifications.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground">No notifications yet</h3>
              <p className="text-muted-foreground mt-2">You'll see patient requests and updates here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {hospitalNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "flex items-start gap-4 p-4 rounded-lg border border-border transition-all cursor-pointer hover:bg-muted/50",
                    !notification.read && "bg-primary/5 border-primary/20"
                  )}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                    getNotificationColor(notification.type)
                  )}>
                    {getNotificationIcon(notification.type, notification.title)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className={cn("font-medium", !notification.read && "text-foreground")}>
                        {notification.title}
                      </h4>
                      {!notification.read && (
                        <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                    </p>
                  </div>
                  {!notification.read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notification.id);
                      }}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HospitalNotifications;