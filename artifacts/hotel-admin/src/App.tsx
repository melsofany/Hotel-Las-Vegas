import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { Loader2 } from 'lucide-react';

import Dashboard from './pages/dashboard';
import Reservations from './pages/reservations';
import NewReservation from './pages/reservations-new';
import Rooms from './pages/rooms';
import Guests from './pages/guests';
import Employees from './pages/employees';
import Export from './pages/export';
import Login from './pages/login';

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/reservations" component={Reservations} />
      <Route path="/reservations/new" component={NewReservation} />
      <Route path="/rooms" component={Rooms} />
      <Route path="/guests" component={Guests} />
      <Route path="/employees" component={Employees} />
      <Route path="/export" component={Export} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthGate() {
  const { employee, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!employee) {
    return <Login />;
  }

  return <Router />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <AuthGate />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
