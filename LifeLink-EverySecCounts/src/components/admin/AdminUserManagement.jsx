import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Search, 
  MoreVertical, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Flag,
  User as UserIcon,
  Loader2,
  Eye,
  Ban,
  AlertOctagon
} from 'lucide-react';
import { toast } from 'sonner';
import { serverUrl } from '@/lib/serverConfig';
import ReportsModal from './ReportsModal';

const AdminUserManagement = () => {
  const [userList, setUserList] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedUserForReports, setSelectedUserForReports] = useState(null);
  const [reportsModalOpen, setReportsModalOpen] = useState(false);

  // Fetch users from API on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Filter users when search term, role filter, or status filter changes
  useEffect(() => {
    const filtered = userList.filter(user => {
      const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            user.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
    setFilteredUsers(filtered);
  }, [searchTerm, roleFilter, statusFilter, userList]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await fetch(`${serverUrl}/api/moderation/all-users-with-reports`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const result = await response.json();
      if (result.success) {
        setUserList(result.data);
      } else {
        setError(result.message || 'Failed to fetch users');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Failed to load users');
      toast.error('Failed to load users data');
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
          reason: `Status changed to ${newStatus} by admin`
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      const result = await response.json();
      if (result.success) {
        setUserList(prev => prev.map(user => 
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Active':
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Active</Badge>;
      case 'Suspended':
        return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Suspended</Badge>;
      case 'Blocked':
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Blocked</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
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

  const getFlaggedBadge = (isFlagged) => {
    if (isFlagged) {
      return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 flex items-center gap-1">
        <AlertOctagon className="h-3 w-3" />
        Flagged
      </Badge>;
    }
    return null;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            User Management & Moderation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="patient">Patient</SelectItem>
                <SelectItem value="donor">Donor</SelectItem>
                <SelectItem value="hospital">Hospital</SelectItem>
                <SelectItem value="ngo">NGO</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Suspended">Suspended</SelectItem>
                <SelectItem value="Blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading users...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
              <p className="text-destructive">Error: {error}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={fetchUsers}>
                Try Again
              </Button>
            </div>
          )}

          {/* Users Table */}
          {!loading && !error && (
            <>
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
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => (
                        <TableRow key={user._id} className={user.isFlagged ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                                <UserIcon className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{user.name}</p>
                                <p className="text-xs text-muted-foreground">{user.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getRoleBadge(user.role)}</TableCell>
                          <TableCell className="space-y-2">
                            <div>{getStatusBadge(user.status)}</div>
                            {getFlaggedBadge(user.isFlagged)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant={user.reportCount > 0 ? 'destructive' : 'secondary'}>
                                {user.reportCount} report{user.reportCount !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            {user.reportCount > 0 && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleViewReports(user)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Reports
                              </Button>
                            )}
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
                                  disabled={user.status === 'Active' || actionLoading === user._id}
                                >
                                  <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                  Activate
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleStatusChange(user._id, 'Suspended')}
                                  disabled={user.status === 'Suspended' || actionLoading === user._id}
                                >
                                  <AlertTriangle className="mr-2 h-4 w-4 text-amber-600" />
                                  Suspend
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleStatusChange(user._id, 'Blocked')}
                                  disabled={user.status === 'Blocked' || actionLoading === user._id}
                                >
                                  <Ban className="mr-2 h-4 w-4 text-red-600" />
                                  Block
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan="5" className="text-center py-8">
                          <p className="text-muted-foreground">No users found</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <p className="text-sm text-muted-foreground text-center">
                Showing {filteredUsers.length} of {userList.length} users
              </p>
            </>
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

export default AdminUserManagement;