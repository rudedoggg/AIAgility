import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

const COLOR_TOKENS = [
    { label: "Background", var: "--background", tw: "bg-background" },
    { label: "Foreground", var: "--foreground", tw: "text-foreground" },
    { label: "Card", var: "--card", tw: "bg-card" },
    { label: "Primary", var: "--primary", tw: "bg-primary" },
    { label: "Primary FG", var: "--primary-foreground", tw: "text-primary-foreground" },
    { label: "Secondary", var: "--secondary", tw: "bg-secondary" },
    { label: "Muted", var: "--muted", tw: "bg-muted" },
    { label: "Muted FG", var: "--muted-foreground", tw: "text-muted-foreground" },
    { label: "Accent", var: "--accent", tw: "bg-accent" },
    { label: "Destructive", var: "--destructive", tw: "bg-destructive" },
    { label: "Border", var: "--border", tw: "border-border" },
    { label: "Ring", var: "--ring", tw: "ring-ring" },
];

const SEMANTIC_COLORS = [
    { label: "Success", light: "#10b981", dark: "#34d399" },
    { label: "Warning", light: "#f59e0b", dark: "#fbbf24" },
    { label: "Danger", light: "#ef4444", dark: "#f87171" },
    { label: "Info", light: "#3b82f6", dark: "#60a5fa" },
];

const RADII = [
    { label: "sm", value: "4px", tw: "rounded-sm" },
    { label: "md", value: "6px", tw: "rounded-md" },
    { label: "lg", value: "8px", tw: "rounded-lg" },
    { label: "xl", value: "12px", tw: "rounded-xl" },
    { label: "full", value: "9999px", tw: "rounded-full" },
];

export default function StyleGuidePage(): React.ReactElement {
    const { user } = useAuth();

    if (!user?.isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background" data-testid="style-guide-forbidden">
                <p className="text-muted-foreground text-lg">Access denied. Admin only.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background" data-testid="style-guide-page">
            {/* Header Bar */}
            <div className="border-b bg-background">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/admin">
                            <Button variant="ghost" size="sm" className="gap-2" data-testid="button-styleguide-back">
                                <ArrowLeft className="w-4 h-4" /> Back to Admin
                            </Button>
                        </Link>
                        <div className="h-6 w-px bg-border" />
                        <h1 className="font-bold text-lg font-heading" data-testid="text-styleguide-title">Style Guide</h1>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-8 space-y-10">

                {/* Typography */}
                <section>
                    <h2 className="text-xl font-bold font-heading mb-4" data-testid="section-typography">Typography</h2>
                    <Card>
                        <CardContent className="py-6 space-y-4">
                            <div className="space-y-3">
                                <div className="flex items-baseline gap-4">
                                    <span className="text-xs text-muted-foreground w-24 shrink-0 font-mono">font-heading</span>
                                    <span className="font-heading text-2xl font-bold">Plus Jakarta Sans — Headings</span>
                                </div>
                                <div className="flex items-baseline gap-4">
                                    <span className="text-xs text-muted-foreground w-24 shrink-0 font-mono">font-sans</span>
                                    <span className="font-sans text-base">Inter — Body text, labels, inputs</span>
                                </div>
                                <div className="flex items-baseline gap-4">
                                    <span className="text-xs text-muted-foreground w-24 shrink-0 font-mono">font-mono</span>
                                    <span className="font-mono text-sm">JetBrains Mono — Code, technical values</span>
                                </div>
                            </div>
                            <div className="border-t pt-4 space-y-2">
                                <p className="text-xs text-muted-foreground font-mono mb-2">Type Scale</p>
                                <p className="text-3xl font-heading font-bold">text-3xl — 30px Hero</p>
                                <p className="text-2xl font-heading font-bold">text-2xl — 24px Page Title</p>
                                <p className="text-xl font-heading font-semibold">text-xl — 20px Subtitle</p>
                                <p className="text-lg font-semibold">text-lg — 18px Card Title</p>
                                <p className="text-base">text-base — 16px Body Copy</p>
                                <p className="text-sm text-muted-foreground">text-sm — 14px Secondary</p>
                                <p className="text-xs text-muted-foreground">text-xs — 12px Metadata</p>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                {/* Color Palette */}
                <section>
                    <h2 className="text-xl font-bold font-heading mb-4" data-testid="section-colors">Color Palette</h2>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-muted-foreground">Design Tokens</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {COLOR_TOKENS.map((c) => (
                                    <div key={c.var} className="space-y-1.5" data-testid={`swatch-${c.label.toLowerCase().replace(/\s/g, "-")}`}>
                                        <div
                                            className="h-12 rounded-lg border border-border"
                                            style={{ backgroundColor: `hsl(var(${c.var}))` }}
                                        />
                                        <div className="text-xs font-medium">{c.label}</div>
                                        <div className="text-[10px] text-muted-foreground font-mono">{c.tw}</div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="mt-4">
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-muted-foreground">Semantic Colors</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {SEMANTIC_COLORS.map((c) => (
                                    <div key={c.label} className="space-y-1.5">
                                        <div className="flex gap-1.5">
                                            <div className="h-10 flex-1 rounded-lg" style={{ backgroundColor: c.light }} />
                                            <div className="h-10 flex-1 rounded-lg" style={{ backgroundColor: c.dark }} />
                                        </div>
                                        <div className="text-xs font-medium">{c.label}</div>
                                        <div className="text-[10px] text-muted-foreground font-mono">{c.light} / {c.dark}</div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </section>

                {/* Border Radius */}
                <section>
                    <h2 className="text-xl font-bold font-heading mb-4" data-testid="section-radius">Border Radius</h2>
                    <Card>
                        <CardContent className="py-6">
                            <div className="flex items-end gap-4 flex-wrap">
                                {RADII.map((r) => (
                                    <div key={r.label} className="text-center space-y-2">
                                        <div
                                            className="w-16 h-16 bg-primary/20 border-2 border-primary"
                                            style={{ borderRadius: r.value }}
                                        />
                                        <div className="text-xs font-medium">{r.tw}</div>
                                        <div className="text-[10px] text-muted-foreground font-mono">{r.value}</div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </section>

                {/* Buttons */}
                <section>
                    <h2 className="text-xl font-bold font-heading mb-4" data-testid="section-buttons">Buttons</h2>
                    <Card>
                        <CardContent className="py-6">
                            <div className="flex items-center gap-3 flex-wrap">
                                <Button>Primary</Button>
                                <Button variant="secondary">Secondary</Button>
                                <Button variant="outline">Outline</Button>
                                <Button variant="ghost">Ghost</Button>
                                <Button variant="destructive">Destructive</Button>
                                <Button variant="link">Link</Button>
                                <Button disabled>Disabled</Button>
                            </div>
                            <div className="flex items-center gap-3 flex-wrap mt-4">
                                <Button size="sm">Small</Button>
                                <Button size="default">Default</Button>
                                <Button size="lg">Large</Button>
                                <Button size="icon"><ArrowLeft className="w-4 h-4" /></Button>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                {/* Badges */}
                <section>
                    <h2 className="text-xl font-bold font-heading mb-4" data-testid="section-badges">Badges</h2>
                    <Card>
                        <CardContent className="py-6">
                            <div className="flex items-center gap-3 flex-wrap">
                                <Badge>Default</Badge>
                                <Badge variant="secondary">Secondary</Badge>
                                <Badge variant="outline">Outline</Badge>
                                <Badge variant="destructive">Destructive</Badge>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                {/* Inputs */}
                <section>
                    <h2 className="text-xl font-bold font-heading mb-4" data-testid="section-inputs">Inputs</h2>
                    <Card>
                        <CardContent className="py-6 space-y-4 max-w-md">
                            <Input placeholder="Default input" />
                            <Input placeholder="Disabled input" disabled />
                        </CardContent>
                    </Card>
                </section>

                {/* Shadows */}
                <section>
                    <h2 className="text-xl font-bold font-heading mb-4" data-testid="section-shadows">Shadows / Elevation</h2>
                    <Card>
                        <CardContent className="py-6">
                            <div className="flex items-center gap-6 flex-wrap">
                                <div className="w-32 h-20 rounded-lg bg-card border border-border shadow-sm flex items-center justify-center text-xs text-muted-foreground">
                                    shadow-sm
                                </div>
                                <div className="w-32 h-20 rounded-lg bg-card border border-border shadow-md flex items-center justify-center text-xs text-muted-foreground">
                                    shadow-md
                                </div>
                                <div className="w-32 h-20 rounded-lg bg-card border border-border shadow-lg flex items-center justify-center text-xs text-muted-foreground">
                                    shadow-lg
                                </div>
                                <div className="w-32 h-20 rounded-lg bg-card border border-border shadow-xl flex items-center justify-center text-xs text-muted-foreground">
                                    shadow-xl
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                {/* Icons */}
                <section>
                    <h2 className="text-xl font-bold font-heading mb-4" data-testid="section-icons">Icons</h2>
                    <Card>
                        <CardContent className="py-6">
                            <p className="text-sm text-muted-foreground mb-3">All icons from <span className="font-mono text-xs">lucide-react</span>. Default: 16px inline, 20px standalone.</p>
                            <div className="flex items-center gap-4">
                                <ArrowLeft className="w-4 h-4 text-muted-foreground" />
                                <ArrowLeft className="w-5 h-5 text-foreground" />
                            </div>
                        </CardContent>
                    </Card>
                </section>

            </div>
        </div>
    );
}
