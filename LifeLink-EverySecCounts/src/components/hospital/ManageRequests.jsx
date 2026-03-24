import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, X, Play, User, Heart, Clock, Eye, AlertOctagon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import FundRequestDetails from '@/components/ngo/FundRequestDetails';
import HospitalReportModal from '@/components/hospital/HospitalReportModal';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
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

  const [donorRequests, setDonorRequests] = useState([]);
  const [hospitalNgoFundRequests, setHospitalNgoFundRequests] = useState([]);
  const [showSendPaymentModal, setShowSendPaymentModal] = useState(false);
  const [sendPaymentLoading, setSendPaymentLoading] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ surgeryFee: 0, hospitalCharges: 0, processingFee: 0 });
  const [selectedForPayment, setSelectedForPayment] = useState(null);
  const [selectedDonorForMatch, setSelectedDonorForMatch] = useState(null);
  const [showNgoDetails, setShowNgoDetails] = useState(false);
  const [selectedNgoRequest, setSelectedNgoRequest] = useState(null);
  
  // Report modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportingUser, setReportingUser] = useState(null); // { name, type, userId, raw }

  // Helper to robustly extract a person's name from possible backend shapes
  const getNameFromObject = (obj) => {
    if (!obj) return null;
    if (typeof obj === 'string') return null;
    if (Array.isArray(obj)) obj = obj[0];
    const keys = Object.keys(obj || {});
    for (const k of keys) {
      if (/name|fullname|firstName|lastName/i.test(k) && typeof obj[k] === 'string' && obj[k].trim()) return obj[k];
    }
    // common nested path
    if (obj.user && typeof obj.user === 'object') {
      const fromUser = getNameFromObject(obj.user);
      if (fromUser) return fromUser;
    }
    return null;
  };

  const extractName = (r) => {
    if (!r) return 'Unknown';
    // try direct fields
    const candidates = [
      r.patientName,
      r.name,
      r.requestedBy?.name,
      r.requestedBy?.user?.name,
    ];
    for (const c of candidates) if (c && typeof c === 'string' && c.trim()) return c;

    // try patientId which may be object/array/string
    const pid = r.patientId;
    const fromPid = getNameFromObject(pid);
    if (fromPid) return fromPid;

    // try requestedBy object
    const fromReq = getNameFromObject(r.requestedBy);
    if (fromReq) return fromReq;

    // last resort: scan raw object shallowly
    const raw = r.raw || r;
    const fromRaw = getNameFromObject(raw);
    if (fromRaw) return fromRaw;

    return 'Unknown';
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
            // include persisted payment info so UI shows 'Sent' after refresh
            paymentSent: Boolean(r.paymentSent),
            paymentId: r.paymentId || null,
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
    // Load donor registration requests for this hospital
    const loadDonorRequests = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const resp = await fetch('http://localhost:5000/api/hospital-requests/donor-requests', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await resp.json();
        console.debug('hospital donor-requests response:', json);
        if (resp.ok && Array.isArray(json.data)) {
          const mapped = json.data.map(r => {
            // donor info may be in r.donorId or r.requestedBy
            const donorObj = r.donorId || r.requestedBy || {};
            const name = donorObj.name || donorObj.fullName || donorObj.user?.name || extractName(r) || 'Unknown';
            const organOffered = r.organType || (r.bloodType ? 'Blood' : '') || '';
            const bloodGroup = r.bloodType || donorObj.blood_type || donorObj.bloodGroup || '';
            // merge requester and donor objects to have a comprehensive details object
            const mergedDetails = { ...(r.requestedBy || {}), ...(donorObj || {}) };
            return {
              id: r._id,
              name,
              organOffered,
              bloodGroup,
              availability: 'Available',
              status: r.status || 'pending',
              createdAt: r.createdAt,
              raw: r,
              details: Object.keys(mergedDetails).length ? mergedDetails : null,
            };
          });
          setDonorRequests(mapped);
        }
      } catch (e) {
        console.error('Failed to load donor requests', e);
      }
    };
    loadDonorRequests();

    // Load fund requests that target NGOs but belong to this hospital (for hospital staff review)
    const loadHospitalNgoFundRequests = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const hospitalId = localStorage.getItem('hospitalId') || null;
        // If we have a hospitalId, prefer querying by it. Otherwise, fetch fund requests and
        // filter for items with status 'SentToHospital' so NGO-sent requests still appear.
        const baseUrl = hospitalId ? ('http://localhost:5000/api/requests?hospitalId=' + encodeURIComponent(hospitalId)) : 'http://localhost:5000/api/requests?requestType=fund_request';
        const resp = await fetch(baseUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await resp.json();
        console.debug('hospital NGO fund-requests response:', json);
        if (resp.ok && Array.isArray(json.data)) {
          // if hospitalId is present, use backend filtering; otherwise filter SentToHospital locally
          const rawList = Array.isArray(json.data) ? json.data : [];
          const candidates = hospitalId ? rawList : rawList.filter(r => String(r.status).toLowerCase() === 'senttohospital' || String(r.status).toLowerCase() === 'senttohos' || String(r.status).toLowerCase() === 'senttohospital');
          const mapped = candidates.filter(r => r.requestType === 'fund_request').map(r => {
                // derive patient name from common locations
                const pName = r.patientName || (r.patientId && (r.patientId.name || r.patientId.fullName || r.patientId.displayName)) || (r.raw && (r.raw.patientName || r.raw.patientId && (r.raw.patientId.name))) || 'Unknown';
                // derive amount: prefer r.amount, then payment breakdown total, then sum of top-level fields
                const breakdown = r.breakdown || { transplantFee: r.transplantFee || 0, hospitalCharges: r.hospitalCharges || 0, processingFee: r.processingFee || 0 };
                const amt = Number(r.amount || 0) || Number(breakdown.transplantFee || 0) + Number(breakdown.hospitalCharges || 0) + Number(breakdown.processingFee || 0) || 0;
                return {
                  id: r._id,
                  patientName: pName,
                  amount: amt,
                  status: r.status || 'pending',
                  createdAt: r.createdAt,
                  breakdown,
                  raw: r,
                };
              });
              setHospitalNgoFundRequests(mapped);
        }
      } catch (e) {
        console.error('Failed to load hospital NGO fund requests', e);
      }
    };
    loadHospitalNgoFundRequests();
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

      // Notify patient explicitly so notification is delivered regardless of context organRequests id mapping
      const reqObj = hospitalOrganRequests.find(r => r.id === requestId) || null;
      const patientName = reqObj?.patientName || extractName(reqObj) || 'patient';
      const organType = reqObj?.organType || 'organ';

      addNotification({
        type: 'success',
        title: 'Request Accepted',
        message: `Your ${organType} request has been accepted by the hospital.`,
        targetRole: 'patient',
      });

      // Also update shared organRequests state if present
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

      const reqObj = hospitalOrganRequests.find(r => r.id === requestId) || null;
      const patientName = reqObj?.patientName || extractName(reqObj) || 'patient';
      const organType = reqObj?.organType || 'organ';

      addNotification({
        type: 'error',
        title: 'Request Rejected',
        message: `Your ${organType} request has been rejected by the hospital.`,
        targetRole: 'patient',
      });

      updateOrganRequestStatus(requestId, 'Rejected');
    } catch (err) {
      console.error('Reject organ request failed', err);
    }
  };

  const handleDonorRequestAction = async (requestId, action) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Not authenticated');

      const endpoint = action === 'approved' ? 'approve' : 'reject';
      const url = `http://localhost:5000/api/hospital-requests/${requestId}/${endpoint}`;
      const opts = {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      };
      if (action === 'rejected') {
        opts.body = JSON.stringify({ rejectionReason: 'Rejected by hospital' });
      }

      const resp = await fetch(url, opts);
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.message || 'Failed to update donor request');

      // Update local UI state
      setDonorRequests(prev => prev.map(d => (d.id === requestId ? { ...d, status: action === 'approved' ? 'approved' : 'rejected' } : d)));

      // Notify donor
      const donor = donorRequests.find(d => d.id === requestId);
      addNotification({
        type: action === 'approved' ? 'success' : 'error',
        title: 'Donor Request Update',
        message: `Your donation offer${donor && donor.organOffered ? ` for ${donor.organOffered}` : ''} has been ${action}.`,
        targetRole: 'donor',
      });

      // Optionally: refresh hospital dashboard/inventory elsewhere. The backend increments inventory on approve.
    } catch (err) {
      addNotification({ type: 'error', title: 'Donor Action Failed', message: err.message || 'Could not update donor request' });
      console.error('Donor request action failed', err);
    }
  };

  // Handle report submission for patient or donor
  const handleSubmitReport = async (reportData) => {
    if (!reportingUser) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Not authenticated');

      const raw = reportingUser.raw || {};
      
      // Simple approach: Send patient_id/donor_id + type to backend
      // Backend will resolve the user ID from the Patient/Donor collection
      const payload = {
        reason: reportData.reason,
        description: reportData.description || '',
        user_type: reportingUser.type,
      };

      if (reportingUser.type === 'patient') {
        // Get patient ID from request
        payload.patient_id = raw.patientId?._id || raw.patientId?.id || raw.patientId;
        console.log('Reporting patient with ID:', payload.patient_id);
      } else if (reportingUser.type === 'donor') {
        // Get donor ID from request
        payload.donor_id = raw.donorId?._id || raw.donorId?.id || raw.donorId;
        console.log('Reporting donor with ID:', payload.donor_id);
      }

      if (!payload.patient_id && !payload.donor_id) {
        throw new Error('Could not identify patient/donor to report. Please refresh and try again.');
      }

      console.log('Submitting report with payload:', payload);

      // Submit report to moderation API
      const resp = await fetch('http://localhost:5000/api/moderation/report-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await resp.json();
      console.log('Report response status:', resp.status, 'Message:', json.message);

      if (!resp.ok) {
        throw new Error(json.message || `Server error: ${json.error || 'Failed to submit report'}`);
      }

      // Show success toast
      toast.success(
        `${reportingUser.type === 'donor' ? 'Donor' : 'Patient'} reported successfully`,
        {
          description: 'Admins will review this report and take appropriate action.',
        }
      );

      // Reset report state
      setReportingUser(null);
      setShowReportModal(false);
    } catch (err) {
      console.error('Report submission failed:', err);
      toast.error('Failed to submit report', {
        description: err.message || 'Please try again later.',
      });
      throw err;
    }
  };

  // Helper to open report modal for a patient or donor
  const openReportModal = (name, type, raw) => {
    setReportingUser({
      name,
      type, // 'patient' or 'donor'
      raw,
    });
    setShowReportModal(true);
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="verification">Patient Verification</TabsTrigger>
          <TabsTrigger value="patients">Patient Requests</TabsTrigger>
          <TabsTrigger value="ngo">NGO Pay Verify</TabsTrigger>
          <TabsTrigger value="donors">Donor Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="verification" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Patient Verifications
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
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-warning hover:bg-warning/10"
                          title="Report this patient to admin"
                          onClick={() => openReportModal(req.patientName, 'patient', req)}
                        >
                          <AlertOctagon className="w-4 h-4" />
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
                        {/* Show Match Donor button for accepted/approved statuses (tolerant to variants/casing) */}
                        {/(accepted|approved|accept)/i.test(String(req.status || '')) && (
                          <>
                            {!req.paymentSent ? (
                              <Button size="sm" onClick={() => { setSelectedForPayment(req); setSelectedDonorForMatch(null); setShowSendPaymentModal(true); }}>
                                <Play className="w-4 h-4 mr-1" /> Match Donor
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" disabled>
                                Sent
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ngo" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Patients of Your Hospital Requested for Fund in NGO
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hospitalNgoFundRequests.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No fund requests for your hospital found</p>
              ) : (
                <div className="space-y-4">
                  {hospitalNgoFundRequests.map(req => (
                    <div key={req.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
                      <div>
                        <h4 className="font-medium">{req.patientName}</h4>
                        <p className="text-sm text-muted-foreground">Amount: ₹{(req.amount || 0).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground mt-1">{new Date(req.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {req.status === 'SentToHospital' ? (
                          <div className="flex items-center gap-2">
                            <Button size="sm" onClick={async () => {
                              try {
                                const token = localStorage.getItem('token')
                                const resp = await fetch(`http://localhost:5000/api/requests/${req.id}/verify-by-hospital`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
                                })
                                const json = await resp.json().catch(() => ({}))
                                if (!resp.ok) throw new Error(json.message || 'Failed to verify')
                                // remove from hospital list so NGO sees the VerifiedByHospital status
                                setHospitalNgoFundRequests(prev => prev.filter(p => p.id !== req.id))
                                toast.success('Request marked for hospital verification')
                              } catch (err) {
                                console.error('Verify by hospital failed', err)
                                toast.error(err.message || 'Failed to verify request')
                              }
                            }} className="bg-success/10 hover:bg-success/20 text-success">
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { 
                              const raw = req.raw || req;
                              const details = raw.patientId || raw.requestedBy || raw.patient || raw.patientDetails || null;
                              setDetailsUser({ name: req.patientName || extractName(raw) || 'Unknown', details, raw, amount: req.amount || 0 });
                              setShowDetailsOpen(true);
                            }}>
                              <Eye className="w-4 h-4 mr-1" /> Details
                            </Button>
                          </div>
                        ) : (
                          <>
                            <span className={cn("px-3 py-1 rounded-full text-xs font-medium", req.status === 'Approved' ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground')}>
                              {req.status || 'pending'}
                            </span>
                            <Button size="sm" variant="outline" onClick={() => { 
                              const raw = req.raw || req;
                              const details = raw.patientId || raw.requestedBy || raw.patient || raw.patientDetails || null;
                              setDetailsUser({ name: req.patientName || extractName(raw) || 'Unknown', details, raw, amount: req.amount || 0 });
                              setShowDetailsOpen(true);
                            }}>
                              <Eye className="w-4 h-4 mr-1" /> Details
                            </Button>
                          </>
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
                    <div key={donor.id} className="p-4 bg-muted/30 rounded-lg border border-border">
                      <div className="flex gap-4 items-start">
                        {/* Left: details box */}
                        <div className="w-1/3 min-w-[220px] pr-4">
                          <h4 className="font-medium">{donor.name}</h4>
                          <p className="text-sm text-muted-foreground mt-2">Organ: {donor.organOffered || '—'} • Blood Group: {donor.bloodGroup || '—'}</p>
                          <p className="mt-2">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-xs",
                              donor.availability === 'Available' ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
                            )}>
                              {donor.availability}
                            </span>
                          </p>
                        </div>

                        {/* Right: actions only (organ/blood shown on left preview) */}
                        <div className="flex-1 flex items-center justify-end">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => { setDetailsUser({ name: donor.name, details: donor.details, raw: donor.raw }); setShowDetailsOpen(true); }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-warning hover:bg-warning/10"
                              title="Report this donor to admin"
                              onClick={() => openReportModal(donor.name, 'donor', donor.raw)}
                            >
                              <AlertOctagon className="w-4 h-4" />
                            </Button>
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
                const d = detailsUser.details || {};
                const raw = detailsUser.raw || {};
                const phone = d.phone || d.mobile || d.contact || d.phoneNumber || d.contact_number || d.primaryPhone || d.user?.phone || raw.phone || raw.donorPhone || raw.requestedBy?.phone || raw.donorId?.phone || '—';
                const aadhaar = d.aadhaar_no || d.aadhaarNumber || d.aadhaar || d.aadhaarNo || d.aadhaarNo?.toString?.() || raw.aadhaar || raw.donorId?.aadhaar || raw.requestedBy?.aadhaar || '—';
                const address = d.location?.full_address || d.full_address || d.address || d.location?.address || d.location?.city || d.city || '—';
                const blood = d.blood_type || d.bloodGroup || detailsUser.bloodGroup || '—';
                const email = d.email || d.contact?.email || d.user?.email || '—';
                const age = d.age ?? d.dob ?? '—';

                // Find uploaded documents in multiple possible locations/keys
                const files = detailsUser.raw?.files || detailsUser.details?.files || {};
                const getFile = (keys) => {
                  for (const k of keys) {
                    if (!files) continue;
                    if (files[k]) return files[k];
                    // sometimes files stored under details object
                    if (detailsUser.details && detailsUser.details[k]) return detailsUser.details[k];
                  }
                  return null;
                };

                const fitness = getFile(['fitnessCertificate', 'fitness_certificate', 'fitness', 'fitnessCert']);
                const bloodReport = getFile(['bloodGroupReport', 'blood_group_report', 'bloodReport', 'blood_report']);
                const idProof = getFile(['identityProof', 'idProof', 'identity_proof', 'id_proof', 'identity']);

                const renderFileLink = (f) => {
                  if (!f) return null;
                  // file could be string or array
                  if (Array.isArray(f)) f = f[0];
                  const src = typeof f === 'string' && f.startsWith('/') ? `http://localhost:5000${f}` : f;
                  return (
                    <a href={src} target="_blank" rel="noreferrer" className="text-sm text-primary block mt-1">Open</a>
                  );
                };

                return (
                  <div className="text-sm space-y-2">
                    <p><strong>Name:</strong> {d.name || detailsUser.name}</p>
                    <p><strong>Email:</strong> {email}</p>
                    <p><strong>Phone:</strong> {phone}</p>
                    <p><strong>Aadhaar:</strong> {aadhaar}</p>
                    <p><strong>Age/DOB:</strong> {age}</p>
                    {/* If this dialog was opened for a fund_request, show Amount instead of Blood Type */}
                    {detailsUser && detailsUser.raw && (detailsUser.raw.requestType === 'fund_request' || detailsUser.raw.requestType === 'fund') ? (
                      <p><strong>Amount:</strong> ₹{(detailsUser.amount || detailsUser.raw?.amount || detailsUser.details?.amount || 0).toLocaleString()}</p>
                    ) : (
                      <p><strong>Blood Type:</strong> {blood}</p>
                    )}
                    <p className="truncate"><strong>Address:</strong> {address}</p>

                    <div className="pt-2">
                      <p className="font-medium">Uploaded Documents:</p>
                      <div className="mt-2 space-y-2">
                        {fitness && (
                          <div>
                            <p className="text-xs text-muted-foreground">Fitness Certificate:</p>
                            {renderFileLink(fitness)}
                          </div>
                        )}
                        {bloodReport && (
                          <div>
                            <p className="text-xs text-muted-foreground">Blood Group Report:</p>
                            {renderFileLink(bloodReport)}
                          </div>
                        )}
                        {idProof && (
                          <div>
                            <p className="text-xs text-muted-foreground">Identity Proof:</p>
                            {renderFileLink(idProof)}
                          </div>
                        )}
                        {/* Fallback: show any file thumbnails if available */}
                        {files && typeof files === 'object' && Object.keys(files).length > 0 && (
                          <div>
                            {Object.keys(files).map((k, i) => {
                              // skip generic/additional bucket as it's rendered elsewhere or not needed
                              if (k === 'additional') return null;
                              const f = files[k];
                              if (!f) return null;
                              const fileItem = Array.isArray(f) ? f[0] : f;
                              const src = typeof fileItem === 'string' && fileItem.startsWith('/') ? `http://localhost:5000${fileItem}` : fileItem;
                              return (
                                <div key={i} className="mt-1">
                                  <p className="text-xs text-muted-foreground">{k}:</p>
                                  <a href={src} target="_blank" rel="noreferrer" className="text-sm text-primary">Open</a>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <p className="text-sm text-muted-foreground">No additional details available for this user.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* Match Donor Modal: show patient details and allow selecting a donor, then send full details to patient's hospital */}
      <Dialog open={showSendPaymentModal} onOpenChange={setShowSendPaymentModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Match Donor — Review Details</DialogTitle>
            <DialogDescription>Review patient details and select a donor to send full details to the patient's hospital.</DialogDescription>
          </DialogHeader>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="p-3 bg-muted/30 rounded">
              <p className="text-xs text-muted-foreground">Patient</p>
              <h4 className="font-medium">{selectedForPayment?.patientName || '—'}</h4>
              <p className="text-sm text-muted-foreground mt-2"><strong>Organ:</strong> {selectedForPayment?.organType || '—'}</p>
              <p className="text-sm text-muted-foreground"><strong>Urgency:</strong> {selectedForPayment?.urgency || '—'}</p>
              <div className="mt-3 text-sm space-y-2">
                {selectedForPayment?.raw && (
                  <>
                    {selectedForPayment.raw.patientName && <p><strong>Name:</strong> {selectedForPayment.raw.patientName}</p>}
                    {selectedForPayment.raw.patientId && selectedForPayment.raw.patientId.phone && <p><strong>Phone:</strong> {selectedForPayment.raw.patientId.phone}</p>}
                    {selectedForPayment.raw.patientId && selectedForPayment.raw.patientId.blood_type && <p><strong>Blood Group:</strong> {selectedForPayment.raw.patientId.blood_type}</p>}
                    {selectedForPayment.raw.message && <p><strong>Notes:</strong> {selectedForPayment.raw.message}</p>}
                    <p><strong>Admitted Hospital:</strong> {
                      (selectedForPayment.hospital && selectedForPayment.hospital.name)
                      || selectedForPayment.patientHospitalName
                      || selectedForPayment.hospitalName
                      || (selectedForPayment.raw && (selectedForPayment.raw.patientHospitalName || selectedForPayment.raw.hospitalName))
                      || (selectedForPayment.raw && selectedForPayment.raw.patientId && ((selectedForPayment.raw.patientId.hospital && selectedForPayment.raw.patientId.hospital.name) || selectedForPayment.raw.patientId.hospitalName || selectedForPayment.raw.patientId.admittedHospital))
                      || '—'
                    }</p>
                  </>
                )}
              </div>
            </div>

            <div className="p-3 bg-muted/30 rounded">
              <p className="text-xs text-muted-foreground">Select Donor</p>
              <div className="mt-2 space-y-2 max-h-64 overflow-auto">
                {donorRequests.filter(d => d.status !== 'Donor Matched').length === 0 ? (
                  <p className="text-sm text-muted-foreground">No donor registrations available</p>
                ) : donorRequests.filter(d => d.status !== 'Donor Matched').map(d => (
                  <div key={d.id} className={cn('p-2 rounded border', selectedDonorForMatch && selectedDonorForMatch.id === d.id ? 'border-primary bg-primary/10' : 'border-border')}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{d.name}</p>
                        <p className="text-xs text-muted-foreground">{d.organOffered || '—'} • Blood: {d.bloodGroup || '—'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => { setDetailsUser({ name: d.name, details: d.details, raw: d.raw }); setShowDetailsOpen(true); }}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" onClick={() => setSelectedDonorForMatch(d)}>
                          {selectedDonorForMatch && selectedDonorForMatch.id === d.id ? 'Selected' : 'Select'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowSendPaymentModal(false)}>Cancel</Button>
            <Button disabled={!selectedForPayment || !selectedDonorForMatch} onClick={async () => {
              if (!selectedForPayment || !selectedDonorForMatch) return;
              setSendPaymentLoading(true);
              try {
                const token = localStorage.getItem('token');
                // determine admitted/receiving hospital name to send
                const receivingHospitalName = (selectedForPayment && (selectedForPayment.patientHospitalName || selectedForPayment.hospitalName)) || (selectedForPayment && selectedForPayment.raw && (selectedForPayment.raw.patientHospitalName || selectedForPayment.raw.hospitalName)) || (selectedForPayment && selectedForPayment.raw && selectedForPayment.raw.patientId && (selectedForPayment.raw.patientId.hospitalName || selectedForPayment.raw.patientId.admittedHospital)) || null;
                // Build donor payload explicitly so backend always receives name/blood fields
                const donorPayloadBase = selectedDonorForMatch && (selectedDonorForMatch.raw || selectedDonorForMatch) ? (selectedDonorForMatch.raw || selectedDonorForMatch) : {};
                const donorPayload = { ...donorPayloadBase };
                if (selectedDonorForMatch && selectedDonorForMatch.name) donorPayload.name = selectedDonorForMatch.name;
                if (selectedDonorForMatch && selectedDonorForMatch.bloodGroup) {
                  donorPayload.bloodGroup = selectedDonorForMatch.bloodGroup;
                  donorPayload.blood_type = donorPayload.blood_type || selectedDonorForMatch.bloodGroup;
                }
                // ensure we include donorId (Donor._id) when available from the donor request raw object
                const possibleDonorId = (selectedDonorForMatch && (selectedDonorForMatch.id || selectedDonorForMatch._id)) || null;
                const rawDonorId = selectedDonorForMatch && selectedDonorForMatch.raw && (selectedDonorForMatch.raw.donorId || selectedDonorForMatch.raw.donor_id || selectedDonorForMatch.raw.donor?._id || selectedDonorForMatch.raw.donorId?._id) || null;
                const detailsDonorId = selectedDonorForMatch && selectedDonorForMatch.details && (selectedDonorForMatch.details.donorId || selectedDonorForMatch.details.donor_id || selectedDonorForMatch.details._id) || null;
                if (rawDonorId) donorPayload.donorId = donorPayload.donorId || rawDonorId;
                else if (detailsDonorId) donorPayload.donorId = donorPayload.donorId || detailsDonorId;
                else if (possibleDonorId) donorPayload.id = donorPayload.id || possibleDonorId;

                const payload = { donor: donorPayload };
                if (receivingHospitalName) payload.receivingHospital = receivingHospitalName;

                const resp = await fetch(`/api/requests/${selectedForPayment.id}/send-matched-details`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                  body: JSON.stringify(payload),
                });
                const json = await resp.json().catch(() => ({}));
                if (!resp.ok) throw new Error(json.message || 'Failed to send matched details');

                // Update local UI state - mark the matched donor as no longer available
                setDonorRequests(prev => prev.map(d => d.id === selectedDonorForMatch.id ? { ...d, status: 'Donor Matched' } : d));
                setHospitalOrganRequests(prev => prev.map(r => r.id === selectedForPayment.id ? { ...r, status: 'Donor Matched' } : r));
                updateOrganRequestStatus(selectedForPayment.id, 'Donor Matched');
                addNotification({ type: 'success', title: "Details sent", message: "Details sent to patient's hospital successfully", targetRole: 'patient' });
                toast.success("Details sent to patient's hospital successfully");
                setShowSendPaymentModal(false);
              } catch (err) {
                console.error('Send matched details failed', err);
                toast.error(err.message || 'Failed to send matched details');
              } finally {
                setSendPaymentLoading(false);
              }
            }} className="bg-success hover:bg-success/90 text-success-foreground">Send to Patient's Hospital</Button>
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
      {/* NGO Fund Request Details Modal */}
      <FundRequestDetails
        isOpen={showNgoDetails && Boolean(selectedNgoRequest)}
        onClose={() => { setShowNgoDetails(false); setSelectedNgoRequest(null); }}
        request={selectedNgoRequest}
        onReject={(id) => {
          // local optimistic update: mark as rejected if id present
          setHospitalNgoFundRequests(prev => prev.map(r => (String(r.id) === String(id) ? { ...r, status: 'Rejected' } : r)));
          setShowNgoDetails(false);
        }}
      />
      
      {/* Hospital Report Modal */}
      <HospitalReportModal
        open={showReportModal}
        onOpenChange={setShowReportModal}
        userName={reportingUser?.name || 'User'}
        userType={reportingUser?.type || 'patient'}
        onReport={handleSubmitReport}
      />
    </div>
  );
};

export default ManageRequests;