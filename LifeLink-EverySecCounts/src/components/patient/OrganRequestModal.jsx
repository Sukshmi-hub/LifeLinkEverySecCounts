import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
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
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Loader2, Upload, FileText, Image as ImageIcon, CreditCard, X } from 'lucide-react';
import { toast } from 'sonner';

const organTypes = ['Kidney', 'Liver', 'Heart', 'Lung', 'Pancreas', 'Cornea', 'Bone Marrow', 'Other'];
const urgencyLevels = ['Low', 'Medium', 'High'];

const OrganRequestModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { addOrganRequest, selectedHospital } = useNotifications();
  
  const [organType, setOrganType] = useState('');
  const [urgency, setUrgency] = useState('Medium');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Document uploads
  const [medicalReports, setMedicalReports] = useState([]);
  const [prescription, setPrescription] = useState(null);
  const [identityProof, setIdentityProof] = useState(null);
  const [additionalDocs, setAdditionalDocs] = useState([]);

  // Cleanup object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      [...medicalReports, ...additionalDocs, prescription, identityProof].forEach(item => {
        if (item?.preview) URL.revokeObjectURL(item.preview);
      });
    };
  }, [isOpen, medicalReports, additionalDocs, prescription, identityProof]);

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

  const removeFile = (index, setter) => {
    setter(prev => {
      const newFiles = [...prev];
      if (newFiles[index].preview) URL.revokeObjectURL(newFiles[index].preview);
      return newFiles.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!organType) return toast.error('Please select an organ type');
    if (medicalReports.length === 0) return toast.error('At least one medical report is mandatory');

    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate upload

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
    setTimeout(() => { resetForm(); onClose(); }, 2000);
  };

  const resetForm = () => {
    setOrganType('');
    setUrgency('Medium');
    setNotes('');
    setIsSuccess(false);
    setMedicalReports([]);
    setPrescription(null);
    setIdentityProof(null);
    setAdditionalDocs([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6 animate-in zoom-in">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Submission Successful</h3>
            <p className="text-muted-foreground">Your request and documents have been sent to {selectedHospital?.name}.</p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" /> Submit New Request
              </DialogTitle>
              <DialogDescription>Verify your medical condition by uploading relevant documents.</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6 mt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Organ Type *</Label>
                  <Select value={organType} onValueChange={setOrganType}>
                    <SelectTrigger className="bg-background"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>{organTypes.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Urgency Level *</Label>
                  <Select value={urgency} onValueChange={(v) => setUrgency(v)}>
                    <SelectTrigger className="bg-background"><SelectValue placeholder="Select level" /></SelectTrigger>
                    <SelectContent>
                      {urgencyLevels.map(l => (
                        <SelectItem key={l} value={l}>
                          <span className={l === 'High' ? 'text-red-500 font-bold' : l === 'Medium' ? 'text-amber-500 font-medium' : ''}>{l}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2"><FileText className="w-4 h-4" /> Required Documents</h3>
                
                <MultiFileUploadCard 
                    label="Medical Reports" 
                    description="Diagnostic scans and lab results (Required)" 
                    files={medicalReports} 
                    required 
                    onFileChange={e => handleMultipleFileChange(e, setMedicalReports)} 
                    onRemove={i => removeFile(i, setMedicalReports)} 
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <SingleFileUploadCard 
                    label="Prescription" 
                    icon={ImageIcon} 
                    file={prescription} 
                    onFileChange={e => handleFileChange(e, setPrescription)} 
                    onRemove={() => setPrescription(null)} 
                  />
                  <SingleFileUploadCard 
                    label="ID Proof" 
                    icon={CreditCard} 
                    file={identityProof} 
                    onFileChange={e => handleFileChange(e, setIdentityProof)} 
                    onRemove={() => setIdentityProof(null)} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Medical Notes</Label>
                <Textarea placeholder="Describe your current condition..." value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing</> : 'Submit Request'}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

const SingleFileUploadCard = ({ label, icon: Icon, file, onFileChange, onRemove }) => (
  <Card className="border-dashed bg-muted/30">
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-primary" />
        <div className="flex-1 overflow-hidden">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</Label>
          {file ? (
            <div className="flex items-center justify-between mt-1 p-1.5 bg-background rounded border">
              <span className="text-xs truncate max-w-[100px]">{file.file.name}</span>
              <X className="w-3 h-3 cursor-pointer" onClick={onRemove} />
            </div>
          ) : (
            <Input type="file" onChange={onFileChange} className="h-7 text-[10px] mt-1" />
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);

const MultiFileUploadCard = ({ label, description, files, onFileChange, onRemove }) => (
  <Card className="border-dashed">
    <CardContent className="p-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <Label className="text-sm font-bold">{label} *</Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">{files.length} Files</div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {files.map((f, i) => (
          <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded relative group">
            <FileText className="w-3 h-3 text-primary" />
            <span className="text-[10px] truncate">{f.file.name}</span>
            <X className="w-3 h-3 absolute right-1 top-1 opacity-0 group-hover:opacity-100 cursor-pointer" onClick={() => onRemove(i)} />
          </div>
        ))}
      </div>
      <Input type="file" multiple onChange={onFileChange} className="text-xs h-9 cursor-pointer" />
    </CardContent>
  </Card>
);

export default OrganRequestModal;