import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useSocket } from '@/hooks/useSocket';
import { useAuth } from '@/context/AuthContext';

const NotificationContext = createContext(undefined);

// Normalize various MongoDB id/reference shapes into a simple string id
const extractId = (ref) => {
  if (!ref) return null;
  if (typeof ref === 'string') return ref;
  if (typeof ref === 'object') {
    if (ref.$oid) return ref.$oid;
    if (ref._id && typeof ref._id === 'string') return ref._id;
    if (ref._id && typeof ref._id === 'object' && ref._id.$oid) return ref._id.$oid;
    if (ref.id && typeof ref.id === 'string') return ref.id;
    if (ref.toString && typeof ref.toString === 'function') return String(ref);
  }
  return null;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [organRequests, setOrganRequests] = useState([]);
  const [fundRequests, setFundRequests] = useState([]);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [matchedDonor, setMatchedDonor] = useState(null);
  const { socket } = useSocket();
  const { user } = useAuth() || {};
  const [myHospital, setMyHospital] = useState(null);
  const lastRequestsRef = useRef({})

  // If user is hospital, load hospital account (so we can filter notifications)
  useEffect(() => {
    (async () => {
      try {
        if (!user || user.role !== 'hospital') return;
        const token = localStorage.getItem('token');
        const resp = await fetch('/api/hospital/me', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        const j = await resp.json().catch(() => ({}));
        if (resp.ok && j.data) setMyHospital(j.data);
      } catch (e) {
        // ignore
      }
    })()
  }, [user]);

  // Listen for server-sent notifications via socket and add locally
  useEffect(() => {
    if (!socket) return;
    const handler = (payload) => {
      try {
        if (!payload) return;
        // Only handle notifications targeted to this user's role
        if (payload.targetRole && payload.targetRole !== (user && user.role)) return;
        // If notification is hospital-scoped, ensure it matches this hospital account
        if (payload.hospitalId && myHospital && String(payload.hospitalId) !== String(myHospital._id)) return;
        addNotification({
          type: payload.type || 'info',
          title: payload.title || 'Notification',
          message: payload.message || '',
          targetRole: payload.targetRole || 'hospital',
        })
      } catch (e) {
        console.error('Failed to handle socket notification', e)
      }
    }
    socket.on('new_notification', handler)
    return () => socket.off('new_notification', handler)
  }, [socket, user, myHospital])

  // Load persisted notifications from server for this user/hospital
  useEffect(() => {
    (async () => {
      try {
        if (!user) return
        const token = localStorage.getItem('token')
        const resp = await fetch('/api/notifications', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
        const json = await resp.json().catch(() => ({}))
        if (resp.ok && Array.isArray(json.data)) {
          // normalize ids to string id for UI
          const mapped = json.data.map(n => ({ ...n, id: n._id || n.id }))
          setNotifications(mapped)
        }
      } catch (e) {
        console.error('Failed to load persisted notifications', e)
      }
    })()
  }, [user])

  const addNotification = (notification) => {
    const newNotification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      read: false,
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const markAsRead = (id) => {
    (async () => {
      try {
        const token = localStorage.getItem('token')
        const resp = await fetch(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'PUT', headers: token ? { Authorization: `Bearer ${token}` } : {} })
        if (resp.ok) {
          setNotifications(prev => prev.map(n => (String(n.id) === String(id) ? { ...n, read: true } : n)))
        } else {
          setNotifications(prev => prev.map(n => (String(n.id) === String(id) ? { ...n, read: true } : n)))
        }
      } catch (e) {
        console.error('Failed to mark notification read', e)
        setNotifications(prev => prev.map(n => (String(n.id) === String(id) ? { ...n, read: true } : n)))
      }
    })()
  };

  const markAllAsRead = (role) => {
    setNotifications(prev =>
      prev.map(n => (n.targetRole === role ? { ...n, read: true } : n))
    );
  };

  const getUnreadCount = (role) => {
    return notifications.filter(n => n.targetRole === role && !n.read).length;
  };

  const addOrganRequest = (request) => {
    const newRequest = {
      ...request,
      id: `req_${Date.now()}`,
      status: 'Pending – Hospital Review',
      createdAt: new Date(),
    };
    setOrganRequests(prev => [newRequest, ...prev]);

    // Send notification to hospital
    addNotification({
      type: 'info',
      title: 'New Organ Request',
      message: `New organ request received from ${request.patientName} for ${request.organType}.`,
      targetRole: 'hospital',
    });
  };

  // Load organ requests from backend for a given patientId
  const loadOrganRequests = useCallback(async (patientId) => {
    if (!patientId) return;
    try {
      // simple rate-limit / dedupe: if same patientId was requested in the last 1500ms, skip
      const now = Date.now()
      const last = lastRequestsRef.current["organ:" + patientId]
      if (last && (now - last) < 1500) {
        console.debug('[NotificationContext] skipping loadOrganRequests due to recent fetch', patientId)
        return
      }
      lastRequestsRef.current["organ:" + patientId] = now
      console.debug('[NotificationContext] loadOrganRequests called for', patientId, new Date().toISOString())
      const res = await fetch(`http://localhost:5000/api/requests?patientId=${encodeURIComponent(patientId)}`)
      const json = await res.json()
      if (json && json.success && Array.isArray(json.data)) {
        // map backend _id to id and normalize fields
        const mapped = json.data.map(r => ({
          id: extractId(r._id) || r._id,
          patientId: extractId(r.patientId) || r.patientId,
          patientName: r.patientName,
          organType: r.organType || r.organ || null,
          bloodType: r.bloodType || null,
          urgency: r.urgency || null,
          // normalize backend status values to user-friendly labels
          status: (function(s) {
            if (!s) return 'Pending – Hospital Review'
            const low = String(s).toLowerCase()
            if (low === 'pending') return 'Pending – Hospital Review'
            if (low === 'approved') return 'Accepted'
            if (low === 'rejected') return 'Rejected'
            return s
          })(r.status),
          createdAt: r.createdAt,
          // backend stores hospital id in `hospitalId` field - normalize it
          hospitalId: extractId(r.hospitalId) || extractId(r.hospital) || r.hospitalId || r.hospital || null,
          // include hospital display fields when backend provides them
          hospitalName: (r.hospitalId && (r.hospitalId.name || r.hospitalId.organizationName)) || r.hospitalName || null,
          hospitalContact: (r.hospitalId && (r.hospitalId.phone || r.hospitalId.contact_phone)) || r.hospitalContact || null,
          hospitalAddress: (r.hospitalId && (r.hospitalId.address || r.hospitalId.location?.full_address)) || r.hospitalAddress || null,
          // donor fields (if backend returned a matched donor)
          donorId: extractId(r.donorId) || r.donorId || null,
          donorName: r.donorName || null,
          details: r.message || r.details || null,
        }))
        setOrganRequests(mapped)

        // If loading for a specific patient, derive matched donor state from backend data
        try {
          const pidStr = String(patientId || '');
          const matched = mapped.find(r => {
            const rs = String(r.status || '').toLowerCase();
            const isMatched = rs.includes('donor') || rs.includes('matched');
            const rid = String(r.patientId || '');
            return isMatched && rid === pidStr;
          });
          if (matched) {
            setMatchedDonor({
              id: matched.donorId || (`donor_${Date.now()}`),
              name: matched.donorName || 'Anonymous Donor',
              organType: matched.organType,
              hospitalName: matched.hospitalName || matched.hospital || null,
            });
          } else {
            // clear matched donor if none found
            setMatchedDonor(null);
          }
        } catch (e) {
          // ignore
        }
      }
    } catch (err) {
      console.error('Failed to load organ requests:', err)
    }
  }, [])

  const updateOrganRequestStatus = (id, status) => {
    setOrganRequests(prev => {
      const updated = prev.map(r => (r.id === id ? { ...r, status } : r));
      const request = updated.find(r => r.id === id);
      
      if (request) {
        // Send notification to patient
        addNotification({
          type: status === 'Accepted' ? 'success' : status === 'Rejected' ? 'error' : 'info',
          title: 'Request Update',
          message: `Hospital has ${status.toLowerCase()} your ${request.organType} request.`,
          targetRole: 'patient',
        });
      }
      
      return updated;
    });
  };

  // Load fund requests for a given patientId from backend
  const loadFundRequests = useCallback(async (patientId) => {
    if (!patientId) return
    try {
      const now = Date.now()
      const last = lastRequestsRef.current["fund:" + patientId]
      if (last && (now - last) < 1500) {
        console.debug('[NotificationContext] skipping loadFundRequests due to recent fetch', patientId)
        return
      }
      lastRequestsRef.current["fund:" + patientId] = now
      const token = localStorage.getItem('token')
      const res = await fetch(`http://localhost:5000/api/requests?patientId=${encodeURIComponent(patientId)}`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined })
      const json = await res.json()
      if (json && json.success && Array.isArray(json.data)) {
        const mapped = json.data.filter(r => r.requestType === 'fund_request').map(r => ({
          id: extractId(r._id) || r._id,
          amount: r.amount,
          status: r.status,
          createdAt: r.createdAt,
          ngoId: r.ngoId,
          ngoName: r.ngoName,
          patientId: extractId(r.patientId) || r.patientId,
          patientName: r.patientName,
          description: r.message || r.details || '' ,
          document: r.files?.medicalReports?.[0] || null,
          // include hospital info if backend populated it (normalize id)
          hospitalId: extractId(r.hospitalId) || null,
          hospitalName: (r.hospitalId && (r.hospitalId.name || r.hospitalId.organizationName)) || r.hospitalName || null,
          hospitalContact: (r.hospitalId && (r.hospitalId.phone || r.hospitalId.contact_phone)) || null,
          hospitalAddress: (r.hospitalId && (r.hospitalId.address || r.hospitalId.location?.full_address)) || r.hospitalAddress || null,
          // include breakdown if backend provided it (used by NGO UI)
          breakdown: r.breakdown || {
            transplantFee: r.transplantFee || 0,
            hospitalCharges: r.hospitalCharges || 0,
            processingFee: r.processingFee || 0,
          },
        }))
        setFundRequests(mapped)
      }
    } catch (err) {
      console.error('Failed to load fund requests', err)
    }
  }, [])

  // Load fund requests for a given ngoId (for NGO dashboard)
  const loadNgoFundRequests = useCallback(async (ngoId) => {
    if (!ngoId) return
    try {
      const now = Date.now()
      const last = lastRequestsRef.current["ngoFund:" + ngoId]
      if (last && (now - last) < 1500) {
        console.debug('[NotificationContext] skipping loadNgoFundRequests due to recent fetch', ngoId)
        return
      }
      lastRequestsRef.current["ngoFund:" + ngoId] = now
      const token = localStorage.getItem('token')
      const res = await fetch(`http://localhost:5000/api/requests?ngoId=${encodeURIComponent(ngoId)}`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined })
      const json = await res.json()
      if (json && json.success && Array.isArray(json.data)) {
        const mapped = json.data.filter(r => r.requestType === 'fund_request').map(r => ({
          id: extractId(r._id) || r._id,
          amount: r.amount,
          status: r.status,
          createdAt: r.createdAt,
          ngoId: r.ngoId,
          ngoName: r.ngoName,
          patientId: extractId(r.patientId) || r.patientId,
          patientName: r.patientName,
          description: r.message || r.details || '' ,
          document: r.files?.medicalReports?.[0] || null,
          hospitalId: extractId(r.hospitalId) || null,
          hospitalName: (r.hospitalId && (r.hospitalId.name || r.hospitalId.organizationName)) || r.hospitalName || null,
          hospitalContact: (r.hospitalId && (r.hospitalId.phone || r.hospitalId.contact_phone)) || null,
          hospitalAddress: (r.hospitalId && (r.hospitalId.address || r.hospitalId.location?.full_address)) || r.hospitalAddress || null,
          // include original server response so callers can access populated patient/hospital objects
          raw: r,
          // include breakdown fields so NGO UI can render exact amounts
          breakdown: r.breakdown || {
            transplantFee: r.transplantFee || 0,
            hospitalCharges: r.hospitalCharges || 0,
            processingFee: r.processingFee || 0,
          },
        }))
        setFundRequests(mapped)
      }
    } catch (err) {
      console.error('Failed to load NGO fund requests', err)
    }
  }, [])

  const addFundRequest = (request) => {
    (async () => {
      try {
        const token = localStorage.getItem('token')
        const form = new FormData()
        form.append('amount', String(request.amount || 0))
        form.append('ngoId', request.ngoId || '')
        form.append('ngoName', request.ngoName || '')
        // include hospital information when provided
        if (request.hospitalId) form.append('hospitalId', request.hospitalId)
        if (request.hospitalName) form.append('hospitalName', request.hospitalName)
        if (request.hospitalAddress) form.append('hospitalAddress', request.hospitalAddress)
        form.append('message', request.description || request.message || '')
        // attach breakdown as JSON when provided
        if (request.transplantFee || request.hospitalCharges || request.processingFee) {
          const breakdown = {
            transplantFee: Number(request.transplantFee || 0),
            hospitalCharges: Number(request.hospitalCharges || 0),
            processingFee: Number(request.processingFee || 0),
          }
          form.append('breakdown', JSON.stringify(breakdown))
        }
        // attach document file if present
        // attach files if present: medical report, prescription, ration card
        if (request.document && request.document instanceof File) {
          form.append('medicalReports', request.document)
        }
        if (request.prescription && request.prescription instanceof File) {
          form.append('prescription', request.prescription)
        }
        if (request.rationCard && request.rationCard instanceof File) {
          form.append('rationCard', request.rationCard)
        }

        const res = await fetch('http://localhost:5000/api/requests/fund', {
          method: 'POST',
          body: form,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })

        const json = await res.json()
        if (res.ok && json.success) {
          const saved = json.data
          const mapped = {
            id: saved._id,
            amount: saved.amount,
            status: saved.status || 'Pending',
            createdAt: saved.createdAt,
            ngoId: saved.ngoId,
            ngoName: saved.ngoName,
            document: saved.files?.medicalReports?.[0] || null,
            prescription: saved.files?.prescription || null,
            rationCard: saved.files?.rationCard || null,
            patientName: saved.patientName
          ,
            // include raw server response to enable immediate detail view with populated fields
            raw: saved,
          }
          setFundRequests(prev => [mapped, ...prev])

          addNotification({
            type: 'info',
            title: 'New Fund Request',
            message: `New patient fund request received from ${mapped.patientName} for ₹${(mapped.amount || 0).toLocaleString()}${mapped.ngoName ? ' (to ' + mapped.ngoName + ')' : ''}.`,
            targetRole: 'ngo',
          });
          toast.success('Fund request submitted successfully')
          return
        }

        // failure — fallback to local add and notify user
        console.error('Failed to persist fund request', json)
        const fallback = {
          id: `fund_${Date.now()}`,
          ...request,
          status: 'Pending',
          createdAt: new Date(),
        }
        setFundRequests(prev => [fallback, ...prev])
        addNotification({ type: 'error', title: 'Fund Request Failed', message: 'Could not save fund request to server — saved locally.' })
        toast.error('Could not save fund request to server — saved locally')
      } catch (err) {
        console.error('addFundRequest error', err)
        const fallback = {
          id: `fund_${Date.now()}`,
          ...request,
          status: 'Pending',
          createdAt: new Date(),
        }
        setFundRequests(prev => [fallback, ...prev])
        addNotification({ type: 'error', title: 'Fund Request Failed', message: 'Could not save fund request to server — saved locally.' })
        toast.error('Could not save fund request to server — saved locally')
      }
    })()
  };

  const updateFundRequestStatus = (id, status) => {
    setFundRequests(prev => {
      const updated = prev.map(r => (r.id === id ? { ...r, status } : r));
      const request = updated.find(r => r.id === id);
      
      if (request) {
        addNotification({
          type: status === 'Approved' ? 'success' : 'error',
          title: 'Fund Request Update',
          message: `Your fund request for ₹${request.amount.toLocaleString()} has been ${status.toLowerCase()}.`,
          targetRole: 'patient',
        });
      }
      
      return updated;
    });
  };

  const simulateDonorMatch = (requestId, donorName) => {
    setOrganRequests(prev => {
      const updated = prev.map(r => 
        r.id === requestId 
          ? { ...r, status: 'Donor Matched', donorId: `donor_${Date.now()}`, donorName } 
          : r
      );
      const request = updated.find(r => r.id === requestId);
      
      if (request) {
        setMatchedDonor({
          id: request.donorId || `donor_${Date.now()}`,
          name: donorName,
          organType: request.organType,
          hospitalName: request.hospitalName || request.hospital || null,
        });

        // Notify patient
        addNotification({
          type: 'success',
          title: 'Donor Matched!',
          message: `A donor has been matched for your ${request.organType} request. Please proceed to payment.`,
          targetRole: 'patient',
        });

        // Notify donor
        addNotification({
          type: 'success',
          title: 'Match Confirmation',
          message: `You have been matched with patient ${request.patientName} for ${request.organType} donation.`,
          targetRole: 'donor',
        });
      }
      
      return updated;
    });
  };

  // Notify donor when patient completes payment
  const notifyDonorPaymentCompleted = (donorName, patientName, organType, hospitalName) => {
    addNotification({
      type: 'success',
      title: 'Payment Confirmed',
      message: `Patient ${patientName} has completed payment for ${organType} donation. Procedure will be scheduled.`,
      targetRole: 'donor',
    });

    addNotification({
      type: 'info',
      title: 'Payment Received',
      message: `Payment confirmed for ${patientName}'s ${organType} transplant. Coordinating with donor hospital.`,
      targetRole: 'hospital',
    });
  };

  // Hospital-to-hospital coordination notification
  const notifyHospitalCoordination = (patientHospital, donorHospital, organType, patientName) => {
    addNotification({
      type: 'info',
      title: 'Cross-Hospital Coordination',
      message: `${patientHospital} requests ${organType} coordination for patient ${patientName}. Donor hospital: ${donorHospital}.`,
      targetRole: 'hospital',
    });
  };

  // Notify when donation is complete
  const notifyDonationComplete = (donorName, patientName, organType, hospitalName) => {
    addNotification({
      type: 'success',
      title: 'Donation Completed!',
      message: `Congratulations! Your ${organType} donation has been successfully completed. Your certificate is ready.`,
      targetRole: 'donor',
    });

    addNotification({
      type: 'success',
      title: 'Transplant Successful',
      message: `${organType} transplant completed successfully. Thank you for using LifeLink.`,
      targetRole: 'patient',
    });

    addNotification({
      type: 'success',
      title: 'Procedure Completed',
      message: `${organType} transplant for ${patientName} completed. Donor: ${donorName}.`,
      targetRole: 'hospital',
    });
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        organRequests,
        fundRequests,
        selectedHospital,
        matchedDonor,
        addNotification,
        markAsRead,
        markAllAsRead,
        getUnreadCount,
        addOrganRequest,
        loadOrganRequests,
        loadFundRequests,
        loadNgoFundRequests,
        updateOrganRequestStatus,
        addFundRequest,
        updateFundRequestStatus,
        setSelectedHospital,
        simulateDonorMatch,
        notifyDonorPaymentCompleted,
        notifyHospitalCoordination,
        notifyDonationComplete,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};