import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle, Loader2, CreditCard, Smartphone, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const RazorpayModal = ({ 
  isOpen, 
  onClose, 
  donorName, 
  organType, 
  hospitalName,
  amount = 50000 
}) => {
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const banks = [
    'State Bank of India',
    'HDFC Bank',
    'ICICI Bank',
    'Axis Bank',
    'Punjab National Bank',
    'Bank of Baroda',
  ];

  const handlePayment = async () => {
    setIsProcessing(true);

    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2500));

    setIsProcessing(false);
    setIsSuccess(true);
  };

  const resetAndClose = () => {
    setPaymentMethod('upi');
    setUpiId('');
    setCardNumber('');
    setCardExpiry('');
    setCardCvv('');
    setSelectedBank('');
    setIsSuccess(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-lg">
        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>
            <h3 className="text-2xl font-semibold text-foreground mb-2">Payment Successful!</h3>
            <p className="text-muted-foreground mb-4">
              Treatment process initiated.
            </p>
            <div className="bg-muted p-4 rounded-lg w-full text-left space-y-2">
              <p className="text-sm"><span className="text-muted-foreground">Amount:</span> <span className="font-medium">₹{amount.toLocaleString()}</span></p>
              <p className="text-sm"><span className="text-muted-foreground">Donor:</span> <span className="font-medium">{donorName}</span></p>
              <p className="text-sm"><span className="text-muted-foreground">Organ:</span> <span className="font-medium">{organType}</span></p>
              <p className="text-sm"><span className="text-muted-foreground">Hospital:</span> <span className="font-medium">{hospitalName}</span></p>
              <p className="text-sm"><span className="text-muted-foreground">Transaction ID:</span> <span className="font-medium">TXN{Date.now()}</span></p>
            </div>
            <Button onClick={resetAndClose} className="mt-6 w-full">
              Done
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <img src="https://razorpay.com/favicon.png" alt="Razorpay" className="w-6 h-6" />
                Complete Payment
              </DialogTitle>
              <DialogDescription>
                Secure payment powered by Razorpay
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-6">
              {/* Payment Summary */}
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Organ Transplant Fee</span>
                  <span className="font-medium">₹{amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Donor: {donorName}</span>
                  <span className="text-muted-foreground">{organType}</span>
                </div>
                <div className="border-t border-border pt-2 mt-2 flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-lg">₹{amount.toLocaleString()}</span>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="space-y-3">
                <Label>Select Payment Method</Label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('upi')}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                      paymentMethod === 'upi' 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-muted-foreground"
                    )}
                  >
                    <Smartphone className="w-6 h-6" />
                    <span className="text-sm font-medium">UPI</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                      paymentMethod === 'card' 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-muted-foreground"
                    )}
                  >
                    <CreditCard className="w-6 h-6" />
                    <span className="text-sm font-medium">Card</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('netbanking')}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                      paymentMethod === 'netbanking' 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-muted-foreground"
                    )}
                  >
                    <Building2 className="w-6 h-6" />
                    <span className="text-sm font-medium">Net Banking</span>
                  </button>
                </div>
              </div>

              {/* Payment Form */}
              <div className="space-y-4">
                {paymentMethod === 'upi' && (
                  <div className="space-y-2">
                    <Label htmlFor="upiId">UPI ID</Label>
                    <Input
                      id="upiId"
                      placeholder="example@upi"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                    />
                  </div>
                )}

                {paymentMethod === 'card' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="cardNumber">Card Number</Label>
                      <Input
                        id="cardNumber"
                        placeholder="1234 5678 9012 3456"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        maxLength={19}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="expiry">Expiry Date</Label>
                        <Input
                          id="expiry"
                          placeholder="MM/YY"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          maxLength={5}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cvv">CVV</Label>
                        <Input
                          id="cvv"
                          type="password"
                          placeholder="***"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          maxLength={3}
                        />
                      </div>
                    </div>
                  </>
                )}

                {paymentMethod === 'netbanking' && (
                  <div className="space-y-2">
                    <Label>Select Bank</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {banks.map(bank => (
                        <button
                          key={bank}
                          type="button"
                          onClick={() => setSelectedBank(bank)}
                          className={cn(
                            "p-3 text-sm rounded-lg border transition-all text-left",
                            selectedBank === bank
                              ? "border-primary bg-primary/5 font-medium"
                              : "border-border hover:border-muted-foreground"
                          )}
                        >
                          {bank}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Button 
                onClick={handlePayment} 
                disabled={isProcessing}
                className="w-full h-12 text-base"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing Payment...
                  </>
                ) : (
                  `Pay ₹${amount.toLocaleString()}`
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                🔒 Your payment is secure and encrypted
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RazorpayModal;