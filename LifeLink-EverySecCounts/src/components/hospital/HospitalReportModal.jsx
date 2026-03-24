import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Loader } from 'lucide-react';

const HospitalReportModal = ({ 
  open, 
  onOpenChange, 
  userName, 
  userType = 'patient', // 'patient' or 'donor'
  onReport 
}) => {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reasonOptions = [
    'Suspicious Activity',
    'Inappropriate Behavior',
    'Fraudulent Information',
    'Harassment',
    'Misuse of Platform',
    'False Medical Records',
    'Other'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('Please select a reason');
      return;
    }

    setIsSubmitting(true);
    try {
      await onReport({
        reason,
        description: description.trim()
      });
      // Reset form
      setReason('');
      setDescription('');
      onOpenChange(false);
    } catch (err) {
      console.error('Report submission failed:', err);
      alert('Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-warning" />
            Report {userType === 'donor' ? 'Donor' : 'Patient'}
          </DialogTitle>
          <DialogDescription>
            Report {userName} to the admin team for review and action.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Reason Dropdown */}
          <div>
            <label className="block text-sm font-medium mb-2">Reason *</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isSubmitting}
            >
              <option value="">Select a reason...</option>
              {reasonOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Additional Details */}
          <div>
            <label className="block text-sm font-medium mb-2">Additional Details (Optional)</label>
            <Textarea
              placeholder="Provide any additional context or observations..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              className="min-h-24"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Be specific to help admins understand the issue.
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-warning/10 border border-warning/20 rounded-md p-3">
            <p className="text-xs text-warning">
              This report will be reviewed by administrators. Multiple reports may result in account suspension.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Report'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default HospitalReportModal;
