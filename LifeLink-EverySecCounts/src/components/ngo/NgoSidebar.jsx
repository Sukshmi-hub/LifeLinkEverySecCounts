import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useDots } from '@/context/DotsContext';
import { Button } from '@/components/ui/button';
import LifeLinkLogo from '@/components/LifeLinkLogo';
import { 
  LayoutDashboard, 
  FileText, 
  MessageCircle, 
  User, 
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NgoSidebar = ({ activeTab, setActiveTab }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { dots, clearDot } = useDots();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, dotName: null },
    { id: 'requests', label: 'Fund Requests', icon: FileText, dotName: 'requests' },
    { id: 'messages', label: 'Messages', icon: MessageCircle, dotName: 'messages' },
    { id: 'profile', label: 'Profile', icon: User, dotName: null },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSetTab = (id, dotName) => {
    setActiveTab(id);
    if (dotName && dots[dotName]) {
      clearDot(dotName);
    }
  };

  return (
    <aside className="w-64 min-h-screen bg-card border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <LifeLinkLogo size="md" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-1">
          {menuItems.map((item) => (
            <Button
              key={item.id}
              variant={activeTab === item.id ? 'secondary' : 'ghost'}
              className={cn(
                "w-full justify-start gap-3 h-11 relative",
                activeTab === item.id && "bg-primary/10 text-primary font-medium"
              )}
              onClick={() => handleSetTab(item.id, item.dotName)}
            >
              <item.icon className="w-5 h-5" />
              <span className="flex-1">{item.label}</span>
              {/* Dot indicator */}
              {item.dotName && dots[item.dotName] && (
                <span className={cn(
                  "w-2.5 h-2.5 rounded-full",
                  activeTab === item.id 
                    ? "bg-primary"  // Dot color matches text on active button
                    : "bg-red-500"  // Red dot on inactive button
                )} />
              )}
            </Button>
          ))}
        </div>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5" />
          Logout
        </Button>
      </div>
    </aside>
  );
};

export default NgoSidebar;