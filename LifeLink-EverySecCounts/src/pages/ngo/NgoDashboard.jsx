import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import NgoSidebar from '@/components/ngo/NgoSidebar';
import NgoStatCard from '@/components/ngo/NgoStatCard';
import NgoMessages from '@/components/ngo/NgoMessages';
import NgoProfile from '@/components/ngo/NgoProfile';
import FundRequestDetails from '@/components/ngo/FundRequestDetails';
import NgoHospitalChat from '@/components/ngo/NgoHospitalChat';
import { serverUrl } from '@/lib/serverConfig';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  Wallet,
  Eye,
  HandHeart,
  MessageCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

const isPaymentDone = (request) => Boolean(request?.paymentReceived) || String(request?.paymentStatus || '').toLowerCase() === 'success';

const getRequestBadgeMeta = (request) => {
  if (isPaymentDone(request)) {
    return { label: 'Payment Done', className: 'bg-success/20 text-success' };
  }

  const status = String(request?.status || '');
  if (status === 'VerifiedByHospital') {
    return { label: 'verifiedByHospital', className: 'bg-yellow-100 text-yellow-700' };
  }
  if (status === 'SentToHospital') {
    return { label: 'SentToHospital', className: 'bg-amber-100 text-amber-700' };
  }
  if (status === 'Approved') {
    return { label: 'Approved', className: 'bg-success/20 text-success' };
  }
  if (status === 'Rejected' || status === 'Dennied') {
    return { label: status, className: 'bg-destructive/20 text-destructive' };
  }
  return { label: status || 'Pending', className: 'bg-warning/20 text-warning-foreground' };
};

const NgoDashboard = () => {
  const { user } = useAuth();
  const { fundRequests, updateFundRequestStatus, loadNgoFundRequests } = useNotifications();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showHospitalChat, setShowHospitalChat] = useState(false);

  // Calculate stats
  const totalRequests = fundRequests.length;
  const paymentCompleted = (r) => isPaymentDone(r);
  const completedRequests = fundRequests.filter(paymentCompleted);
  const pendingRequests = fundRequests.filter(r => !paymentCompleted(r)).length;
  // Approved Supports: total number of donations done
  const approvedRequests = completedRequests.length;
  // Disbursed Amount: total amount distributed by NGO
  const disbursedAmount = completedRequests.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  const handleViewDetails = (request) => {
    // If the mapped request includes the original server response as `raw`, prefer that for detail view
    setSelectedRequest(request.raw || request);
    setShowDetails(true);
  };

  const handleMessageHospital = async (request) => {
    // Try to mark the request as sent to hospital so it appears in hospital payment section.
    // Do NOT open chat — the hospital will review the request in their dashboard.
    try {
      const id = request.id || request._id;
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      // include hospitalId so backend can attach the request to the correct hospital
      const payload = { hospitalId: request.hospitalId || request.hospital || request.raw?.hospitalId || null };
      // fallback to hospitalId from current hospital session (hospital portal) when available
      if (!payload.hospitalId) payload.hospitalId = localStorage.getItem('hospitalId') || null;
      const res = await fetch(`/api/requests/${id}/send-to-hospital`, { method: 'PUT', headers, body: JSON.stringify(payload) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        // surface server error body for debugging
        console.error('send-to-hospital response', res.status, json);
        throw new Error(json.message || 'Failed to send to hospital' || 'Server error');
      }
      // update local state
      updateFundRequestStatus(id, 'SentToHospital');
      setSelectedRequest({ ...(request || {}), status: 'SentToHospital' });
      setShowDetails(false);
    } catch (err) {
      console.error('Send to hospital failed', err);
      // on failure leave the modal open so NGO can retry or view details
      // (no chat fallback)
      return false;
    }
    return true;
  };

  useEffect(() => {
    if (user?.role === 'ngo' && user?.id && typeof loadNgoFundRequests === 'function') {
      loadNgoFundRequests(user.id)
    }
  }, [user?.id, user?.role])

  const renderDashboard = () => (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <NgoStatCard
          title="Total Fund Requests"
          subtitle="All patient funding requests received"
          value={totalRequests}
          icon={FileText}
          variant="primary"
        />
        <NgoStatCard
          title="Pending Approvals"
          subtitle="Payments not done"
          value={pendingRequests}
          icon={Clock}
          variant="warning"
        />
        <NgoStatCard
          title="Approved Supports"
          subtitle="Total donations done"
          value={approvedRequests}
          icon={CheckCircle}
          variant="success"
        />
        <NgoStatCard
          title="Disbursed Amount"
          subtitle="Total amount distributed"
          value={`₹${disbursedAmount.toLocaleString()}`}
          icon={Wallet}
          variant="info"
        />
      </div>

      {/* Fund Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Patient Fund Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {fundRequests.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No fund requests received yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {fundRequests.map((request) => {
                const badge = getRequestBadgeMeta(request);
                return (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold">{request.patientName}</h4>
                      <Badge className={cn("text-xs", badge.className)}>
                        {badge.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      ₹{request.amount.toLocaleString()} • {request.reason}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Submitted: {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => handleViewDetails(request)}
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </Button>
                </div>
              )})}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-primary"
            onClick={() => setActiveTab('requests')}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <HandHeart className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Financial Support</h3>
                  <p className="text-sm text-muted-foreground">Manage patient funding requests</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-success"
            onClick={() => setActiveTab('messages')}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-success" />
                </div>
                <div>
                  <h3 className="font-semibold">Messages</h3>
                  <p className="text-sm text-muted-foreground">Chat with hospitals and patients</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  const renderRequests = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Fund Requests Management</h2>
        <p className="text-muted-foreground">Review and process patient funding requests</p>
      </div>

      {fundRequests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No fund requests to process</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {fundRequests.map((request) => {
            const badge = getRequestBadgeMeta(request);
            return (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{request.patientName}</h3>
                      <Badge className={cn(badge.className)}>
                        {badge.label}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Amount Requested</p>
                        <p className="font-semibold text-primary">₹{request.amount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Submitted On</p>
                        <p className="font-medium">{new Date(request.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          className="gap-2"
                          onClick={() => handleViewDetails(request)}
                        >
                          <Eye className="w-4 h-4" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                </div>
              </CardContent>
            </Card>
          )})}
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'requests':
        return renderRequests();
      case 'messages':
        return <NgoMessages />;
      case 'profile':
        return <NgoProfile />;
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <NgoSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b border-border bg-card flex items-center px-6">
          <div>
            <h1 className="text-xl font-bold">{user?.name || 'NGO Dashboard'}</h1>
            <p className="text-sm text-muted-foreground">NGO Support Dashboard</p>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          {renderContent()}
        </main>
      </div>

      {showDetails && (
        <FundRequestDetails
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
          request={selectedRequest}
          onPaymentSuccess={() => {
            setSelectedRequest(prev => prev ? {
              ...prev,
              paymentSent: true,
              paymentReceived: true,
              paymentStatus: 'success',
              status: 'VerifiedByHospital',
            } : prev)
            if (user?.id) {
              loadNgoFundRequests(user.id)
            }
          }}
          onApprove={async (id) => {
          try {
            const token = localStorage.getItem('token')
            const headers = { 'Content-Type': 'application/json' }
            if (token) headers.Authorization = `Bearer ${token}`
            const res = await fetch(`${serverUrl}/api/requests/${id}/approve`, { method: 'PUT', headers })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || 'Failed to approve')
            updateFundRequestStatus(id, 'Approved')
            setShowDetails(false)
          } catch (err) {
            console.error('Approve from modal failed', err)
          }
        }}
        onReject={async (id) => {
          try {
            const token = localStorage.getItem('token')
            const headers = { 'Content-Type': 'application/json' }
            if (token) headers.Authorization = `Bearer ${token}`
            const res = await fetch(`${serverUrl}/api/requests/${id}/reject`, { method: 'PUT', headers, body: JSON.stringify({ rejectionReason: 'Rejected by NGO' }) })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || 'Failed to reject')
            updateFundRequestStatus(id, 'Rejected')
            setShowDetails(false)
          } catch (err) {
            console.error('Reject from modal failed', err)
          }
        }}
        onMessageHospital={handleMessageHospital}
      />
      )}

      {showHospitalChat && (
        <NgoHospitalChat
          isOpen={showHospitalChat}
          onClose={() => setShowHospitalChat(false)}
          request={selectedRequest}
        />
      )}
    </div>
  );
};

export default NgoDashboard;

