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
  LogIn,
  User,
  Phone,
  Mail,
  Lock,
  Loader2,
  CheckCircle,
  Stethoscope,
  HeartHandshake,
  Building2,
  Users
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

  const [patientData, setPatientData] = useState({
    age: '',
    bloodGroup: '',
    aadhaarNumber: '',
  });

  const [donorData, setDonorData] = useState({
    age: '',
    bloodGroup: '',
    willingToDonate: [],
    aadhaarNumber: '',
  });

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(getRoleBasedRedirect(user.role));
    }
  }, [isAuthenticated, user, navigate]);

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

    // Basic password match check
    if (commonData.password !== commonData.confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      // Build payload with common and role-specific fields
      const payload = {
        name: commonData.name,
        email: commonData.email,
        phone: commonData.phone,
        password: commonData.password,
        role: commonData.role,
        aadhaar_no: commonData.role === 'patient' ? patientData.aadhaarNumber : donorData.aadhaarNumber
      };

      if (commonData.role === 'patient') {
        payload.age = patientData.age ? Number(patientData.age) : undefined;
        payload.blood_type = patientData.bloodGroup || undefined;
      }

      if (commonData.role === 'donor') {
        payload.age = donorData.age ? Number(donorData.age) : undefined;
        payload.blood_type = donorData.bloodGroup || undefined;
        payload.donation_type = donorData.willingToDonate || [];
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
      toast({ title: 'Error', description: err.message || 'Connection failed', variant: 'destructive' });
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

  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Success!</h2>
          <p className="text-gray-600 mb-6">Account created. Please log in.</p>
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
                    className={`p-3 border rounded-xl flex flex-col items-center gap-2 ${commonData.role === r.value ? 'bg-primary text-white' : 'bg-white'}`}
                  >
                    <r.icon className="w-5 h-5" />
                    <span className="text-xs">{r.label}</span>
                  </button>
                ))}
              </div>

              <div className="space-y-4 border-t pt-4">
                <Label>Full Name</Label>
                <Input value={commonData.name} onChange={(e) => setCommonData({ ...commonData, name: e.target.value })} required />
                <div className="grid grid-cols-2 gap-4">
                  <Input placeholder="Email" type="email" value={commonData.email} onChange={(e) => setCommonData({ ...commonData, email: e.target.value })} required />
                  <Input placeholder="Phone" value={commonData.phone} onChange={(e) => setCommonData({ ...commonData, phone: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input placeholder="Password" type="password" value={commonData.password} onChange={(e) => setCommonData({ ...commonData, password: e.target.value })} required />
                  <Input placeholder="Confirm" type="password" value={commonData.confirmPassword} onChange={(e) => setCommonData({ ...commonData, confirmPassword: e.target.value })} required />
                </div>
              </div>

              {commonData.role === 'patient' && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2"><Stethoscope className="h-5 w-5 text-primary" /> Patient Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Input placeholder="Age" type="number" max="110" value={patientData.age} onChange={(e) => setPatientData({ ...patientData, age: e.target.value })} />
                    <Select onValueChange={(v) => setPatientData({ ...patientData, bloodGroup: v })}>
                      <SelectTrigger><SelectValue placeholder="Blood Group" /></SelectTrigger>
                      <SelectContent className="bg-white">
                        {['A+', 'B+', 'O+', 'AB+', 'A-', 'B-', 'O-', 'AB-'].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input placeholder="12 Digit Aadhaar" maxLength={12} value={patientData.aadhaarNumber} onChange={(e) => setPatientData({...patientData, aadhaarNumber: e.target.value.replace(/\D/g, '')})} />
                </div>
              )}

              {commonData.role === 'donor' && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2"><HeartHandshake className="h-5 w-5 text-primary" /> Donor Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Input placeholder="Age" type="number" max="110" value={donorData.age} onChange={(e) => setDonorData({ ...donorData, age: e.target.value })} />
                    <Select onValueChange={(v) => setDonorData({...donorData, bloodGroup: v})}>
                      <SelectTrigger><SelectValue placeholder="Blood Group" /></SelectTrigger>
                      <SelectContent className="bg-white">
                        {['A+', 'B+', 'O+', 'AB+', 'A-', 'B-', 'O-', 'AB-'].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <Label className="mb-2 block">I want to donate...</Label>
                    <div className="flex gap-4">
                      {['Blood', 'Plasma', 'Organs'].map(type => (
                        <div key={type} className="flex items-center gap-1">
                          <Checkbox id={type} onCheckedChange={(checked) => handleDonationTypeChange(type, checked)} />
                          <label htmlFor={type} className="text-sm">{type}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Input placeholder="12 Digit Aadhaar" maxLength={12} value={donorData.aadhaarNumber} onChange={(e) => setDonorData({...donorData, aadhaarNumber: e.target.value.replace(/\D/g, '')})} />
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