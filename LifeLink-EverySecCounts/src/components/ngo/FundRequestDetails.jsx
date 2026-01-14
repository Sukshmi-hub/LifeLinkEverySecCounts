import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Phone, 
  MapPin, 
  Building2, 
  Stethoscope, 
  FileText, 
  AlertTriangle,
  IndianRupee,
  CheckCircle,
  XCircle,
  MessageCircle,
  CreditCard,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock patient details
const getPatientDetails = (patientName) => ({
  name: patientName,
  age: 45,
  gender: 'Male',
  contactNumber: '+91 98765 43210',
  aadhaarNumber: '****-****-4567',
  address: '123, MG Road, Sector 15, Bangalore, Karnataka - 560001',
});

// Mock hospital details
const getHospitalDetails = () => ({
  name: 'City General Hospital',
  id: 'HOSP-2024-001',
  address: '456, Healthcare Avenue, Medical District, Bangalore - 560010',
  department: 'Nephrology & Transplant',
  doctorName: 'Dr. Anand Sharma',
});

// Mock amount breakup based on reason
const getAmountBreakup = (amount, reason) => {
  if (reason.toLowerCase().includes('surgery') || reason.toLowerCase().includes('transplant')) {
    return [
      { category: 'Surgery', amount: Math.round(amount * 0.6) },
      { category: 'Medicine', amount: Math.round(amount * 0.2) },
      { category: 'ICU & Hospital Stay', amount: Math.round(amount * 0.15) },
      { category: 'Misc. Charges', amount: Math.round(amount * 0.05) },
    ];
  }
  return [
    { category: 'Medical Treatment', amount: Math.round(amount * 0.5) },
    { category: 'Medication', amount: Math.round(amount * 0.3) },
    { category: 'Hospital Charges', amount: Math.round(amount * 0.15) },
    { category: 'Other Expenses', amount: Math.round(amount * 0.05) },
  ];
};

const FundRequestDetails = ({
  isOpen,
  onClose,
  request,
  onApprove,
  onReject,
  onMessageHospital,
}) => {
  if (!request) return null;

  const patient = getPatientDetails(request.patientName);
  const hospital = getHospitalDetails();
  const amountBreakup = getAmountBreakup(request.amount, request.reason);
  const totalAmount = amountBreakup.reduce((sum, item) => sum + item.amount, 0);

  // Determine urgency based on reason
  const getUrgency = () => {
    if (request.reason.toLowerCase().includes('emergency') || request.reason.toLowerCase().includes('critical')) {
      return { level: 'Critical', color: 'bg-destructive/20 text-destructive' };
    }
    if (request.reason.toLowerCase().includes('transplant')) {
      return { level: 'High', color: 'bg-warning/20 text-warning-foreground' };
    }
    return { level: 'Medium', color: 'bg-primary/20 text-primary' };
  };

  const urgency = getUrgency();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Fund Request Details
            <Badge variant="outline" className={cn("ml-2", urgency.color)}>
              {urgency.level} Priority
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Section 1: Patient Profile Card */}
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Patient Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Full Name</p>
                  <p className="font-medium">{patient.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Age</p>
                  <p className="font-medium">{patient.age} years</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Gender</p>
                  <p className="font-medium">{patient.gender}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3 h-3 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Contact</p>
                    <p className="font-medium text-sm">{patient.contactNumber}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Aadhaar Number</p>
                  <p className="font-medium">{patient.aadhaarNumber}</p>
                </div>
                <div className="col-span-2 md:col-span-1 flex items-start gap-2">
                  <MapPin className="w-3 h-3 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-xs text-muted-foreground">Address</p>
                    <p className="font-medium text-sm">{patient.address}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Hospital Information Card */}
          <Card className="border-l-4 border-l-success">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4 text-success" />
                Hospital Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Hospital Name</p>
                  <p className="font-medium">{hospital.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Hospital ID</p>
                  <p className="font-medium">{hospital.id}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Department</p>
                  <p className="font-medium">{hospital.department}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-3 h-3 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Attending Doctor</p>
                    <p className="font-medium text-sm">{hospital.doctorName}</p>
                  </div>
                </div>
                <div className="col-span-2 flex items-start gap-2">
                  <MapPin className="w-3 h-3 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-xs text-muted-foreground">Hospital Address</p>
                    <p className="font-medium text-sm">{hospital.address}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Medical Report Preview */}
          <Card className="border-l-4 border-l-warning">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-warning" />
                Medical Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Medical_Report_{request.patientName.replace(' ', '_')}.pdf</p>
                      <p className="text-xs text-muted-foreground">Uploaded on {new Date(request.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Eye className="w-4 h-4" />
                    View Full Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Doctor Recommendation Note */}
          <Card className="border-l-4 border-l-destructive">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                Doctor's Recommendation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn("rounded-lg p-4 border-2", urgency.level === 'Critical' ? 'bg-destructive/5 border-destructive/30' : urgency.level === 'High' ? 'bg-warning/5 border-warning/30' : 'bg-primary/5 border-primary/30')}>
                <p className="text-sm leading-relaxed">
                  {request.description || `The patient requires immediate financial assistance for ${request.reason}. Based on the medical evaluation, timely intervention is crucial for the patient's recovery. I strongly recommend approval of this funding request to ensure the patient receives necessary treatment without delay.`}
                </p>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                  <span className="text-xs text-muted-foreground">Urgency Level:</span>
                  <Badge className={urgency.color}>{urgency.level}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 5: Amount Breakup */}
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-primary" />
                Amount Breakup
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Category</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {amountBreakup.map((item, index) => (
                      <tr key={index} className="border-t border-border">
                        <td className="px-4 py-3 text-sm">{item.category}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">₹{item.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-border bg-muted/50">
                      <td className="px-4 py-3 text-sm font-bold">Total</td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-primary">₹{totalAmount.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-4" />

        {/* Section 6: Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          {request.status === 'Pending' ? (
            <>
              <Button
                variant="outline"
                onClick={() => onMessageHospital(request)}
                className="gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Message Hospital
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  onReject(request.id);
                  onClose();
                }}
                className="gap-2"
              >
                <XCircle className="w-4 h-4" />
                Reject Request
              </Button>
              <Button
                onClick={() => {
                  onApprove(request.id);
                  onClose();
                }}
                className="gap-2 bg-success hover:bg-success/90 text-success-foreground"
              >
                <CheckCircle className="w-4 h-4" />
                Approve Funding
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Badge className={cn("text-sm py-1 px-3", request.status === 'Approved' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive')}>
                {request.status === 'Approved' ? (
                  <><CheckCircle className="w-4 h-4 mr-1" /> Approved</>
                ) : (
                  <><XCircle className="w-4 h-4 mr-1" /> Rejected</>
                )}
              </Badge>
              <Button variant="outline" onClick={onClose}>Close</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FundRequestDetails;