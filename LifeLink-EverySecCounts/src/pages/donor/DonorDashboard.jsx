import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useDonor } from '@/context/DonorContext';
import DonorSidebar from '@/components/donor/DonorSidebar';
import DonateModal from '@/components/donor/DonateModal';
import DonationCertificate from '@/components/donor/DonationCertificate';
import DashboardCard from '@/components/DashboardCard';
import { useDots } from '@/context/DotsContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, AlertTriangle, MessageCircle, CheckCircle, Award, FileText, Clock, Activity } from 'lucide-react';

const DonorDashboard = () => {
  const { user } = useAuth();
  const { donationIntents = [], donorMatches = [], donorProfile = {} } = useDonor();
  const { donationCertificates = [] } = useDonor();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const { clearDot } = useDots();

  // Logic with safe fallbacks
  const currentStatus = donationIntents.length > 0 ? donationIntents[0].status : 'Registered';
  const activeMatch = donorMatches.find(m => m.status !== 'Completed' && m.donorName === donorProfile?.fullName);
  // Pending verification = intents marked as 'Available...' or 'Pending'
  const pendingIntents = donationIntents.filter(i => {
    const s = (i.status || '').toString().toLowerCase();
    return s.includes('available') || s.includes('pending');
  }).length;
  const verifiedIntents = donationIntents.filter(i => i.status === 'Verified').length;

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'bg-success text-success-foreground';
      case 'Matched': 
      case 'In Progress': return 'bg-primary text-primary-foreground';
      case 'Verified': return 'bg-warning text-warning-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    const date = d instanceof Date ? d : new Date(d);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
  };

  const handleViewCertificate = (match) => {
    setSelectedCertificate({
      organType: match.organType,
      hospitalName: match.hospitalName,
      patientName: match.patientName,
      date: match.matchDate,
    });
    setShowCertificate(true);
  };

  const getCertificateKey = (certificate, index) => (
    certificate?._id ||
    certificate?.id ||
    certificate?.certificateNumber ||
    `${certificate?.organOrBlood || certificate?.organType || 'certificate'}-${certificate?.dateOfDonation || certificate?.issuedAt || index}`
  );

  const getCertificateOrgan = (certificate) => (
    certificate?.organOrBlood ||
    certificate?.organType ||
    certificate?.organ ||
    certificate?.bloodType ||
    '—'
  );

  const getCertificateDate = (certificate) => {
    const rawDate = certificate?.dateOfDonation || certificate?.issuedAt || certificate?.createdAt || certificate?.completedAt;
    if (!rawDate) return '—';
    const date = new Date(rawDate);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
  };

  const buildSyntheticCertificates = () => {
    const sources = [...(Array.isArray(donorMatches) ? donorMatches : []), ...(Array.isArray(donationIntents) ? donationIntents : [])];
    return sources
      .filter((item) => {
        const status = String(item?.status || '').toLowerCase();
        return status.includes('matched') || status.includes('completed') || status.includes('certificate');
      })
      .map((item, index) => {
        const rawDate = item.completedAt || item.matchDate || item.createdAt || new Date();
        const certDate = new Date(rawDate);
        const safeDate = Number.isNaN(certDate.getTime()) ? new Date() : certDate;
        const organOrBlood = item.organType || item.organ || item.organOrBlood || item.bloodType || 'Organ';
        const certId = item.certificateNumber || item._id || item.id || `SYN-${index + 1}`;
        return {
          _id: String(certId),
          id: String(certId),
          certificateNumber: String(certId),
          donorName: donorProfile?.fullName || item.donorName || user?.name || 'Anonymous Donor',
          organOrBlood,
          organType: organOrBlood,
          dateOfDonation: safeDate.toISOString(),
          issuedAt: safeDate.toISOString(),
          createdAt: safeDate.toISOString(),
          completedAt: safeDate.toISOString(),
          donorHospitalName: item.donorHospitalName || item.hospitalName || item.receivingHospitalName || item.senderHospitalName || 'City General Hospital',
          hospitalName: item.donorHospitalName || item.hospitalName || item.receivingHospitalName || item.senderHospitalName || 'City General Hospital',
          patientName: item.patientName || item.recipientName || 'Recipient',
          synthetic: true,
        };
      });
  };

  const hasRealCertificates = Array.isArray(donationCertificates) && donationCertificates.some(cert => !cert?.synthetic);
  const displayCertificates = (() => {
    const merged = hasRealCertificates
      ? [...(Array.isArray(donationCertificates) ? donationCertificates : [])]
      : [...(Array.isArray(donationCertificates) ? donationCertificates : []), ...buildSyntheticCertificates()];
    const seen = new Set();
    return merged.filter((cert) => {
      const key = cert?._id || cert?.id || cert?.certificateNumber || `${cert?.organOrBlood || cert?.organType || 'cert'}-${cert?.dateOfDonation || cert?.createdAt || cert?.completedAt || ''}`;
      if (seen.has(String(key))) return false;
      seen.add(String(key));
      return true;
    });
  })();

  // Completed donations count should reflect certificates generated
  const completedCount = displayCertificates.length;

  const buildCertificateHTML = (certificate) => {
    const donorName = donorProfile?.fullName || certificate?.donorName || user?.name || 'Anonymous Donor';
    const organType = getCertificateOrgan(certificate);
    const hospitalName = certificate?.donorHospitalName || certificate?.hospitalName || certificate?.receivingHospitalName || certificate?.senderHospitalName || 'City General Hospital';
    const patientName = certificate?.patientName || 'Recipient';
    const dateText = getCertificateDate(certificate);
    const certificateId = certificate?.certificateNumber || certificate?._id || certificate?.id || 'CERT-UNKNOWN';

    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Donation Certificate</title>
    <style>
      body { font-family: Georgia, serif; margin: 0; padding: 32px; background: #fff; }
      .frame { border: 8px solid #e11d2d; padding: 28px; min-height: 100vh; box-sizing: border-box; }
      .logo { text-align: center; margin-bottom: 28px; }
      .mark { width: 56px; height: 56px; margin: 0 auto 8px; background: #e11d2d; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-size: 28px; }
      .brand { font-weight: 700; font-size: 24px; }
      .tag { color: #777; font-size: 11px; letter-spacing: 2px; }
      .divider { height: 1px; background: #ddd; margin: 20px 0; }
      .subtle { color: #888; font-size: 12px; letter-spacing: 4px; text-align: center; }
      .title { text-align: center; font-size: 28px; font-weight: 700; margin: 10px 0 20px; }
      .name { text-align: center; font-size: 36px; font-style: italic; margin: 18px 0; }
      .bodyText { text-align: center; color: #666; font-style: italic; font-size: 18px; }
      .grid { display: flex; justify-content: space-between; gap: 16px; margin-top: 24px; }
      .cell { flex: 1; text-align: center; }
      .label { color: #e11d2d; text-transform: uppercase; font-size: 12px; letter-spacing: 2px; }
      .value { font-weight: 700; font-size: 18px; margin-top: 6px; }
      .stamp { position: absolute; right: 48px; bottom: 48px; width: 120px; height: 120px; border-radius: 999px; border: 4px solid #e11d2d; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #e11d2d; font-size: 12px; }
      .stamp .heart { font-size: 24px; }
      .container { position: relative; }
    </style>
  </head>
  <body>
    <div class="frame">
      <div class="container">
        <div class="logo">
          <div class="mark">❤</div>
          <div class="brand">LifeLink</div>
          <div class="tag">EVERY SECOND COUNTS</div>
        </div>
        <div class="divider"></div>
        <div class="subtle">THIS CERTIFICATE IS PRESENTED TO</div>
        <div class="title">Certificate of Donation</div>
        <div class="subtle">DONOR</div>
        <div class="name">${donorName}</div>
        <div style="text-align:center;color:#888;margin-bottom:18px;">ID: ${certificateId}</div>
        <div class="bodyText">In recognition of your selfless and generous act of donation, your gift has given someone a second chance at life.</div>
        <div class="divider"></div>
        <div class="grid">
          <div class="cell">
            <div class="label">Organ</div>
            <div class="value">${organType}</div>
          </div>
          <div class="cell">
            <div class="label">Date</div>
            <div class="value">${dateText}</div>
          </div>
          <div class="cell">
            <div class="label">Hospital</div>
            <div class="value">${hospitalName}</div>
          </div>
        </div>
        <div class="stamp">
          <div class="heart">❤</div>
          <div style="font-weight:700;margin-top:6px">LIFELINK</div>
          <div style="font-size:10px">Official</div>
        </div>
      </div>
    </div>
  </body>
</html>`;
  };

  return (
    <div className="min-h-screen bg-background">
      <DonorSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      <main className="lg:ml-64 min-h-screen">
        <header className="sticky top-0 z-20 bg-card border-b border-border px-6 py-4">
          <div className="ml-12 lg:ml-0 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Welcome, {donorProfile?.fullName || 'Donor'}</h1>
              <p className="text-muted-foreground">Thank you for being a life-saver</p>
            </div>
            <Badge className={getStatusColor(currentStatus)}>{currentStatus}</Badge>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Active Match Banner */}
          {activeMatch && (
            <Card className="border-success/50 bg-success/5">
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
                    <Heart className="w-6 h-6 text-success" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-success">You Have Been Matched!</h3>
                    <p className="text-sm text-muted-foreground">
                      Patient: {activeMatch.patientName} • Organ: {activeMatch.organType}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Status: {activeMatch.paymentCompleted ? 'Awaiting Procedure' : 'Awaiting Patient Payment'}
                    </p>
                  </div>
                </div>
                {activeMatch.paymentCompleted && (
                  <Badge className="bg-primary text-primary-foreground">Procedure Scheduled</Badge>
                )}
              </CardContent>
            </Card>
          )}

          {/* Stats Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DashboardCard 
              icon={Heart} 
              title="Donations Completed" 
              value={String(completedCount)} 
              variant="success"
              subtitle="Lives saved"
            />
            <DashboardCard 
              icon={Clock} 
              title="Pending Verification" 
              value={String(pendingIntents)} 
              variant="warning"
              subtitle="Hospital review"
            />
            <DashboardCard 
              icon={Award} 
              title="Certificates" 
              value={String(displayCertificates.length)} 
              variant="primary"
              subtitle="Earned awards"
            />
          </div>

          {/* Action Buttons */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <Button 
                  onClick={() => setShowDonateModal(true)} 
                  className="h-24 flex-col gap-2 bg-destructive hover:bg-destructive/90"
                >
                  <Heart className="h-8 w-8 text-white" />
                  <span className="font-semibold">Donate Organ</span>
                </Button>
                
                {/* Alerts removed for donors */}

                <Link to="/donor/messages" onClick={() => { try { clearDot('messages') } catch (e) {} }}>
                  <Button variant="outline" className="w-full h-24 flex-col gap-2 border-primary/50">
                    <MessageCircle className="h-8 w-8 text-primary" />
                    <span className="font-semibold">Messages</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Donation History List */}
          {donationIntents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Donation Intents
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {donationIntents.slice(0, 5).map(intent => (
                  <div key={intent.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Heart className="h-5 w-5 text-destructive" />
                      <div>
                        <p className="font-medium">{intent.organType || intent.organ || intent.organOrBlood || (intent.bloodType ? 'Blood' : '—')}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(intent.createdAt)}
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(intent.status)}>{intent.status}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* My Donations / Certificates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                My Donations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {displayCertificates.length === 0 ? (
                <p className="text-muted-foreground">No certificates yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full table-auto">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="py-2">Organ</th>
                        <th className="py-2">Date</th>
                        <th className="py-2">Status</th>
                        <th className="py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayCertificates.map((c, index) => (
                        <tr key={getCertificateKey(c, index)} className="border-b">
                          <td className="py-3">{getCertificateOrgan(c)}</td>
                          <td className="py-3">{getCertificateDate(c)}</td>
                          <td className="py-3">Certificate Issued</td>
                          <td className="py-3">
                            <button className="text-primary underline" onClick={async () => {
                              try {
                                const token = localStorage.getItem('token')
                                const certificateId = c?._id || c?.id || c?.certificateNumber
                                if (!certificateId || c?.synthetic) {
                                  const html = buildCertificateHTML(c)
                                  const w = window.open('', '_blank')
                                  if (w) {
                                    w.document.open()
                                    w.document.write(html)
                                    w.document.close()
                                  }
                                  return
                                }
                                const resp = await fetch(`/api/certificates/${encodeURIComponent(certificateId)}/download`, { headers: { Authorization: token ? `Bearer ${token}` : '' } })
                                const html = await resp.text()
                                const w = window.open('', '_blank')
                                if (w) {
                                  w.document.open()
                                  w.document.write(html)
                                  w.document.close()
                                }
                              } catch (e) {
                                console.error('Failed to open certificate', e)
                              }
                            }}>Download Certificate</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <DonateModal isOpen={showDonateModal} onClose={() => setShowDonateModal(false)} />
      
      {showCertificate && selectedCertificate && (
        <DonationCertificate
          donorName={donorProfile?.fullName}
          organType={selectedCertificate.organType}
          hospitalName={selectedCertificate.hospitalName}
          patientName={selectedCertificate.patientName}
          donationDate={selectedCertificate.date}
          certificateId={`CERT-${Date.now().toString(36).toUpperCase()}`}
          onClose={() => setShowCertificate(false)}
        />
      )}
    </div>
  );
};

export default DonorDashboard;
