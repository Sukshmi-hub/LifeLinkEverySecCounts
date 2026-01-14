import React, { createContext, useContext, useState } from 'react';

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

  const addFundRequest = (request) => {
    const newRequest = {
      ...request,
      id: `fund_${Date.now()}`,
      status: 'Pending',
      createdAt: new Date(),
    };
    setFundRequests(prev => [newRequest, ...prev]);

    // Send notification to NGO
    addNotification({
      type: 'info',
      title: 'New Fund Request',
      message: `New patient fund request received from ${request.patientName} for ₹${request.amount.toLocaleString()}.`,
      targetRole: 'ngo',
    });
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