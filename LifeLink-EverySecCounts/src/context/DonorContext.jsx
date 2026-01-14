import React, { createContext, useContext, useState } from 'react';
import { useNotifications } from './NotificationContext';

const defaultProfile = {
  fullName: 'Sunita Singh',
  email: 'you@example.com',
  phone: '1234567890',
  city: 'Mumbai',
  state: 'Maharashtra',
  password: '',
  confirmPassword: '',
  age: '25',
  bloodGroup: '',
  lastDonationDate: '',
  availabilityStatus: 'Available',
  willingToDonate: '',
  aadhaarNumber: '',
};


const DonorContext = createContext(undefined);

export const DonorProvider = ({ children }) => {
  const { addNotification } = useNotifications();
  const [donationIntents, setDonationIntents] = useState([]);
  const [donorMatches, setDonorMatches] = useState([]);
  const [donorProfile, setDonorProfile] = useState(defaultProfile);

  const addDonationIntent = (intent) => {
    const newIntent = {
      ...intent,
      id: `intent_${Date.now()}`,
      status: 'Available for Donation',
      hospitalVerified: false,
      paymentCompleted: false,
      certificateReady: false,
      createdAt: new Date(),
    };
    setDonationIntents(prev => [newIntent, ...prev]);

    // Notify hospital
    addNotification({
      type: 'info',
      title: 'New Donation Intent',
      message: `${intent.donorName} wants to donate ${intent.organType}. Verification required.`,
      targetRole: 'hospital',
    });

    // Notify patient
    addNotification({
      type: 'info',
      title: 'Potential Donor Available',
      message: `A donor is available for ${intent.organType} donation.`,
      targetRole: 'patient',
    });
  };

  const updateDonationStatus = (intentId, status) => {
    setDonationIntents(prev => 
      prev.map(intent => intent.id === intentId ? { ...intent, status } : intent)
    );
  };

  const verifyDonation = (intentId) => {
    setDonationIntents(prev => 
      prev.map(intent => 
        intent.id === intentId 
          ? { ...intent, hospitalVerified: true, status: 'Verified' } 
          : intent
      )
    );

    const intent = donationIntents.find(i => i.id === intentId);
    if (intent) {
      addNotification({
        type: 'success',
        title: 'Donation Verified',
        message: `Your ${intent.organType} donation intent has been verified by the hospital.`,
        targetRole: 'donor',
      });
    }
  };

  const createMatch = (intentId, patientId, patientName, patientHospitalName) => {
    const intent = donationIntents.find(i => i.id === intentId);
    if (!intent) return;

    const hospitalName = intent.donorHospitalName || 'City General Hospital';
    const newMatch = {
      id: `match_${Date.now()}`,
      donorId: intent.donorId,
      donorName: intent.donorName,
      patientId,
      patientName,
      organType: intent.organType,
      hospitalName,
      patientHospitalName,
      donorHospitalName: hospitalName,
      patientAccepted: false,
      donorAccepted: false,
      hospitalConfirmed: false,
      paymentCompleted: false,
      matchDate: new Date(),
      status: 'Pending',
    };

    setDonorMatches(prev => [newMatch, ...prev]);
    updateDonationStatus(intentId, 'Matched');

    // Notify patient
    addNotification({
      type: 'success',
      title: 'Donor Matched!',
      message: `A donor has been matched for your ${intent.organType} request. Please proceed to accept.`,
      targetRole: 'patient',
    });

    // Notify donor
    addNotification({
      type: 'success',
      title: 'You Have Been Matched!',
      message: `You have been matched with a patient for ${intent.organType} donation.`,
      targetRole: 'donor',
    });
  };

  const acceptMatchAsPatient = (matchId) => {
    setDonorMatches(prev => 
      prev.map(match => 
        match.id === matchId 
          ? { ...match, patientAccepted: true, status: 'Patient Accepted' } 
          : match
      )
    );

    const match = donorMatches.find(m => m.id === matchId);
    if (match) {
      addNotification({
        type: 'info',
        title: 'Patient Accepted Match',
        message: `Patient ${match.patientName} has accepted the organ match. Hospital action required.`,
        targetRole: 'hospital',
      });
    }
  };

  const acceptMatchAsDonor = (matchId) => {
    setDonorMatches(prev => 
      prev.map(match => 
        match.id === matchId 
          ? { ...match, donorAccepted: true, status: match.patientAccepted ? 'Confirmed' : 'Donor Accepted' } 
          : match
      )
    );

    const match = donorMatches.find(m => m.id === matchId);
    if (match) {
      addNotification({
        type: 'info',
        title: 'Donor Accepted Match',
        message: `Donor ${match.donorName} has accepted the organ match. Hospital action required.`,
        targetRole: 'hospital',
      });
    }
  };

  const confirmPayment = (matchId) => {
    setDonorMatches(prev => 
      prev.map(match => 
        match.id === matchId 
          ? { ...match, paymentCompleted: true, status: 'Payment Done' } 
          : match
      )
    );

    const match = donorMatches.find(m => m.id === matchId);
    if (match) {
      addNotification({
        type: 'success',
        title: 'Payment Completed',
        message: `Patient ${match.patientName} has completed payment for the organ donation.`,
        targetRole: 'hospital',
      });

      addNotification({
        type: 'success',
        title: 'Payment Confirmed',
        message: `Payment confirmed for ${match.organType} donation. Donation process can be initiated.`,
        targetRole: 'hospital',
      });

      addNotification({
        type: 'success',
        title: 'Payment Received',
        message: `Patient has completed payment. The hospital will contact you for the procedure.`,
        targetRole: 'donor',
      });
    }
  };

  const completeDonation = (matchId) => {
    setDonorMatches(prev => 
      prev.map(match => 
        match.id === matchId 
          ? { ...match, status: 'Completed' } 
          : match
      )
    );

    const match = donorMatches.find(m => m.id === matchId);
    if (match) {
      setDonationIntents(prev => 
        prev.map(intent => 
          intent.donorId === match.donorId 
            ? { ...intent, status: 'Completed', certificateReady: true, completedAt: new Date() } 
            : intent
        )
      );

      addNotification({
        type: 'success',
        title: 'Donation Completed',
        message: `Your ${match.organType} donation has been completed successfully. Certificate is ready!`,
        targetRole: 'donor',
      });

      addNotification({
        type: 'success',
        title: 'Transplant Successful',
        message: `Your ${match.organType} transplant procedure has been completed successfully.`,
        targetRole: 'patient',
      });
    }
  };

  const updateDonorProfile = (profile) => {
    setDonorProfile(prev => ({ ...prev, ...profile }));
  };

  const getDonorStatus = (donorId) => {
    const intent = donationIntents.find(i => i.donorId === donorId);
    return intent?.status || 'Registered';
  };

  return (
    <DonorContext.Provider
      value={{
        donationIntents,
        donorMatches,
        donorProfile,
        addDonationIntent,
        updateDonationStatus,
        verifyDonation,
        createMatch,
        acceptMatchAsPatient,
        acceptMatchAsDonor,
        confirmPayment,
        completeDonation,
        updateDonorProfile,
        getDonorStatus,
      }}
    >
      {children}
    </DonorContext.Provider>
  );
};

export const useDonor = () => {
  const context = useContext(DonorContext);
  if (!context) {
    throw new Error('useDonor must be used within a DonorProvider');
  }
  return context;
};