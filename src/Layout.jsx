import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  LayoutDashboard, 
  Kanban, 
  Users, 
  Calendar,
  Settings,
  Menu,
  X,
  LogOut,
  User,
  CheckSquare,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import ClinicOnboarding from './components/crm/ClinicOnboarding';
import TrialBanner from './components/crm/TrialBanner';
import TrialExpiredWall from './components/crm/TrialExpiredWall';
import NuevoCobroModal from './components/crm/NuevoCobroModal';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const navigation = [
  { name: 'Dashboard', href: 'Dashboard', icon: LayoutDashboard },
  { name: 'Pipeline', href: 'Pipeline', icon: Kanban },
  { name: 'Pacientes', href: 'Patients', icon: Users },
  { name: 'Tareas', href: 'Tasks', icon: CheckSquare },
  { name: 'Calendario', href: 'Calendar', icon: Calendar },
  { name: 'Configuración', href: 'Settings', icon: Settings },
];

function ClinicGate({ currentUser, children }) {
  const clinicId = currentUser?.clinic_id;

  const { data: clinic } = useQuery({
    queryKey: ['clinic', clinicId],
    queryFn: async () => {
      if (!clinicId) return null;
      const clinics = await base44.entities.Clinic.filter({ id: clinicId });
      return clinics[0] || null;
    },
    enabled: !!clinicId,
    staleTime: 60_000,
  });

  if (!clinic) return children;

  const isActiveSubscription = clinic.subscription_status === 'active';
  const isTrialing = clinic.subscription_status === 'trialing';
  const trialEnd = clinic.trial_end_date ? new Date(clinic.trial_end_date) : null;
  const trialExpired = isTrialing && trialEnd && new Date() > trialEnd;

  // Trial expired & not active → show paywall
  if (trialExpired && !isActiveSubscription) {
    return <TrialExpiredWall currentUser={currentUser} />;
  }

  return (
    <>
      {isTrialing && trialEnd && !trialExpired && (
        <TrialBanner trialEndDate={trialEnd} />
      )}
      {children}
    </>
  );
}

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showCobroModal, setShowCobroModal] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar_collapsed') === 'true'; } catch { return false; }
  });

  const toggleDesktopSidebar = () => {
    setDesktopCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem('sidebar_collapsed', String(next)); } catch {}
      return next;
    });
  };

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400;500;600;700;800;900&family=Montserrat:wght@200;400;600&display=swap');
        body, * { font-family: 'Inter', sans-serif; }
        body, p, span, div, td, li, label, input, textarea, select { font-weight: 200; }
      `}</style>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 lg:hidden
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699c7eaa852fc152542c4acf/d41c2c0f7_logodentalflow.png"
              alt="Dental Flow"
              className="w-8 h-8 rounded-lg object-cover"
            />
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 200 }} className="text-gray-900">Dental Flow</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        <nav className="p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = currentPageName === item.href;
            return (
              <Link
                key={item.name}
                to={createPageUrl(item.href)}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${isActive 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
          <button
            onClick={() => { setSidebarOpen(false); setShowCobroModal(true); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 transition-colors mt-2"
          >
            <span>💰</span>
            Nuevo Cobro
          </button>
        </nav>
      </div>

      {/* Desktop sidebar */}
      <div
        className={`hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col transition-all duration-300 ${desktopCollapsed ? 'lg:w-16' : 'lg:w-64'}`}
        style={{ zIndex: 20 }}
      >
        <div className="flex flex-col flex-1 bg-white border-r border-gray-200 overflow-hidden">
          {/* Logo + toggle */}
          <div className={`flex items-center border-b transition-all duration-300 ${desktopCollapsed ? 'justify-center px-3 py-5' : 'gap-3 px-4 py-5 justify-between'}`}>
            {!desktopCollapsed && (
              <div className="flex items-center gap-3 min-w-0">
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699c7eaa852fc152542c4acf/d41c2c0f7_logodentalflow.png"
                  alt="Dental Flow"
                  className="w-9 h-9 rounded-xl object-cover flex-shrink-0"
                />
                <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 200, fontSize: '1.05rem', letterSpacing: '0.01em' }} className="text-gray-900 truncate">
                  Dental Flow
                </span>
              </div>
            )}
            {desktopCollapsed && (
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699c7eaa852fc152542c4acf/d41c2c0f7_logodentalflow.png"
                alt="Dental Flow"
                className="w-8 h-8 rounded-lg object-cover"
              />
            )}
            <button
              onClick={toggleDesktopSidebar}
              className={`flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors ${desktopCollapsed ? 'mt-3' : ''}`}
              title={desktopCollapsed ? 'Expandir menú' : 'Colapsar menú'}
            >
              {desktopCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-2 space-y-1">
            {navigation.map((item) => {
              const isActive = currentPageName === item.href;
              return (
                <Link
                  key={item.name}
                  to={createPageUrl(item.href)}
                  title={desktopCollapsed ? item.name : ''}
                  className={`
                    flex items-center rounded-lg text-sm font-medium transition-all
                    ${desktopCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'}
                    ${isActive 
                      ? 'bg-blue-50 text-blue-700 shadow-sm' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-blue-600' : ''}`} />
                  {!desktopCollapsed && <span className="truncate">{item.name}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Nuevo Cobro */}
          <div className="px-2 pb-2">
            <button
              onClick={() => setShowCobroModal(true)}
              className={`w-full flex items-center rounded-lg text-sm font-medium transition-all bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 ${desktopCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'}`}
              title={desktopCollapsed ? 'Nuevo Cobro' : ''}
            >
              <span className="flex-shrink-0">💰</span>
              {!desktopCollapsed && <span className="truncate">Nuevo Cobro</span>}
            </button>
          </div>

          {/* User section */}
          <div className="p-2 border-t">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`w-full flex items-center rounded-lg hover:bg-gray-50 transition-colors ${desktopCollapsed ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-2.5'}`}
                  title={desktopCollapsed ? (currentUser?.full_name || 'Usuario') : ''}
                >
                  <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-gray-500" />
                  </div>
                  {!desktopCollapsed && (
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {currentUser?.full_name || 'Usuario'}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {currentUser?.role || 'usuario'}
                      </p>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{currentUser?.full_name}</p>
                  <p className="text-xs text-gray-500">{currentUser?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`transition-all duration-300 ${desktopCollapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
        {/* Mobile header */}
        <div className="sticky top-0 z-30 lg:hidden bg-white border-b shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699c7eaa852fc152542c4acf/d41c2c0f7_logodentalflow.png"
                alt="Dental Flow"
                className="w-8 h-8 rounded-lg object-cover"
              />
              <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 200 }} className="text-gray-900">Dental Flow</span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <User className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{currentUser?.full_name}</p>
                  <p className="text-xs text-gray-500">{currentUser?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Page content */}
        <main>
          {currentUser && !currentUser.clinic_id ? (
            <ClinicOnboarding currentUser={currentUser} />
          ) : (
            <ClinicGate currentUser={currentUser}>
              {children}
            </ClinicGate>
          )}
        </main>
      </div>
      <NuevoCobroModal isOpen={showCobroModal} onClose={() => setShowCobroModal(false)} />
    </div>
  );
}