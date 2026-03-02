/* =========================
   ROLE CONSTANTS
========================= */

export const UserRole = {
  PATIENT: "patient",
  DONOR: "donor",
  HOSPITAL: "hospital",
  NGO: "ngo",
  ADMIN: "admin",
};

export const userRoles = Object.values(UserRole);

/* 
   USERS DATA (MOCK) - INDIAN CONTEXT
 */

export const users = [
  {
    id: "usr_001",
    name: "Amit Sharma",
    email: "amit.sharma@gmail.com",
    phone: "+91 9876543210",
    role: UserRole.PATIENT,
    verified: true,
    createdAt: "2024-01-15",
    bloodType: "O+",
    location: "Kanpur, Uttar Pradesh",
    status: "active",
  },
  {
    id: "usr_002",
    name: "Sunita Singh",
    email: "sunita.singh@gmail.com",
    phone: "+91 9123456789",
    role: UserRole.DONOR,
    verified: true,
    createdAt: "2024-02-10",
    bloodType: "A-",
    location: "Mumbai, Maharashtra",
    status: "active",
  },
  {
    id: "usr_003",
    name: "City Care Hospital",
    email: "contact@citycarehospital.in",
    phone: "+91 2265432109",
    role: UserRole.HOSPITAL,
    verified: true,
    createdAt: "2024-01-01",
    location: "Delhi",
    status: "active",
  },
  {
    id: "usr_004",
    name: "Seva Foundation",
    email: "info@sevafoundation.org",
    phone: "+91 8045678901",
    role: UserRole.NGO,
    verified: true,
    createdAt: "2024-01-20",
    location: "Bengaluru, Karnataka",
    status: "active",
  },
  {
    id: "usr_005",
    name: "LifeLink Admin",
    email: "admin@lifelink.in",
    phone: "+91 9000000001",
    role: UserRole.ADMIN,
    verified: true,
    createdAt: "2024-01-01",
    location: "Noida, Uttar Pradesh",
    status: "active",
  },
  {
    id: "usr_006",
    name: "Rohit Verma",
    email: "rohit.verma@gmail.com",
    phone: "+91 9988776655",
    role: UserRole.DONOR,
    verified: false,
    createdAt: "2024-03-01",
    bloodType: "B+",
    location: "Jaipur, Rajasthan",
    status: "pending",
  },
  {
    id: "usr_007",
    name: "Neha Gupta",
    email: "neha.gupta@gmail.com",
    phone: "+91 8899776655",
    role: UserRole.PATIENT,
    verified: true,
    createdAt: "2024-02-28",
    bloodType: "AB+",
    location: "Lucknow, Uttar Pradesh",
    status: "active",
  },
];

/* =========================
   HELPER FUNCTIONS
========================= */

export const getUsersByRole = (role) =>
  users.filter((user) => user.role === role);

export const getUserById = (id) =>
  users.find((user) => user.id === id);

export const getPendingUsers = () =>
  users.filter((user) => user.status === "pending");
