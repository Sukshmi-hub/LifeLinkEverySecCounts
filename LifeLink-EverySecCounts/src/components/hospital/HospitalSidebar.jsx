import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  AlertTriangle, 
  MessageCircle, 
  Bell, 
  User, 
  LogOut 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import LifeLinkLogo from '@/components/LifeLinkLogo';

const HospitalSidebar = ({ activeTab, setActiveTab, hasRedAlerts }) => {
  const { logout } = useAuth();
  const { getUnreadCount } = useNotifications();
  const navigate = useNavigate();
  const unreadCount = getUnreadCount('hospital');

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'requests', label: 'Manage Requests', icon: FileText },
    { id: 'red-alerts', label: 'Red Alerts', icon: AlertTriangle, hasAlert: hasRedAlerts },
    { id: 'messages', label: 'Messages', icon: MessageCircle },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
    { id: 'profile', label: 'Profile', icon: User },
  ];

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
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200",
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
              {item.hasAlert && hasRedAlerts && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full animate-ping" />
              )}
            </div>
            <span className="flex-1">{item.label}</span>
            {item.badge && item.badge > 0 && (
              <span className="bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full">
                {item.badge}
              </span>
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