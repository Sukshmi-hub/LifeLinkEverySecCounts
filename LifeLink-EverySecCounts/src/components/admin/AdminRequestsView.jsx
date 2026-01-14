import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Search, FileText, Eye } from 'lucide-react';

/* ---------------- MOCK DATA (INDIAN CONTEXT) ---------------- */

const mockRequests = [
  {
    id: 'REQ001',
    type: 'organ',
    patientName: 'Amit Sharma',
    description: 'Kidney Transplant',
    status: 'pending',
    createdAt: '2024-03-15',
    hospitalName: 'City Care Hospital',
  },
  {
    id: 'REQ002',
    type: 'fund',
    patientName: 'Neha Gupta',
    description: 'Surgery Funding ₹80,000',
    status: 'approved',
    createdAt: '2024-03-14',
    hospitalName: 'Metro Life Hospital',
  },
  {
    id: 'REQ003',
    type: 'organ',
    patientName: 'Rohit Verma',
    description: 'Liver Transplant',
    status: 'completed',
    createdAt: '2024-03-12',
    hospitalName: 'Apollo Care Centre',
  },
  {
    id: 'REQ004',
    type: 'fund',
    patientName: 'Sunita Singh',
    description: 'Treatment Funding ₹50,000',
    status: 'pending',
    createdAt: '2024-03-11',
    hospitalName: 'City Care Hospital',
  },
  {
    id: 'REQ005',
    type: 'organ',
    patientName: 'Ankit Mishra',
    description: 'Heart Valve Surgery',
    status: 'rejected',
    createdAt: '2024-03-10',
    hospitalName: 'Metro Life Hospital',
  },
];

const AdminRequestsView = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const filteredRequests = mockRequests.filter(req => {
    const matchesSearch =
      req.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    const matchesType = typeFilter === 'all' || req.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Approved</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Completed</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTypeBadge = (type) => {
    return type === 'organ' 
      ? <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">Organ</Badge>
      : <Badge className="bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">Fund</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          System Requests
        </CardTitle>
        <CardDescription>
          Read-only view of all requests in the system. Admin cannot approve, reject, or modify requests.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ID or patient..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="organ">Organ</SelectItem>
              <SelectItem value="fund">Fund</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Read-only notice */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
          <Eye className="h-4 w-4 text-blue-600" />
          <p className="text-sm text-blue-700 dark:text-blue-400">
            This is a read-only view. Request management is handled by Hospitals and NGOs.
          </p>
        </div>

        {/* Requests Table */}
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Request ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Hospital</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-mono text-sm">{req.id}</TableCell>
                  <TableCell>{getTypeBadge(req.type)}</TableCell>
                  <TableCell className="font-medium">{req.patientName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{req.description}</TableCell>
                  <TableCell className="text-sm">{req.hospitalName}</TableCell>
                  <TableCell>{getStatusBadge(req.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{req.createdAt}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <p className="text-sm text-muted-foreground text-center">
          Showing {filteredRequests.length} of {mockRequests.length} requests
        </p>
      </CardContent>
    </Card>
  );
};

export default AdminRequestsView;
