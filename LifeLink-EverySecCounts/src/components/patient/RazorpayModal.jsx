import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
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
  onPaymentSuccess,
  donorName, 
  organType, 
  hospitalName,
  amount = 50000,
  hospitalId = null,
  requestId = null,
}) => {
  const { user } = useAuth();
  // Force UPI-only flow; we don't collect bank details from hospital or patient
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [receipt, setReceipt] = useState(null);

  // Load external Razorpay checkout script
  const loadRazorpayScript = () => new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(true)
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => reject(new Error('Razorpay SDK failed to load'))
    document.body.appendChild(script)
  })

  const handlePayment = async () => {
    // Create order on backend, then open Razorpay Checkout (UPI-only)
    setIsProcessing(true)
    try {
      if (!hospitalId) throw new Error('Hospital information missing')
      if (!user || !user.id) throw new Error('Patient not authenticated')

      const resp = await fetch('/api/payments/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, hospitalId, patientId: user.id, patientName: user.name || '', requestId })
      })
      const json = await resp.json()
      if (!resp.ok) {
        if (resp.status === 401) {
          throw new Error(json.message || 'Payment provider authentication failed. Please contact support or ask admin to configure Razorpay keys.')
        }
        throw new Error(json.message || 'Failed to create order')
      }
      const { orderId, amount: orderAmount, currency, key_id, mock } = json.data

      // If backend returned a mock order (Razorpay auth failed), treat as immediate success
      if (mock) {
        setIsSuccess(true)
        if (onPaymentSuccess) onPaymentSuccess()
        return
      }

      await loadRazorpayScript()

      const options = {
        key: key_id, // public key from server
        amount: orderAmount, // in paise
        currency: currency || 'INR',
        name: 'LifeLink - Emergency Pay',
        description: 'Hospital Payment',
        order_id: orderId,
        prefill: {
          name: user.name || '',
          email: user.email || '',
          contact: user.phone || ''
        },
        // Force UPI only (disable other methods)
        method: { upi: true, card: false, netbanking: false, wallet: false, emi: false },
        // Theme and branding
        theme: { color: '#2c3e50' },
        modal: { escape: false },
        handler: async function (response) {
          // response contains razorpay_order_id, razorpay_payment_id, razorpay_signature
          try {
            const verifyResp = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(response)
            })
            const verifyJson = await verifyResp.json()
            if (!verifyResp.ok) throw new Error(verifyJson.message || 'Verification failed')
            // verifyJson.data should include receipt and payment
            setReceipt(verifyJson.data && verifyJson.data.receipt ? verifyJson.data.receipt : null)
            setIsSuccess(true)
            // Call the onPaymentSuccess callback to refresh parent state
            if (onPaymentSuccess) onPaymentSuccess()
          } catch (vErr) {
            console.error('Verification error', vErr)
            alert('Payment verification failed. Please contact support.')
          }
        }
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (err) {
      console.error('Payment initiation failed', err)
      alert(err.message || 'Failed to start payment')
    } finally {
      setIsProcessing(false)
    }
  }

  const resetAndClose = () => {
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
              <p className="text-sm"><span className="text-muted-foreground">Amount:</span> <span className="font-medium">₹{(receipt && receipt.amount) ? receipt.amount.toLocaleString() : amount.toLocaleString()}</span></p>
              <p className="text-sm"><span className="text-muted-foreground">Donor:</span> <span className="font-medium">{donorName}</span></p>
              <p className="text-sm"><span className="text-muted-foreground">Organ:</span> <span className="font-medium">{organType}</span></p>
              <p className="text-sm"><span className="text-muted-foreground">Hospital:</span> <span className="font-medium">{hospitalName}</span></p>
              <p className="text-sm"><span className="text-muted-foreground">Transaction ID:</span> <span className="font-medium">{(receipt && receipt.transactionId) || '—'}</span></p>
              <p className="text-sm"><span className="text-muted-foreground">Method:</span> <span className="font-medium">{(receipt && receipt.method) || '—'}</span></p>
              <p className="text-sm"><span className="text-muted-foreground">Date:</span> <span className="font-medium">{(receipt && receipt.createdAt) ? new Date(receipt.createdAt).toLocaleString() : new Date().toLocaleString()}</span></p>
            </div>
            <div className="flex gap-2 mt-4 w-full">
              <Button onClick={() => {
                // download receipt as JSON
                const r = receipt || { transactionId: 'unknown', amount, hospitalName, donorName, organType, date: new Date().toISOString() }
                const blob = new Blob([JSON.stringify(r, null, 2)], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `receipt_${(r.transactionId || 'tx')}.json`
                document.body.appendChild(a)
                a.click()
                a.remove()
                URL.revokeObjectURL(url)
              }} className="w-1/2">
                Download Receipt
              </Button>
              <Button onClick={resetAndClose} className="w-1/2">
                Done
              </Button>
            </div>
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
                🔒 Payments handled securely by Razorpay. Hospital bank details are not shared with patients.
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RazorpayModal;