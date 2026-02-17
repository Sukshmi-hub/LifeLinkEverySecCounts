import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, X, Play, User, Heart, Clock, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/context/NotificationContext';
import { formatDistanceToNow } from 'date-fns';

const ManageRequests = () => {
  const { organRequests, updateOrganRequestStatus, simulateDonorMatch, addNotification } = useNotifications();
  const [hospitalOrganRequests, setHospitalOrganRequests] = useState([]);
  const [showOrganDetails, setShowOrganDetails] = useState(false);
  const [organDetails, setOrganDetails] = useState(null);

  const [pendingUsers, setPendingUsers] = useState([]);
  const [showDetailsOpen, setShowDetailsOpen] = useState(false);
  const [detailsUser, setDetailsUser] = useState(null);
  const [loadingPending, setLoadingPending] = useState(false);
  const [pendingError, setPendingError] = useState(null);

  const [donorRequests, setDonorRequests] = useState([
    { id: 'dr1', name: 'Rahul Sharma', organOffered: 'Kidney', bloodGroup: 'O+', availability: 'Available', status: 'pending', createdAt: new Date(Date.now() - 1800000) },
    { id: 'dr2', name: 'Priya Patel', organOffered: 'Liver', bloodGroup: 'A+', availability: 'Available', status: 'pending', createdAt: new Date(Date.now() - 5400000) },
  ]);

  // Helper to robustly extract a person's name from possible backend shapes
  const extractName = (r) => {
    return (
      r?.patientId?.name ||
      r?.patientId?.fullName ||
      r?.patientId?.user?.name ||
      r?.requestedBy?.name ||
      r?.requestedBy?.user?.name ||
      r?.patientName ||
      r?.name ||
      'Unknown'
    );
  };

  const handleUserVerification = (userId, action) => {
    // Local optimistic update
    setPendingUsers(prev => prev.map(u => u.id === userId ? { ...u, status: action } : u));
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

  // Approve/reject via backend
  const handleApproveRequest = async (requestId) => {
    try {
      const token = localStorage.getItem('token');
      const resp = await fetch(`http://localhost:5000/api/hospital-requests/${requestId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.message || 'Failed to approve');
      setPendingUsers(prev => prev.filter(p => p.requestId !== requestId));
      addNotification({ type: 'success', title: 'Request Approved', message: 'Verification request approved.' });
    } catch (err) {
      addNotification({ type: 'error', title: 'Approve Failed', message: err.message || 'Could not approve' });
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      const token = localStorage.getItem('token');
      const resp = await fetch(`http://localhost:5000/api/hospital-requests/${requestId}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rejectionReason: 'Rejected by hospital' }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.message || 'Failed to reject');
      setPendingUsers(prev => prev.filter(p => p.requestId !== requestId));
      addNotification({ type: 'error', title: 'Request Rejected', message: 'Verification request rejected.' });
    } catch (err) {
      addNotification({ type: 'error', title: 'Reject Failed', message: err.message || 'Could not reject' });
    }
  };

  useEffect(() => {
    // Load hospital organ requests for hospital users
    const loadHospitalOrganRequests = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const resp = await fetch('http://localhost:5000/api/hospital-requests/organ-requests', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await resp.json();
        // DEBUG: inspect response shape when patient name is missing
        console.debug('hospital organ-requests response:', json);
        if (resp.ok && Array.isArray(json.data)) {
          setHospitalOrganRequests(json.data.map(r => ({
            id: r._id,
            patientName: extractName(r),
            organType: r.organType,
            urgency: r.urgency,
            status: r.status,
            createdAt: r.createdAt,
            details: r.message || r.details || '',
            raw: r,
          })));
        }
      } catch (err) {
        console.error('Failed to load hospital organ requests', err);
      }
    };
    loadHospitalOrganRequests();
    const fetchPending = async () => {
      setLoadingPending(true);
      setPendingError(null);
      try {
        const token = localStorage.getItem('token');
        const resp = await fetch('http://localhost:5000/api/hospital-requests/verify', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await resp.json();
        // DEBUG: inspect pending verification response
        console.debug('hospital verify response:', json);
        if (!resp.ok) throw new Error(json.message || 'Failed to load pending verifications');

        // Map backend requests to UI shape
        const mapped = (json.data || []).map(r => {
          const isPatient = !!r.patientId;
          const person = isPatient ? r.patientId : r.donorId || r.requestedBy;
          // Merge requester and person objects so we have fallback fields available
          const mergedDetails = { ...(r.requestedBy || {}), ...(person || {}) };
          return {
            id: r._id,
            requestId: r._id,
            name: mergedDetails?.name || mergedDetails?.fullName || mergedDetails?.user?.name || 'Unknown',
            type: isPatient ? 'patient' : 'donor',
            organType: r.organType || (isPatient && mergedDetails?.organ_needed) || '',
            status: r.status || 'pending',
            requestedAt: r.createdAt,
            details: Object.keys(mergedDetails).length ? mergedDetails : null,
          };
        });
        setPendingUsers(mapped);
      } catch (err) {
        setPendingError(err.message || 'Failed to load');
      } finally {
        setLoadingPending(false);
      }
    };

    fetchPending();
  }, []);

  // Approve/Reject organ request (calls backend then updates local state + notifies patient)
  const handleAcceptOrganRequest = async (requestId) => {
    try {
      const token = localStorage.getItem('token');
      const resp = await fetch(`http://localhost:5000/api/hospital-requests/${requestId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.message || 'Failed to accept request');

      // Update local hospital list
      setHospitalOrganRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'Accepted' } : r));

      // Notify patient via notification context
      updateOrganRequestStatus(requestId, 'Accepted');
    } catch (err) {
      console.error('Accept organ request failed', err);
    }
  };

  const handleRejectOrganRequest = async (requestId) => {
    try {
      const token = localStorage.getItem('token');
      const resp = await fetch(`http://localhost:5000/api/hospital-requests/${requestId}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rejectionReason: 'Rejected by hospital' }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.message || 'Failed to reject request');

      setHospitalOrganRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'Rejected' } : r));
      updateOrganRequestStatus(requestId, 'Rejected');
    } catch (err) {
      console.error('Reject organ request failed', err);
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
                  {!localStorage.getItem('token') ? (
                    <p className="text-center py-8 text-muted-foreground">No server token found. Please login with server credentials so hospital requests can be loaded.</p>
                  ) : loadingPending ? (
                    <p className="text-center py-8 text-muted-foreground">Loading pending verifications...</p>
                  ) : pendingError ? (
                    <p className="text-center py-8 text-destructive">Failed to load verifications: {pendingError}</p>
                  ) : pendingUsers.filter(u => u.status === 'pending').length === 0 ? (
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
                          className="text-primary border-border"
                          onClick={() => { setDetailsUser(user); setShowDetailsOpen(true); }}
                        >
                          <Eye className="w-4 h-4 mr-1" /> Details
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-success border-success hover:bg-success/10"
                          onClick={() => handleApproveRequest(user.requestId)}
                        >
                          <Check className="w-4 h-4 mr-1" /> Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-destructive border-destructive hover:bg-destructive/10"
                          onClick={() => handleRejectRequest(user.requestId)}
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
              {hospitalOrganRequests.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No organ requests yet</p>
              ) : (
                <div className="space-y-4">
                  {hospitalOrganRequests.map(req => (
                    <div key={req.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
                      <div>
                        <h4 className="font-medium">{req.patientName}</h4>
                        <p className="text-sm text-muted-foreground">
                          {req.organType} • Urgency: <span className={req.urgency === 'high' || req.urgency === 'High' ? 'text-destructive font-medium' : ''}>{req.urgency}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(req.createdAt, { addSuffix: true })}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn("px-3 py-1 rounded-full text-xs font-medium", getStatusColor(req.status))}>
                          {req.status}
                        </span>
                        <Button size="sm" variant="outline" onClick={() => { setOrganDetails(req); setShowOrganDetails(true); }}>
                          <Eye className="w-4 h-4 mr-1" /> Details
                        </Button>
                        {req.status === 'pending' && (
                          <>
                            <Button size="sm" variant="outline" className="text-success" onClick={() => handleAcceptOrganRequest(req.id)}>
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleRejectOrganRequest(req.id)}>
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
      {/* Details Dialog */}
      <Dialog open={showDetailsOpen} onOpenChange={setShowDetailsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Applicant Details</DialogTitle>
            <DialogDescription>View information submitted by the applicant.</DialogDescription>
          </DialogHeader>
          <div className="mt-2 space-y-2">
            {detailsUser && detailsUser.details ? (
              (() => {
                const d = detailsUser.details;
                const phone = d.phone || d.mobile || d.contact || d.phoneNumber || d.contact_number || '—';
                const address = d.location?.full_address || d.full_address || d.address || d.location?.address || d.location?.city || '—';
                const aadhaar = d.aadhaar_no || d.aadhaarNumber || d.aadhaar || '—';
                const blood = d.blood_type || d.bloodGroup || '—';
                const email = d.email || d.contact?.email || '—';
                const age = d.age ?? '—';
                return (
                  <div className="text-sm">
                    <p><strong>Name:</strong> {d.name || detailsUser.name}</p>
                    <p><strong>Email:</strong> {email}</p>
                    <p><strong>Phone:</strong> {phone}</p>
                    <p><strong>Aadhaar:</strong> {aadhaar}</p>
                    <p><strong>Age:</strong> {age}</p>
                    <p><strong>Blood Type:</strong> {blood}</p>
                    <p><strong>Address:</strong> {address}</p>
                  </div>
                );
              })()
            ) : (
              <p className="text-sm text-muted-foreground">No additional details available for this user.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* Organ Request Details Dialog */}
      <Dialog open={showOrganDetails} onOpenChange={setShowOrganDetails}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Organ Request Details</DialogTitle>
            <DialogDescription>Details submitted by the patient for this organ request.</DialogDescription>
          </DialogHeader>
          <div className="mt-2 space-y-2">
              {organDetails ? (
              <div className="text-sm space-y-2">
                <p>
                  <strong>Patient:</strong>{' '}
                  {organDetails.patientName || (
                    organDetails.raw
                      ? organDetails.raw.patientId?.name || organDetails.raw.requestedBy?.name || organDetails.raw.patientName || organDetails.raw.name
                      : 'Unknown'
                  )}
                </p>
                <p><strong>Organ:</strong> {organDetails.organType}</p>
                <p><strong>Urgency:</strong> {organDetails.urgency}</p>
                <p><strong>Submitted:</strong> {formatDistanceToNow(organDetails.createdAt, { addSuffix: true })}</p>
                <p><strong>Notes:</strong> {organDetails.details || '—'}</p>
                {/* Show uploaded files if available */}
                {organDetails.raw && organDetails.raw.files && (
                  <div className="pt-2">
                    <p className="font-medium">Uploaded Documents:</p>
                    <div className="mt-2 space-y-2">
                      {organDetails.raw.files.medicalReports && organDetails.raw.files.medicalReports.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground">Medical Reports:</p>
                          <div className="flex gap-2 mt-1 flex-wrap">
                            {organDetails.raw.files.medicalReports.map((f, i) => {
                              const src = f.startsWith('/') ? `http://localhost:5000${f}` : f
                              return (
                                <a key={i} href={src} target="_blank" rel="noreferrer" className="block w-24 h-24 bg-muted rounded overflow-hidden border">
                                  <img src={src} alt={`medical-${i}`} className="w-full h-full object-cover" />
                                </a>
                              )
                            })}
                          </div>
                        </div>
                      )}
                      {organDetails.raw.files.prescription && (
                        <div>
                          <p className="text-xs text-muted-foreground">Prescription:</p>
                          <a href={organDetails.raw.files.prescription.startsWith('/') ? `http://localhost:5000${organDetails.raw.files.prescription}` : organDetails.raw.files.prescription} target="_blank" rel="noreferrer" className="text-sm text-primary">Open Prescription</a>
                        </div>
                      )}
                      {organDetails.raw.files.idProof && (
                        <div>
                          <p className="text-xs text-muted-foreground">ID Proof:</p>
                          <a href={organDetails.raw.files.idProof.startsWith('/') ? `http://localhost:5000${organDetails.raw.files.idProof}` : organDetails.raw.files.idProof} target="_blank" rel="noreferrer" className="text-sm text-primary">Open ID Proof</a>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No details available.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageRequests;