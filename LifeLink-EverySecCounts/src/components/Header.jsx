import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, getRoleBasedRedirect } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import {
  Menu,
  X,
  User,
  LogOut,
  Bell,
  Settings,
  Home,
  Info,
  Award,
  LogIn,
  Check,
  Lock,
  BellRing,
} from 'lucide-react';
import { useChat } from '@/context/ChatContext';
import LifeLinkLogo from '@/components/LifeLinkLogo';

const Header = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { getUnreadCount } = useChat();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Notification state
  const [notifications, setNotifications] = useState([
    { id: '1', message: 'New donor registered', time: '2 mins ago', read: false },
    { id: '2', message: 'New patient request received', time: '10 mins ago', read: false },
    { id: '3', message: 'Hospital verification pending', time: '1 hour ago', read: false },
  ]);

  // Settings state
  const [notificationPrefs, setNotificationPrefs] = useState({
    email: true,
    push: true,
    sms: false,
  });

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const unreadCount = user ? getUnreadCount(user.id) : 0;
  const unreadNotifications = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const markAsRead = (id) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const publicLinks = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/about', label: 'About', icon: Info },
    { to: '/tribute', label: 'Tribute Wall', icon: Award },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="transition-opacity hover:opacity-80">
          <LifeLinkLogo size="sm" showSubtext={true} />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {publicLinks.map(link => (
            <Link key={link.to} to={link.to}>
              <Button
                variant={isActive(link.to) ? 'soft' : 'ghost'}
                size="sm"
                className="gap-2"
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Button>
            </Link>
          ))}
        </nav>

        {/* Right Side Actions */}
        <div className="flex items-center gap-2">
          {isAuthenticated && user ? (
            <>
              {/* Notifications Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {(unreadCount + unreadNotifications) > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {(unreadCount + unreadNotifications) > 9 ? '9+' : (unreadCount + unreadNotifications)}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 bg-background border border-border shadow-lg">
                  <DropdownMenuLabel className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <BellRing className="h-4 w-4" />
                      Notifications
                    </span>
                    {unreadNotifications > 0 && (
                      <Button variant="ghost" size="sm" className="h-auto py-1 px-2 text-xs" onClick={markAllAsRead}>
                        Mark all read
                      </Button>
                    )}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      No notifications
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.map((notification) => (
                        <DropdownMenuItem 
                          key={notification.id} 
                          className={`flex items-start gap-3 p-3 cursor-pointer ${!notification.read ? 'bg-primary/5' : ''}`}
                          onClick={() => markAsRead(notification.id)}
                        >
                          <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${!notification.read ? 'bg-primary' : 'bg-transparent'}`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${!notification.read ? 'font-medium' : ''}`}>
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {notification.time}
                            </p>
                          </div>
                          {!notification.read && (
                            <Check className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          )}
                        </DropdownMenuItem>
                      ))}
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Settings Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Settings className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 bg-background border border-border shadow-lg">
                  <DropdownMenuLabel>Settings</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate(getRoleBasedRedirect(user.role))}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {}}>
                    <Lock className="mr-2 h-4 w-4" />
                    Change Password
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                    Notification Preferences
                  </DropdownMenuLabel>
                  <div className="px-2 py-2 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Email Notifications</span>
                      <Switch 
                        checked={notificationPrefs.email}
                        onCheckedChange={(checked) => setNotificationPrefs({ ...notificationPrefs, email: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Push Notifications</span>
                      <Switch 
                        checked={notificationPrefs.push}
                        onCheckedChange={(checked) => setNotificationPrefs({ ...notificationPrefs, push: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">SMS Notifications</span>
                      <Switch 
                        checked={notificationPrefs.sms}
                        onCheckedChange={(checked) => setNotificationPrefs({ ...notificationPrefs, sms: checked })}
                      />
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 px-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <span className="hidden sm:inline text-sm font-medium">{user.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-background border border-border shadow-lg">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="font-semibold">{user.name}</span>
                      <span className="text-xs text-muted-foreground capitalize">{user.role}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate(getRoleBasedRedirect(user.role))}>
                    <Home className="mr-2 h-4 w-4" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Link to="/login">
              <Button variant="default" className="gap-2">
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Sign In</span>
              </Button>
            </Link>
          )}

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background animate-fade-in">
          <nav className="container py-4 flex flex-col gap-2">
            {publicLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Button
                  variant={isActive(link.to) ? 'soft' : 'ghost'}
                  className="w-full justify-start gap-3"
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Button>
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;