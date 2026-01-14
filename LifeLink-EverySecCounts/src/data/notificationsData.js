// Role-based notification data (INDIAN CONTEXT)
export const notificationsByRole = {
  patient: [
    { id: 'p1', title: 'Request Status Update', message: 'Your organ request has been received by the hospital.', time: '5 mins ago', read: false, type: 'info' },
    { id: 'p2', title: 'Donor Matched!', message: 'A compatible donor has been found for your kidney request.', time: '1 hour ago', read: false, type: 'success' },
    { id: 'p3', title: 'Hospital Response', message: 'City Care Hospital has accepted your case.', time: '2 hours ago', read: true, type: 'success' },
    { id: 'p4', title: 'Fund Request Update', message: 'Your fund request for ₹1,10,000 is under review.', time: '1 day ago', read: true, type: 'info' },
  ],
  donor: [
    { id: 'd1', title: 'Patient Needs Your Organ', message: 'A patient urgently needs a kidney transplant. Please review the match.', time: '10 mins ago', read: false, type: 'warning' },
    { id: 'd2', title: 'Profile Approved', message: 'Your donor profile has been verified and approved.', time: '3 hours ago', read: false, type: 'success' },
    { id: 'd3', title: 'Hospital Message', message: 'City Care Hospital has sent you a message regarding your donation.', time: '5 hours ago', read: true, type: 'info' },
    { id: 'd4', title: 'Donation Intent Received', message: 'Your donation intent has been successfully submitted.', time: '1 day ago', read: true, type: 'success' },
  ],
  hospital: [
    { id: 'h1', title: 'New Patient Request', message: 'New organ request received from Amit Sharma for Kidney.', time: '2 mins ago', read: false, type: 'info' },
    { id: 'h2', title: 'New Donor Registration', message: 'Sunita Singh has registered as a potential organ donor.', time: '30 mins ago', read: false, type: 'info' },
    { id: 'h3', title: 'Verification Status', message: 'Donor Rohit Verma pending verification review.', time: '2 hours ago', read: false, type: 'warning' },
    { id: 'h4', title: 'Payment Confirmed', message: 'Patient payment confirmed. Procedure can be scheduled.', time: '4 hours ago', read: true, type: 'success' },
  ],
  ngo: [
    { id: 'n1', title: 'New Fund Request', message: 'Patient Neha Gupta has requested ₹80,000 for surgery.', time: '15 mins ago', read: false, type: 'info' },
    { id: 'n2', title: 'Donation Completed', message: 'Kidney donation procedure completed successfully.', time: '1 hour ago', read: false, type: 'success' },
    { id: 'n3', title: 'Request Approved', message: 'Fund request for Amit Sharma has been approved.', time: '3 hours ago', read: true, type: 'success' },
    { id: 'n4', title: 'Hospital Verification', message: 'City Care Hospital has verified fund request documents.', time: '1 day ago', read: true, type: 'info' },
  ],
  admin: [
    { id: 'a1', title: 'New User Registration', message: 'New hospital registered: Metro Life Hospital.', time: '5 mins ago', read: false, type: 'info' },
    { id: 'a2', title: 'Verification Pending', message: 'Hospital verification pending for 3 new registrations.', time: '1 hour ago', read: false, type: 'warning' },
    { id: 'a3', title: 'System Health Alert', message: 'Database backup completed successfully.', time: '2 hours ago', read: false, type: 'success' },
    { id: 'a4', title: 'Reported Content', message: 'Tribute post flagged for review.', time: '4 hours ago', read: true, type: 'warning' },
    { id: 'a5', title: 'Suspicious Activity', message: 'Multiple failed login attempts detected.', time: '1 day ago', read: true, type: 'error' },
  ],
};

// Admin-specific system alerts (INDIAN CONTEXT)
export const systemAlerts = [
  {
    id: 'alert_001',
    type: 'verification_pending',
    title: 'Hospital Verification Pending',
    description: 'Metro Life Hospital registration requires admin verification.',
    severity: 'medium',
    timestamp: '2024-03-15 10:30 AM',
    resolved: false,
  },
  {
    id: 'alert_002',
    type: 'suspicious_activity',
    title: 'Multiple Failed Logins',
    description: 'Account usr_007 has 5 failed login attempts in the last hour.',
    severity: 'high',
    timestamp: '2024-03-15 09:45 AM',
    resolved: false,
  },
  {
    id: 'alert_003',
    type: 'emergency_spike',
    title: 'Red Alert Spike',
    description: 'Unusual increase in emergency blood requests detected.',
    severity: 'high',
    timestamp: '2024-03-14 11:20 PM',
    resolved: false,
  },
  {
    id: 'alert_004',
    type: 'system_health',
    title: 'Database Backup Complete',
    description: 'Scheduled database backup completed successfully.',
    severity: 'low',
    timestamp: '2024-03-14 02:00 AM',
    resolved: true,
  },
  {
    id: 'alert_005',
    type: 'failed_action',
    title: 'Email Delivery Failed',
    description: 'Notification email to donor sunita.singh@gmail.com failed.',
    severity: 'medium',
    timestamp: '2024-03-13 04:15 PM',
    resolved: true,
  },
];

// Tribute moderation data (INDIAN CONTEXT)
export const tributePosts = [
  {
    id: 'tribute_001',
    donorName: 'Ramesh Kumar',
    message: 'A true hero who gave the gift of life. Forever in our hearts.',
    submittedBy: 'Family Member',
    submittedAt: '2024-03-15',
    status: 'pending',
  },
  {
    id: 'tribute_002',
    donorName: 'Savitri Devi',
    message: 'Your selfless donation saved three lives. Thank you.',
    submittedBy: 'Hospital Staff',
    submittedAt: '2024-03-14',
    status: 'approved',
  },
  {
    id: 'tribute_003',
    donorName: 'Anonymous Donor',
    message: 'This post contains inappropriate content and has been flagged.',
    submittedBy: 'System',
    submittedAt: '2024-03-13',
    status: 'flagged',
  },
];
