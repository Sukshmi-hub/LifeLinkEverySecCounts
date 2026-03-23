import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useDots } from '@/context/DotsContext';
import { 
  FileText, 
  CreditCard, 
  HandHeart, 
  User, 
  LogOut,
  MessageCircle,
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import LifeLinkLogo from '@/components/LifeLinkLogo';

const menuItems = [
  { icon: FileText, label: 'Request', path: '/patient/request', dotName: 'requests' },
  { icon: MessageCircle, label: 'Messages', path: '/patient/messages', dotName: 'messages' },
  { icon: CreditCard, label: 'Payments', path: '/patient/payment', dotName: 'payments' },
  { icon: HandHeart, label: 'Request Funds', path: '/patient/request-funds', dotName: null },
  { icon: User, label: 'Profile', path: '/patient/profile', dotName: null },
];

const PatientSidebar = ({ isOpen, onToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { dots, clearDot } = useDots();

  const handleLogout = async () => {
    try {
      await logout(); 
      navigate('/login'); 
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleNavClick = (dotName) => {
    onToggle();
    if (dotName && dots[dotName]) {
      clearDot(dotName);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full bg-card border-r border-border z-50 transition-transform duration-300 ease-in-out",
          "w-64 lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <Link to="/patient/dashboard">
            <LifeLinkLogo size="sm" showSubtext={true} />
          </Link>
          <Button variant="ghost" size="icon" onClick={onToggle} className="lg:hidden">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Navigation - Only Patient Actions */}
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 relative",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                onClick={() => handleNavClick(item.dotName)}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
                {/* Dot indicator */}
                {item.dotName && dots[item.dotName] && (
                  <span className={cn(
                    "w-2.5 h-2.5 rounded-full absolute right-3",
                    isActive 
                      ? "bg-white"  // White dot on primary (dark) button
                      : "bg-red-500"  // Red dot on light button
                  )} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section - Logout Only (No Sign In) */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </Button>
        </div>
      </aside>

      {/* Mobile toggle button */}
      <Button
        variant="outline"
        size="icon"
        className="fixed top-4 left-4 z-30 lg:hidden"
        onClick={onToggle}
      >
        <Menu className="w-5 h-5" />
      </Button>
    </>
  );
};

export default PatientSidebar;