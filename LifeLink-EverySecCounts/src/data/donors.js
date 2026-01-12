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

/* ---------------- DONORS DATA ---------------- */

export const donors = [
  {
    id: "dnr_001",
    userId: "usr_002",
    name: "Sarah Donor",
    email: "sarah@example.com",
    phone: "+1234567891",
    bloodType: "A-",
    donorType: "both",
    organs: ["Kidney"],
    available: true,
    lastDonation: "2024-02-15",
    totalDonations: 8,
    location: "Los Angeles, CA",
    coordinates: { lat: 34.0522, lng: -118.2437 },
    verified: true,
    consentUploaded: true,
    createdAt: "2023-06-10",
  },
  {
    id: "dnr_002",
    userId: "usr_006",
    name: "Mike Williams",
    email: "mike@example.com",
    phone: "+1234567895",
    bloodType: "B+",
    donorType: "blood",
    available: true,
    lastDonation: "2024-01-20",
    totalDonations: 3,
    location: "Houston, TX",
    coordinates: { lat: 29.7604, lng: -95.3698 },
    verified: false,
    consentUploaded: false,
    createdAt: "2024-01-01",
  },
  {
    id: "dnr_003",
    userId: "new_donor_1",
    name: "Rachel Green",
    email: "rachel@example.com",
    phone: "+1234567897",
    bloodType: "O+",
    donorType: "blood",
    available: true,
    totalDonations: 12,
    lastDonation: "2024-03-01",
    location: "New York, NY",
    coordinates: { lat: 40.7128, lng: -74.006 },
    verified: true,
    consentUploaded: true,
    createdAt: "2022-03-15",
  },
  {
    id: "dnr_004",
    userId: "new_donor_2",
    name: "David Chen",
    email: "david@example.com",
    phone: "+1234567898",
    bloodType: "AB+",
    donorType: "organ",
    organs: ["Liver", "Kidney"],
    available: false,
    totalDonations: 1,
    location: "San Francisco, CA",
    coordinates: { lat: 37.7749, lng: -122.4194 },
    verified: true,
    consentUploaded: true,
    createdAt: "2023-09-20",
  },
  {
    id: "dnr_005",
    userId: "new_donor_3",
    name: "Lisa Johnson",
    email: "lisa@example.com",
    phone: "+1234567899",
    bloodType: "O-",
    donorType: "blood",
    available: true,
    totalDonations: 20,
    lastDonation: "2024-02-28",
    location: "Chicago, IL",
    coordinates: { lat: 41.8781, lng: -87.6298 },
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
