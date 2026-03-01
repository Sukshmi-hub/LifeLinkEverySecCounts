import React, { useState, useEffect } from 'react';
import PatientSidebar from '@/components/patient/PatientSidebar';
import RazorpayModal from '@/components/patient/RazorpayModal';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Clock, User, Heart, Building2, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const PaymentPage = () => {
  const { user } = useAuth();
  const { matchedDonor, organRequests = [], loadOrganRequests } = useNotifications() || {};

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentSummary, setPaymentSummary] = useState(null);
  

  useEffect(() => {
    if (user?.id && loadOrganRequests) loadOrganRequests(user.id);

    (async () => {
      try {
        if (!user?.id) return;
        const resp = await fetch(`/api/payments/patient/${encodeURIComponent(user.id)}`);
        const json = await resp.json().catch(() => ({}));
        if (resp.ok && Array.isArray(json.data)) {
          const pending = json.data.find(p => String(p.status || '').toLowerCase() === 'pending');
          setPaymentSummary(pending || (json.data[0] || null));
        }
      } catch (e) {
        // ignore
      }
    })();
  }, [user?.id, loadOrganRequests]);

  const matchedRequest = (organRequests || []).find((r) => {
    if (!r) return false;
    const rs = String(r.status || '').toLowerCase();
    const isMatched = rs.includes('donor') || rs.includes('matched') || rs.includes('accept');

    const uid = String(user?.id || user?._id || '');
    const uname = String(user?.name || user?.fullName || '');
    const uemail = String(user?.email || '');

    const pid = String(r.patientId || r.patient || r.patientId?._id || '');
    const pname = String(r.patientName || r.patient || r.patient?.name || '');
    const pemail = String(r.patientEmail || r.email || '');

    const matchesUser = (
      (pid && uid && pid === uid) ||
      (pid && uid && pid.includes(uid)) ||
      (pname && uname && pname.toLowerCase().includes(uname.toLowerCase())) ||
      (pemail && uemail && pemail.toLowerCase() === uemail.toLowerCase())
    );

    return isMatched && matchesUser;
  });

  return (
    <div className="min-h-screen bg-background">
      <PatientSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      <main className="lg:ml-64 min-h-screen">
        <header className="sticky top-0 z-20 bg-card border-b border-border px-6 py-4">
          <div className="ml-12 lg:ml-0">
            <h1 className="text-2xl font-bold text-foreground">Payments</h1>
            <p className="text-muted-foreground">Complete payment for matched donors</p>
          </div>
        </header>

        <div className="p-6">
          {!paymentSummary && !matchedDonor && !matchedRequest ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
                  <Clock className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">No donor matched yet</h3>
                <p className="text-muted-foreground max-w-md">
                  Once a donor is matched to your organ request, you'll be able to proceed with the payment here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="max-w-2xl mx-auto">
              <Card className="overflow-hidden">
                <div className="bg-success/10 p-6 border-b border-success/20">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
                      <Heart className="w-6 h-6 text-success" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-success">Donor Matched!</h3>
                      <p className="text-sm text-muted-foreground">Complete payment to initiate treatment</p>
                    </div>
                  </div>
                </div>

                <CardContent className="p-6 space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
                      <User className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Donor Name</p>
                        <p className="font-medium">
                          {matchedDonor?.name || matchedRequest?.donorName || (matchedRequest?.patientName || '').trim() || 'Anonymous Donor'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
                      <Heart className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Organ Type</p>
                        <p className="font-medium">{matchedDonor?.organType || matchedRequest?.organType}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg sm:col-span-2">
                      <Building2 className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Hospital</p>
                        <p className="font-medium">{matchedDonor?.hospitalName || matchedRequest?.hospitalName || 'City General Hospital'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border pt-6">
                    <h4 className="font-semibold mb-4">Payment Summary</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Transplant Surgery Fee</span>
                        <span>₹{(paymentSummary?.surgeryFee || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Hospital Charges</span>
                        <span>₹{(paymentSummary?.hospitalCharges || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Processing Fee</span>
                        <span>₹{(paymentSummary?.processingFee || 0).toLocaleString()}</span>
                      </div>
                      <div className="border-t border-border pt-2 mt-2 flex justify-between">
                        <span className="font-semibold">Total Amount</span>
                        <span className="font-bold text-lg">₹{(paymentSummary?.totalAmount || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={() => setShowPaymentModal(true)} className="flex-1 h-12 text-base">
                      <CreditCard className="w-5 h-5 mr-2" />
                      Proceed to Payment
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      {(paymentSummary || matchedDonor || matchedRequest) && (
        <RazorpayModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          donorName={user?.name || matchedDonor?.name || matchedRequest?.donorName || (matchedRequest?.patientName || '').trim() || 'Anonymous Donor'}
          organType={matchedDonor?.organType || matchedRequest?.organType}
          hospitalName={matchedDonor?.hospitalName || matchedRequest?.hospitalName || 'City General Hospital'}
          amount={paymentSummary?.totalAmount || 50000}
          hospitalId={matchedRequest?.hospitalId || paymentSummary?.hospitalId || null}
          requestId={matchedRequest?.id || paymentSummary?.requestId || null}
        />
      )}

      
    </div>
  );
};

export default PaymentPage;
