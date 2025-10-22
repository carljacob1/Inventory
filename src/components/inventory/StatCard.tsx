import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  variant?: "primary" | "success" | "warning" | "info";
  className?: string;
}

const variantStyles = {
  primary: "border-l-primary bg-card",
  success: "border-l-success bg-card",
  warning: "border-l-warning bg-card",
  info: "border-l-info bg-card",
};

const iconStyles = {
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  info: "text-info",
};

export function StatCard({ 
  title, 
  value, 
  icon, 
  variant = "primary", 
  className 
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg shadow-sm p-6 border-l-4 transition-all duration-300 hover:shadow-md",
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
        </div>
        <div className={cn("text-2xl", iconStyles[variant])}>
          {icon}
        </div>
      </div>
    </div>
  );
}