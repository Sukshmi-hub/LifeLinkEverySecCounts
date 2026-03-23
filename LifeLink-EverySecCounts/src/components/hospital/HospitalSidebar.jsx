import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  AlertTriangle, 
  MessageCircle, 
  CreditCard,
  User, 
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useDots } from '@/context/DotsContext';
import LifeLinkLogo from '@/components/LifeLinkLogo';

const HospitalSidebar = ({ activeTab, setActiveTab, hasRedAlerts }) => {
  const { logout } = useAuth();
  const { dots, clearDot } = useDots();
  const navigate = useNavigate();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, dot: null },
    { id: 'payments', label: 'Payments', icon: CreditCard, dot: 'payments' },
    { id: 'requests', label: 'Manage Requests', icon: FileText, dot: 'requests' },
    { id: 'red-alerts', label: 'Red Alerts', icon: AlertTriangle, dot: 'alerts' },
    { id: 'messages', label: 'Messages', icon: MessageCircle, dot: 'messages' },
    { id: 'profile', label: 'Profile', icon: User, dot: null },
  ];

  const handleMenuClick = (item) => {
    setActiveTab(item.id);
    // Clear dot when user clicks the button
    if (item.dot && dots[item.dot]) {
      clearDot(item.dot);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-card border-r border-border min-h-screen p-4">
      <div className="mb-8">
        <LifeLinkLogo size="md" showSubtext={true} />
        <p className="text-xs text-muted-foreground mt-1 ml-13">Hospital Portal</p>
      </div>

      <nav className="space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleMenuClick(item)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 relative",
              activeTab === item.id
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            <div className="relative">
              <item.icon className={cn(
                "w-5 h-5",
                item.id === 'red-alerts' && hasRedAlerts && "text-destructive animate-pulse"
              )} />
            </div>
            <span className="flex-1">{item.label}</span>
            {/* Dot indicator */}
            {item.dot && dots[item.dot] && (
              <span className={cn(
                "w-2.5 h-2.5 rounded-full",
                activeTab === item.id 
                  ? "bg-white"  // White dot on primary (dark) button
                  : "bg-red-500"  // Red dot on light button
              )} />
            )}
          </button>
        ))}

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-destructive hover:bg-destructive/10 transition-all duration-200 mt-4"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </nav>
    </aside>
  );
};

export default HospitalSidebar;