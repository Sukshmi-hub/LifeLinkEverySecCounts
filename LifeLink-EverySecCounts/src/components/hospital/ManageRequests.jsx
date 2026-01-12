import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, X, Play, User, Heart, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/context/NotificationContext';
import { formatDistanceToNow } from 'date-fns';

const ManageRequests = () => {
  const { organRequests, updateOrganRequestStatus, simulateDonorMatch, addNotification } = useNotifications();

  const [pendingUsers, setPendingUsers] = useState([
    { id: 'pu1', name: 'Rajesh Kumar', type: 'patient', organType: 'Kidney', status: 'pending', requestedAt: new Date(Date.now() - 3600000) },
    { id: 'pu2', name: 'Sunita Devi', type: 'patient', organType: 'Liver', status: 'pending', requestedAt: new Date(Date.now() - 7200000) },
  ]);

  const [donorRequests, setDonorRequests] = useState([
    { id: 'dr1', name: 'Rahul Sharma', organOffered: 'Kidney', bloodGroup: 'O+', availability: 'Available', status: 'pending', createdAt: new Date(Date.now() - 1800000) },
    { id: 'dr2', name: 'Priya Patel', organOffered: 'Liver', bloodGroup: 'A+', availability: 'Available', status: 'pending', createdAt: new Date(Date.now() - 5400000) },
  ]);

  const handleUserVerification = (userId, action) => {
    setPendingUsers(prev => prev.map(u => 
      u.id === userId ? { ...u, status: action } : u
    ));
    const user = pendingUsers.find(u => u.id === userId);
    if (user) {
      addNotification({
        type: action === 'approved' ? 'success' : 'error',
        title: `${user.type === 'patient' ? 'Patient' : 'Donor'} Verification`,
        message: `${user.name} has been ${action}.`,
        targetRole: user.type,
      });
    }
  };

  const handleDonorRequestAction = (donorId, action) => {
    setDonorRequests(prev => prev.map(d => 
      d.id === donorId ? { ...d, status: action } : d
    ));
    const donor = donorRequests.find(d => d.id === donorId);
    if (donor) {
      addNotification({
        type: action === 'approved' ? 'success' : 'error',
        title: 'Donor Request Update',
        message: `Your donation offer for ${donor.organOffered} has been ${action}.`,
        targetRole: 'donor',
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Accepted': case 'Donor Matched': case 'approved': return 'bg-success/20 text-success';
      case 'Rejected': case 'rejected': return 'bg-destructive/20 text-destructive';
      case 'In Progress': return 'bg-warning/20 text-warning';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Manage Requests</h2>
        <p className="text-muted-foreground">Review and manage patient & donor requests</p>
      </div>

      <Tabs defaultValue="patients" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="verification">User Verification</TabsTrigger>
          <TabsTrigger value="patients">Patient Requests</TabsTrigger>
          <TabsTrigger value="donors">Donor Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="verification" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Pending Verifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingUsers.filter(u => u.status === 'pending').length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No pending verifications</p>
              ) : (
                <div className="space-y-4">
                  {pendingUsers.filter(u => u.status === 'pending').map(user => (
                    <div key={user.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center",
                          user.type === 'patient' ? "bg-primary/20" : "bg-success/20"
                        )}>
                          <User className={cn(
                            "w-6 h-6",
                            user.type === 'patient' ? "text-primary" : "text-success"
                          )} />
                        </div>
                        <div>
                          <h4 className="font-medium">{user.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {user.type === 'patient' ? '🧑‍⚕️ Patient' : '🩸 Donor'} • {user.organType || 'General'}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(user.requestedAt, { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-success border-success hover:bg-success/10"
                          onClick={() => handleUserVerification(user.id, 'approved')}
                        >
                          <Check className="w-4 h-4 mr-1" /> Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-destructive border-destructive hover:bg-destructive/10"
                          onClick={() => handleUserVerification(user.id, 'rejected')}
                        >
                          <X className="w-4 h-4 mr-1" /> Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patients" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-destructive" />
                Patient Organ Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {organRequests.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No organ requests yet</p>
              ) : (
                <div className="space-y-4">
                  {organRequests.map(req => (
                    <div key={req.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
                      <div>
                        <h4 className="font-medium">{req.patientName}</h4>
                        <p className="text-sm text-muted-foreground">
                          {req.organType} • Urgency: <span className={req.urgency === 'High' ? 'text-destructive font-medium' : ''}>{req.urgency}</span>
                        </p>
                        {req.notes && <p className="text-xs text-muted-foreground mt-1">Notes: {req.notes}</p>}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(req.createdAt, { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn("px-3 py-1 rounded-full text-xs font-medium", getStatusColor(req.status))}>
                          {req.status}
                        </span>
                        {req.status === 'Pending – Hospital Review' && (
                          <>
                            <Button size="sm" variant="outline" className="text-success" onClick={() => updateOrganRequestStatus(req.id, 'Accepted')}>
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" className="text-destructive" onClick={() => updateOrganRequestStatus(req.id, 'Rejected')}>
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {req.status === 'Accepted' && (
                          <Button size="sm" onClick={() => simulateDonorMatch(req.id, 'Rahul Sharma')}>
                            <Play className="w-4 h-4 mr-1" /> Match Donor
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="donors" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-success" />
                Donor Availability
              </CardTitle>
            </CardHeader>
            <CardContent>
              {donorRequests.filter(d => d.status === 'pending').length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No pending donor requests</p>
              ) : (
                <div className="space-y-4">
                  {donorRequests.filter(d => d.status === 'pending').map(donor => (
                    <div key={donor.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
                      <div>
                        <h4 className="font-medium">{donor.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Organ: {donor.organOffered} • Blood Group: {donor.bloodGroup}
                        </p>
                        <p className="text-xs mt-1">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-xs",
                            donor.availability === 'Available' ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
                          )}>
                            {donor.availability}
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-success"
                          onClick={() => handleDonorRequestAction(donor.id, 'approved')}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-destructive"
                          onClick={() => handleDonorRequestAction(donor.id, 'rejected')}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ManageRequests;