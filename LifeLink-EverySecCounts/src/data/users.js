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

/* =========================
   USERS DATA (MOCK)
========================= */

export const users = [
  {
    id: "usr_001",
    name: "John Patient",
    email: "john@example.com",
    phone: "+1234567890",
    role: UserRole.PATIENT,
    verified: true,
    createdAt: "2024-01-15",
    bloodType: "O+",
    location: "New York, NY",
    status: "active",
  },
  {
    id: "usr_002",
    name: "Sarah Donor",
    email: "sarah@example.com",
    phone: "+1234567891",
    role: UserRole.DONOR,
    verified: true,
    createdAt: "2024-02-10",
    bloodType: "A-",
    location: "Los Angeles, CA",
    status: "active",
  },
  {
    id: "usr_003",
    name: "City General Hospital",
    email: "admin@citygeneral.com",
    phone: "+1234567892",
    role: UserRole.HOSPITAL,
    verified: true,
    createdAt: "2024-01-01",
    location: "Chicago, IL",
    status: "active",
  },
  {
    id: "usr_004",
    name: "Hope Foundation NGO",
    email: "contact@hopefoundation.org",
    phone: "+1234567893",
    role: UserRole.NGO,
    verified: true,
    createdAt: "2024-01-20",
    location: "Boston, MA",
    status: "active",
  },
  {
    id: "usr_005",
    name: "Admin User",
    email: "admin@lifelink.com",
    phone: "+1234567894",
    role: UserRole.ADMIN,
    verified: true,
    createdAt: "2024-01-01",
    location: "Headquarters",
    status: "active",
  },
  {
    id: "usr_006",
    name: "Mike Williams",
    email: "mike@example.com",
    phone: "+1234567895",
    role: UserRole.DONOR,
    verified: false,
    createdAt: "2024-03-01",
    bloodType: "B+",
    location: "Houston, TX",
    status: "pending",
  },
  {
    id: "usr_007",
    name: "Emily Brown",
    email: "emily@example.com",
    phone: "+1234567896",
    role: UserRole.PATIENT,
    verified: true,
    createdAt: "2024-02-28",
    bloodType: "AB+",
    location: "Phoenix, AZ",
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
