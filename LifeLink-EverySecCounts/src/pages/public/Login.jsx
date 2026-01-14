import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, getRoleBasedRedirect } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  LogIn,
  UserPlus,
  Mail,
  Lock,
  User,
  Phone,
  MapPin,
  Droplets,
  ArrowLeft,
  Loader2,
  CheckCircle,
  Upload,
  Building2,
  Calendar,
  FileText,
  Shield,
  Users,
  Stethoscope,
  HeartHandshake,
  CreditCard,
} from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('login');
  const [isLoading, setIsLoading] = useState(false);
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginRole, setLoginRole] = useState('patient');

  // Common register fields
  const [commonData, setCommonData] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    password: '',
    confirmPassword: '',
    role: 'patient',
  });

  // Patient-specific fields
  const [patientData, setPatientData] = useState({
    age: '',
    gender: '',
    bloodGroup: '',
    medicalCondition: '',
    hospitalName: '',
    hospitalId: '',
    aadhaarNumber: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    medicalReport: null,
  });

  // Donor-specific fields
  const [donorData, setDonorData] = useState({
    age: '',
    bloodGroup: '',
    lastDonationDate: '',
    availabilityStatus: 'available',
    willingToDonate: [],
    aadhaarNumber: '',
    governmentId: '',
  });

  // Hospital-specific fields
  const [hospitalData, setHospitalData] = useState({
    hospitalName: '',
    registrationNumber: '',
    hospitalType: '',
    numberOfBeds: '',
    icuAvailability: '',
    bloodBankAvailable: '',
    emergencyContact: '',
    hospitalAddress: '',
  });

  // NGO-specific fields
  const [ngoData, setNgoData] = useState({
    ngoName: '',
    ngoId: '',
    registrationNumber: '',
    ngoType: '',
    areasOfOperation: '',
    contactPersonName: '',
    contactPersonPhone: '',
    organizationAddress: '',
  });

  const [otpInput, setOtpInput] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(getRoleBasedRedirect(user.role));
    }
  }, [isAuthenticated, user, navigate]);

  const validateAadhaar = (aadhaar) => {
    const cleanAadhaar = aadhaar.replace(/\D/g, '');
    return cleanAadhaar.length === 12;
  };

  const validateCommonFields = () => {
    const newErrors = {};
    if (!commonData.name.trim()) newErrors.name = 'Full name is required';
    if (!commonData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(commonData.email)) newErrors.email = 'Invalid email format';
    if (!commonData.phone.trim()) newErrors.phone = 'Phone number is required';
    else if (!/^\d{10}$/.test(commonData.phone.replace(/\D/g, ''))) newErrors.phone = 'Invalid phone number';
    if (!commonData.city.trim()) newErrors.city = 'City is required';
    if (!commonData.state.trim()) newErrors.state = 'State is required';
    if (!commonData.password) newErrors.password = 'Password is required';
    else if (commonData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (commonData.password !== commonData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    return newErrors;
  };

  const validateRoleSpecificFields = () => {
    const newErrors = {};
    if (commonData.role === 'patient') {
      if (!patientData.age) newErrors.patientAge = 'Age is required';
      if (!patientData.gender) newErrors.patientGender = 'Gender is required';
      if (!patientData.bloodGroup) newErrors.patientBloodGroup = 'Blood group is required';
      if (!patientData.medicalCondition.trim()) newErrors.patientMedicalCondition = 'Medical condition is required';
      if (!patientData.hospitalName.trim()) newErrors.patientHospitalName = 'Hospital name is required';
      if (!patientData.hospitalId.trim()) newErrors.patientHospitalId = 'Hospital ID is required';
      if (!patientData.aadhaarNumber.trim()) newErrors.patientAadhaar = 'Aadhaar number is required';
      else if (!validateAadhaar(patientData.aadhaarNumber)) newErrors.patientAadhaar = 'Aadhaar must be exactly 12 digits';
      if (!patientData.emergencyContactName.trim()) newErrors.patientEmergencyName = 'Emergency contact name is required';
      if (!patientData.emergencyContactPhone.trim()) newErrors.patientEmergencyPhone = 'Emergency contact phone is required';
    }
    if (commonData.role === 'donor') {
      if (!donorData.age) newErrors.donorAge = 'Age is required';
      if (!donorData.bloodGroup) newErrors.donorBloodGroup = 'Blood group is required';
      if (!donorData.aadhaarNumber.trim()) newErrors.donorAadhaar = 'Aadhaar number is required';
      else if (!validateAadhaar(donorData.aadhaarNumber)) newErrors.donorAadhaar = 'Aadhaar must be exactly 12 digits';
      if (donorData.willingToDonate.length === 0) newErrors.donorWillingToDonate = 'Select at least one donation type';
    }
    return newErrors;
  };

  // UPDATED LOGIN FUNCTION
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      });

      const result = await response.json();

      if (result.success) {
        localStorage.setItem('token', result.data.token);
        localStorage.setItem('user', JSON.stringify(result.data.user));
        
        toast({
          title: 'Welcome back!',
          description: 'Login successful.',
        });
        
        navigate(`/${result.data.user.role.toLowerCase()}-dashboard`);
      } else {
        toast({
          title: 'Login Failed',
          description: result.message || 'Invalid credentials',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Server connection failed. Is the backend running?',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // UPDATED REGISTER FUNCTION
  const handleRegister = async (e) => {
    e.preventDefault();
    
    const commonErrors = validateCommonFields();
    const roleErrors = validateRoleSpecificFields();
    const allErrors = { ...commonErrors, ...roleErrors };

    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: commonData.name,
          email: commonData.email,
          phone: commonData.phone,
          password: commonData.password,
          role: commonData.role,
          aadhaar_no: commonData.role === 'patient' ? patientData.aadhaarNumber : donorData.aadhaarNumber
        }),
      });

      const result = await response.json();

      if (result.success) {
        setShowSuccess(true);
        toast({
          title: 'Registration Successful!',
          description: 'You can now log in.',
        });
      } else {
        toast({
          title: 'Registration Failed',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Could not connect to the server.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    // Logic for OTP verification if needed later
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setPatientData({ ...patientData, medicalReport: file });
  };

  const handleDonationTypeChange = (type, checked) => {
    if (checked) {
      setDonorData({ ...donorData, willingToDonate: [...donorData.willingToDonate, type] });
    } else {
      setDonorData({ ...donorData, willingToDonate: donorData.willingToDonate.filter(t => t !== type) });
    }
  };

  const handleAadhaarChange = (value, isPatient) => {
    const numericValue = value.replace(/\D/g, '').slice(0, 12);
    if (isPatient) setPatientData({ ...patientData, aadhaarNumber: numericValue });
    else setDonorData({ ...donorData, aadhaarNumber: numericValue });
  };

  const roles = [
    { value: 'patient', label: 'Patient', icon: User },
    { value: 'donor', label: 'Donor', icon: HeartHandshake },
    { value: 'hospital', label: 'Hospital', icon: Building2 },
    { value: 'ngo', label: 'NGO', icon: Users },
    { value: 'admin', label: 'Admin', icon: Shield },
  ];

  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const genders = ['Male', 'Female', 'Other'];

  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl border border-border p-8 shadow-lg animate-fade-in text-center">
            <div className="mx-auto w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mb-6">
              <CheckCircle className="h-10 w-10 text-success" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">Registration Successful!</h2>
            <p className="text-muted-foreground mb-6">Your account has been created. You can now sign in.</p>
            <Button onClick={() => { setShowSuccess(false); setActiveTab('login'); }} className="w-full" size="lg">
              <LogIn className="mr-2 h-4 w-4" />
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4 py-8">
      <div className="w-full max-w-2xl">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-md">
            <Heart className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-foreground">LifeLink</span>
            <span className="text-xs font-medium tracking-wider text-muted-foreground">EVERY SECOND COUNTS</span>
          </div>
        </Link>

        <div className="bg-card rounded-2xl border border-border p-6 md:p-8 shadow-lg animate-fade-in">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="login" className="gap-2">
                <LogIn className="h-4 w-4" /> Login
              </TabsTrigger>
              <TabsTrigger value="register" className="gap-2">
                <UserPlus className="h-4 w-4" /> Register
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="login-email" type="email" placeholder="you@example.com" className="pl-10" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="login-password" type="password" placeholder="••••••••" className="pl-10" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
                  </div>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                  Sign In
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Select Your Role</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {roles.slice(0, 4).map((role) => {
                      const Icon = role.icon;
                      const isSelected = commonData.role === role.value;
                      return (
                        <button key={role.value} type="button" onClick={() => setCommonData({ ...commonData, role: role.value })} className={`p-4 rounded-xl border-2 transition-all duration-300 flex flex-col items-center gap-2 ${isSelected ? 'border-primary bg-primary/5' : 'border-border'}`}>
                          <Icon className={`h-6 w-6 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                          <span className="text-sm font-medium">{role.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-border">
                  <h3 className="text-lg font-semibold flex items-center gap-2"><User className="h-5 w-5 text-primary" /> Basic Information</h3>
                  <div className="space-y-2">
                    <Label htmlFor="reg-name">Full Name *</Label>
                    <Input id="reg-name" placeholder="Name" value={commonData.name} onChange={(e) => setCommonData({ ...commonData, name: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input type="email" placeholder="Email" value={commonData.email} onChange={(e) => setCommonData({ ...commonData, email: e.target.value })} />
                    <Input type="tel" placeholder="Phone" value={commonData.phone} onChange={(e) => setCommonData({ ...commonData, phone: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input type="password" placeholder="Password" value={commonData.password} onChange={(e) => setCommonData({ ...commonData, password: e.target.value })} />
                    <Input type="password" placeholder="Confirm Password" value={commonData.confirmPassword} onChange={(e) => setCommonData({ ...commonData, confirmPassword: e.target.value })} />
                  </div>
                </div>

                {commonData.role === 'patient' && (
                   <div className="space-y-4 pt-4 border-t border-border">
                    <h3 className="text-lg font-semibold flex items-center gap-2"><Stethoscope className="h-5 w-5 text-primary" /> Patient Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <Input type="number" placeholder="Age" value={patientData.age} onChange={(e) => setPatientData({ ...patientData, age: e.target.value })} />
                      <Select value={patientData.bloodGroup} onValueChange={(v) => setPatientData({ ...patientData, bloodGroup: v })}>
                        <SelectTrigger><SelectValue placeholder="Blood Group" /></SelectTrigger>
                        <SelectContent className="bg-popover">{bloodTypes.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Input placeholder="Aadhaar Number" maxLength={12} value={patientData.aadhaarNumber} onChange={(e) => handleAadhaarChange(e.target.value, true)} />
                   </div>
                )}

                {commonData.role === 'donor' && (
                  <div className="space-y-4 pt-4 border-t border-border">
                    <h3 className="text-lg font-semibold flex items-center gap-2"><HeartHandshake className="h-5 w-5 text-primary" /> Donor Details</h3>
                    <Input placeholder="Aadhaar Number" maxLength={12} value={donorData.aadhaarNumber} onChange={(e) => handleAadhaarChange(e.target.value, false)} />
                  </div>
                )}

                <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Login;