import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DashboardCard from '@/components/DashboardCard';
import { FileText, AlertTriangle, Users, Activity, UserCheck, Clock, Heart, Droplet } from 'lucide-react';
import { GiKidneys, GiLiver, GiLungs, GiSkeleton } from 'react-icons/gi';
import { FaEye, FaHeart } from 'react-icons/fa';
import { MdBiotech } from 'react-icons/md';
import { useNotifications } from '@/context/NotificationContext';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { addTribute } from '@/data/tributes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const HospitalDashboardOverview = ({
  userName,
  pendingVerifications,
  redAlertsCount,
}) => {
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
  const { organRequests, notifications } = useNotifications();
  const { toast } = useToast();

  // State for dynamic stats
  const [stats, setStats] = useState({
    pendingRequests: 0,
    redAlerts: 0,
    pendingVerifications: 0,
    matchedDonors: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);

  const pendingRequests = organRequests.filter(r => r.status === 'Pending – Hospital Review').length;
  const emergencies = organRequests.filter(r => r.urgency === 'High').length;
  const matchedCount = organRequests.filter(r => r.status === 'Donor Matched').length;
  
  const recentActivities = [
    { id: 1, action: 'Patient verification pending', time: new Date(Date.now() - 1800000), type: 'warning' },
    { id: 2, action: 'New organ request received', time: new Date(Date.now() - 3600000), type: 'info' },
    { id: 3, action: 'Donor matched successfully', time: new Date(Date.now() - 7200000), type: 'success' },
    { id: 4, action: 'Emergency case escalated', time: new Date(Date.now() - 14400000), type: 'error' },
  ];

  const organOptions = [
    { key: 'Kidney', name: 'Kidney', description: 'Most commonly transplanted organ', icon: GiKidneys },
    { key: 'Blood', name: 'Blood', description: 'Donate blood to save lives', icon: Droplet },
    { key: 'Liver', name: 'Liver', description: 'Can regenerate after partial donation', icon: GiLiver },
    { key: 'Heart', name: 'Heart', description: 'Critical for cardiac patients', icon: FaHeart },
    { key: 'Lung', name: 'Lung', description: 'For respiratory failure patients', icon: GiLungs },
    { key: 'Pancreas', name: 'Pancreas', description: 'For diabetes treatment', icon: MdBiotech },
    { key: 'Cornea', name: 'Cornea', description: 'Restore vision to the blind', icon: FaEye },
    { key: 'Bone Marrow', name: 'Bone Marrow', description: 'For blood cancer patients', icon: GiSkeleton },
  ];
  const [inventory, setInventory] = useState({});
  const [initialInventory, setInitialInventory] = useState({});
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false); // whether inventory has been saved before
  const bloodGroupsList = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
  const [bloodInventory, setBloodInventory] = useState({});
  const [initialBloodInventory, setInitialBloodInventory] = useState({});
  const [selectedBlood, setSelectedBlood] = useState([]);
  const [initialSelectedBlood, setInitialSelectedBlood] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [hospitalTributes, setHospitalTributes] = useState([]);
  const [formData, setFormData] = useState({
    donorName: '',
    age: '',
    donorLocation: '',
    donationType: '',
    hospitalName: '',
    aboutDonor: '',
    familyConsent: false,
    photo: null,
  });

  // Fetch dashboard stats from API with 30-second auto-refresh
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setStatsLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE}/api/hospital/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setStats({
              pendingRequests: data.data.pendingRequests || 0,
              redAlerts: data.data.redAlerts || 0,
              pendingVerifications: data.data.pendingVerifications || 0,
              matchedDonors: data.data.matchedDonors || 0
            });
          }
        } else {
          console.warn('Failed to fetch hospital stats:', response.status);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
      } finally {
        setStatsLoading(false);
      }
    };

    // Fetch immediately on mount
    fetchStats();

    // Set up 30-second auto-refresh interval
    const refreshInterval = setInterval(fetchStats, 30000);

    // Cleanup interval on component unmount
    return () => clearInterval(refreshInterval);
  }, [API_BASE]);


  useEffect(() => {
    const loadHospitalTributes = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const resp = await fetch(`${API_BASE}/api/tributes/mine`, { headers: { Authorization: `Bearer ${token}` } });
        if (!resp.ok) return;
        const json = await resp.json();
        if (json && json.tributes) setHospitalTributes(json.tributes);
      } catch (e) {
        // ignore
      }
    };
    loadHospitalTributes();
    const loadInventory = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const resp = await fetch(`${API_BASE}/api/hospital/inventory`, { headers: { Authorization: `Bearer ${token}` } });
        const json = await resp.json();
        if (resp.ok && Array.isArray(json.data)) {
          const map = {};
          const bloodMap = {};
          // Build a lookup from known organ option names for case-insensitive matching
          const organNameLookup = {};
          organOptions.forEach(o => { if (o.name) organNameLookup[o.name.toUpperCase()] = o.name; });
          json.data.forEach(it => {
            if (it.itemType === 'organ' && it.organType) {
              const keyUpper = String(it.organType).toUpperCase();
              const nameKey = organNameLookup[keyUpper] || (it.organType && String(it.organType).charAt(0).toUpperCase() + String(it.organType).slice(1).toLowerCase());
              map[nameKey] = it.count || 0;
            }
            if (it.itemType === 'blood' && it.bloodType) { bloodMap[String(it.bloodType).toUpperCase()] = it.count || 0; }
          });
          setInventory(map);
          setInitialInventory(map);
          // normalize blood keys to canonical list keys
          const normalizedBloodMap = {};
          bloodGroupsList.forEach(b => { normalizedBloodMap[b] = bloodMap[b.toUpperCase()] || 0; });
          setBloodInventory(normalizedBloodMap);
          setInitialBloodInventory(bloodMap);
          // mark selected blood groups where count > 0
          const sel = Object.keys(normalizedBloodMap).filter(k => (normalizedBloodMap[k] || 0) > 0);
          setSelectedBlood(sel);
          setInitialSelectedBlood(sel);
          setSaved((json.data || []).length > 0);
        }
      } catch (err) {
        console.error('Failed to load inventory', err);
      }
    };
    loadInventory();
  }, []);

  const handleChangeCount = (organ, value) => {
    setInventory(prev => ({ ...prev, [organ]: value }));
  };

  const toggleBlood = (bg) => {
    setSelectedBlood(prev => {
      if (prev.includes(bg)) {
        // deselect
        return prev.filter(x => x !== bg);
      }
      return [...prev, bg];
    });
  }

  const saveInventory = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast({ title: 'Not authenticated', description: 'Please sign in to save inventory', variant: 'destructive' });
        return;
      }
      // Exclude the special 'Blood' option from organ items
      const organItems = organOptions.filter(o => o.name !== 'Blood').map(o => ({ itemType: 'organ', organType: o.name, count: Number(inventory[o.name] || 0) }));
      // Always save all blood groups (keeps DB in sync with inputs)
      const bloodItems = bloodGroupsList.map(b => ({ itemType: 'blood', bloodType: b, count: Number(bloodInventory[b] || 0) }));
      const items = [...organItems, ...bloodItems];
      const resp = await fetch(`${API_BASE}/api/hospital/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items })
      });
      const text = await resp.text();
      let json = {};
      try { json = text ? JSON.parse(text) : {}; } catch (e) { console.warn('Invalid JSON from save:', text); }
      if (!resp.ok) {
        console.error('Inventory save failed', resp.status, text);
        toast({ title: 'Save failed', description: json.message || resp.statusText || 'Failed to save inventory', variant: 'destructive' });
        throw new Error(json.message || resp.statusText || 'Failed to save');
      }
      setEditing(false);
      setSaved(true);
      setInitialInventory({ ...inventory });
      setInitialBloodInventory({ ...bloodInventory });
      setInitialSelectedBlood([...selectedBlood]);
      toast({ title: 'Inventory saved', description: 'Available organs and blood updated', variant: 'success' });
    } catch (err) {
      console.error('Failed to save inventory', err);
      toast({ title: 'Save error', description: err?.message || 'Failed to save inventory', variant: 'destructive' });
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setFormData({ ...formData, photo: file });
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e && e.preventDefault && e.preventDefault();
    setIsSubmitting(true);

    // Validate required fields
    if (!formData.donorName || !formData.donorName.trim()) {
      setIsSubmitting(false);
      toast({ title: 'Missing field', description: 'Donor name is required', variant: 'destructive' });
      return;
    }

    if (!formData.age) {
      setIsSubmitting(false);
      toast({ title: 'Missing field', description: 'Age is required', variant: 'destructive' });
      return;
    }

    if (!formData.donorLocation || !formData.donorLocation.trim()) {
      setIsSubmitting(false);
      toast({ title: 'Missing field', description: 'Location is required', variant: 'destructive' });
      return;
    }

    if (!formData.donationType || !formData.donationType.trim()) {
      setIsSubmitting(false);
      toast({ title: 'Missing field', description: 'Donation type is required', variant: 'destructive' });
      return;
    }

    if (!formData.hospitalName || !formData.hospitalName.trim()) {
      setIsSubmitting(false);
      toast({ title: 'Missing field', description: 'Hospital name is required', variant: 'destructive' });
      return;
    }

    if (!formData.aboutDonor || !formData.aboutDonor.trim()) {
      setIsSubmitting(false);
      toast({ title: 'Missing field', description: 'About the donor is required', variant: 'destructive' });
      return;
    }

    // Client-side age validation: must be between 18 and 70
    const ageNum = Number(formData.age);
    if (Number.isNaN(ageNum) || ageNum < 18 || ageNum > 70) {
      setIsSubmitting(false);
      toast({ title: 'Invalid age', description: 'Age must be between 18 and 70', variant: 'destructive' });
      return;
    }

    // Validate aboutDonor length: minimum 20 characters
    const aboutTrimmed = formData.aboutDonor.trim();
    if (aboutTrimmed.length < 20) {
      setIsSubmitting(false);
      toast({ title: 'Invalid input', description: 'About the donor must be at least 20 characters', variant: 'destructive' });
      return;
    }

    if (aboutTrimmed.length > 700) {
      setIsSubmitting(false);
      toast({ title: 'Invalid input', description: 'About the donor must be at most 700 characters', variant: 'destructive' });
      return;
    }

    // If location empty, try geolocation
    let finalLocation = formData.donorLocation;
    if (!finalLocation && navigator && navigator.geolocation) {
      try {
        const pos = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 }));
        const { latitude, longitude } = pos.coords;
        finalLocation = `Lat:${latitude.toFixed(4)}, Lon:${longitude.toFixed(4)}`;
      } catch (err) {
        console.warn('Geolocation failed or denied', err);
      }
    }

    const payload = {
      donorName: formData.donorName.trim(),
      age: Number(formData.age),
      location: finalLocation,
      donationType: formData.donationType,
      hospitalName: formData.hospitalName.trim(),
      aboutDonor: aboutTrimmed,
      photoUrl: photoPreview || undefined,
      isPublic: !!formData.familyConsent,
    };

    // Try to send to API; if that fails, append locally using addTribute
    try {
      const token = localStorage.getItem('token');
      const resp = await fetch(`${API_BASE}/api/tributes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(payload),
      });
      
      const respJson = await resp.json();
      if (!resp.ok) {
        setIsSubmitting(false);
        toast({ title: 'Submission failed', description: respJson.message || 'Failed to submit tribute', variant: 'destructive' });
        return;
      }

      // Refresh list after successful submit
      try {
        const listResp = await fetch(`${API_BASE}/api/tributes/mine`, { headers: { Authorization: `Bearer ${token}` } });
        if (listResp.ok) {
          const listJson = await listResp.json();
          if (listJson && listJson.tributes) {
            setHospitalTributes(listJson.tributes);
          }
        }
      } catch (e) { 
        console.warn('Failed to refresh tributes list', e);
      }
      
      setIsSubmitting(false);
      setDialogOpen(false);
      setFormData({ donorName: '', age: '', donorLocation: '', donationType: '', hospitalName: '', aboutDonor: '', familyConsent: false, photo: null });
      setPhotoPreview(null);
      toast({ title: 'Tribute Submitted', description: 'Your tribute has been recorded successfully!', variant: 'default' });
    } catch (err) {
      console.error('Tribute submission error:', err);
      setIsSubmitting(false);
      toast({ title: 'Error', description: 'An error occurred while submitting the tribute', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{userName}</h1>
        <p className="text-muted-foreground">Hospital Management Dashboard</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard 
          icon={FileText} 
          title="Patient Requests" 
          value={String(stats.pendingRequests)} 
          variant="warning" 
        />
        <DashboardCard 
          icon={AlertTriangle} 
          title="Red Alerts" 
          value={String(stats.redAlerts)} 
          variant="critical" 
        />
        <DashboardCard 
          icon={UserCheck} 
          title="Patient Verifications" 
          value={String(stats.pendingVerifications)} 
          variant="primary" 
        />
        <DashboardCard 
          icon={Activity} 
          title="Matched Donors" 
          value={String(stats.matchedDonors)} 
          variant="success" 
        />
      </div>

      <div className="grid gap-6">
        {/* Available Organs / Inventory */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-destructive" />
                Available Organs / Inventory
              </CardTitle>
              <div>
                {!saved && !editing && (
                  <button
                    onClick={() => setEditing(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded-md"
                  >
                    Fill Details
                  </button>
                )}
                {!saved && editing && (
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-2 bg-gray-200 rounded-md" onClick={() => { setEditing(false); setInventory(initialInventory); setSelectedBlood(initialSelectedBlood); }}>Cancel</button>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-md" onClick={saveInventory}>Save</button>
                  </div>
                )}
                {saved && !editing && (
                  <button className="px-4 py-2 bg-gray-800 text-white rounded-md" onClick={() => setEditing(true)}>Edit</button>
                )}
                {saved && editing && (
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-2 bg-gray-200 rounded-md" onClick={() => { setEditing(false); setInventory(initialInventory); setSelectedBlood(initialSelectedBlood); }}>Cancel</button>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-md" onClick={saveInventory}>Save</button>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* When saved and not editing show compact highlighted entries */}
              {saved && !editing ? (
                <div>
                  <div className="grid grid-cols-3 gap-0 border rounded-md overflow-hidden">
                    {organOptions.filter(o => o.name !== 'Blood').map((org, idx) => {
                      const Icon = org.icon;
                      const count = inventory[org.name] ?? 0;
                      return (
                        <div key={org.key} className="p-4 flex flex-col items-start gap-2 border-b border-r last:border-r-0" style={{minHeight:120}}>
                          <div className="flex items-center gap-2">
                            <div className="text-xs uppercase text-muted-foreground mr-2">{org.name}</div>
                            <div className="ml-auto text-muted-foreground text-sm">{count > 0 ? '' : ''}</div>
                          </div>
                          <div className="flex items-center gap-3 w-full">
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                              {count > 0 ? (
                                <div className="text-sm font-medium">{count} available</div>
                              ) : (
                                <div className="text-sm text-muted-foreground">Unavailable</div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-3 p-3 border rounded-md bg-muted/10">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="text-sm font-medium">BLOOD AVAILABILITY</div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {bloodGroupsList.map(bg => (
                        <button key={bg} type="button" onClick={() => { if (editing) toggleBlood(bg); }} className={`px-3 py-1 rounded-full border flex items-center gap-2 ${selectedBlood.includes(bg) ? 'bg-red-600 text-white border-red-600' : 'bg-white text-muted-foreground'}`}>
                          <span className="font-medium">{bg}</span>
                          <span className="text-xs">{(bloodInventory[bg] || 0) > 0 ? `${bloodInventory[bg]} units` : 'None'}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {organOptions.map(org => {
                    const Icon = org.icon;
                    if (org.name === 'Blood') {
                      return (
                        <div key={org.key} className="p-4 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-3 w-full mb-2">
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                              <Icon className="w-6 h-6" />
                            </div>
                            <div>
                              <h4 className="font-medium">{org.name}</h4>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {bloodGroupsList.map(bg => (
                              <div key={bg} className="flex items-center gap-2">
                                <label className="text-sm w-12">{bg}</label>
                                <input disabled={!editing} type="number" min={0} value={bloodInventory[bg] ?? 0} onChange={(e) => setBloodInventory(prev => ({ ...prev, [bg]: Number(e.target.value || 0) }))} className="w-20 px-2 py-1 border rounded bg-white" />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={org.key} className="p-4 bg-muted/30 rounded-lg flex flex-col items-start gap-3">
                        <div className="flex items-center gap-3 w-full">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            <Icon className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="font-medium">{org.name}</h4>
                          </div>
                        </div>
                        <div className="w-full">
                          <input disabled={!editing} type="number" min={0} value={inventory[org.name] ?? 0} onChange={(e) => handleChangeCount(org.name, e.target.value)} className="w-32 px-2 py-1 border rounded bg-white mt-1" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Tribute Wall</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="mt-0 gap-2">
                  <Plus className="h-4 w-4" />
                  Submit a Tribute
                </Button>
              </DialogTrigger>

              <DialogContent className="max-w-lg bg-background max-h-[90vh] overflow-y-auto">
                <DialogHeader className="sticky top-0 bg-background z-10">
                  <DialogTitle>Submit a Tribute</DialogTitle>
                  <DialogDescription>
                    Tributes with consent will be published publicly.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5 mt-4 pb-6">
                  {/* Donor Name */}
                  <div className="space-y-2">
                    <Label htmlFor="donorName" className="text-sm font-medium">
                      Donor Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="donorName"
                      placeholder="Enter donor's full name"
                      value={formData.donorName}
                      onChange={(e) => setFormData({ ...formData, donorName: e.target.value })}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">Minimum 3 characters required</p>
                  </div>

                  {/* Age */}
                  <div className="space-y-2">
                    <Label htmlFor="age" className="text-sm font-medium">
                      Age <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="age"
                      type="number"
                      placeholder="Enter age (18-70)"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      min="18"
                      max="70"
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">Must be between 18 and 70 years</p>
                  </div>

                  {/* Location */}
                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-sm font-medium">
                      Location <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="location"
                      placeholder="Enter location or city"
                      value={formData.donorLocation}
                      onChange={(e) => setFormData({ ...formData, donorLocation: e.target.value })}
                      className="w-full"
                    />
                  </div>

                  {/* Donation Type */}
                  <div className="space-y-2">
                    <Label htmlFor="donationType" className="text-sm font-medium">
                      Donation Type <span className="text-red-500">*</span>
                    </Label>
                    <Select value={formData.donationType} onValueChange={(value) => setFormData({ ...formData, donationType: value })}>
                      <SelectTrigger id="donationType" className="w-full">
                        <SelectValue placeholder="Select a donation type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Kidney">Kidney</SelectItem>
                        <SelectItem value="Liver">Liver</SelectItem>
                        <SelectItem value="Heart">Heart</SelectItem>
                        <SelectItem value="Lung">Lung</SelectItem>
                        <SelectItem value="Pancreas">Pancreas</SelectItem>
                        <SelectItem value="Cornea">Cornea</SelectItem>
                        <SelectItem value="Bone Marrow">Bone Marrow</SelectItem>
                        <SelectItem value="Blood">Blood</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Hospital Name */}
                  <div className="space-y-2">
                    <Label htmlFor="hospitalName" className="text-sm font-medium">
                      Hospital Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="hospitalName"
                      placeholder="Enter hospital name"
                      value={formData.hospitalName}
                      onChange={(e) => setFormData({ ...formData, hospitalName: e.target.value })}
                      className="w-full"
                    />
                  </div>

                  {/* About the Donor */}
                  <div className="space-y-2">
                    <Label htmlFor="aboutDonor" className="text-sm font-medium">
                      About the Donor <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="aboutDonor"
                      placeholder="Share a tribute about the donor (minimum 20 characters)"
                      rows={4}
                      value={formData.aboutDonor}
                      onChange={(e) => setFormData({ ...formData, aboutDonor: e.target.value })}
                      className="w-full resize-none"
                    />
                    <div className="flex justify-between">
                      <p className="text-xs text-muted-foreground">Minimum 20 characters required</p>
                      <p className={`text-xs ${formData.aboutDonor.trim().length >= 20 ? 'text-green-600' : 'text-red-500'}`}>
                        {formData.aboutDonor.length}/700
                      </p>
                    </div>
                  </div>

                  {/* Photo Upload */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Photo (Optional)</Label>
                    <div className="border-dashed border-2 rounded-xl p-6 text-center cursor-pointer hover:bg-muted/30 transition">
                      <input type="file" id="photo_hosp" hidden accept="image/*" onChange={handlePhotoChange} />
                      <label htmlFor="photo_hosp" className="cursor-pointer block">
                        {photoPreview ? (
                          <div className="space-y-2">
                            <img src={photoPreview} alt="preview" className="w-24 h-24 mx-auto rounded-lg object-cover" />
                            <p className="text-sm text-muted-foreground">Click to change photo</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Click to upload photo</p>
                            <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 10MB</p>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>

                  {/* Publish Tribute */}
                  <div className="flex items-center justify-between border p-4 rounded-lg bg-muted/5">
                    <div>
                      <p className="font-medium text-sm">Publish Tribute</p>
                      <p className="text-xs text-muted-foreground">Make this tribute visible to the public</p>
                    </div>
                    <Switch checked={formData.familyConsent} onCheckedChange={(v) => setFormData({ ...formData, familyConsent: !!v })} />
                  </div>

                  {/* Form Actions */}
                  <div className="flex items-center justify-end gap-3 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => { 
                        setDialogOpen(false); 
                        setFormData({ donorName: '', age: '', donorLocation: '', donationType: '', hospitalName: '', aboutDonor: '', familyConsent: false, photo: null }); 
                        setPhotoPreview(null); 
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      className="bg-red-600 hover:bg-red-700"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Tribute'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          {/* Hospital tributes list */}
          <div className="mt-6">
            <div className="container grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {hospitalTributes.map((t) => (
                <div key={t._id || t.id} className="rounded-2xl border bg-card p-6 hover:shadow-lg transition">
                  <div className="flex gap-4">
                    {t.photoUrl ? (
                      <img src={t.photoUrl} alt={t.donorName} className="w-16 h-16 rounded-xl object-cover" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Heart className="text-primary/50" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold">{t.donorName}</h3>
                      <p className="text-xs text-muted-foreground">{t.location}</p>
                    </div>
                  </div>
                  <blockquote className="mt-4 italic text-sm text-muted-foreground">“{t.aboutDonor || t.familyMessage || ''}”</blockquote>
                  <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                    <div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        <span>{t.donationDate ? new Date(t.donationDate).toLocaleDateString() : new Date(t.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="text-red-600">{t.livesImpacted ? `${t.livesImpacted} lives` : ''}</div>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">— {t.hospitalName}</div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HospitalDashboardOverview;