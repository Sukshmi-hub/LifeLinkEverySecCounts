import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useDonor } from '@/context/DonorContext';
import { useAuth } from '@/context/AuthContext';
import { 
  CheckCircle, 
  Heart, 
  AlertTriangle, 
  ArrowRight, 
  ArrowLeft, 
  Upload, 
  FileText, 
  Droplet, 
  CreditCard, 
  File, 
  X 
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ✅ SAFE Medical Icons
import { GiKidneys, GiLiver, GiLungs, GiSkeleton } from "react-icons/gi";
import { FaEye, FaHeart } from "react-icons/fa";
import { MdBiotech } from "react-icons/md";

const organOptions = [
  { id: 'kidney', name: 'Kidney', description: 'Most commonly transplanted organ', icon: GiKidneys },
  { id: 'liver', name: 'Liver', description: 'Can regenerate after partial donation', icon: GiLiver },
  { id: 'heart', name: 'Heart', description: 'Critical for cardiac patients', icon: FaHeart },
  { id: 'lung', name: 'Lung', description: 'For respiratory failure patients', icon: GiLungs },
  { id: 'pancreas', name: 'Pancreas', description: 'For diabetes treatment', icon: MdBiotech },
  { id: 'cornea', name: 'Cornea', description: 'Restore vision to the blind', icon: FaEye },
  { id: 'bone_marrow', name: 'Bone Marrow', description: 'For blood cancer patients', icon: GiSkeleton },
];

const DonateModal = ({ isOpen, onClose }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { addDonationIntent, donorProfile } = useDonor();

  const [step, setStep] = useState('select');
  const [selectedOrgan, setSelectedOrgan] = useState(null);
  
  // Document uploads state
  const [fitnessCertificate, setFitnessCertificate] = useState(null);
  const [bloodGroupReport, setBloodGroupReport] = useState(null);
  const [identityProof, setIdentityProof] = useState(null);
  const [otherDocuments, setOtherDocuments] = useState([]);

  const [consentChecks, setConsentChecks] = useState({
    voluntary: false,
    risks: false,
    pressure: false,
    verification: false,
    terms: false,
  });

  const allConsentsChecked = Object.values(consentChecks).every(Boolean);
  const documentsValid = fitnessCertificate !== null && bloodGroupReport !== null;

  const handleFileChange = (e, setter) => {
    const file = e.target.files?.[0];
    if (file) {
      setter({
        file,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
      });
    }
  };

  const handleMultipleFileChange = (e, setter) => {
    const files = Array.from(e.target.files || []);
    const newFiles = files.map(file => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
    }));
    setter(prev => [...prev, ...newFiles]);
  };

  const handleProceedToDocuments = () => {
    if (!selectedOrgan) {
      toast({ title: 'Please select an organ', variant: 'destructive' });
      return;
    }
    setStep('documents');
  };

  const handleProceedToConsent = () => {
    if (!documentsValid) {
      toast({ title: 'Required Documents Missing', description: 'Please upload Fitness Certificate and Blood Report.', variant: 'destructive' });
      return;
    }
    setStep('consent');
  };

  const handleSubmit = () => {
    if (!allConsentsChecked) return;

    const organ = organOptions.find(o => o.id === selectedOrgan);
    addDonationIntent({
      donorId: user?.id || 'donor_1',
      donorName: donorProfile?.fullName || user?.name || 'Anonymous Donor',
      organType: organ?.name,
      donorHospitalName: 'City General Hospital',
    });

    setStep('success');
    toast({ title: 'Donation Intent Submitted', description: 'Verification is now in progress.' });
  };

  const handleClose = () => {
    setStep('select');
    setSelectedOrgan(null);
    setFitnessCertificate(null);
    setBloodGroupReport(null);
    setIdentityProof(null);
    setOtherDocuments([]);
    setConsentChecks({ voluntary: false, risks: false, pressure: false, verification: false, terms: false });
    onClose();
  };

  // Reusable File Card
  const FileUploadCard = ({ label, description, icon: Icon, required, file, onFileChange, onRemove }) => (
    <Card className="border-dashed mb-3">
      <CardContent className="p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <Label className="text-sm font-medium">{label} {required && <span className="text-destructive">*</span>}</Label>
          <p className="text-xs text-muted-foreground">{description}</p>
          {file ? (
            <div className="mt-2 flex items-center gap-2 p-2 bg-muted rounded-lg">
              <FileText className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs truncate flex-1">{file.file.name}</span>
              <X className="w-3 h-3 cursor-pointer" onClick={onRemove} />
            </div>
          ) : (
            <Input type="file" onChange={onFileChange} className="mt-2 text-xs h-9" />
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        
        {step === 'select' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl"><Heart className="text-primary" /> Choose Organ</DialogTitle>
              <DialogDescription>Select the organ you wish to donate.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
              {organOptions.map((organ) => {
                const Icon = organ.icon;
                return (
                  <button
                    key={organ.id}
                    onClick={() => setSelectedOrgan(organ.id)}
                    className={cn(
                      "flex flex-col items-center p-4 rounded-xl border-2 transition-all",
                      selectedOrgan === organ.id ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"
                    )}
                  >
                    <Icon size={42} className="text-primary mb-2" />
                    <h3 className="font-semibold text-sm">{organ.name}</h3>
                    <p className="text-[10px] text-muted-foreground mt-1">{organ.description}</p>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleProceedToDocuments} disabled={!selectedOrgan}>Continue <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </div>
          </>
        )}

        {step === 'documents' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl"><Upload className="text-primary" /> Upload Documents</DialogTitle>
              <DialogDescription>Verified documents are required for legal donation.</DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-2">
              <FileUploadCard label="Fitness Certificate" description="From a registered practitioner" icon={FileText} required file={fitnessCertificate} onFileChange={(e) => handleFileChange(e, setFitnessCertificate)} onRemove={() => setFitnessCertificate(null)} />
              <FileUploadCard label="Blood Group Report" description="Official lab report" icon={Droplet} required file={bloodGroupReport} onFileChange={(e) => handleFileChange(e, setBloodGroupReport)} onRemove={() => setBloodGroupReport(null)} />
              <FileUploadCard label="Identity Proof" description="Aadhaar or Government ID" icon={CreditCard} file={identityProof} onFileChange={(e) => handleFileChange(e, setIdentityProof)} onRemove={() => setIdentityProof(null)} />
            </div>
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setStep('select')}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
              <Button onClick={handleProceedToConsent} disabled={!documentsValid}>Continue <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </div>
          </>
        )}

        {step === 'consent' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl text-warning"><AlertTriangle /> Legal Consent</DialogTitle>
            </DialogHeader>
            <div className="mt-6 space-y-4">
              {Object.keys(consentChecks).map((key) => (
                <div key={key} className="flex items-start gap-3">
                  <Checkbox id={key} checked={consentChecks[key]} onCheckedChange={(checked) => setConsentChecks(p => ({ ...p, [key]: checked === true }))} />
                  <Label htmlFor={key} className="text-sm leading-tight cursor-pointer">
                    {key === 'voluntary' && "I confirm this donation is voluntary and of my free will."}
                    {key === 'risks' && "I understand the medical risks involved."}
                    {key === 'pressure' && "I am not under any external pressure or coercion."}
                    {key === 'verification' && "I consent to LifeLink and hospital verification."}
                    {key === 'terms' && "I agree to the full Terms and Conditions."}
                  </Label>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setStep('documents')}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
              <Button onClick={handleSubmit} disabled={!allConsentsChecked}>Submit Intent</Button>
            </div>
          </>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center py-8 text-center">
            <CheckCircle className="w-16 h-16 text-success mb-4" />
            <h3 className="text-2xl font-bold">Submission Successful!</h3>
            <p className="text-muted-foreground mt-2">Your intent for {organOptions.find(o => o.id === selectedOrgan)?.name} donation is under review.</p>
            <Button onClick={handleClose} className="mt-6">Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DonateModal;