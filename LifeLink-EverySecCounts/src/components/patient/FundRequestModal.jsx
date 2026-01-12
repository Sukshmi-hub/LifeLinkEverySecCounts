import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle, Loader2, Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';

const reasons = [
  'Treatment',
  'Surgery',
  'Medication',
  'Post-operative Care',
  'Rehabilitation',
  'Other',
];

const FundRequestModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { addFundRequest } = useNotifications();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [document, setDocument] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setDocument(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!reason) {
      toast.error('Please select a reason');
      return;
    }

    if (!description.trim()) {
      toast.error('Please provide a description');
      return;
    }

    setIsSubmitting(true);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    addFundRequest({
      patientId: user?.id || 'patient_1',
      patientName: user?.name || 'Anonymous Patient',
      amount: parseFloat(amount),
      reason,
      description,
    });

    setIsSubmitting(false);
    setIsSuccess(true);

    // Reset and close after success
    setTimeout(() => {
      setAmount('');
      setReason('');
      setDescription('');
      setDocument(null);
      setIsSuccess(false);
      onClose();
    }, 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Request Sent</h3>
            <p className="text-muted-foreground">
              Your fund request has been sent to NGOs for review.
            </p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">Request Funds</DialogTitle>
              <DialogDescription>
                Submit a request for financial assistance from NGOs.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount Required (₹) *</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason *</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger id="reason" className="bg-background">
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {reasons.map(r => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Explain why you need financial assistance..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label>Upload Document (Optional)</Label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="flex items-center gap-3 p-4 border-2 border-dashed border-border rounded-lg hover:border-primary/50 transition-colors">
                    {document ? (
                      <>
                        <FileText className="w-8 h-8 text-primary" />
                        <div>
                          <p className="font-medium text-foreground">{document.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(document.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-foreground">Click to upload</p>
                          <p className="text-sm text-muted-foreground">PDF, JPG, PNG accepted</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Send Request to NGO'
                  )}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FundRequestModal;