import React, { createContext, useContext, useState, useCallback } from 'react';

const SharedChatContext = createContext(undefined);

const initialThreads = [
  {
    id: 'thread_ph_001',
    participants: {
      patient: { id: 'patient_001', name: 'Rajesh Kumar' },
      hospital: { id: 'hospital_001', name: 'City General Hospital' },
    },
    messages: [
      {
        id: 'msg_001',
        senderId: 'patient_001',
        senderName: 'Rajesh Kumar',
        senderRole: 'patient',
        content: 'Hello, I need an update on my kidney transplant request.',
        timestamp: new Date(Date.now() - 7200000),
      },
      {
        id: 'msg_002',
        senderId: 'hospital_001',
        senderName: 'City General Hospital',
        senderRole: 'hospital',
        content: 'Hello Rajesh! Your case is under review.',
        timestamp: new Date(Date.now() - 5400000),
      },
    ],
    lastActivity: new Date(Date.now() - 3600000),
  },
  {
    id: 'thread_ph_002',
    participants: {
      patient: { id: 'patient_002', name: 'Sunita Devi' },
      hospital: { id: 'hospital_002', name: 'Apollo Health Center' },
    },
    messages: [
      {
        id: 'msg_004',
        senderId: 'patient_002',
        senderName: 'Sunita Devi',
        senderRole: 'patient',
        content: 'When will I get a donor match for my liver?',
        timestamp: new Date(Date.now() - 86400000),
      },
    ],
    lastActivity: new Date(Date.now() - 82800000),
  },
  {
    id: 'thread_pn_001',
    participants: {
      patient: { id: 'patient_001', name: 'Rajesh Kumar' },
      ngo: { id: 'ngo_001', name: 'Helping Hearts NGO' },
    },
    messages: [
      {
        id: 'msg_ngo_01',
        senderId: 'ngo_001',
        senderName: 'Helping Hearts NGO',
        senderRole: 'ngo',
        content: 'We have received your application for financial aid.',
        timestamp: new Date(Date.now() - 172800000),
      },
    ],
    lastActivity: new Date(Date.now() - 172800000),
  },
  {
    id: 'thread_pn_002',
    participants: {
      patient: { id: 'patient_003', name: 'Amit Sharma' },
      ngo: { id: 'ngo_002', name: 'Life Foundation' },
    },
    messages: [
      {
        id: 'msg_ngo_02',
        senderId: 'patient_003',
        senderName: 'Amit Sharma',
        senderRole: 'patient',
        content: 'I need help with medicine costs.',
        timestamp: new Date(Date.now() - 259200000),
      },
    ],
    lastActivity: new Date(Date.now() - 259200000),
  }
];

export const SharedChatProvider = ({ children }) => {
  const [threads, setThreads] = useState(initialThreads);

  const getThreadsForRole = useCallback((role, userId) => {
    // This allows the lists to populate for any logged-in user for testing
    if (role === 'patient') {
      // Show threads where the patient is involved
      return threads.filter(t => t.participants.patient);
    }
    if (role === 'hospital') {
      // Show threads where a hospital is involved
      return threads.filter(t => t.participants.hospital);
    }
    if (role === 'ngo') {
      // Show threads where an NGO is involved
      return threads.filter(t => t.participants.ngo);
    }
    return threads;
  }, [threads]);

  const sendMessage = useCallback((threadId, senderId, senderName, senderRole, content) => {
    const newMessage = {
      id: `msg_${Date.now()}`,
      senderId,
      senderName,
      senderRole,
      content,
      timestamp: new Date(),
    };

    setThreads(prev => prev.map(thread => {
      if (thread.id === threadId) {
        return {
          ...thread,
          messages: [...thread.messages, newMessage],
          lastActivity: new Date(),
        };
      }
      return thread;
    }));
  }, []);

  return (
    <SharedChatContext.Provider value={{ threads, getThreadsForRole, sendMessage }}>
      {children}
    </SharedChatContext.Provider>
  );
};

export const useSharedChat = () => {
  const context = useContext(SharedChatContext);
  if (!context) throw new Error('useSharedChat must be used within a SharedChatProvider');
  return context;
};