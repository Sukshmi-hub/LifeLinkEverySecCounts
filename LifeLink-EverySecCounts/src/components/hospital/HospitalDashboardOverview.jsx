import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DashboardCard from '@/components/DashboardCard';
import { FileText, AlertTriangle, Users, Activity, UserCheck, Clock, TrendingUp, Heart } from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const HospitalDashboardOverview = ({
  userName,
  pendingVerifications,
  redAlertsCount,
}) => {
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001';
  const { organRequests, notifications } = useNotifications();

  const pendingRequests = organRequests.filter(r => r.status === 'Pending – Hospital Review').length;
  const emergencies = organRequests.filter(r => r.urgency === 'High').length;
  const matchedCount = organRequests.filter(r => r.status === 'Donor Matched').length;
  
  const recentActivities = [
    { id: 1, action: 'Patient verification pending', time: new Date(Date.now() - 1800000), type: 'warning' },
    { id: 2, action: 'New organ request received', time: new Date(Date.now() - 3600000), type: 'info' },
    { id: 3, action: 'Donor matched successfully', time: new Date(Date.now() - 7200000), type: 'success' },
    { id: 4, action: 'Emergency case escalated', time: new Date(Date.now() - 14400000), type: 'error' },
  ];

  const organs = ['Kidney','Liver','Heart','Lung','Pancreas','Cornea','Bone Marrow'];
  const [inventory, setInventory] = useState({});
  const [initialInventory, setInitialInventory] = useState({});
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false); // whether inventory has been saved before
  const bloodGroupsList = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
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
          const selected = [];
          json.data.forEach(it => {
            if (it.itemType === 'organ' && it.organType) map[it.organType] = it.count || 0;
            if (it.itemType === 'blood' && it.bloodType) { selected.push(it.bloodType); }
          });
          setInventory(map);
          setInitialInventory(map);
          setSaved((json.data || []).length > 0);
          setSelectedBlood(selected);
          setInitialSelectedBlood(selected);
        }
      } catch (err) {
        console.error('Failed to load inventory', err);
      }
    };
    loadInventory();
  }, []);

  const handleChangeCount = (organ, value) => {
    setInventory(prev => ({ ...prev, [organ]: Number(value) }));
  };

  const toggleBlood = (bg) => {
    setSelectedBlood(prev => {
      if (prev.includes(bg)) return prev.filter(x => x !== bg);
      return [...prev, bg];
    });
  }

  const saveInventory = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const organItems = organs.map(o => ({ organType: o, count: Number(inventory[o] || 0) }));
      // no per-blood counts UI — save selected blood groups with default count 0
      const bloodItems = selectedBlood.map(b => ({ bloodType: b, count: 0 }));
      const items = [...organItems, ...bloodItems];
      const resp = await fetch(`${API_BASE}/api/hospital/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items })
      });
      const text = await resp.text();
      let json = {};
      try { json = text ? JSON.parse(text) : {}; } catch (e) { console.warn('Invalid JSON from save:', text); }
      if (!resp.ok) throw new Error(json.message || resp.statusText || 'Failed to save');
      setEditing(false);
      setSaved(true);
      setInitialInventory({ ...inventory });
      setInitialSelectedBlood([...selectedBlood]);
    } catch (err) {
      console.error('Failed to save inventory', err);
      alert(err?.message || 'Failed to save inventory');
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Organ Requests */}
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {organs.map(org => (
                      <div key={org} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                        <div>
                          <h4 className="font-medium">{org}</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <input disabled={!editing} type="number" min={0} value={inventory[org] ?? 0} onChange={(e) => handleChangeCount(org, e.target.value)} className="w-24 px-2 py-1 border rounded bg-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-1 p-2 bg-muted/20 rounded-md md:row-start-4">
                  <h4 className="font-medium mb-2">BLOOD</h4>
                  <div className="flex gap-4 items-start">
                    {/* If saved and not editing, hide the selectable list and show only chips */}
                    {saved && !editing ? (
                      <div className="w-full">
                        <div className="flex flex-wrap gap-2">
                          {selectedBlood.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No blood groups selected</p>
                          ) : selectedBlood.map(bg => (
                            <div key={bg} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600 text-white">
                              <span className="text-sm">{bg}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 max-h-28 w-56 overflow-auto border rounded bg-white">
                          {bloodGroupsList.map(bg => (
                            <button key={bg} type="button" disabled={!editing} onClick={() => toggleBlood(bg)} className={`w-full text-left px-3 py-2 ${selectedBlood.includes(bg) ? 'bg-red-600 text-white' : ''}`}>
                              {bg}
                            </button>
                          ))}
                        </div>
                        <div className="min-w-[72px]">
                          <div className="flex flex-col gap-2">
                            {selectedBlood.length === 0 ? (
                              <p className="text-sm text-muted-foreground">None</p>
                            ) : selectedBlood.map(bg => (
                              <div key={bg} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600 text-white">
                                <span className="text-sm">{bg}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map(activity => (
                <div key={activity.id} className="flex items-center gap-3">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    activity.type === 'success' ? 'bg-success' :
                    activity.type === 'warning' ? 'bg-warning' :
                    activity.type === 'error' ? 'bg-destructive' :
                    'bg-primary'
                  )} />
                  <div className="flex-1">
                    <p className="text-sm">{activity.action}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(activity.time, { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
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