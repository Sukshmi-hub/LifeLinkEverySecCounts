import React, { useMemo, useState, useEffect } from 'react';
import RazorpayModal from '@/components/patient/RazorpayModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { serverUrl } from '@/lib/serverConfig';
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
  
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Render patient/hospital info directly from the request when available

// Amount breakup based on reason (safe - reason may be undefined)
const getAmountBreakup = (amount, reason) => {
  const r = String(reason || '').toLowerCase();
  if (r.includes('surgery') || r.includes('transplant')) {
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
  onPaymentSuccess,
}) => {

  const [sendingToHos, setSendingToHos] = useState(false);
  const [sentToHos, setSentToHos] = useState(false);
  const [fetchedPatient, setFetchedPatient] = useState(null);
  const [fetchedHospital, setFetchedHospital] = useState(null);

  // Helper to extract a usable id string from various MongoDB reference shapes
  const extractId = (ref) => {
    if (!ref) return null;
    if (typeof ref === 'string') return ref;
    if (typeof ref === 'object') {
      if (ref.$oid) return ref.$oid;
      if (ref._id && typeof ref._id === 'object' && ref._id.$oid) return ref._id.$oid;
      if (ref._id && typeof ref._id === 'string') return ref._id;
      if (ref.id && typeof ref.id === 'string') return ref.id;
      if (ref._id && typeof ref._id === 'object' && (ref._id._id || ref._id.id)) return extractId(ref._id);
    }
    return null;
  };

  // Helper to fetch hospital by id, try common endpoint variants and normalize response
  const fetchHospitalById = async (id, authToken) => {
    if (!id) return null;
    const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : null;
    const endpoints = [`/api/hospitals/${id}`, `/api/hospital/${id}`];
    if (origin) {
      endpoints.push(`${origin}/api/hospitals/${id}`, `${origin}/api/hospital/${id}`);
    }
    endpoints.push(`${serverUrl}/api/hospitals/${id}`, `${serverUrl}/api/hospital/${id}`);
    // also try encoded id variants
    endpoints.push(...endpoints.map(ep => ep.replace(id, encodeURIComponent(id))));
    for (const ep of endpoints) {
      try {
        const res = await fetch(ep, { headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined });
        if (!res.ok) continue;
        const json = await res.json();
        return json && json.data ? json.data : json;
      } catch (e) {
        // try next
      }
    }
    return null;
  };

  // Helper to fetch patient by id with same normalization and host fallbacks
  const fetchPatientById = async (id, authToken) => {
    if (!id) return null;
    const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : null;
    const endpoints = [`/api/patients/${id}`, `/api/patient/${id}`];
    if (origin) {
      endpoints.push(`${origin}/api/patients/${id}`, `${origin}/api/patient/${id}`);
    }
    endpoints.push(`${serverUrl}/api/patients/${id}`, `${serverUrl}/api/patient/${id}`);
    endpoints.push(...endpoints.map(ep => ep.replace(id, encodeURIComponent(id))));
    for (const ep of endpoints) {
      try {
        const res = await fetch(ep, { headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined });
        if (!res.ok) continue;
        const json = await res.json();
        return json && json.data ? json.data : json;
      } catch (e) {
        // try next
      }
    }
    return null;
  };

  useEffect(() => {
    let mounted = true;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!request) return () => { mounted = false; };

    // Debug logs to help diagnose missing hospital data in the modal
    try {
      // eslint-disable-next-line no-console
      console.debug('FundRequestDetails: request', request);
    } catch (e) {}

    // If request already contains a populated hospital object, use it
    if (request.hospitalId && typeof request.hospitalId === 'object' && (request.hospitalId.name || request.hospitalId.address || request.hospitalId.contact_phone)) {
      setFetchedHospital(request.hospitalId);
    } else {
      // If hospitalId is a mongo-id wrapper like {$oid: '...'}, extract and fetch
      const hidFromReq = extractId(request.hospitalId);
      if (hidFromReq) {
        // eslint-disable-next-line no-console
        console.debug('FundRequestDetails: extracted hospitalId from request.hospitalId ->', hidFromReq);
        fetchHospitalById(hidFromReq, token).then(hdata => { if (mounted && hdata) setFetchedHospital(hdata); else { /* eslint-disable-next-line no-console */ console.debug('FundRequestDetails: hospital fetch returned null for', hidFromReq); } }).catch((e) => { /* eslint-disable-next-line no-console */ console.debug('FundRequestDetails: hospital fetch error', e); });
      }
    }

    // Handle patientId: it may be an embedded patient object or a mongo-id wrapper
    if (request.patientId && typeof request.patientId === 'object') {
      const pidFromObj = extractId(request.patientId);
      const looksLikePatient = request.patientId.name || request.patientId.email || request.patientId.phone || request.patientId.aadhaar_no;
        if (looksLikePatient) {
        setFetchedPatient(request.patientId);
        const patientHospital = request.patientId.hospital || null;
        if (patientHospital) {
          if (patientHospital.name || patientHospital.address || patientHospital.contact_phone) {
            setFetchedHospital(patientHospital);
          } else {
            const phId = extractId(patientHospital);
            if (phId) {
              fetchHospitalById(phId, token).then(hdata => { if (mounted && hdata) setFetchedHospital(hdata); }).catch(() => {});
            }
          }
        }
      } else if (pidFromObj) {
        // patientId is likely a {$oid: '...'} wrapper - fetch patient by id
        const id = pidFromObj;
        // eslint-disable-next-line no-console
        console.debug('FundRequestDetails: extracted patientId from request.patientId ->', id);
        fetchPatientById(id, token)
          .then(async (patientData) => {
            if (!mounted) return;
            if (!patientData) return;
            setFetchedPatient(patientData);
            try {
              const patientHospital = (patientData && (patientData.hospital || patientData.hospitalId)) || null;
              if (patientHospital) {
                if (patientHospital.name || patientHospital.address || patientHospital.contact_phone) {
                  if (mounted) setFetchedHospital(patientHospital);
                } else {
                  const hid = extractId(patientHospital);
                  if (hid) {
                    const hdata = await fetchHospitalById(hid, token);
                    if (hdata && mounted) setFetchedHospital(hdata);
                  }
                }
              }
            } catch (e) {
              // ignore
            }
          })
          .catch(() => {});
      }
    } else {
      // fetch patient if patientId appears to be an id/string
      const pid = request.patientId && (typeof request.patientId === 'string' || request.patientId._id);
      if (pid) {
        const id = typeof request.patientId === 'string' ? request.patientId : request.patientId._id;
        fetchPatientById(id, token)
          .then(async (patientData) => {
            if (!mounted) return;
            if (!patientData) return;
            setFetchedPatient(patientData);
            // If patient record contains a hospital reference, prefer that hospital
            try {
              const patientHospital = (patientData && (patientData.hospital || patientData.hospitalId)) || null;
                if (patientHospital) {
                  if (patientHospital.name || patientHospital.address || patientHospital.contact_phone) {
                    if (mounted) setFetchedHospital(patientHospital);
                  } else {
                    const hid = extractId(patientHospital);
                    if (hid) {
                      // eslint-disable-next-line no-console
                      console.debug('FundRequestDetails: extracted patient.hospital id ->', hid);
                      const hdata = await fetchHospitalById(hid, token);
                      if (hdata && mounted) setFetchedHospital(hdata);
                    }
                  }
                }
            } catch (e) {
              // ignore
            }
          })
          .catch(() => {});
      }
    }

    const hid = extractId(request.hospitalId) || null;
    if (hid) {
      fetchHospitalById(hid, token).then(data => { if (mounted && !fetchedHospital && data) setFetchedHospital(data); }).catch(() => {});
    }

    return () => { mounted = false; };
  }, [request]);

  // Try to extract patient details from request if available, else fall back to submitted name
  const patient = useMemo(() => {
    const patientSource = fetchedPatient || request?.patientId || request?.patient || request?.patientDetails || {};

    const maybeDob = patientSource.dob || patientSource.DOB || request?.dob || request?.patientDob;
    const computeAge = (d) => {
      if (!d) return null;
      const dt = new Date(d);
      if (isNaN(dt)) return null;
      const diff = Date.now() - dt.getTime();
      const ageDt = new Date(diff);
      return Math.abs(ageDt.getUTCFullYear() - 1970);
    };

    const ageVal = patientSource.age || request?.age || computeAge(maybeDob) || '—';

    return {
      name: request?.patientName || patientSource.name || patientSource.fullName || patientSource.displayName || 'Unknown',
      age: ageVal,
      email: patientSource.email || request?.email || '—',
      contactNumber: patientSource.phone || patientSource.contact || request?.contact || request?.phone || '—',
      aadhaarNumber: patientSource.aadhaar_no || patientSource.aadhaar || request?.aadhaar || request?.aadhaarNumber || '—',
      bloodType: patientSource.blood_type || patientSource.bloodType || request?.bloodType || '—',
      address: patientSource.location?.full_address || patientSource.address || patientSource.city || request?.address || request?.patientAddress || '—',
    };
  }, [request, fetchedPatient]);

  // Hospital information is not always provided with fund requests; show NGO/patient-facing fields instead
  const hospital = useMemo(() => {
    const h = fetchedHospital || request?.hospitalId || request?.hospital || request?.hospitalInfo || {};
    return {
      name: (h && (h.name || h.hospitalName)) || request?.hospitalName || request?.hospital || '—',
      // Use hospital.userId as the displayed Hospital ID per DB schema; fall back to hospital._id if userId missing
      id: extractId(h && (h.userId || h.user_id)) || extractId(h && (h._id || h.id) ? (h._id || h.id) : (h && h._id) || h) || extractId(request?.hospitalId) || request?.hospital_id || '—',
      // Prefer the hospital `phone` field for contact, then `contact_phone` as fallback
      contact: (h && (h.phone || h.contact_phone || h.contact || h.mobile)) || request?.hospitalContact || request?.hospital_phone || '—',
      // Address comes from `address` or location.full_address
      address: (h && (h.address || h.location?.full_address)) || request?.hospitalAddress || '—',
    };
  }, [request, fetchedHospital]);
  // Prefer server-provided breakdown when available
  const amountBreakup = useMemo(() => {
    try {
      if (request?.breakdown) {
        const b = request.breakdown;
        // normalize into table rows
        return [
          { category: 'Transplant Surgery Fee', amount: Number(b.transplantFee || 0) },
          { category: 'Hospital Charges', amount: Number(b.hospitalCharges || 0) },
          { category: 'Processing Fee', amount: Number(b.processingFee || 0) },
        ];
      }
    } catch (e) {}
    return getAmountBreakup(request?.amount || 0, request?.reason || request?.description || request?.message || '');
  }, [request]);
  const totalAmount = amountBreakup.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const [isRzpOpen, setIsRzpOpen] = useState(false);

  const hospitalDbId = useMemo(() => {
    // Try several common shapes to derive the hospital _id that backend expects
    const fh = fetchedHospital || request?.hospital || request?.hospitalId || request?.hospitalInfo || null;
    if (!fh) return null;
    const candidate = (fh && (fh._id || fh.id || fh.userId || fh.user_id)) || null;
    return extractId(candidate) || extractId(request?.hospitalId) || null;
  }, [fetchedHospital, request]);
  const paymentCompleted = Boolean(request?.paymentReceived) || String(request?.paymentStatus || '').toLowerCase() === 'success';
  const displayStatus = request?.status;

  if (!request) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Fund Request Details
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
                  <p className="font-medium">{patient.age || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium">{patient.email || '—'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3 h-3 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Contact</p>
                    <p className="font-medium text-sm">{patient.contactNumber || '—'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Aadhaar Number</p>
                  <p className="font-medium">{patient.aadhaarNumber || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Blood Type</p>
                  <p className="font-medium">{patient.bloodType || '—'}</p>
                </div>
                <div className="col-span-2 md:col-span-1 flex items-start gap-2">
                  <MapPin className="w-3 h-3 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-xs text-muted-foreground">Address</p>
                    <p className="font-medium text-sm">{patient.address || '—'}</p>
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
                  <p className="font-medium">{hospital.name || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Hospital ID</p>
                  <p className="font-medium">{hospital.id || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Contact</p>
                  <p className="font-medium">{hospital.contact || '—'}</p>
                </div>
                <div className="col-span-2 flex items-start gap-2">
                  <MapPin className="w-3 h-3 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-xs text-muted-foreground">Hospital Address</p>
                    <p className="font-medium text-sm">{hospital.address || '—'}</p>
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
              <div className="space-y-3">
                {(() => {
                  const files = [];
                  // collect medical report(s)
                  if (request.document) files.push({ key: 'Medical Report', path: request.document });
                  if (request.files?.medicalReports && Array.isArray(request.files.medicalReports)) {
                    request.files.medicalReports.forEach(p => files.push({ key: 'Medical Report', path: p }));
                  }
                  // prescription
                  if (request.prescription) files.push({ key: 'Prescription', path: request.prescription });
                  if (request.files?.prescription) files.push({ key: 'Prescription', path: request.files.prescription });
                  // ration card
                  if (request.rationCard) files.push({ key: 'Ration Card', path: request.rationCard });
                  if (request.files?.rationCard) files.push({ key: 'Ration Card', path: request.files.rationCard });

                  if (files.length === 0) {
                    return <p className="text-sm text-muted-foreground">No documents uploaded.</p>
                  }

                  return files.map((f, i) => {
                    const doc = f.path;
                    const displayName = typeof doc === 'string' ? (doc.split('/').pop() || doc) : (doc.name || String(doc));
                    const uploadedOn = request.createdAt ? new Date(request.createdAt).toLocaleDateString() : '—';
                    const href = typeof doc === 'string' ? (doc.startsWith('/') ? `${serverUrl}${doc}` : doc) : null;
                    return (
                      <div key={`${f.key}_${i}`} className="bg-muted/50 rounded-lg p-3 border border-border flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          {href ? (
                            <a href={href} target="_blank" rel="noreferrer" className="font-medium text-primary">{f.key}: {displayName}</a>
                          ) : (
                            <p className="font-medium">{f.key}: {displayName}</p>
                          )}
                          <p className="text-xs text-muted-foreground">Uploaded on {uploadedOn}</p>
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Doctor Recommendation Note */}
          <Card className="border-l-4 border-l-destructive">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                Patient's Request
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg p-4 border-2 bg-muted/5 border-border">
                <p className="text-sm leading-relaxed">
                  {request.description || request.message || request.reason || 'No additional details provided.'}
                </p>
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

        {/* Debug panel removed in production UI - patient/hospital info shown above */}

        <Separator className="my-4" />

        {/* Section 6: Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              {(request.status && String(request.status).toLowerCase().startsWith('pending')) ? (
            <>
              {/* Verify by hospital action: sends request to hospital payment queue */}
              {(sentToHos || request.status === 'SentToHospital') ? (
                <Button variant="outline" disabled className="gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Sent to Hos
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      setSendingToHos(true);
                      // prefer passing the raw server response when available
                      const reqToSend = request.raw || request || {};
                      const ok = await onMessageHospital(reqToSend);
                      if (ok) setSentToHos(true);
                    } catch (e) {
                      // ignore - onMessageHospital logs
                    } finally {
                      setSendingToHos(false);
                    }
                  }}
                  className="gap-2"
                  disabled={sendingToHos}
                >
                  <MessageCircle className="w-4 h-4" />
                  {sendingToHos ? 'Sending...' : 'Verify by Hos'}
                </Button>
              )}
              {/* Only allow rejection when payment hasn't been sent / completed */}
              {!(request.paymentSent || String(request.status) === 'SentToHospital') && (
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
              )}
              {/* Approve button removed from modal per NGO UX - approval remains available from requests list */}
            </>
          ) : (
            <div className="flex items-center gap-3">
              {String(request.status) === 'VerifiedByHospital' ? (
                // Show payment state to NGO when hospital has verified the request
                <>
                  {paymentCompleted ? (
                    <Badge className="bg-success/20 text-success">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Payment Done
                    </Badge>
                  ) : hospitalDbId ? (
                    <Button
                      onClick={() => setIsRzpOpen(true)}
                      className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      <CreditCard className="w-4 h-4" />
                      Pay Hospital
                    </Button>
                  ) : null}
                  <Button variant="outline" onClick={onClose}>Close</Button>
                </>
              ) : (
                <>
                  <Badge className={cn("text-sm py-1 px-3", request.status === 'Approved' ? 'bg-success/20 text-success' : (request.status === 'Dennied' ? 'bg-destructive/20 text-destructive' : 'bg-destructive/20 text-destructive'))}>
                    {displayStatus === 'Approved' ? (
                      <><CheckCircle className="w-4 h-4 mr-1" /> Approved</>
                    ) : displayStatus === 'Dennied' ? (
                      <><XCircle className="w-4 h-4 mr-1" /> Dennied</>
                    ) : (
                      <><XCircle className="w-4 h-4 mr-1" /> {displayStatus || 'Rejected'}</>
                    )}
                  </Badge>
                  <Button variant="outline" onClick={onClose}>Close</Button>
                </>
              )}
            </div>
          )}
        </div>
        {/* Razorpay modal for patient payment */}
        <RazorpayModal
          isOpen={isRzpOpen}
          onClose={() => setIsRzpOpen(false)}
          onPaymentSuccess={() => {
            setSentToHos(true)
            if (onPaymentSuccess) onPaymentSuccess(request.id || request._id || null)
          }}
          donorName={patient.name}
          organType={request.reason || request.description}
          hospitalName={hospital.name}
          amount={request.amount || totalAmount}
          hospitalId={hospitalDbId}
          requestId={request.id || request._id || ''}
        />
      </DialogContent>
    </Dialog>
  );
};

export default FundRequestDetails;

