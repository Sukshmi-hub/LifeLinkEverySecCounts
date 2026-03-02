/* ---------------- CONSTANTS ---------------- */

export const donorTypes = ["blood", "organ", "both"];

export const organTypes = [
  "Kidney",
  "Liver",
  "Heart",
  "Lungs",
  "Pancreas",
  "Cornea",
];

export const bloodTypes = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
];

/* ---------------- DONORS DATA (INDIAN CONTEXT) ---------------- */

export const donors = [
  {
    id: "dnr_001",
    userId: "usr_002",
    name: "Sunita Singh",
    email: "sunita.singh@gmail.com",
    phone: "+91 9123456789",
    bloodType: "A-",
    donorType: "both",
    organs: ["Kidney"],
    available: true,
    lastDonation: "2024-02-15",
    totalDonations: 8,
    location: "Mumbai, Maharashtra",
    coordinates: { lat: 19.0760, lng: 72.8777 },
    verified: true,
    consentUploaded: true,
    createdAt: "2023-06-10",
  },
  {
    id: "dnr_002",
    userId: "usr_006",
    name: "Rohit Verma",
    email: "rohit.verma@gmail.com",
    phone: "+91 9988776655",
    bloodType: "B+",
    donorType: "blood",
    available: true,
    lastDonation: "2024-01-20",
    totalDonations: 3,
    location: "Jaipur, Rajasthan",
    coordinates: { lat: 26.9124, lng: 75.7873 },
    verified: false,
    consentUploaded: false,
    createdAt: "2024-01-01",
  },
  {
    id: "dnr_003",
    userId: "new_donor_1",
    name: "Neha Gupta",
    email: "neha.gupta@gmail.com",
    phone: "+91 8899776655",
    bloodType: "O+",
    donorType: "blood",
    available: true,
    totalDonations: 12,
    lastDonation: "2024-03-01",
    location: "Lucknow, Uttar Pradesh",
    coordinates: { lat: 26.8467, lng: 80.9462 },
    verified: true,
    consentUploaded: true,
    createdAt: "2022-03-15",
  },
  {
    id: "dnr_004",
    userId: "new_donor_2",
    name: "Amit Sharma",
    email: "amit.sharma@gmail.com",
    phone: "+91 9876543210",
    bloodType: "AB+",
    donorType: "organ",
    organs: ["Liver", "Kidney"],
    available: false,
    totalDonations: 1,
    location: "Delhi",
    coordinates: { lat: 28.6139, lng: 77.2090 },
    verified: true,
    consentUploaded: true,
    createdAt: "2023-09-20",
  },
  {
    id: "dnr_005",
    userId: "new_donor_3",
    name: "Priya Nair",
    email: "priya.nair@gmail.com",
    phone: "+91 9090909090",
    bloodType: "O-",
    donorType: "blood",
    available: true,
    totalDonations: 20,
    lastDonation: "2024-02-28",
    location: "Kochi, Kerala",
    coordinates: { lat: 9.9312, lng: 76.2673 },
    verified: true,
    consentUploaded: true,
    createdAt: "2021-01-10",
  },
];

/* ---------------- HELPERS ---------------- */

export const getDonorsByBloodType = (bloodType) => {
  return donors.filter(
    (d) => d.bloodType === bloodType && d.available
  );
};

export const getDonorsByOrgan = (organ) => {
  return donors.filter(
    (d) => d.organs?.includes(organ) && d.available
  );
};

export const getAvailableDonors = () => {
  return donors.filter((d) => d.available && d.verified);
};

export const getDonorStats = () => {
  return {
    total: donors.length,
    available: donors.filter((d) => d.available).length,
    verified: donors.filter((d) => d.verified).length,
    bloodDonors: donors.filter(
      (d) => d.donorType === "blood" || d.donorType === "both"
    ).length,
    organDonors: donors.filter(
      (d) => d.donorType === "organ" || d.donorType === "both"
    ).length,
  };
};
