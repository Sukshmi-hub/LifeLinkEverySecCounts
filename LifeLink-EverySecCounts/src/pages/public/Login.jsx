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
  const { login, register, verifyOtp, isAuthenticated, user } = useAuth();
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

  // OTP state
  const [otpInput, setOtpInput] = useState('');

  // Validation errors
  const [errors, setErrors] = useState({});

  // Redirect if already authenticated
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

    if (commonData.role === 'hospital') {
      if (!hospitalData.hospitalName.trim()) newErrors.hospitalName = 'Hospital name is required';
      if (!hospitalData.registrationNumber.trim()) newErrors.hospitalRegNumber = 'Registration number is required';
      if (!hospitalData.hospitalType) newErrors.hospitalType = 'Hospital type is required';
      if (!hospitalData.numberOfBeds) newErrors.hospitalBeds = 'Number of beds is required';
      if (!hospitalData.icuAvailability) newErrors.hospitalIcu = 'ICU availability is required';
      if (!hospitalData.bloodBankAvailable) newErrors.hospitalBloodBank = 'Blood bank status is required';
      if (!hospitalData.emergencyContact.trim()) newErrors.hospitalEmergency = 'Emergency contact is required';
      if (!hospitalData.hospitalAddress.trim()) newErrors.hospitalAddress = 'Hospital address is required';
    }

    if (commonData.role === 'ngo') {
      if (!ngoData.ngoName.trim()) newErrors.ngoName = 'NGO name is required';
      if (!ngoData.ngoId.trim()) newErrors.ngoId = 'NGO ID is required';
      if (!ngoData.registrationNumber.trim()) newErrors.ngoRegNumber = 'Registration number is required';
      if (!ngoData.ngoType) newErrors.ngoType = 'NGO type is required';
      if (!ngoData.areasOfOperation.trim()) newErrors.ngoAreas = 'Areas of operation is required';
      if (!ngoData.contactPersonName.trim()) newErrors.ngoContactName = 'Contact person name is required';
      if (!ngoData.contactPersonPhone.trim()) newErrors.ngoContactPhone = 'Contact person phone is required';
      if (!ngoData.organizationAddress.trim()) newErrors.ngoAddress = 'Organization address is required';
    }

    return newErrors;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const success = await login(loginEmail, loginPassword, loginRole);
      if (success) {
        toast({
          title: 'Welcome back!',
          description: 'You have successfully logged in.',
        });
        navigate(getRoleBasedRedirect(loginRole));
      }
    } catch (err) {
      toast({
        title: 'Login Failed',
        description: 'Please check your credentials and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    const commonErrors = validateCommonFields();
    const roleErrors = validateRoleSpecificFields();
    const allErrors = { ...commonErrors, ...roleErrors };

    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields correctly.',
        variant: 'destructive',
      });
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      const result = await register({
        name: commonData.name,
        email: commonData.email,
        phone: commonData.phone,
        role: commonData.role,
        bloodType: commonData.role === 'patient' ? patientData.bloodGroup : donorData.bloodGroup,
        location: `${commonData.city}, ${commonData.state}`,
      });
      
      if (result.success) {
        setGeneratedOtp(result.otp);
        setShowOtpScreen(true);
        toast({
          title: 'OTP Sent!',
          description: `For demo purposes, your OTP is: ${result.otp}`,
        });
      }
    } catch (err) {
      toast({
        title: 'Registration Failed',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const success = await verifyOtp(otpInput, generatedOtp);
      if (success) {
        setShowOtpScreen(false);
        setShowSuccess(true);
      } else {
        toast({
          title: 'Invalid OTP',
          description: 'The OTP you entered is incorrect. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Verification Failed',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPatientData({ ...patientData, medicalReport: file });
    }
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
    if (isPatient) {
      setPatientData({ ...patientData, aadhaarNumber: numericValue });
    } else {
      setDonorData({ ...donorData, aadhaarNumber: numericValue });
    }
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
  const hospitalTypes = ['Private', 'Government'];
  const ngoTypes = ['Healthcare', 'Blood Donation', 'Disaster Relief'];

  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl border border-border p-8 shadow-lg animate-fade-in text-center">
            <div className="mx-auto w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mb-6">
              <CheckCircle className="h-10 w-10 text-success" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">Registration Successful!</h2>
            <p className="text-muted-foreground mb-6">
              Your account has been created successfully. Awaiting verification by LifeLink team.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <p className="text-sm text-muted-foreground">
                You will receive a confirmation email once your account is verified. This usually takes 24-48 hours.
              </p>
            </div>
            <Button onClick={() => { setShowSuccess(false); setActiveTab('login'); }} className="w-full" size="lg">
              <LogIn className="mr-2 h-4 w-4" />
              Back to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (showOtpScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl border border-border p-8 shadow-lg animate-fade-in">
            <Button
              variant="ghost"
              size="sm"
              className="mb-6"
              onClick={() => setShowOtpScreen(false)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <div className="text-center mb-8">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Verify Your Account</h2>
              <p className="mt-2 text-muted-foreground">
                Enter the OTP sent to your phone/email
              </p>
              <p className="mt-1 text-sm text-primary font-medium">
                Demo OTP: {generatedOtp}
              </p>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="otp">One-Time Password</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  maxLength={6}
                  className="text-center text-2xl tracking-widest"
                  required
                />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Continue'
                )}
              </Button>
            </form>
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
            <span className="text-xs font-medium tracking-wider text-muted-foreground">
              EVERY SECOND COUNTS
            </span>
          </div>
        </Link>

        <div className="bg-card rounded-2xl border border-border p-6 md:p-8 shadow-lg animate-fade-in">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="login" className="gap-2">
                <LogIn className="h-4 w-4" />
                Login
              </TabsTrigger>
              <TabsTrigger value="register" className="gap-2">
                <UserPlus className="h-4 w-4" />
                Register
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      className="pl-10"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-role">Role</Label>
                  <Select value={loginRole} onValueChange={(v) => setLoginRole(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {roles.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          <div className="flex items-center gap-2">
                            <role.icon className="h-4 w-4" />
                            {role.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" />
                      Sign In
                    </>
                  )}
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
                        <button
                          key={role.value}
                          type="button"
                          onClick={() => setCommonData({ ...commonData, role: role.value })}
                          className={`p-4 rounded-xl border-2 transition-all duration-300 flex flex-col items-center gap-2 ${
                            isSelected
                              ? 'border-primary bg-primary/5 shadow-md'
                              : 'border-border hover:border-primary/50 hover:bg-muted/50'
                          }`}
                        >
                          <Icon className={`h-6 w-6 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                          <span className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                            {role.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-border">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Basic Information
                  </h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="reg-name">Full Name *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="reg-name"
                        type="text"
                        placeholder="John Doe"
                        className={`pl-10 ${errors.name ? 'border-destructive' : ''}`}
                        value={commonData.name}
                        onChange={(e) => setCommonData({ ...commonData, name: e.target.value })}
                      />
                    </div>
                    {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="reg-email">Email *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="reg-email"
                          type="email"
                          placeholder="you@example.com"
                          className={`pl-10 ${errors.email ? 'border-destructive' : ''}`}
                          value={commonData.email}
                          onChange={(e) => setCommonData({ ...commonData, email: e.target.value })}
                        />
                      </div>
                      {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-phone">Phone Number *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="reg-phone"
                          type="tel"
                          placeholder="1234567890"
                          className={`pl-10 ${errors.phone ? 'border-destructive' : ''}`}
                          value={commonData.phone}
                          onChange={(e) => setCommonData({ ...commonData, phone: e.target.value })}
                        />
                      </div>
                      {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="reg-city">City *</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="reg-city"
                          type="text"
                          placeholder="Mumbai"
                          className={`pl-10 ${errors.city ? 'border-destructive' : ''}`}
                          value={commonData.city}
                          onChange={(e) => setCommonData({ ...commonData, city: e.target.value })}
                        />
                      </div>
                      {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-state">State *</Label>
                      <Input
                        id="reg-state"
                        type="text"
                        placeholder="Maharashtra"
                        className={errors.state ? 'border-destructive' : ''}
                        value={commonData.state}
                        onChange={(e) => setCommonData({ ...commonData, state: e.target.value })}
                      />
                      {errors.state && <p className="text-xs text-destructive">{errors.state}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="reg-password">Password *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="reg-password"
                          type="password"
                          placeholder="••••••••"
                          className={`pl-10 ${errors.password ? 'border-destructive' : ''}`}
                          value={commonData.password}
                          onChange={(e) => setCommonData({ ...commonData, password: e.target.value })}
                        />
                      </div>
                      {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-confirm-password">Confirm Password *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="reg-confirm-password"
                          type="password"
                          placeholder="••••••••"
                          className={`pl-10 ${errors.confirmPassword ? 'border-destructive' : ''}`}
                          value={commonData.confirmPassword}
                          onChange={(e) => setCommonData({ ...commonData, confirmPassword: e.target.value })}
                        />
                      </div>
                      {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
                    </div>
                  </div>
                </div>

                {commonData.role === 'patient' && (
                  <div className="space-y-4 pt-4 border-t border-border animate-fade-in">
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <Stethoscope className="h-5 w-5 text-primary" />
                      Patient Information
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Age *</Label>
                        <Input
                          type="number"
                          placeholder="25"
                          min="1"
                          max="120"
                          className={errors.patientAge ? 'border-destructive' : ''}
                          value={patientData.age}
                          onChange={(e) => setPatientData({ ...patientData, age: e.target.value })}
                        />
                        {errors.patientAge && <p className="text-xs text-destructive">{errors.patientAge}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label>Gender *</Label>
                        <Select
                          value={patientData.gender}
                          onValueChange={(v) => setPatientData({ ...patientData, gender: v })}
                        >
                          <SelectTrigger className={errors.patientGender ? 'border-destructive' : ''}>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            {genders.map((g) => (
                              <SelectItem key={g} value={g}>{g}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.patientGender && <p className="text-xs text-destructive">{errors.patientGender}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label>Blood Group *</Label>
                        <Select
                          value={patientData.bloodGroup}
                          onValueChange={(v) => setPatientData({ ...patientData, bloodGroup: v })}
                        >
                          <SelectTrigger className={errors.patientBloodGroup ? 'border-destructive' : ''}>
                            <Droplets className="h-4 w-4 text-muted-foreground mr-2" />
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            {bloodTypes.map((bt) => (
                              <SelectItem key={bt} value={bt}>{bt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.patientBloodGroup && <p className="text-xs text-destructive">{errors.patientBloodGroup}</p>}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Medical Condition *</Label>
                      <Textarea
                        placeholder="Describe your medical condition..."
                        className={errors.patientMedicalCondition ? 'border-destructive' : ''}
                        value={patientData.medicalCondition}
                        onChange={(e) => setPatientData({ ...patientData, medicalCondition: e.target.value })}
                      />
                      {errors.patientMedicalCondition && <p className="text-xs text-destructive">{errors.patientMedicalCondition}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label>Medical Report (PDF/Image)</Label>
                      <div className="relative">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={handleFileChange}
                          className="hidden"
                          id="medical-report"
                        />
                        <label
                          htmlFor="medical-report"
                          className="flex items-center justify-center gap-2 w-full p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                        >
                          <Upload className="h-5 w-5 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {patientData.medicalReport ? patientData.medicalReport.name : 'Click to upload medical report'}
                          </span>
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Hospital Name *</Label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="text"
                            placeholder="City Hospital"
                            className={`pl-10 ${errors.patientHospitalName ? 'border-destructive' : ''}`}
                            value={patientData.hospitalName}
                            onChange={(e) => setPatientData({ ...patientData, hospitalName: e.target.value })}
                          />
                        </div>
                        {errors.patientHospitalName && <p className="text-xs text-destructive">{errors.patientHospitalName}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label>Hospital ID *</Label>
                        <Input
                          type="text"
                          placeholder="HOSP123"
                          className={errors.patientHospitalId ? 'border-destructive' : ''}
                          value={patientData.hospitalId}
                          onChange={(e) => setPatientData({ ...patientData, hospitalId: e.target.value })}
                        />
                        {errors.patientHospitalId && <p className="text-xs text-destructive">{errors.patientHospitalId}</p>}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Aadhaar Number * (12 digits)</Label>
                      <div className="relative">
                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="XXXX XXXX XXXX"
                          maxLength={12}
                          className={`pl-10 ${errors.patientAadhaar ? 'border-destructive' : ''}`}
                          value={patientData.aadhaarNumber}
                          onChange={(e) => handleAadhaarChange(e.target.value, true)}
                        />
                      </div>
                      {errors.patientAadhaar && <p className="text-xs text-destructive">{errors.patientAadhaar}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Emergency Contact Name *</Label>
                        <Input
                          type="text"
                          placeholder="Jane Doe"
                          className={errors.patientEmergencyName ? 'border-destructive' : ''}
                          value={patientData.emergencyContactName}
                          onChange={(e) => setPatientData({ ...patientData, emergencyContactName: e.target.value })}
                        />
                        {errors.patientEmergencyName && <p className="text-xs text-destructive">{errors.patientEmergencyName}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label>Emergency Contact Phone *</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="tel"
                            placeholder="9876543210"
                            className={`pl-10 ${errors.patientEmergencyPhone ? 'border-destructive' : ''}`}
                            value={patientData.emergencyContactPhone}
                            onChange={(e) => setPatientData({ ...patientData, emergencyContactPhone: e.target.value })}
                          />
                        </div>
                        {errors.patientEmergencyPhone && <p className="text-xs text-destructive">{errors.patientEmergencyPhone}</p>}
                      </div>
                    </div>
                  </div>
                )}

                {commonData.role === 'donor' && (
                  <div className="space-y-4 pt-4 border-t border-border animate-fade-in">
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <HeartHandshake className="h-5 w-5 text-primary" />
                      Donor Information
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Age *</Label>
                        <Input
                          type="number"
                          placeholder="25"
                          min="18"
                          max="65"
                          className={errors.donorAge ? 'border-destructive' : ''}
                          value={donorData.age}
                          onChange={(e) => setDonorData({ ...donorData, age: e.target.value })}
                        />
                        {errors.donorAge && <p className="text-xs text-destructive">{errors.donorAge}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label>Blood Group *</Label>
                        <Select
                          value={donorData.bloodGroup}
                          onValueChange={(v) => setDonorData({ ...donorData, bloodGroup: v })}
                        >
                          <SelectTrigger className={errors.donorBloodGroup ? 'border-destructive' : ''}>
                            <Droplets className="h-4 w-4 text-muted-foreground mr-2" />
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            {bloodTypes.map((bt) => (
                              <SelectItem key={bt} value={bt}>{bt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.donorBloodGroup && <p className="text-xs text-destructive">{errors.donorBloodGroup}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Last Donation Date</Label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="date"
                            className="pl-10"
                            value={donorData.lastDonationDate}
                            onChange={(e) => setDonorData({ ...donorData, lastDonationDate: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Availability Status</Label>
                        <Select
                          value={donorData.availabilityStatus}
                          onValueChange={(v) => setDonorData({ ...donorData, availabilityStatus: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            <SelectItem value="available">Available</SelectItem>
                            <SelectItem value="not-available">Not Available</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className={errors.donorWillingToDonate ? 'text-destructive' : ''}>Willing to Donate *</Label>
                      <div className="flex flex-wrap gap-4">
                        {['Blood', 'Plasma', 'Organs'].map((type) => (
                          <div key={type} className="flex items-center space-x-2">
                            <Checkbox
                              id={`donate-${type}`}
                              checked={donorData.willingToDonate.includes(type)}
                              onCheckedChange={(checked) => handleDonationTypeChange(type, checked)}
                            />
                            <label
                              htmlFor={`donate-${type}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {type}
                            </label>
                          </div>
                        ))}
                      </div>
                      {errors.donorWillingToDonate && <p className="text-xs text-destructive">{errors.donorWillingToDonate}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label>Aadhaar Number * (12 digits)</Label>
                      <div className="relative">
                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="XXXX XXXX XXXX"
                          maxLength={12}
                          className={`pl-10 ${errors.donorAadhaar ? 'border-destructive' : ''}`}
                          value={donorData.aadhaarNumber}
                          onChange={(e) => handleAadhaarChange(e.target.value, false)}
                        />
                      </div>
                      {errors.donorAadhaar && <p className="text-xs text-destructive">{errors.donorAadhaar}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label>Government ID Number (Optional)</Label>
                      <div className="relative">
                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="PAN / Passport (optional)"
                          className="pl-10"
                          value={donorData.governmentId}
                          onChange={(e) => setDonorData({ ...donorData, governmentId: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {commonData.role === 'hospital' && (
                  <div className="space-y-4 pt-4 border-t border-border animate-fade-in">
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      Hospital Information
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Hospital Name *</Label>
                        <Input
                          type="text"
                          placeholder="City General Hospital"
                          className={errors.hospitalName ? 'border-destructive' : ''}
                          value={hospitalData.hospitalName}
                          onChange={(e) => setHospitalData({ ...hospitalData, hospitalName: e.target.value })}
                        />
                        {errors.hospitalName && <p className="text-xs text-destructive">{errors.hospitalName}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label>Hospital Registration Number *</Label>
                        <Input
                          type="text"
                          placeholder="REG123456"
                          className={errors.hospitalRegNumber ? 'border-destructive' : ''}
                          value={hospitalData.registrationNumber}
                          onChange={(e) => setHospitalData({ ...hospitalData, registrationNumber: e.target.value })}
                        />
                        {errors.hospitalRegNumber && <p className="text-xs text-destructive">{errors.hospitalRegNumber}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Hospital Type *</Label>
                        <Select
                          value={hospitalData.hospitalType}
                          onValueChange={(v) => setHospitalData({ ...hospitalData, hospitalType: v })}
                        >
                          <SelectTrigger className={errors.hospitalType ? 'border-destructive' : ''}>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            {hospitalTypes.map((type) => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.hospitalType && <p className="text-xs text-destructive">{errors.hospitalType}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label>Number of Beds *</Label>
                        <Input
                          type="number"
                          placeholder="100"
                          min="1"
                          className={errors.hospitalBeds ? 'border-destructive' : ''}
                          value={hospitalData.numberOfBeds}
                          onChange={(e) => setHospitalData({ ...hospitalData, numberOfBeds: e.target.value })}
                        />
                        {errors.hospitalBeds && <p className="text-xs text-destructive">{errors.hospitalBeds}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>ICU Availability *</Label>
                        <Select
                          value={hospitalData.icuAvailability}
                          onValueChange={(v) => setHospitalData({ ...hospitalData, icuAvailability: v })}
                        >
                          <SelectTrigger className={errors.hospitalIcu ? 'border-destructive' : ''}>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            <SelectItem value="yes">Yes</SelectItem>
                            <SelectItem value="no">No</SelectItem>
                          </SelectContent>
                        </Select>
                        {errors.hospitalIcu && <p className="text-xs text-destructive">{errors.hospitalIcu}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label>Blood Bank Available *</Label>
                        <Select
                          value={hospitalData.bloodBankAvailable}
                          onValueChange={(v) => setHospitalData({ ...hospitalData, bloodBankAvailable: v })}
                        >
                          <SelectTrigger className={errors.hospitalBloodBank ? 'border-destructive' : ''}>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            <SelectItem value="yes">Yes</SelectItem>
                            <SelectItem value="no">No</SelectItem>
                          </SelectContent>
                        </Select>
                        {errors.hospitalBloodBank && <p className="text-xs text-destructive">{errors.hospitalBloodBank}</p>}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Emergency Contact Number *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="tel"
                          placeholder="1800-XXX-XXXX"
                          className={`pl-10 ${errors.hospitalEmergency ? 'border-destructive' : ''}`}
                          value={hospitalData.emergencyContact}
                          onChange={(e) => setHospitalData({ ...hospitalData, emergencyContact: e.target.value })}
                        />
                      </div>
                      {errors.hospitalEmergency && <p className="text-xs text-destructive">{errors.hospitalEmergency}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label>Hospital Address *</Label>
                      <Textarea
                        placeholder="Full hospital address..."
                        className={errors.hospitalAddress ? 'border-destructive' : ''}
                        value={hospitalData.hospitalAddress}
                        onChange={(e) => setHospitalData({ ...hospitalData, hospitalAddress: e.target.value })}
                      />
                      {errors.hospitalAddress && <p className="text-xs text-destructive">{errors.hospitalAddress}</p>}
                    </div>
                  </div>
                )}

                {commonData.role === 'ngo' && (
                  <div className="space-y-4 pt-4 border-t border-border animate-fade-in">
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      NGO Information
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>NGO Name *</Label>
                        <Input
                          type="text"
                          placeholder="LifeSavers Foundation"
                          className={errors.ngoName ? 'border-destructive' : ''}
                          value={ngoData.ngoName}
                          onChange={(e) => setNgoData({ ...ngoData, ngoName: e.target.value })}
                        />
                        {errors.ngoName && <p className="text-xs text-destructive">{errors.ngoName}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label>NGO ID *</Label>
                        <Input
                          type="text"
                          placeholder="NGO-12345"
                          className={errors.ngoId ? 'border-destructive' : ''}
                          value={ngoData.ngoId}
                          onChange={(e) => setNgoData({ ...ngoData, ngoId: e.target.value })}
                        />
                        {errors.ngoId && <p className="text-xs text-destructive">{errors.ngoId}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>NGO Registration Number *</Label>
                        <Input
                          type="text"
                          placeholder="REG-NGO-2024"
                          className={errors.ngoRegNumber ? 'border-destructive' : ''}
                          value={ngoData.registrationNumber}
                          onChange={(e) => setNgoData({ ...ngoData, registrationNumber: e.target.value })}
                        />
                        {errors.ngoRegNumber && <p className="text-xs text-destructive">{errors.ngoRegNumber}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label>NGO Type *</Label>
                        <Select
                          value={ngoData.ngoType}
                          onValueChange={(v) => setNgoData({ ...ngoData, ngoType: v })}
                        >
                          <SelectTrigger className={errors.ngoType ? 'border-destructive' : ''}>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            {ngoTypes.map((type) => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.ngoType && <p className="text-xs text-destructive">{errors.ngoType}</p>}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Areas of Operation *</Label>
                      <Input
                        type="text"
                        placeholder="Mumbai, Pune, Delhi..."
                        className={errors.ngoAreas ? 'border-destructive' : ''}
                        value={ngoData.areasOfOperation}
                        onChange={(e) => setNgoData({ ...ngoData, areasOfOperation: e.target.value })}
                      />
                      {errors.ngoAreas && <p className="text-xs text-destructive">{errors.ngoAreas}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Contact Person Name *</Label>
                        <Input
                          type="text"
                          placeholder="John Smith"
                          className={errors.ngoContactName ? 'border-destructive' : ''}
                          value={ngoData.contactPersonName}
                          onChange={(e) => setNgoData({ ...ngoData, contactPersonName: e.target.value })}
                        />
                        {errors.ngoContactName && <p className="text-xs text-destructive">{errors.ngoContactName}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label>Contact Person Phone *</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="tel"
                            placeholder="9876543210"
                            className={`pl-10 ${errors.ngoContactPhone ? 'border-destructive' : ''}`}
                            value={ngoData.contactPersonPhone}
                            onChange={(e) => setNgoData({ ...ngoData, contactPersonPhone: e.target.value })}
                          />
                        </div>
                        {errors.ngoContactPhone && <p className="text-xs text-destructive">{errors.ngoContactPhone}</p>}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Organization Address *</Label>
                      <Textarea
                        placeholder="Full organization address..."
                        className={errors.ngoAddress ? 'border-destructive' : ''}
                        value={ngoData.organizationAddress}
                        onChange={(e) => setNgoData({ ...ngoData, organizationAddress: e.target.value })}
                      />
                      {errors.ngoAddress && <p className="text-xs text-destructive">{errors.ngoAddress}</p>}
                    </div>
                  </div>
                )}

                <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Create Account
                    </>
                  )}
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