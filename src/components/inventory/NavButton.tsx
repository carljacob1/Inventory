import { cn } from "@/lib/utils";

interface NavButtonProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: (id: string) => void;
}

export function NavButton({ id, label, icon, active, onClick }: NavButtonProps) {
  return (
    <button
      onClick={() => onClick(id)}
      className={cn(
        "flex items-center space-x-3 w-full px-4 py-3 rounded-lg text-left transition-all duration-300",
        active
          ? "bg-primary text-primary-foreground shadow-md"
          : "text-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <span className="text-xl">{icon}</span>
      <span className="font-medium">{label}</span>
    </button>
  );
}