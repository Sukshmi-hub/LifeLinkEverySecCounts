/* ---------------- DATA ---------------- */

export const hospitalStatuses = [
  "operational",
  "high_demand",
  "emergency",
  "maintenance",
];

export const hospitals = [
  {
    id: "hosp_001",
    name: "City General Hospital",
    email: "admin@citygeneral.com",
    phone: "+1-555-0100",
    address: "123 Medical Center Dr",
    city: "New York",
    state: "NY",
    zipCode: "10001",
    coordinates: { lat: 40.7128, lng: -74.006 },
    status: "operational",
    emergencyCapacity: 50,
    currentLoad: 35,
    availableOrgans: ["Kidney", "Liver", "Cornea"],
    availableBlood: [
      { type: "O+", units: 45 },
      { type: "O-", units: 20 },
      { type: "A+", units: 35 },
      { type: "A-", units: 15 },
      { type: "B+", units: 25 },
      { type: "AB+", units: 10 },
    ],
    specializations: [
      "Transplant Surgery",
      "Emergency Care",
      "Cardiology",
    ],
    verified: true,
    rating: 4.8,
    totalTransplants: 342,
  },
  {
    id: "hosp_002",
    name: "St. Mary's Medical Center",
    email: "contact@stmarys.com",
    phone: "+1-555-0101",
    address: "456 Healthcare Blvd",
    city: "Los Angeles",
    state: "CA",
    zipCode: "90001",
    coordinates: { lat: 34.0522, lng: -118.2437 },
    status: "high_demand",
    emergencyCapacity: 40,
    currentLoad: 38,
    availableOrgans: ["Kidney", "Heart", "Lungs"],
    availableBlood: [
      { type: "O+", units: 30 },
      { type: "O-", units: 10 },
      { type: "A+", units: 25 },
      { type: "B-", units: 8 },
    ],
    specializations: [
      "Heart Transplant",
      "Oncology",
      "Neurology",
    ],
    verified: true,
    rating: 4.9,
    totalTransplants: 456,
  },
  {
    id: "hosp_003",
    name: "Memorial Regional Hospital",
    email: "info@memorialregional.com",
    phone: "+1-555-0102",
    address: "789 Wellness Way",
    city: "Chicago",
    state: "IL",
    zipCode: "60601",
    coordinates: { lat: 41.8781, lng: -87.6298 },
    status: "operational",
    emergencyCapacity: 60,
    currentLoad: 42,
    availableOrgans: ["Kidney", "Liver", "Pancreas"],
    availableBlood: [
      { type: "O+", units: 55 },
      { type: "O-", units: 25 },
      { type: "A+", units: 40 },
      { type: "A-", units: 20 },
      { type: "B+", units: 30 },
      { type: "B-", units: 12 },
      { type: "AB+", units: 15 },
      { type: "AB-", units: 8 },
    ],
    specializations: [
      "Liver Transplant",
      "Pediatrics",
      "Trauma Care",
    ],
    verified: true,
    rating: 4.7,
    totalTransplants: 289,
  },
  {
    id: "hosp_004",
    name: "Phoenix Medical Institute",
    email: "admin@phoenixmed.com",
    phone: "+1-555-0103",
    address: "321 Healing Lane",
    city: "Phoenix",
    state: "AZ",
    zipCode: "85001",
    coordinates: { lat: 33.4484, lng: -112.074 },
    status: "emergency",
    emergencyCapacity: 35,
    currentLoad: 34,
    availableOrgans: ["Cornea"],
    availableBlood: [
      { type: "O+", units: 15 },
      { type: "A+", units: 10 },
    ],
    specializations: [
      "Ophthalmology",
      "Emergency Medicine",
    ],
    verified: true,
    rating: 4.5,
    totalTransplants: 156,
  },
  {
    id: "hosp_005",
    name: "Boston Children's Hospital",
    email: "info@bostonchildrens.com",
    phone: "+1-555-0104",
    address: "654 Care Circle",
    city: "Boston",
    state: "MA",
    zipCode: "02101",
    coordinates: { lat: 42.3601, lng: -71.0589 },
    status: "operational",
    emergencyCapacity: 45,
    currentLoad: 30,
    availableOrgans: ["Kidney", "Liver", "Heart"],
    availableBlood: [
      { type: "O+", units: 40 },
      { type: "O-", units: 18 },
      { type: "A+", units: 35 },
      { type: "A-", units: 12 },
      { type: "B+", units: 22 },
      { type: "AB+", units: 8 },
    ],
    specializations: [
      "Pediatric Transplant",
      "Neonatal Care",
      "Pediatric Cardiology",
    ],
    verified: true,
    rating: 4.9,
    totalTransplants: 512,
  },
];

/* ---------------- HELPERS ---------------- */

export const getHospitalById = (id) => {
  return hospitals.find((h) => h.id === id);
};

export const getHospitalsByOrgan = (organ) => {
  return hospitals.filter((h) =>
    h.availableOrgans.includes(organ)
  );
};

export const getHospitalsByBlood = (bloodType) => {
  return hospitals.filter((h) =>
    h.availableBlood.some(
      (b) => b.type === bloodType && b.units > 0
    )
  );
};

export const calculateDistance = (
  lat1,
  lng1,
  lat2,
  lng2
) => {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

export const getNearbyHospitals = (
  lat,
  lng,
  radiusKm = 100
) => {
  return hospitals
    .filter((h) => {
      const distance = calculateDistance(
        lat,
        lng,
        h.coordinates.lat,
        h.coordinates.lng
      );
      return distance <= radiusKm;
    })
    .sort((a, b) => {
      const distA = calculateDistance(
        lat,
        lng,
        a.coordinates.lat,
        a.coordinates.lng
      );
      const distB = calculateDistance(
        lat,
        lng,
        b.coordinates.lat,
        b.coordinates.lng
      );
      return distA - distB;
    });
};

export const getHospitalStats = () => {
  return {
    total: hospitals.length,
    operational: hospitals.filter(
      (h) => h.status === "operational"
    ).length,
    emergency: hospitals.filter(
      (h) => h.status === "emergency"
    ).length,
    highDemand: hospitals.filter(
      (h) => h.status === "high_demand"
    ).length,
    totalTransplants: hospitals.reduce(
      (sum, h) => sum + h.totalTransplants,
      0
    ),
  };
};
