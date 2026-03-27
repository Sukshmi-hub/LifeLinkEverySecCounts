import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useDonor } from '@/context/DonorContext';
import { useDots } from '@/context/DotsContext';
import LifeLinkLogo from '@/components/LifeLinkLogo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MessageCircle, User, LogOut, Menu, X, Award, AlertTriangle } from 'lucide-react';

const DonorSidebar = ({ isOpen, onToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { donationIntents } = useDonor() || { donationIntents: [] };
  const { dots, clearDot } = useDots();

  const hasCompletedDonation = (donationIntents || []).some(i => i.status === 'Completed');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavClick = (dotName) => {
    if (dotName && dots[dotName]) {
      clearDot(dotName);
    }
  };

  const navItems = [
    { path: '/donor/messages', icon: MessageCircle, label: 'Messages', dotName: 'messages' },
    { path: '/donor/profile', icon: User, label: 'Profile', dotName: null },
  ];

  if (hasCompletedDonation) {
    navItems.push({ path: '/donor/certificate', icon: Award, label: 'Certificate', dotName: null });
  }

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={onToggle}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-card border border-border shadow-lg"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-30" onClick={onToggle} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full w-64 bg-card border-r border-border z-40 transition-transform duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b border-border">
            <LifeLinkLogo />
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => {
                    onToggle();
                    handleNavClick(item.dotName);
                  }}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
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

          {/* Logout */}
          <div className="p-4 border-t border-border">
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
