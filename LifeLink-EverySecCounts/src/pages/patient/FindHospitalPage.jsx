import React, { useState } from 'react';
import PatientSidebar from '@/components/patient/PatientSidebar';
import { useNotifications } from '@/context/NotificationContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { hospitals } from '@/data/hospitals';
import { Search, Building2, MapPin, Bed, CheckCircle, Star } from 'lucide-react';
import { toast } from 'sonner';

const FindHospitalPage = () => {
  const { setSelectedHospital, addNotification } = useNotifications();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const filteredHospitals = hospitals.filter(h =>
    h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.state.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectHospital = (hospital) => {
    setSelectedHospital({ id: hospital.id, name: hospital.name });
    setSelectedId(hospital.id);

    // Notify hospital
    addNotification({
      type: 'info',
      title: 'New Patient Registration',
      message: `A new patient has registered under ${hospital.name}.`,
      targetRole: 'hospital',
    });

    toast.success('Hospital selected successfully.');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'operational':
        return 'bg-success/20 text-success';
      case 'high_demand':
        return 'bg-warning/20 text-warning';
      case 'emergency':
        return 'bg-destructive/20 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PatientSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      <main className="lg:ml-64 min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-card border-b border-border px-6 py-4">
          <div className="ml-12 lg:ml-0">
            <h1 className="text-2xl font-bold text-foreground">Find Hospital</h1>
            <p className="text-muted-foreground">Search and select a hospital for your treatment</p>
          </div>
        </header>

        <div className="p-6">
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search by hospital name or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12"
            />
          </div>

          {/* Results count */}
          <p className="text-muted-foreground mb-4">
            Showing {filteredHospitals.length} hospital{filteredHospitals.length !== 1 ? 's' : ''}
          </p>

          {/* Hospital Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredHospitals.map(hospital => (
              <Card 
                key={hospital.id} 
                className={`transition-all duration-200 hover:shadow-md ${
                  selectedId === hospital.id ? 'ring-2 ring-primary' : ''
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{hospital.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(hospital.status)}`}>
                          {hospital.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    {selectedId === hospital.id && (
                      <CheckCircle className="w-6 h-6 text-success" />
                    )}
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{hospital.city}, {hospital.state}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Bed className="w-4 h-4" />
                      <span>{hospital.emergencyCapacity - hospital.currentLoad} beds available</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Star className="w-4 h-4 text-warning" />
                      <span>{hospital.rating} rating • {hospital.totalTransplants} transplants</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-4">
                    {hospital.availableOrgans.slice(0, 3).map(organ => (
                      <span key={organ} className="text-xs bg-muted px-2 py-1 rounded">
                        {organ}
                      </span>
                    ))}
                    {hospital.availableOrgans.length > 3 && (
                      <span className="text-xs bg-muted px-2 py-1 rounded">
                        +{hospital.availableOrgans.length - 3} more
                      </span>
                    )}
                  </div>

                  <Button
                    onClick={() => handleSelectHospital(hospital)}
                    variant={selectedId === hospital.id ? 'secondary' : 'default'}
                    className="w-full"
                  >
                    {selectedId === hospital.id ? 'Selected' : 'Select Hospital'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredHospitals.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-foreground mb-2">No hospitals found</h3>
              <p className="text-muted-foreground">Try adjusting your search query.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default FindHospitalPage;