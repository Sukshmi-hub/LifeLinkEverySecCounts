import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useDonor } from '@/context/DonorContext';
import { useNotifications } from '@/context/NotificationContext';
import LifeLinkLogo from '@/components/LifeLinkLogo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Heart,
  Bell,
  MessageCircle,
  User,
  LogOut,
  Menu,
  X,
  Award,
  AlertTriangle, // Icon for Red Alert
} from 'lucide-react';

const DonorSidebar = ({ isOpen, onToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { donationIntents } = useDonor();
  const { getUnreadCount } = useNotifications();

  const unreadNotifications = getUnreadCount('donor');
  const hasCompletedDonation = donationIntents.some(i => i.status === 'Completed');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { 
      path: '/donor/dashboard', 
      icon: LayoutDashboard, 
      label: 'Dashboard',
      badge: null 
    },
    // --- ADDED RED ALERT HERE ---
    { 
      path: '/red-alert', 
      icon: AlertTriangle, 
      label: 'Red Alerts',
      badge: 'URGENT',
      isRedAlert: true 
    },
    { 
      path: '/donor/alerts', 
      icon: Bell, 
      label: 'Alerts',
      badge: unreadNotifications > 0 ? unreadNotifications : null 
    },
    { 
      path: '/donor/messages', 
      icon: MessageCircle, 
      label: 'Messages',
      badge: null 
    },
    { 
      path: '/donor/profile', 
      icon: User, 
      label: 'Profile',
      badge: null 
    },
  ];

  if (hasCompletedDonation) {
    navItems.push({
      path: '/donor/certificate',
      icon: Award,
      label: 'Certificate',
      badge: null,
    });
  }

  return (
    <>
      <button
        onClick={onToggle}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-card border border-border shadow-lg"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={onToggle}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 h-full w-64 bg-card border-r border-border z-40 transition-transform duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-border">
            <LifeLinkLogo />
          </div>

          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => onToggle()}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : item.isRedAlert 
                        ? "text-red-600 hover:bg-red-50" // Special style for Red Alert
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className={cn("h-5 w-5", item.isRedAlert && "animate-pulse")} />
                  <span className="font-medium">{item.label}</span>
                  
                  {item.badge && (
                    <span className={cn(
                      "absolute right-3 text-[10px] font-bold px-2 py-0.5 rounded-full",
                      item.isRedAlert 
                        ? "bg-red-600 text-white animate-bounce" 
                        : "bg-destructive text-destructive-foreground"
                    )}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-border space-y-3">
            <Link to="/donor/dashboard">
              <Button className="w-full gap-2 bg-destructive hover:bg-destructive/90">
                <Heart className="h-4 w-4" />
                Donate Now
              </Button>
            </Link>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              Logout
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default DonorSidebar;