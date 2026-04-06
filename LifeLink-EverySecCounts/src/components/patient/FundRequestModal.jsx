import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { serverUrl } from '@/lib/serverConfig';
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
import { CheckCircle, Loader2, Upload, FileText, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const reasons = [
  'Treatment',
  'Surgery',
  'Medication',
  'Post-operative Care',
  'Rehabilitation',
  'Other',
];

const FundRequestModal = ({ isOpen, onClose, initialData = null, fixed = false }) => {
  const { user } = useAuth();
  const { addFundRequest } = useNotifications();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [transplantFee, setTransplantFee] = useState('');
  const [hospitalChargesFee, setHospitalChargesFee] = useState('');
  const [processingFee, setProcessingFee] = useState('');
  const [document, setDocument] = useState(null);
  const [documentValidation, setDocumentValidation] = useState(null);
  const [isValidatingDocument, setIsValidatingDocument] = useState(false);
  const [documentValidationError, setDocumentValidationError] = useState('');
  const [prescription, setPrescription] = useState(null);
  const [rationCard, setRationCard] = useState(null);
  const [rationValidation, setRationValidation] = useState(null);
  const [isValidatingRation, setIsValidatingRation] = useState(false);
  const [rationValidationError, setRationValidationError] = useState('');
  const [ngos, setNgos] = useState([]);
  const [selectedNgo, setSelectedNgo] = useState('');
  const [hospitals, setHospitals] = useState([]);
  const [selectedHospital, setSelectedHospital] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const documentValidationSeq = useRef(0);
  const rationValidationSeq = useRef(0);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setDocument(e.target.files[0]);
      setDocumentValidation(null);
      setDocumentValidationError('');
    }
  };

  const handlePrescriptionChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setPrescription(e.target.files[0]);
    }
  }

  const validateMedicalReport = async (file) => {
    const seq = ++documentValidationSeq.current;
    setIsValidatingDocument(true);
    setDocumentValidation(null);
    setDocumentValidationError('');

    try {
      const form = new FormData();
      form.append('document', file);

      const res = await fetch(`${serverUrl}/api/documents/validate-medical-report`, {
        method: 'POST',
        body: form,
      });

      const json = await res.json().catch(() => ({}));
      if (seq !== documentValidationSeq.current) return;

      setDocumentValidation(json);
      if (!res.ok || json.isValid === false) {
        const msg = json.status === 'retry'
          ? 'OCR failed. Please upload a clearer medical report image or searchable PDF.'
          : (json.message || 'Invalid medical report document');
        setDocumentValidationError(msg);
        toast.error(msg);
        return;
      }

      setDocumentValidationError('');
      toast.success('Valid Medical Report ✅');
    } catch (err) {
      if (seq !== documentValidationSeq.current) return;
      const msg = err?.message || 'Failed to validate medical report';
      setDocumentValidationError(msg);
      setDocumentValidation({
        success: false,
        isValid: false,
        status: 'retry',
        message: msg,
      });
      toast.error(msg);
    } finally {
      if (seq === documentValidationSeq.current) {
        setIsValidatingDocument(false);
      }
    }
  };

  const handleMedicalReportChange = (e) => {
    const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    setDocument(file);
    setDocumentValidation(null);
    setDocumentValidationError('');

    if (file) {
      validateMedicalReport(file);
    }
  };

  const validateRationCard = async (file) => {
    const seq = ++rationValidationSeq.current;
    setIsValidatingRation(true);
    setRationValidation(null);
    setRationValidationError('');

    try {
      const form = new FormData();
      form.append('document', file);

      const res = await fetch(`${serverUrl}/api/documents/validate-ration-card`, {
        method: 'POST',
        body: form,
      });

      const json = await res.json().catch(() => ({}));
      if (seq !== rationValidationSeq.current) return;

      setRationValidation(json);
      if (!res.ok || json.isValid === false) {
        const msg = json.status === 'retry'
          ? 'OCR failed. Please upload a clearer ration card image or searchable PDF.'
          : (json.message || 'Invalid ration card document');
        setRationValidationError(msg);
        toast.error(msg);
        return;
      }

      setRationValidationError('');
      toast.success('Valid Ration Card ✅');
    } catch (err) {
      if (seq !== rationValidationSeq.current) return;
      const msg = err?.message || 'Failed to validate ration card';
      setRationValidationError(msg);
      setRationValidation({
        success: false,
        isValid: false,
        status: 'retry',
        message: msg,
      });
      toast.error(msg);
    } finally {
      if (seq === rationValidationSeq.current) {
        setIsValidatingRation(false);
      }
    }
  };

  const handleRationChange = (e) => {
    const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    setRationCard(file);
    setRationValidation(null);
    setRationValidationError('');

    if (file) {
      validateRationCard(file);
    }
  }

  useEffect(() => {
    // load NGOs from backend
    (async () => {
      try {
        const res = await fetch(`${serverUrl}/api/ngo`);
        const json = await res.json();
        if (res.ok && Array.isArray(json.data)) {
          // accept items in shape { id, name } or { _id, name }
              const mapped = json.data.map(x => ({ id: String(x.id || x._id || x._id), name: x.name || x.organizationName || x.name }));
              setNgos(mapped);
              return;
        }
        // no NGOs returned -> set empty list so UI shows "No NGOs available"
        setNgos([]);
      } catch (err) {
        console.error('Failed to load NGOs', err);
        setNgos([]);
      }
    })();
    // load hospitals for patient to choose from
    (async () => {
      try {
        const res = await fetch(`${serverUrl}/api/hospitals`)
        const json = await res.json()
        if (res.ok && Array.isArray(json.data)) {
          const mapped = json.data.map(x => ({ id: String(x.id || x._id || x._id), name: x.name || x.hospitalName || x.name, address: x.address || '' }))
          setHospitals(mapped)
          return
        }
        setHospitals([])
      } catch (e) {
        console.error('Failed to load hospitals', e)
        setHospitals([])
      }
    })();
  }, []);

  // If initial data provided (from Payment -> Ask NGO), prefill and optionally lock fields
  useEffect(() => {
    if (initialData) {
      if (initialData.totalAmount !== undefined) setAmount(String(initialData.totalAmount));
      if (initialData.transplantFee !== undefined) setTransplantFee(String(initialData.transplantFee));
      if (initialData.hospitalCharges !== undefined) setHospitalChargesFee(String(initialData.hospitalCharges));
      if (initialData.processingFee !== undefined) setProcessingFee(String(initialData.processingFee));
      if (initialData.hospitalId) setSelectedHospital(String(initialData.hospitalId));
      if (initialData.hospitalName && !initialData.hospitalId) {
        // try to find hospital by name after hospitals load
        setSelectedHospital('prefill_hospital_name:' + initialData.hospitalName);
      }
    }
  }, [initialData]);

  // render guard to avoid hydration/runtime issues when opening modal
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token')
    if (!token) {
      toast.error('Please sign in to submit a fund request (server login required)')
      return
    }
    
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

    if (!selectedNgo || selectedNgo === '__no_ngos__') {
      toast.error('Please select an NGO to send this request to');
      return;
    }
    if (!selectedHospital || selectedHospital === '__no_hospitals__') {
      toast.error('Please select your hospital');
      return;
    }

    if (!document) {
      toast.error('Please upload your medical report (PDF/JPG/PNG)');
      return;
    }

    if (!documentValidation?.isValid) {
      toast.error(documentValidationError || 'Please upload a valid medical report before submitting');
      return;
    }

    if (!rationCard) {
      toast.error('Please upload your ration card for NGO support validation');
      return;
    }

    if (!rationValidation?.isValid) {
      toast.error(rationValidationError || 'Please upload a valid ration card before submitting');
      return;
    }

    setIsSubmitting(true);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const ngoObj = ngos.find(n => String(n.id) === String(selectedNgo));
    const hospObj = hospitals.find(h => String(h.id) === String(selectedHospital));

    addFundRequest({
      patientId: user?.id || 'patient_1',
      patientName: user?.name || 'Anonymous Patient',
      amount: parseFloat(amount),
      reason,
      description,
      sourceRequestId: initialData?.sourceRequestId || initialData?.requestId || null,
      ngoId: ngoObj?.id || selectedNgo,
      ngoName: ngoObj?.name || 'Selected NGO',
      hospitalId: hospObj?.id || selectedHospital,
      hospitalName: hospObj?.name || hospObj?.name || 'Selected Hospital',
      hospitalAddress: hospObj?.address || '',
      document,
      prescription,
      rationCard,
      transplantFee: transplantFee ? Number(transplantFee) : 0,
      hospitalCharges: hospitalChargesFee ? Number(hospitalChargesFee) : 0,
      processingFee: processingFee ? Number(processingFee) : 0,
    });

    setIsSubmitting(false);
    setIsSuccess(true);

    // Reset and close after success
    setTimeout(() => {
      setAmount('');
      setReason('');
      setDescription('');
      setDocument(null);
      setDocumentValidation(null);
      setDocumentValidationError('');
      setPrescription(null);
      setRationCard(null);
      setIsSuccess(false);
      onClose();
    }, 2000);
  };

  if (!mounted) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-y-auto">
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
                  disabled={fixed}
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="transplantFee">Transplant Surgery Fee</Label>
                  <Input id="transplantFee" type="number" min="0" placeholder="0" value={transplantFee} onChange={e => setTransplantFee(e.target.value)} disabled={fixed} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hospitalCharges">Hospital Charges</Label>
                  <Input id="hospitalCharges" type="number" min="0" placeholder="0" value={hospitalChargesFee} onChange={e => setHospitalChargesFee(e.target.value)} disabled={fixed} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="processingFee">Processing Fee</Label>
                  <Input id="processingFee" type="number" min="0" placeholder="0" value={processingFee} onChange={e => setProcessingFee(e.target.value)} disabled={fixed} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hospital">Select Hospital *</Label>
                <Select value={selectedHospital} onValueChange={setSelectedHospital}>
                  <SelectTrigger id="hospital" className="bg-background" disabled={fixed}>
                    <SelectValue placeholder="Choose hospital" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {hospitals.length === 0 ? (
                      <SelectItem value="__no_hospitals__" disabled>No hospitals available</SelectItem>
                    ) : hospitals.map(h => (
                      <SelectItem key={h.id} value={String(h.id)}>{h.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ngo">Select NGO *</Label>
                <Select value={selectedNgo} onValueChange={setSelectedNgo}>
                  <SelectTrigger id="ngo" className="bg-background">
                    <SelectValue placeholder="Choose NGO" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {ngos.length === 0 ? (
                          <SelectItem value="__no_ngos__" disabled>No NGOs available</SelectItem>
                        ) : ngos.map(n => (
                          <SelectItem key={n.id} value={String(n.id)}>{n.name}</SelectItem>
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
                <Label>Medical Report (Required)</Label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleMedicalReportChange}
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
                <div className="mt-2 rounded-lg border border-border bg-muted/30 p-3 min-h-[56px] flex items-center gap-2">
                  {isValidatingDocument ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-sm">Validating medical report with OCR...</span>
                    </>
                  ) : documentValidation?.isValid ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-success" />
                      <div>
                        <p className="text-sm font-medium text-success">Valid Medical Report ✅</p>
                        <p className="text-xs text-muted-foreground">{documentValidation.reason || 'Document passed validation.'}</p>
                      </div>
                    </>
                  ) : documentValidation && documentValidation.isValid === false ? (
                    <>
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                      <div>
                        <p className="text-sm font-medium text-destructive">Invalid Document ❌</p>
                        <p className="text-xs text-muted-foreground">{documentValidationError || documentValidation.message || 'Please re-upload a valid medical report.'}</p>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Upload a medical report to validate it before submitting.</p>
                  )}
                </div>
              </div>
              
                <div className="space-y-2">
                  <Label>Prescription (Optional)</Label>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handlePrescriptionChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="flex items-center gap-3 p-4 border-2 border-dashed border-border rounded-lg hover:border-primary/50 transition-colors">
                      {prescription ? (
                        <>
                          <FileText className="w-8 h-8 text-primary" />
                          <div>
                            <p className="font-medium text-foreground">{prescription.name}</p>
                            <p className="text-sm text-muted-foreground">{(prescription.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-foreground">Click to upload prescription</p>
                            <p className="text-sm text-muted-foreground">PDF, JPG, PNG accepted</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Ration Card *</Label>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleRationChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="flex items-center gap-3 p-4 border-2 border-dashed border-border rounded-lg hover:border-primary/50 transition-colors">
                      {rationCard ? (
                        <>
                          <FileText className="w-8 h-8 text-primary" />
                          <div>
                            <p className="font-medium text-foreground">{rationCard.name}</p>
                            <p className="text-sm text-muted-foreground">{(rationCard.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-foreground">Click to upload ration card</p>
                            <p className="text-sm text-muted-foreground">PDF, JPG, PNG accepted</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Aadhaar, PAN, selfies, and other IDs are rejected automatically.
                  </div>
                  <div className="mt-2 rounded-lg border border-border bg-muted/30 p-3 min-h-[56px] flex items-center gap-2">
                    {isValidatingRation ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="text-sm">Validating ration card with OCR...</span>
                      </>
                    ) : rationValidation?.isValid ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-success" />
                        <div>
                          <p className="text-sm font-medium text-success">Valid Ration Card ✅</p>
                          <p className="text-xs text-muted-foreground">{rationValidation.reason || 'Document passed validation.'}</p>
                        </div>
                      </>
                    ) : rationValidation && rationValidation.isValid === false ? (
                      <>
                        <AlertTriangle className="w-4 h-4 text-destructive" />
                        <div>
                          <p className="text-sm font-medium text-destructive">Invalid Document ❌</p>
                          <p className="text-xs text-muted-foreground">{rationValidationError || rationValidation.message || 'Please re-upload a valid ration card.'}</p>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Upload a ration card to validate it before submitting.</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || !documentValidation?.isValid} className="flex-1">
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


