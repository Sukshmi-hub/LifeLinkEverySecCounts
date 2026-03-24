import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  AlertOctagon,
  User as UserIcon,
  Loader2,
  MoreVertical,
  Eye,
  AlertTriangle,
  Ban,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { serverUrl } from '@/lib/serverConfig';
import ReportsModal from './ReportsModal';

const FlaggedUsers = () => {
  const [flaggedUsers, setFlaggedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedUserForReports, setSelectedUserForReports] = useState(null);
  const [reportsModalOpen, setReportsModalOpen] = useState(false);

  useEffect(() => {
    fetchFlaggedUsers();
  }, []);

  const fetchFlaggedUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await fetch(`${serverUrl}/api/moderation/flagged-users?limit=10`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch flagged users');
      }

      const result = await response.json();
      if (result.success) {
        setFlaggedUsers(result.data);
      } else {
        setError(result.message || 'Failed to fetch flagged users');
      }
    } catch (err) {
      console.error('Error fetching flagged users:', err);
      setError(err.message || 'Failed to load flagged users');
      toast.error('Failed to load flagged users');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (userId, newStatus) => {
    try {
      setActionLoading(userId);
      const token = localStorage.getItem('token');
      const response = await fetch(`${serverUrl}/api/moderation/user/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          status: newStatus,
          reason: `Status changed to ${newStatus} from Flagged Users view`
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      const result = await response.json();
      if (result.success) {
        setFlaggedUsers(prev => prev.map(user => 
          user._id === userId ? { ...user, status: newStatus } : user
        ));
        toast.success(`User status updated to ${newStatus}`);
      } else {
        toast.error(result.message || 'Failed to update status');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Failed to update user status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewReports = (user) => {
    setSelectedUserForReports(user);
    setReportsModalOpen(true);
  };

  const getRoleBadge = (role) => {
    const styles = {
      patient: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      donor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      hospital: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
      ngo: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      admin: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
    };
    return <Badge className={styles[role] || 'bg-gray-100'}>{role}</Badge>;
  };

  const getStatusBadge = (status) => {
    const s = String(status || '').toLowerCase();
    switch (s) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Active</Badge>;
      case 'suspended':
        return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Suspended</Badge>;
      case 'blocked':
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Blocked</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <>
      <Card className="border-l-4 border-l-red-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertOctagon className="h-5 w-5 text-red-600" />
            Flagged Users (Report Count ≥ 3)
            {!loading && flaggedUsers.length > 0 && (
              <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                {flaggedUsers.length}
              </Badge>
            )}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Users with 3 or more reports requiring immediate attention
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
              <p className="text-destructive">{error}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={fetchFlaggedUsers}>
                Try Again
              </Button>
            </div>
          ) : flaggedUsers.length > 0 ? (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reports</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flaggedUsers.map((user) => (
                    <TableRow key={user._id} className="bg-red-50 dark:bg-red-950/20">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-red-100 flex items-center justify-center">
                            <UserIcon className="h-4 w-4 text-red-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell>
                        <Badge variant="destructive" className="cursor-pointer hover:opacity-80">
                          {user.reportCount} report{user.reportCount !== 1 ? 's' : ''}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewReports(user)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Reports
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              disabled={actionLoading === user._id}
                            >
                              {actionLoading === user._id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreVertical className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => handleStatusChange(user._id, 'Active')}
                              disabled={String(user.status || '').toLowerCase() === 'active' || actionLoading === user._id}
                            >
                              <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                              Activate
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleStatusChange(user._id, 'Suspended')}
                              disabled={String(user.status || '').toLowerCase() === 'suspended' || actionLoading === user._id}
                            >
                              <AlertTriangle className="mr-2 h-4 w-4 text-amber-600" />
                              Suspend
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleStatusChange(user._id, 'Blocked')}
                              disabled={String(user.status || '').toLowerCase() === 'blocked' || actionLoading === user._id}
                            >
                              <Ban className="mr-2 h-4 w-4 text-red-600" />
                              Block
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <AlertOctagon className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground mb-2">No flagged users</p>
              <p className="text-sm text-muted-foreground">All users have fewer than 3 reports</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reports Modal */}
      {selectedUserForReports && (
        <ReportsModal 
          isOpen={reportsModalOpen}
          onClose={() => {
            setReportsModalOpen(false);
            setSelectedUserForReports(null);
          }}
          user={selectedUserForReports}
        />
      )}
    </>
  );
};

export default FlaggedUsers;
