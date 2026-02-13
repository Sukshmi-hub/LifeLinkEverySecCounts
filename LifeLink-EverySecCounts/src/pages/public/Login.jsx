import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, getRoleBasedRedirect } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Heart,
  User,
  Phone,
  Mail,
  Lock,
  Loader2,
  CheckCircle,
  Stethoscope,
  HeartHandshake,
  Building2,
  Users,
  MapPin,
  Home,
  PhoneCall
} from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('login');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [commonData, setCommonData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'patient',
  });

  // Role-specific data states
  const [patientData, setPatientData] = useState({
    age: '',
    bloodGroup: '',
    aadhaarNumber: '',
    location: '',
  });

  const [donorData, setDonorData] = useState({
    age: '',
    bloodGroup: '',
    willingToDonate: [],
    aadhaarNumber: '',
    address: '',
    emergencyName: '',
    emergencyPhone: '',
  });

  const [hospitalData, setHospitalData] = useState({
    address: '',
    hospitalPhone: '',
    type: '',
  });

  const [ngoData, setNgoData] = useState({
    address: '',
    ngoPhone: '',
  });

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(getRoleBasedRedirect(user.role));
    }
  }, [isAuthenticated, user, navigate]);

  const validateRegistration = () => {
    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{1,10}$/;
    const phoneRegex = /^[0-9]{10}$/;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|gmail\.in|yahoo\.com|outlook\.com)$/;

    if (!passwordRegex.test(commonData.password)) {
      toast({ 
        title: 'Weak Password', 
        description: 'Password must be max 10 characters, include one uppercase letter and one special character.', 
        variant: 'destructive' 
      });
      return false;
    }

    if (commonData.password !== commonData.confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
      return false;
    }

    if (!phoneRegex.test(commonData.phone)) {
      toast({ title: 'Invalid Primary Phone', description: 'Phone number must be exactly 10 numeric digits.', variant: 'destructive' });
      return false;
    }

    if (!emailRegex.test(commonData.email)) {
      toast({ 
        title: 'Invalid Email Domain', 
        description: 'Allowed domains: gmail.com, gmail.in, yahoo.com, outlook.com', 
        variant: 'destructive' 
      });
      return false;
    }

    if (commonData.role === 'ngo') {
      if (!phoneRegex.test(ngoData.ngoPhone)) {
        toast({ title: 'Invalid NGO Phone', description: 'NGO phone must be 10 digits.', variant: 'destructive' });
        return false;
      }
      if (!ngoData.address.trim()) {
        toast({ title: 'Address Required', description: 'NGO address is mandatory.', variant: 'destructive' });
        return false;
      }
    }

    if (commonData.role === 'hospital') {
      if (!hospitalData.type) {
        toast({ title: 'Type Required', description: 'Please select Hospital Type (Government/Private).', variant: 'destructive' });
        return false;
      }
    }

    if (commonData.role === 'donor') {
      if (!phoneRegex.test(donorData.emergencyPhone)) {
        toast({ title: 'Invalid Emergency Phone', description: 'Emergency contact must be 10 digits.', variant: 'destructive' });
        return false;
      }
    }

    return true;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const result = await response.json();
      if (result.success) {
        localStorage.setItem('token', result.data.token);
        localStorage.setItem('user', JSON.stringify(result.data.user));
        toast({ title: 'Welcome back!' });
        navigate(`/${result.data.user.role.toLowerCase()}-dashboard`);
      } else {
        toast({ title: 'Login Failed', description: result.message, variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Server offline', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!validateRegistration()) return;

    setIsLoading(true);
    try {
      const payload = {
        name: commonData.name,
        email: commonData.email,
        phone: commonData.phone,
        password: commonData.password,
        role: commonData.role,
      };

      if (commonData.role === 'patient') {
        Object.assign(payload, {
          age: Number(patientData.age),
          blood_type: patientData.bloodGroup,
          location: patientData.location,
          aadhaar_no: patientData.aadhaarNumber
        });
      } else if (commonData.role === 'donor') {
        Object.assign(payload, {
          age: Number(donorData.age),
          blood_type: donorData.bloodGroup,
          donation_type: donorData.willingToDonate,
          aadhaar_no: donorData.aadhaarNumber,
          address: donorData.address,
          emergency_contact_name: donorData.emergencyName,
          emergency_contact_phone: donorData.emergencyPhone
        });
      } else if (commonData.role === 'hospital') {
        Object.assign(payload, {
          hospital_type: hospitalData.type,
          address: hospitalData.address,
          hospital_phone: hospitalData.hospitalPhone
        });
      } else if (commonData.role === 'ngo') {
        Object.assign(payload, {
          address: ngoData.address,
          ngo_phone: ngoData.ngoPhone
        });
      }

      const response = await fetch('http://127.0.0.1:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (result.success) {
        setShowSuccess(true);
      } else {
        toast({ title: 'Error', description: result.message || 'Registration failed', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Connection failed', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDonationTypeChange = (type, checked) => {
    if (checked) {
      setDonorData({ ...donorData, willingToDonate: [...donorData.willingToDonate, type] });
    } else {
      setDonorData({ ...donorData, willingToDonate: donorData.willingToDonate.filter(t => t !== type) });
    }
  };

  const roles = [
    { value: 'patient', label: 'Patient', icon: User },
    { value: 'donor', label: 'Donor', icon: HeartHandshake },
    { value: 'hospital', label: 'Hospital', icon: Building2 },
    { value: 'ngo', label: 'NGO', icon: Users },
  ];

  // Logic to determine name field label based on selected role
  const isOrganization = commonData.role === 'ngo' || commonData.role === 'hospital';

  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Success!</h2>
          <p className="text-gray-600 mb-6">Account created successfully.</p>
          <Button onClick={() => { setShowSuccess(false); setActiveTab('login'); }} className="w-full">Go to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      <div className="flex items-center gap-2 mb-8">
        <Heart className="text-red-500 w-8 h-8" />
        <h1 className="text-3xl font-bold">LifeLink</h1>
      </div>
      <div className="bg-white p-6 rounded-2xl shadow-lg w-full max-w-2xl">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <Label>Email</Label>
              <Input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
              <Label>Password</Label>
              <Input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : 'Sign In'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-6">
              <Label className="text-lg">I am a...</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {roles.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setCommonData({ ...commonData, role: r.value })}
                    className={`p-3 border rounded-xl flex flex-col items-center gap-2 transition-colors ${commonData.role === r.value ? 'bg-primary text-white' : 'bg-white hover:bg-slate-50'}`}
                  >
                    <r.icon className="w-5 h-5" />
                    <span className="text-xs">{r.label}</span>
                  </button>
                ))}
              </div>

              {/* Common Fields */}
              <div className="space-y-4 border-t pt-4">
                <Label>{isOrganization ? 'Organization Name' : 'Full Name'}</Label>
                <Input 
                   placeholder={isOrganization ? 'Enter organization name' : 'Enter your full name'} 
                   value={commonData.name} 
                   onChange={(e) => setCommonData({ ...commonData, name: e.target.value })} 
                   required 
                />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input placeholder="Email" type="email" value={commonData.email} onChange={(e) => setCommonData({ ...commonData, email: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Primary Phone</Label>
                    <Input placeholder="10-Digit Phone" value={commonData.phone} onChange={(e) => setCommonData({ ...commonData, phone: e.target.value.replace(/\D/g, '') })} required maxLength={10} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input placeholder="Max 10 chars" type="password" value={commonData.password} onChange={(e) => setCommonData({ ...commonData, password: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Confirm Password</Label>
                    <Input placeholder="Confirm Password" type="password" value={commonData.confirmPassword} onChange={(e) => setCommonData({ ...commonData, confirmPassword: e.target.value })} required />
                  </div>
                </div>
              </div>

              {/* ROLE SPECIFIC: PATIENT */}
              {commonData.role === 'patient' && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-md font-semibold flex items-center gap-2"><Stethoscope className="h-4 w-4 text-primary" /> Patient Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Input placeholder="Age" type="number" value={patientData.age} onChange={(e) => setPatientData({ ...patientData, age: e.target.value })} />
                    <Select onValueChange={(v) => setPatientData({ ...patientData, bloodGroup: v })}>
                      <SelectTrigger><SelectValue placeholder="Blood Group" /></SelectTrigger>
                      <SelectContent className="bg-white">
                        {['A+', 'B+', 'O+', 'AB+', 'A-', 'B-', 'O-', 'AB-'].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input placeholder="City, State" value={patientData.location} onChange={(e) => setPatientData({ ...patientData, location: e.target.value })} required />
                  <Input placeholder="12 Digit Aadhaar" maxLength={12} value={patientData.aadhaarNumber} onChange={(e) => setPatientData({...patientData, aadhaarNumber: e.target.value.replace(/\D/g, '')})} />
                </div>
              )}

              {/* ROLE SPECIFIC: DONOR */}
              {commonData.role === 'donor' && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-md font-semibold flex items-center gap-2"><HeartHandshake className="h-4 w-4 text-primary" /> Donor Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Input placeholder="Age" type="number" value={donorData.age} onChange={(e) => setDonorData({ ...donorData, age: e.target.value })} />
                    <Select onValueChange={(v) => setDonorData({...donorData, bloodGroup: v})}>
                      <SelectTrigger><SelectValue placeholder="Blood Group" /></SelectTrigger>
                      <SelectContent className="bg-white">
                        {['A+', 'B+', 'O+', 'AB+', 'A-', 'B-', 'O-', 'AB-'].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input placeholder="Address" value={donorData.address} onChange={(e) => setDonorData({...donorData, address: e.target.value})} required />
                  <div className="grid grid-cols-2 gap-4">
                    <Input placeholder="Emergency Contact Name" value={donorData.emergencyName} onChange={(e) => setDonorData({...donorData, emergencyName: e.target.value})} required />
                    <Input placeholder="Emergency Phone" value={donorData.emergencyPhone} onChange={(e) => setDonorData({...donorData, emergencyPhone: e.target.value.replace(/\D/g, '')})} required maxLength={10} />
                  </div>
                  <Input placeholder="12 Digit Aadhaar" maxLength={12} value={donorData.aadhaarNumber} onChange={(e) => setDonorData({...donorData, aadhaarNumber: e.target.value.replace(/\D/g, '')})} />
                </div>
              )}

              {/* ROLE SPECIFIC: HOSPITAL */}
              {commonData.role === 'hospital' && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-md font-semibold flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> Hospital Registration</h3>
                  <Select onValueChange={(v) => setHospitalData({ ...hospitalData, type: v })}>
                    <SelectTrigger><SelectValue placeholder="Hospital Type" /></SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="Government">Government</SelectItem>
                      <SelectItem value="Private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="Hospital Contact Phone" value={hospitalData.hospitalPhone} onChange={(e) => setHospitalData({...hospitalData, hospitalPhone: e.target.value.replace(/\D/g, '')})} required maxLength={10} />
                  <textarea 
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Hospital Full Address" 
                    value={hospitalData.address} 
                    onChange={(e) => setHospitalData({...hospitalData, address: e.target.value})} 
                    required 
                  />
                </div>
              )}

              {/* ROLE SPECIFIC: NGO */}
              {commonData.role === 'ngo' && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-md font-semibold flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> NGO Registration</h3>
                  <Input placeholder="NGO Contact Phone" value={ngoData.ngoPhone} onChange={(e) => setNgoData({...ngoData, ngoPhone: e.target.value.replace(/\D/g, '')})} required maxLength={10} />
                  <textarea 
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="NGO Registered Office Address" 
                    value={ngoData.address} 
                    onChange={(e) => setNgoData({...ngoData, address: e.target.value})} 
                    required 
                  />
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : 'Create Account'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Login;