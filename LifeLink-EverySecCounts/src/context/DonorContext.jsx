import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNotifications } from './NotificationContext';
import { useAuth } from '@/context/AuthContext';

// 1. Initial profile is now empty so it doesn't show fake names
const emptyProfile = {
  fullName: '',
  email: '',
  phone: '',
  aadhaarNumber: '',
  bloodGroup: '',
  age: '',
  address: '',
  emergencyContactName: '',
  emergencyContactNumber: '',
};

const DonorContext = createContext(undefined);

export const DonorProvider = ({ children }) => {
  const { addNotification } = useNotifications();
  const { user } = useAuth(); // 2. Pull the actual logged-in user data
  
  const [donationIntents, setDonationIntents] = useState([]);
  const [donorMatches, setDonorMatches] = useState([]);
  const [donorProfile, setDonorProfile] = useState(emptyProfile);

  // 3. Automatically sync the profile with the logged-in user's details
  useEffect(() => {
    if (user && user.role === 'donor') {
      setDonorProfile(prev => ({
        ...prev,
        fullName: user.name || '',
        email: user.email || ''
      }));
    }
  }, [user]);

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

    addNotification({
      type: 'info',
      title: 'New Donation Intent',
      message: `${intent.donorName} wants to donate ${intent.organType}. Verification required.`,
      targetRole: 'hospital',
    });

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

    const newMatch = {
      id: `match_${Date.now()}`,
      donorId: intent.donorId,
      donorName: intent.donorName,
      patientId,
      patientName,
      organType: intent.organType,
      patientHospitalName,
      donorHospitalName: intent.donorHospitalName || 'City General Hospital',
      patientAccepted: false,
      donorAccepted: false,
      hospitalConfirmed: false,
      paymentCompleted: false,
      status: 'Pending',
    };

    setDonorMatches(prev => [newMatch, ...prev]);
    updateDonationStatus(intentId, 'Matched');

    addNotification({
      type: 'success',
      title: 'Donor Matched!',
      message: `A donor has been matched for your ${intent.organType} request.`,
      targetRole: 'patient',
    });

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
  };

  const acceptMatchAsDonor = (matchId) => {
    setDonorMatches(prev => 
      prev.map(match => 
        match.id === matchId 
          ? { ...match, donorAccepted: true, status: match.patientAccepted ? 'Confirmed' : 'Donor Accepted' } 
          : match
      )
    );
  };

  const confirmPayment = (matchId) => {
    setDonorMatches(prev => 
      prev.map(match => 
        match.id === matchId 
          ? { ...match, paymentCompleted: true, status: 'Payment Done' } 
          : match
      )
    );
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