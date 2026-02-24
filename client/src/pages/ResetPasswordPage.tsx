import { useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordPage() {
    const [, setLocation] = useLocation();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            });

            if (updateError) {
                setError(updateError.message);
            } else {
                sessionStorage.removeItem("passwordRecovery");
                setSuccess(true);
                setTimeout(() => setLocation("/dashboard"), 3000);
            }
        } finally {
            setLoading(false);
        }
    }

    if (success) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
                <div className="bg-background border rounded-xl shadow-sm p-8 max-w-md w-full text-center space-y-4">
                    <h2 className="text-xl font-semibold text-primary">Password updated!</h2>
                    <p className="text-sm text-muted-foreground">
                        Your password has been successfully reset. Redirecting you to the dashboard...
                    </p>
                    <Button className="w-full mt-4" onClick={() => setLocation("/dashboard")}>
                        Go to Dashboard Now
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="bg-background border rounded-xl shadow-sm p-8 max-w-md w-full">
                <div className="flex flex-col items-center gap-4 mb-6">
                    <div className="w-10 h-10 bg-primary rounded-md flex items-center justify-center text-primary-foreground font-bold">
                        A
                    </div>
                    <h2 className="text-xl font-semibold">Reset Your Password</h2>
                    <p className="text-sm text-muted-foreground text-center">
                        Enter a new password for your account.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input
                            id="new-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            placeholder="Enter new password"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm Password</Label>
                        <Input
                            id="confirm-password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength={6}
                            placeholder="Confirm new password"
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-destructive font-medium">{error}</p>
                    )}

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Updating..." : "Update Password"}
                    </Button>
                </form>
            </div>
        </div>
    );
}
