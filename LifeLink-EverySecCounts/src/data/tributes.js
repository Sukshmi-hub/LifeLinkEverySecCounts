/* ---------------- CONSTANTS ---------------- */
import donor1 from "../assets/team/donor1.jpeg";
import donor2 from "../assets/team/donor2.jpeg";
import donor3 from "../assets/team/donor3.jpeg";

export const tributeStatuses = [
  "pending",
  "published",
  "archived",
  "private",
];

/* ---------------- TRIBUTES DATA ---------------- */

export const tributes = [
  {
    id: "trb_001",
    donorName: "Deepak Sharma",
    donorAge: 54,
    donorLocation: "Tamil Nadu, INDIA",
    donationType: "Organ Donor - Heart, Kidneys, Liver",
    recipientMessage:
      "Because of Mr. Sharma, I get to see my grandchildren grow up. Forever grateful.",
    familyName: "The Sharma Family",
    familyMessage:
      "Deepak always believed in giving back. Even in death, he wanted to help others live. He was a firefighter who saved lives every day, and now he continues that legacy.",
    familyConsent: true,
    photo:
        donor1,

    status: "published",
    livesImpacted: 2,
    donationDate: "2025-01-15",
    createdAt: "2024-01-20",
    publishedAt: "2024-01-22",
  },
  {
    id: "trb_002",
    donorName: "Teenu Katiyar",
    donorAge: 24,
    donorLocation: "Kanpur, INDIA",
    donationType: "Organ Donor - Corneas, Tissues",
    familyName: "The Katiyar Family",
    familyMessage:
      "Teenu was an artist who loved to see beauty in everything. We find comfort knowing her gift of sight lives on in others.",
    familyConsent: true,
    photo:
      donor2,
    status: "published",
    livesImpacted: 1,
    donationDate: "2025-02-08",
    createdAt: "2024-02-12",
    publishedAt: "2024-02-14",
  },
  {
    id: "trb_002",
    donorName: "Chanda Devi",
    donorAge: 70,
    donorLocation: "Mathura, INDIA",
    donationType: "Organ Donor - Corneas, Tissues",
    familyName: "The Upadhyay Family",
    familyMessage:
      "Chanda was an artist who loved to see beauty in everything. We find comfort knowing her gift of sight lives on in others.",
    familyConsent: true,
    photo:
      donor3,
    status: "published",
    livesImpacted: 2,
    donationDate: "2025-12-01",
    createdAt: "2024-02-12",
    publishedAt: "2024-02-14",
  },
  


];

/* ---------------- HELPERS ---------------- */

export const getPublishedTributes = () => {
  return tributes.filter((t) => t.status === "published");
};

export const getPendingTributes = () => {
  return tributes.filter((t) => t.status === "pending");
};

export const getTributeStats = () => {
  const published = tributes.filter(
    (t) => t.status === "published"
  );

  return {
    total: tributes.length,
    published: published.length,
    pending: tributes.filter(
      (t) => t.status === "pending"
    ).length,
    livesImpacted: published.reduce(
      (sum, t) => sum + t.livesImpacted,
      0
    ),
  };
};
