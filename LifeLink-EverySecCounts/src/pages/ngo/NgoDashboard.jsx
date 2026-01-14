import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import NgoSidebar from '@/components/ngo/NgoSidebar';
import NgoStatCard from '@/components/ngo/NgoStatCard';
import NgoMessages from '@/components/ngo/NgoMessages';
import NgoProfile from '@/components/ngo/NgoProfile';
import NgoSettings from '@/components/ngo/NgoSettings';
import FundRequestDetails from '@/components/ngo/FundRequestDetails';
import NgoHospitalChat from '@/components/ngo/NgoHospitalChat';
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

const NgoDashboard = () => {
  const { user } = useAuth();
  const { fundRequests, updateFundRequestStatus } = useNotifications();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showHospitalChat, setShowHospitalChat] = useState(false);

  // Calculate stats
  const totalRequests = fundRequests.length;
  const pendingRequests = fundRequests.filter(r => r.status === 'Pending').length;
  const approvedRequests = fundRequests.filter(r => r.status === 'Approved').length;
  const disbursedAmount = fundRequests.filter(r => r.status === 'Approved').reduce((sum, r) => sum + r.amount, 0);

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowDetails(true);
  };

  const handleMessageHospital = (request) => {
    setSelectedRequest(request);
    setShowDetails(false);
    setShowHospitalChat(true);
  };

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
          subtitle="Requests awaiting NGO decision"
          value={pendingRequests}
          icon={Clock}
          variant="warning"
        />
        <NgoStatCard
          title="Approved Supports"
          subtitle="Funds approved by NGO"
          value={approvedRequests}
          icon={CheckCircle}
          variant="success"
        />
        <NgoStatCard
          title="Disbursed Amount"
          subtitle="Total funds released"
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
              {fundRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold">{request.patientName}</h4>
                      <Badge
                        className={cn(
                          "text-xs",
                          request.status === 'Approved' ? 'bg-success/20 text-success' :
                          request.status === 'Rejected' ? 'bg-destructive/20 text-destructive' :
                          'bg-warning/20 text-warning-foreground'
                        )}
                      >
                        {request.status}
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
              ))}
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
          {fundRequests.map((request) => (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{request.patientName}</h3>
                      <Badge
                        className={cn(
                          request.status === 'Approved' ? 'bg-success/20 text-success' :
                          request.status === 'Rejected' ? 'bg-destructive/20 text-destructive' :
                          'bg-warning/20 text-warning-foreground'
                        )}
                      >
                        {request.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Amount Requested</p>
                        <p className="font-semibold text-primary">₹{request.amount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Reason</p>
                        <p className="font-medium">{request.reason}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Submitted On</p>
                        <p className="font-medium">{new Date(request.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Case ID</p>
                        <p className="font-medium">{request.id}</p>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-2 ml-4"
                    onClick={() => handleViewDetails(request)}
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
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
      case 'settings':
        return <NgoSettings />;
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

      <FundRequestDetails
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        request={selectedRequest}
        onApprove={(id) => updateFundRequestStatus(id, 'Approved')}
        onReject={(id) => updateFundRequestStatus(id, 'Rejected')}
        onMessageHospital={handleMessageHospital}
      />

      <NgoHospitalChat
        isOpen={showHospitalChat}
        onClose={() => setShowHospitalChat(false)}
        request={selectedRequest}
      />
    </div>
  );
};

export default NgoDashboard;