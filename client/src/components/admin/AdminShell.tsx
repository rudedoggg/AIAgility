import { AdminBanner } from "./AdminBanner";

type AdminShellProps = {
  children: React.ReactNode;
};

export function AdminShell({ children }: AdminShellProps): React.ReactElement {
  return (
    <div className="min-h-screen bg-background" data-testid="admin-shell">
      <AdminBanner />
      {children}
    </div>
  );
}
