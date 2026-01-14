import React, { useState } from 'react';
import PatientSidebar from '@/components/patient/PatientSidebar';
import OrganRequestModal from '@/components/patient/OrganRequestModal';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Clock, Heart, AlertTriangle, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

// ✅ SAFE Medical Icons (Consistent with DonateModal)
import { GiKidneys, GiLiver, GiLungs, GiSkeleton } from "react-icons/gi";
import { FaEye, FaHeart } from "react-icons/fa";
import { MdBiotech } from "react-icons/md";

// Icon mapping helper
const getOrganIcon = (organType) => {
  const type = organType?.toLowerCase() || '';
  if (type.includes('kidney')) return GiKidneys;
  if (type.includes('liver')) return GiLiver;
  if (type.includes('heart')) return FaHeart;
  if (type.includes('lung')) return GiLungs;
  if (type.includes('pancreas')) return MdBiotech;
  if (type.includes('cornea')) return FaEye;
  if (type.includes('marrow')) return GiSkeleton;
  return Heart;
};

const PatientRequestPage = () => {
  const { user } = useAuth();
  const { organRequests } = useNotifications();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);

  const patientRequests = organRequests.filter(r => r.patientId === user?.id || r.patientName === user?.name);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Accepted':
      case 'Donor Matched':
        return 'bg-success/20 text-success border-success/30';
      case 'Rejected':
        return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'In Progress':
      case 'Pending – Hospital Review':
        return 'bg-warning/20 text-warning border-warning/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PatientSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      <main className="lg:ml-64 min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="ml-12 lg:ml-0">
              <h1 className="text-2xl font-bold text-foreground">Organ Request</h1>
              <p className="text-muted-foreground text-sm">Submit and track your organ requests</p>
            </div>
            <Button onClick={() => setShowRequestModal(true)} className="shadow-sm">
              <Plus className="w-4 h-4 mr-2" />
              New Request
            </Button>
          </div>
        </header>

        <div className="p-6 max-w-6xl mx-auto">
          {/* Stats Overview */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card className="border-none bg-primary/5 shadow-none">
              <CardContent className="flex items-center gap-4 p-6">
                <FileText className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{patientRequests.length}</p>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Total</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-none bg-warning/5 shadow-none">
              <CardContent className="flex items-center gap-4 p-6">
                <Clock className="w-8 h-8 text-warning" />
                <div>
                  <p className="text-2xl font-bold">
                    {patientRequests.filter(r => r.status?.includes('Pending')).length}
                  </p>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Pending</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none bg-success/5 shadow-none">
              <CardContent className="flex items-center gap-4 p-6">
                <Heart className="w-8 h-8 text-success" />
                <div>
                  <p className="text-2xl font-bold">
                    {patientRequests.filter(r => r.status === 'Accepted' || r.status === 'Donor Matched').length}
                  </p>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Matched</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none bg-destructive/5 shadow-none">
              <CardContent className="flex items-center gap-4 p-6">
                <AlertTriangle className="w-8 h-8 text-destructive" />
                <div>
                  <p className="text-2xl font-bold">
                    {patientRequests.filter(r => r.urgency === 'High').length}
                  </p>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Critical</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Requests List */}
          <Card className="shadow-sm border-border">
            <CardHeader className="border-b border-border/50">
              <CardTitle className="text-lg">Recent History</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {patientRequests.length === 0 ? (
                <div className="text-center py-20">
                  <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold">No active requests</h3>
                  <p className="text-muted-foreground max-w-xs mx-auto mt-1">
                    When you submit a request for an organ, it will appear here for tracking.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {patientRequests.map(request => {
                    const OrganIcon = getOrganIcon(request.organType);
                    return (
                      <div
                        key={request.id}
                        className="group flex flex-col md:flex-row md:items-center justify-between p-5 border border-border rounded-xl hover:border-primary/30 hover:bg-primary/[0.02] transition-all"
                      >
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <OrganIcon className="w-7 h-7 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-bold text-lg">{request.organType}</h4>
                            <div className="flex items-center gap-3 mt-1">
                                <span className={cn(
                                    "text-[10px] uppercase font-bold px-2 py-0.5 rounded",
                                    request.urgency === 'High' ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-muted-foreground'
                                )}>
                                    {request.urgency} Priority
                                </span>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {request.createdAt ? formatDistanceToNow(new Date(request.createdAt), { addSuffix: true }) : 'Just now'}
                                </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 md:mt-0 flex flex-col items-start md:items-end gap-2">
                          <span className={cn(
                            "px-4 py-1.5 rounded-full text-xs font-bold border", 
                            getStatusColor(request.status)
                          )}>
                            {request.status}
                          </span>
                          <p className="text-[11px] text-muted-foreground italic">
                            ID: #{request.id?.slice(-6).toUpperCase() || 'N/A'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <OrganRequestModal 
        isOpen={showRequestModal} 
        onClose={() => setShowRequestModal(false)} 
      />
    </div>
  );
};

export default PatientRequestPage;