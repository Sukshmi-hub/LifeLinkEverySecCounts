/* ---------------- CONSTANTS ---------------- */

export const requestTypes = ["blood", "organ", "emergency"];
export const urgencyLevels = ["normal", "high", "critical"];
export const requestStatuses = [
  "pending",
  "matched",
  "approved",
  "in_progress",
  "completed",
  "cancelled",
];

/* ---------------- REQUESTS DATA ---------------- */

export const requests = [
  {
    id: "req_001",
    patientId: "usr_001",
    patientName: "John Patient",
    hospitalId: "usr_003",
    hospitalName: "City General Hospital",
    type: "blood",
    bloodType: "O+",
    urgency: "high",
    status: "pending",
    location: "New York, NY",
    description: "Urgent blood transfusion needed for surgery",
    createdAt: "2024-03-10T10:30:00",
    updatedAt: "2024-03-10T10:30:00",
    units: 3,
  },
  {
    id: "req_002",
    patientId: "usr_007",
    patientName: "Emily Brown",
    type: "organ",
    organType: "Kidney",
    urgency: "critical",
    status: "matched",
    location: "Phoenix, AZ",
    description: "Kidney transplant required - patient on dialysis",
    createdAt: "2024-03-08T14:00:00",
    updatedAt: "2024-03-10T09:15:00",
    matchedDonorId: "usr_002",
    matchedDonorName: "Sarah Donor",
  },
  {
    id: "req_003",
    patientId: "usr_001",
    patientName: "John Patient",
    hospitalId: "usr_003",
    hospitalName: "City General Hospital",
    type: "blood",
    bloodType: "A-",
    urgency: "normal",
    status: "completed",
    location: "Chicago, IL",
    description: "Routine blood donation for scheduled procedure",
    createdAt: "2024-03-01T09:00:00",
    updatedAt: "2024-03-05T16:30:00",
    units: 2,
    matchedDonorId: "usr_002",
    matchedDonorName: "Sarah Donor",
  },
  {
    id: "req_004",
    patientId: "usr_007",
    patientName: "Emily Brown",
    type: "emergency",
    bloodType: "AB+",
    urgency: "critical",
    status: "in_progress",
    location: "Phoenix, AZ",
    description:
      "Emergency - Car accident victim needs immediate blood",
    createdAt: "2024-03-10T08:00:00",
    updatedAt: "2024-03-10T08:30:00",
    units: 5,
  },
  {
    id: "req_005",
    patientId: "usr_001",
    patientName: "John Patient",
    type: "organ",
    organType: "Liver",
    urgency: "high",
    status: "pending",
    location: "New York, NY",
    description: "Liver transplant evaluation in progress",
    createdAt: "2024-03-09T11:00:00",
    updatedAt: "2024-03-09T11:00:00",
  },
];

/* ---------------- HELPERS ---------------- */

export const getRequestsByPatient = (patientId) => {
  return requests.filter((req) => req.patientId === patientId);
};

export const getRequestsByStatus = (status) => {
  return requests.filter((req) => req.status === status);
};

export const getEmergencyRequests = () => {
  return requests.filter(
    (req) =>
      req.urgency === "critical" || req.type === "emergency"
  );
};

export const getRequestStats = () => {
  return {
    total: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    inProgress: requests.filter(
      (r) => r.status === "in_progress"
    ).length,
    completed: requests.filter(
      (r) => r.status === "completed"
    ).length,
    critical: requests.filter(
      (r) => r.urgency === "critical"
    ).length,
  };
};
