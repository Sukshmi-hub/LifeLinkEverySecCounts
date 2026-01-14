import React, { useState } from 'react';
import { getPublishedTributes } from '@/data/tributes'; // Updated to use your data source
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Award, 
  CheckCircle, 
  XCircle, 
  Flag,
  MessageSquare,
  User,
  Heart,
  CalendarDays,
  MapPin,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

const AdminTributes = () => {
  // Initializing with the same data source as your TributeWall
  const [tributes, setTributes] = useState(getPublishedTributes());

  const handleApprove = (tributeId) => {
    setTributes(prev => prev.map(tribute =>
      tribute.id === tributeId ? { ...tribute, status: 'published' } : tribute
    ));
    toast.success('Tribute approved and published to the wall');
  };

  const handleReject = (tributeId) => {
    setTributes(prev => prev.map(tribute =>
      tribute.id === tributeId ? { ...tribute, status: 'rejected' } : tribute
    ));
    toast.info('Tribute rejected');
  };

  const handleRemove = (tributeId) => {
    setTributes(prev => prev.filter(tribute => tribute.id !== tributeId));
    toast.success('Tribute removed from database');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-700">Pending</Badge>;
      case 'published':
      case 'approved':
        return <Badge className="bg-green-100 text-green-700">Live on Wall</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Separating for moderation workflow
  const pendingTributes = tributes.filter(t => t.status === 'pending');
  const liveTributes = tributes.filter(t => t.status === 'published' || t.status === 'approved');

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Tribute Moderation</h1>
        <p className="text-muted-foreground text-sm">Review submissions before they appear on the public Hero Wall.</p>
      </div>

      {/* Moderation Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Pending Submissions ({pendingTributes.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingTributes.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">No pending tributes to review</p>
            </div>
          ) : (
            pendingTributes.map((t) => (
              <div key={t.id} className="p-4 rounded-xl border bg-card flex flex-col md:flex-row gap-6">
                {/* Visual Preview */}
                <div className="w-24 h-24 shrink-0">
                  {t.photo ? (
                    <img src={t.photo} alt="Donor" className="w-full h-full rounded-lg object-cover" />
                  ) : (
                    <div className="w-full h-full rounded-lg bg-primary/10 flex items-center justify-center">
                      <Heart className="text-primary/40" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-lg">{t.donorName}</h4>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {t.donorLocation}</span>
                        <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {t.donationDate}</span>
                      </div>
                    </div>
                    {getStatusBadge(t.status)}
                  </div>

                  <div className="bg-muted/50 p-3 rounded-md italic text-sm text-muted-foreground">
                    <MessageSquare className="h-3 w-3 mb-1" />
                    "{t.familyMessage}"
                    <p className="mt-2 text-xs font-semibold not-italic">— {t.familyName}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex md:flex-col gap-2 justify-center shrink-0">
                  <Button size="sm" onClick={() => handleApprove(t.id)} className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="h-4 w-4 mr-2" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleReject(t.id)} className="text-red-600">
                    <XCircle className="h-4 w-4 mr-2" /> Reject
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Published Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Live Tributes</CardTitle>
          <CardDescription>Currently visible to the public</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {liveTributes.map(t => (
              <div key={t.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-4">
                  <Heart className="h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium">{t.donorName}</p>
                    <p className="text-xs text-muted-foreground">Impacted {t.livesImpacted} lives</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-green-600 border-green-200">Public</Badge>
                  <Button variant="ghost" size="icon" onClick={() => handleRemove(t.id)} className="text-muted-foreground hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminTributes;