import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { Button } from '@/components/ui/button';
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
import { CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const organTypes = [
  'Kidney',
  'Liver',
  'Heart',
  'Lung',
  'Pancreas',
  'Cornea',
  'Bone Marrow',
  'Other',
];

const urgencyLevels = ['Low', 'Medium', 'High'];

const OrganRequestModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { addOrganRequest, selectedHospital } = useNotifications();
  const [organType, setOrganType] = useState('');
  const [urgency, setUrgency] = useState('Medium');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!organType) {
      toast.error('Please select an organ type');
      return;
    }

    setIsSubmitting(true);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    addOrganRequest({
      patientId: user?.id || 'patient_1',
      patientName: user?.name || 'Anonymous Patient',
      organType,
      urgency,
      notes,
      hospitalId: selectedHospital?.id,
      hospitalName: selectedHospital?.name,
    });

    setIsSubmitting(false);
    setIsSuccess(true);

    // Reset and close after success
    setTimeout(() => {
      setOrganType('');
      setUrgency('Medium');
      setNotes('');
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
            <h3 className="text-xl font-semibold text-foreground mb-2">Request Submitted</h3>
            <p className="text-muted-foreground">
              Your request has been sent to the hospital.
            </p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">Request Organ</DialogTitle>
              <DialogDescription>
                Fill in the details to submit your organ request to the hospital.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="organType">Select Organ Type *</Label>
                <Select value={organType} onValueChange={setOrganType}>
                  <SelectTrigger id="organType" className="bg-background">
                    <SelectValue placeholder="Select organ type" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {organTypes.map(organ => (
                      <SelectItem key={organ} value={organ}>
                        {organ}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="urgency">Urgency Level *</Label>
                <Select value={urgency} onValueChange={setUrgency}>
                  <SelectTrigger id="urgency" className="bg-background">
                    <SelectValue placeholder="Select urgency level" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {urgencyLevels.map(level => (
                      <SelectItem key={level} value={level}>
                        <span className={
                          level === 'High' ? 'text-destructive font-medium' :
                          level === 'Medium' ? 'text-warning font-medium' :
                          'text-muted-foreground'
                        }>
                          {level}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional information about your medical condition..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>

              {selectedHospital && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Request will be sent to: <span className="font-medium text-foreground">{selectedHospital.name}</span>
                  </p>
                </div>
              )}

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
                    'Submit Request'
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

export default OrganRequestModal;