import React, { createContext, useContext, useState } from 'react';
import { toast } from 'sonner';

const NotificationContext = createContext(undefined);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [organRequests, setOrganRequests] = useState([]);
  const [fundRequests, setFundRequests] = useState([]);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [matchedDonor, setMatchedDonor] = useState(null);

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
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
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
  const loadOrganRequests = async (patientId) => {
    if (!patientId) return;
    try {
      const res = await fetch(`http://localhost:5000/api/requests?patientId=${encodeURIComponent(patientId)}`)
      const json = await res.json()
      if (json && json.success && Array.isArray(json.data)) {
        // map backend _id to id and normalize fields
        const mapped = json.data.map(r => ({
          id: r._id,
          patientId: r.patientId,
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
          // backend stores hospital id in `hospitalId` field
          hospitalId: r.hospitalId || r.hospital || null,
          details: r.message || r.details || null,
        }))
        setOrganRequests(mapped)
      }
    } catch (err) {
      console.error('Failed to load organ requests:', err)
    }
  }

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
  const loadFundRequests = async (patientId) => {
    if (!patientId) return
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`http://localhost:5000/api/requests?patientId=${encodeURIComponent(patientId)}`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined })
      const json = await res.json()
      if (json && json.success && Array.isArray(json.data)) {
        const mapped = json.data.filter(r => r.requestType === 'fund_request').map(r => ({
          id: r._id,
          amount: r.amount,
          status: r.status,
          createdAt: r.createdAt,
          ngoId: r.ngoId,
          ngoName: r.ngoName,
          patientId: r.patientId,
          patientName: r.patientName,
          description: r.message || r.details || '' ,
          document: r.files?.medicalReports?.[0] || null,
        }))
        setFundRequests(mapped)
      }
    } catch (err) {
      console.error('Failed to load fund requests', err)
    }
  }

  // Load fund requests for a given ngoId (for NGO dashboard)
  const loadNgoFundRequests = async (ngoId) => {
    if (!ngoId) return
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`http://localhost:5000/api/requests?ngoId=${encodeURIComponent(ngoId)}`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined })
      const json = await res.json()
      if (json && json.success && Array.isArray(json.data)) {
        const mapped = json.data.filter(r => r.requestType === 'fund_request').map(r => ({
          id: r._id,
          amount: r.amount,
          status: r.status,
          createdAt: r.createdAt,
          ngoId: r.ngoId,
          ngoName: r.ngoName,
          patientId: r.patientId,
          patientName: r.patientName,
          description: r.message || r.details || '' ,
          document: r.files?.medicalReports?.[0] || null,
        }))
        setFundRequests(mapped)
      }
    } catch (err) {
      console.error('Failed to load NGO fund requests', err)
    }
  }

  const addFundRequest = (request) => {
    (async () => {
      try {
        const token = localStorage.getItem('token')
        const form = new FormData()
        form.append('amount', String(request.amount || 0))
        form.append('ngoId', request.ngoId || '')
        form.append('ngoName', request.ngoName || '')
        form.append('message', request.description || request.message || '')
        // attach document file if present
        if (request.document && request.document instanceof File) {
          form.append('document', request.document)
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
            patientName: saved.patientName
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
          hospitalName: request.hospitalName || 'City General Hospital',
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