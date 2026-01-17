import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  value: string;
  label: string;
  sublabel?: string;
  variant?: "primary" | "accent" | "success";
  icon?: LucideIcon;
}

const variantStyles = {
  primary: "bg-primary text-primary-foreground",
  accent: "bg-accent text-accent-foreground", 
  success: "bg-[hsl(31,43%,49%)] text-white",
};

export const KPICard = ({ value, label, sublabel, variant = "primary", icon: Icon }: KPICardProps) => {
  return (
    <Card className={cn("border-0 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1", variantStyles[variant])}>
      <CardContent className="p-6 text-center">
        {Icon && <Icon className="h-6 w-6 mx-auto mb-2 opacity-80" />}
        <div className="text-3xl font-bold mb-1">{value}</div>
        <div className="text-sm opacity-90">{label}</div>
        {sublabel && <div className="text-xs opacity-70 mt-1">{sublabel}</div>}
      </CardContent>
    </Card>
  );
};
