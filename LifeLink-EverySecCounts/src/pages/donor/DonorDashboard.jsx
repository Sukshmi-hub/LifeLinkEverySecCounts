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
  // Completed donations count should reflect certificates generated
  const completedCount = donationCertificates.length || donorMatches.filter(m => m.status === 'Completed').length;
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
              value={String(donationCertificates.length)} 
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
              {donationCertificates.length === 0 ? (
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
                      {donationCertificates.map(c => (
                        <tr key={c._id} className="border-b">
                          <td className="py-3">{c.organOrBlood || '—'}</td>
                          <td className="py-3">{c.dateOfDonation ? (new Date(c.dateOfDonation)).toLocaleDateString() : '—'}</td>
                          <td className="py-3">Certificate Issued</td>
                          <td className="py-3">
                            <button className="text-primary underline" onClick={async () => {
                              try {
                                const token = localStorage.getItem('token')
                                const resp = await fetch(`/api/certificates/${encodeURIComponent(c._id)}/download`, { headers: { Authorization: token ? `Bearer ${token}` : '' } })
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