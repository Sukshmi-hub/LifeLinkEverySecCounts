import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, X, User } from 'lucide-react';
import { toast } from 'sonner';
import { serverUrl } from '@/lib/serverConfig';

const ReportsModal = ({ isOpen, onClose, user }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && user) {
      fetchReports();
    }
  }, [isOpen, user]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await fetch(`${serverUrl}/api/moderation/reports/${user._id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch reports');
      }

      const result = await response.json();
      if (result.success) {
        setReports(result.data.reports || []);
      } else {
        setError(result.message || 'Failed to fetch reports');
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError(err.message || 'Failed to load reports');
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'under_review':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'resolved':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'dismissed':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Reports for {user?.name}</span>
            <Badge variant="secondary">{reports.length} reports</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* User Info Card */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">{user?.name}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Role</p>
                <Badge className="mt-1">{user?.role}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reports List */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
              <p className="text-destructive">{error}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={fetchReports}>
                Try Again
              </Button>
            </div>
          ) : reports.length > 0 ? (
            reports.map((report, index) => (
              <Card key={report._id} className="border-l-4 border-l-orange-500">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base">{report.reason}</CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={getStatusBadgeColor(report.status)}>
                          {report.status?.replace('_', ' ')}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(report.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Reporter Info */}
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Reported by</p>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{report.reported_by_user_id?.name}</p>
                        <p className="text-xs text-muted-foreground">{report.reported_by_user_id?.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {report.description && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Description</p>
                      <p className="text-sm bg-muted/50 rounded-lg p-3 whitespace-pre-wrap">
                        {report.description}
                      </p>
                    </div>
                  )}

                  {/* Admin Notes */}
                  {report.admin_notes && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Admin Notes</p>
                      <p className="text-sm bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 whitespace-pre-wrap">
                        {report.admin_notes}
                      </p>
                    </div>
                  )}

                  {/* Evidence */}
                  {report.evidence && report.evidence.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Evidence ({report.evidence.length})</p>
                      <div className="space-y-1">
                        {report.evidence.map((item, i) => (
                          <a 
                            key={i}
                            href={item} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline block truncate max-w-xs"
                            title={item}
                          >
                            {new URL(item, 'http://example.com').pathname || item}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No reports found for this user</p>
            </div>
          )}
        </div>

        <DialogClose asChild>
          <Button variant="outline" className="w-full">
            Close
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
};

export default ReportsModal;
