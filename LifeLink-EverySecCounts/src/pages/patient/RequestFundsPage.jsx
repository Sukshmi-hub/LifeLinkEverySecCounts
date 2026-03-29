import ErrorBoundary from '@/components/ErrorBoundary';
import React, { useState, useEffect } from 'react';
import PatientSidebar from '@/components/patient/PatientSidebar';
import FundRequestModal from '@/components/patient/FundRequestModal';

import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HandHeart, Plus, Clock, CheckCircle, Check, XCircle, IndianRupee } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

import { useLocation } from 'react-router-dom';

const RequestFundsPage = () => {
  const { user } = useAuth();
  const { fundRequests, loadFundRequests } = useNotifications();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showFundModal, setShowFundModal] = useState(false);
  const { state } = useLocation();

  useEffect(() => {
    if (state && state.prefill) {
      setShowFundModal(true);
    }
  }, [state]);

  React.useEffect(() => {
    if (user?.id) {
      loadFundRequests(user.id)
    }
  }, [user?.id])

  const safeFundRequests = Array.isArray(fundRequests) ? fundRequests : [];
  const patientFundRequests = safeFundRequests.filter(r => r && (r.patientId === user?.id || r.patientName === user?.name));

  const isPaymentDone = (request) => Boolean(request?.paymentReceived) || String(request?.paymentStatus || '').toLowerCase() === 'success';
  const getDisplayStatus = (request) => {
    if (isPaymentDone(request)) return 'paymentDone';
    return request?.status || 'Pending';
  };

  const getStatusIcon = (request) => {
    const status = getDisplayStatus(request);
    switch (status) {
      case 'paymentDone':
        return (
          <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center border-2 border-success">
              <Check className="w-4 h-4 text-success" />
            </div>
          </div>
        );
      case 'Approved':
        return <CheckCircle className="w-5 h-5 text-success" />;
      case 'SentToHospital':
        return (
          <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full bg-success/60 flex items-center justify-center border-2 border-success">
              <Check className="w-4 h-4 text-white" />
            </div>
          </div>
        );
      case 'Rejected':
        return <XCircle className="w-5 h-5 text-destructive" />;
      default:
        return <Clock className="w-5 h-5 text-warning" />;
    }
  };

  const getStatusColor = (request) => {
    const status = getDisplayStatus(request);
    switch (status) {
      case 'paymentDone':
        return 'bg-success/20 text-success';
      case 'Approved':
        return 'bg-success/20 text-success';
      case 'SentToHospital':
        return 'bg-success/20 text-success';
      case 'Rejected':
        return 'bg-destructive/20 text-destructive';
      default:
        return 'bg-warning/20 text-warning';
    }
  };

  return (
    <ErrorBoundary>
    <div className="min-h-screen bg-background">
      <PatientSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      <main className="lg:ml-64 min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-card border-b border-border px-6 py-4">
          <div className="ml-12 lg:ml-0">
            <h1 className="text-2xl font-bold text-foreground">Request Funds</h1>
            <p className="text-muted-foreground">Request financial assistance from NGOs</p>
          </div>
        </header>

        <div className="p-6">
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-3 mb-8">
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <IndianRupee className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    ₹{patientFundRequests.reduce((sum, r) => sum + (Number(r?.amount) || 0), 0).toLocaleString()}
                  </p>
                  <p className="text-muted-foreground text-sm">Total Requested</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {patientFundRequests.filter(r => !isPaymentDone(r)).length}
                  </p>
                  <p className="text-muted-foreground text-sm">Pending</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {patientFundRequests.filter(r => isPaymentDone(r)).length}
                  </p>
                  <p className="text-muted-foreground text-sm">Approved</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Fund Requests List */}
          <Card>
            <CardHeader>
              <CardTitle>Your Fund Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {patientFundRequests.length === 0 ? (
                <div className="text-center py-12">
                  <HandHeart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">No fund requests yet</h3>
                  <p className="text-muted-foreground mb-4">Request financial assistance from NGOs for your treatment.</p>
                  <Button onClick={() => setShowFundModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Request Funds
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {patientFundRequests.map(request => {
                    const createdAt = request?.createdAt ? new Date(request.createdAt) : new Date();
                    const amountDisplay = Number(request?.amount) || 0;
                    const desc = (request?.description || '').slice(0, 50);

                    return (
                      <div
                        key={request.id}
                        className="flex items-center justify-between p-4 bg-muted/30 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          {getStatusIcon(request)}
                          <div>
                            <h4 className="font-medium">₹{amountDisplay.toLocaleString()}</h4>
                            <p className="text-sm text-muted-foreground">
                              {request?.reason || ''} • {desc}...
                              {request?.ngoName ? (
                                <span className="text-xs text-muted-foreground block">NGO: {request.ngoName}</span>
                              ) : null}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={cn("px-3 py-1 rounded-full text-xs font-medium", getStatusColor(request))}>
                            {getDisplayStatus(request)}
                          </span>
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatDistanceToNow(createdAt, { addSuffix: true })}
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

      <FundRequestModal 
        isOpen={showFundModal} 
        onClose={() => setShowFundModal(false)} 
        initialData={state?.prefill}
        fixed={Boolean(state?.fixed)}
      />
    </div>
    </ErrorBoundary>
  );
};

export default RequestFundsPage;
