import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useDonor } from '@/context/DonorContext';
import DonorSidebar from '@/components/donor/DonorSidebar';
import DonateModal from '@/components/donor/DonateModal';
import DashboardCard from '@/components/DashboardCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Bell, MessageCircle, CheckCircle, Award } from 'lucide-react';

const DonorDashboard = () => {
  const { user } = useAuth();
  const { donationIntents, donorMatches, donorProfile } = useDonor();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showDonateModal, setShowDonateModal] = useState(false);

  // Logic to determine current status based on the most recent intent
  const currentStatus = donationIntents.length > 0 ? donationIntents[0].status : 'Registered';
  
  // Find an active match that hasn't been completed yet for this specific donor
  const activeMatch = donorMatches.find(m => m.status !== 'Completed' && m.donorName === donorProfile.fullName);
  
  // Count successfully completed donations
  const completedDonations = donationIntents.filter(i => i.status === 'Completed').length;

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'bg-success text-success-foreground';
      case 'Matched': 
      case 'In Progress': return 'bg-primary text-primary-foreground';
      case 'Verified': return 'bg-warning text-warning-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DonorSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      <main className="lg:ml-64 min-h-screen">
        {/* Header Section */}
        <header className="sticky top-0 z-20 bg-card border-b border-border px-6 py-4">
          <div className="ml-12 lg:ml-0 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Welcome, {donorProfile.fullName || 'Donor'}
              </h1>
              <p className="text-muted-foreground">Thank you for being a life-saver</p>
            </div>
            <Badge className={getStatusColor(currentStatus)}>{currentStatus}</Badge>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Match Notification Banner */}
          {activeMatch && (
            <Card className="border-success/50 bg-success/5 animate-pulse">
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
                    <Heart className="w-6 h-6 text-success" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-success text-lg">You Have Been Matched!</h3>
                    <p className="text-sm text-muted-foreground">
                      Patient: <span className="font-medium text-foreground">{activeMatch.patientName}</span> • 
                      Organ: <span className="font-medium text-foreground">{activeMatch.organType}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 italic">
                      Current Step: {activeMatch.paymentCompleted ? 'Awaiting medical procedure' : 'Awaiting confirmation and patient payment'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Impact Stats Section */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DashboardCard icon={Heart} title="Donations" value={String(completedDonations)} variant="primary" />
            <DashboardCard icon={Bell} title="Active Alerts" value={String(donorMatches.filter(m => m.status !== 'Completed').length)} variant="warning" />
            <DashboardCard icon={CheckCircle} title="Lives Saved" value={String(completedDonations)} variant="success" />
            <DashboardCard icon={Award} title="Certificates" value={String(completedDonations)} variant="primary" />
          </div>

          {/* Quick Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <Button onClick={() => setShowDonateModal(true)} className="h-24 flex-col gap-2 bg-destructive hover:bg-destructive/90 transition-transform hover:scale-105">
                  <Heart className="h-8 w-8" />
                  <span className="font-bold">Donate Now</span>
                </Button>
                <Link to="/donor/alerts" className="block">
                  <Button variant="outline" className="w-full h-24 flex-col gap-2 hover:bg-muted transition-transform hover:scale-105">
                    <Bell className="h-8 w-8" />
                    <span>View Alerts</span>
                  </Button>
                </Link>
                <Link to="/donor/messages" className="block">
                  <Button variant="outline" className="w-full h-24 flex-col gap-2 hover:bg-muted transition-transform hover:scale-105">
                    <MessageCircle className="h-8 w-8" />
                    <span>Chat with Hospital</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* History of Donation Intents */}
          {donationIntents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Your Donation History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {donationIntents.slice(0, 5).map(intent => (
                    <div key={intent.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/10">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Heart className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{intent.organType}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(intent.createdAt).toLocaleDateString(undefined, { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                            })}
                          </p>
                        </div>
                      </div>
                      <Badge className={cn("font-semibold", getStatusColor(intent.status))}>
                        {intent.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Pop-up Modal for Organ Selection */}
      <DonateModal isOpen={showDonateModal} onClose={() => setShowDonateModal(false)} />
    </div>
  );
};

export default DonorDashboard;