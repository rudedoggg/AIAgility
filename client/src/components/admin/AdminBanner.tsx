import { Shield } from "lucide-react";

export function AdminBanner(): React.ReactElement {
  return (
    <div className="h-8 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-center gap-2 px-4">
      <Shield className="w-3.5 h-3.5 text-amber-600" />
      <span className="text-xs font-medium text-amber-700 tracking-wide uppercase">
        Admin Mode
      </span>
    </div>
  );
}
