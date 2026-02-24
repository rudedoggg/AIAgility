import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/use-auth";
import GoalsPage from "@/pages/GoalsPage";
import LabPage from "@/pages/LabPage";
import DeliverablesPage from "@/pages/DeliverablesPage";
import DashboardPage from "@/pages/DashboardPage";
import PreferencesPage from "@/pages/PreferencesPage";
import NotificationsPage from "@/pages/NotificationsPage";
import BillingPage from "@/pages/BillingPage";
import HelpSupportPage from "@/pages/HelpSupportPage";
import ProjectsPage from "@/pages/ProjectsPage";
import ProfilePage from "@/pages/ProfilePage";
import AccountPage from "@/pages/AccountPage";
import SecurityPage from "@/pages/SecurityPage";
import LandingPage from "@/pages/LandingPage";
import AdminPage from "@/pages/AdminPage";
import CoreQsPage from "@/pages/CoreQsPage";
import StyleGuidePage from "@/pages/StyleGuidePage";
import NotFound from "@/pages/not-found";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import { Loader2 } from "lucide-react";

function AuthenticatedRouter() {
  return (
    <Switch>
      <Route path="/" component={GoalsPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/lab" component={LabPage} />
      <Route path="/deliverables" component={DeliverablesPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />

      <Route path="/settings/preferences" component={PreferencesPage} />
      <Route path="/settings/notifications" component={NotificationsPage} />
      <Route path="/settings/billing" component={BillingPage} />
      <Route path="/settings/projects" component={ProjectsPage} />
      <Route path="/support" component={HelpSupportPage} />

      <Route path="/account/profile" component={ProfilePage} />
      <Route path="/account" component={AccountPage} />
      <Route path="/account/security" component={SecurityPage} />

      <Route path="/admin" component={AdminPage} />
      <Route path="/admin/coreqs" component={CoreQsPage} />
      <Route path="/admin/style-guide" component={StyleGuidePage} />

      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="loading-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/reset-password" component={ResetPasswordPage} />
        <Route component={LandingPage} />
      </Switch>
    );
  }

  return <AuthenticatedRouter />;
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <AppContent />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
