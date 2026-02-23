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

const HospitalDashboardOverview = ({
  userName,
  pendingVerifications,
  redAlertsCount,
}) => {
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
  const { organRequests, notifications } = useNotifications();
  const { toast } = useToast();

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

  useEffect(() => {
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
          title="Pending Requests" 
          value={String(pendingRequests)} 
          variant="warning" 
        />
        <DashboardCard 
          icon={AlertTriangle} 
          title="Red Alerts" 
          value={String(redAlertsCount)} 
          variant="critical" 
        />
        <DashboardCard 
          icon={UserCheck} 
          title="Pending Verifications" 
          value={String(pendingVerifications)} 
          variant="primary" 
        />
        <DashboardCard 
          icon={Activity} 
          title="Matched Donors" 
          value={String(matchedCount)} 
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
          <CardTitle>Today's Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold text-primary">{organRequests.length}</p>
              <p className="text-sm text-muted-foreground">Total Requests</p>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold text-success">{matchedCount}</p>
              <p className="text-sm text-muted-foreground">Successful Matches</p>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold text-warning">{pendingVerifications}</p>
              <p className="text-sm text-muted-foreground">Pending Verifications</p>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold text-destructive">{emergencies}</p>
              <p className="text-sm text-muted-foreground">High Urgency Cases</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HospitalDashboardOverview;