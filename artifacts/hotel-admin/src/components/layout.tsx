import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { LayoutDashboard, CalendarDays, BedDouble, Users, UsersRound, Download, Menu, Bell, Search, Building2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location]);

  const navigation = [
    { name: 'لوحة التحكم', href: '/', icon: LayoutDashboard },
    { name: 'الحجوزات', href: '/reservations', icon: CalendarDays },
    { name: 'الغرف', href: '/rooms', icon: BedDouble },
    { name: 'الضيوف', href: '/guests', icon: Users },
    { name: 'الموظفين', href: '/employees', icon: UsersRound },
    { name: 'التصدير', href: '/export', icon: Download },
  ];

  const sidebarContent = (
    <>
      <div className="h-16 flex items-center justify-between px-6 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-2 group">
          <Building2 className="h-6 w-6 text-sidebar-primary group-hover:text-sidebar-primary/80 transition-colors" />
          <span className="font-sans font-bold text-lg tracking-wide text-sidebar-foreground">فندق لاس فيجاس</span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent"
          onClick={() => setIsSidebarOpen(false)}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
        {navigation.map((item) => {
          const isActive = location === item.href || (item.href !== '/' && location.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-all duration-200 group border-r-[3px]',
                isActive 
                  ? 'bg-sidebar-accent text-sidebar-primary border-sidebar-primary' 
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-transparent'
              )}
            >
              <item.icon className={cn('h-5 w-5', isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/50 group-hover:text-sidebar-accent-foreground')} />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center text-sidebar-primary font-bold">
            م
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-sidebar-foreground">مدير الاستقبال</span>
            <span className="text-xs text-sidebar-foreground/60">manager@lasvegas.hotel</span>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row" dir="rtl">
      {/* Sidebar - Desktop */}
      <aside className="w-64 bg-sidebar border-l border-sidebar-border hidden md:flex flex-col flex-shrink-0">
        {sidebarContent}
      </aside>

      {/* Sidebar - Mobile Drawer */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsSidebarOpen(false)}
          />
          <aside className="absolute top-0 right-0 h-full w-72 max-w-[80vw] bg-sidebar border-l border-sidebar-border flex flex-col shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header - Mobile & Desktop */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 sm:px-6 z-10 sticky top-0 shadow-sm">
          <div className="flex items-center md:hidden">
            <Button variant="ghost" size="icon" className="mr-2" onClick={() => setIsSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <Building2 className="h-5 w-5 text-primary ml-2" />
            <span className="font-sans font-bold text-md">لاس فيجاس</span>
          </div>
          
        {/* Desktop Search/Actions */}
        <div className="hidden md:flex items-center flex-1 justify-between pr-4">
          <div className="relative w-96">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="بحث عن حجز، غرفة، أو ضيف..." 
                className="w-full bg-muted/50 border border-border rounded-full pl-4 pr-10 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary animate-pulse" />
              </Button>
              <div className="text-sm text-muted-foreground border-r border-border pr-4 mr-4">
                {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-background/50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
