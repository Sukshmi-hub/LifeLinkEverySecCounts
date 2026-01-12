import React, { useState } from 'react';
import PatientSidebar from '@/components/patient/PatientSidebar';
import RazorpayModal from '@/components/patient/RazorpayModal';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Clock, User, Heart, Building2 } from 'lucide-react';

const PaymentPage = () => {
  const { user } = useAuth();
  const { matchedDonor, organRequests } = useNotifications();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Find request where a donor is already matched for the logged-in user
  const matchedRequest = organRequests.find(
    (r) =>
      r.status === 'Donor Matched' &&
      (r.patientId === user?.id || r.patientName === user?.name)
  );

  return (
    <div className="min-h-screen bg-background">
      <PatientSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      <main className="lg:ml-64 min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-card border-b border-border px-6 py-4">
          <div className="ml-12 lg:ml-0">
            <h1 className="text-2xl font-bold text-foreground">Payments</h1>
            <p className="text-muted-foreground">Complete payment for matched donors</p>
          </div>
        </header>

        <div className="p-6">
          {!matchedDonor && !matchedRequest ? (
            /* No Donor Matched State */
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
            /* Donor Matched State */
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
                  {/* Donor Details */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
                      <User className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Donor Name</p>
                        <p className="font-medium">
                          {matchedDonor?.name || matchedRequest?.donorName || 'Anonymous Donor'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
                      <Heart className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Organ Type</p>
                        <p className="font-medium">
                          {matchedDonor?.organType || matchedRequest?.organType}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg sm:col-span-2">
                      <Building2 className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Hospital</p>
                        <p className="font-medium">
                          {matchedDonor?.hospitalName || matchedRequest?.hospitalName || 'City General Hospital'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Payment Summary */}
                  <div className="border-t border-border pt-6">
                    <h4 className="font-semibold mb-4">Payment Summary</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Transplant Surgery Fee</span>
                        <span>₹40,000</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Hospital Charges</span>
                        <span>₹8,000</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Processing Fee</span>
                        <span>₹2,000</span>
                      </div>
                      <div className="border-t border-border pt-2 mt-2 flex justify-between">
                        <span className="font-semibold">Total Amount</span>
                        <span className="font-bold text-lg">₹50,000</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Button */}
                  <Button 
                    onClick={() => setShowPaymentModal(true)} 
                    className="w-full h-12 text-base"
                  >
                    <CreditCard className="w-5 h-5 mr-2" />
                    Proceed to Payment
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* Razorpay Integration Modal */}
      {(matchedDonor || matchedRequest) && (
        <RazorpayModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          donorName={matchedDonor?.name || matchedRequest?.donorName || 'Anonymous Donor'}
          organType={matchedDonor?.organType || matchedRequest?.organType}
          hospitalName={matchedDonor?.hospitalName || matchedRequest?.hospitalName || 'City General Hospital'}
          amount={50000}
        />
      )}
    </div>
  );
};

export default PaymentPage;