import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AlertBoxProps {
  variant: "success" | "info" | "warning";
  title: string;
  children: ReactNode;
}

const variantStyles = {
  success: "bg-emerald-50 border-emerald-500 text-emerald-800",
  info: "bg-blue-50 border-blue-500 text-blue-800",
  warning: "bg-amber-50 border-amber-500 text-amber-800",
};

export const AlertBox = ({ variant, title, children }: AlertBoxProps) => {
  return (
    <div className={cn("border-l-4 px-5 py-4 rounded-r-lg", variantStyles[variant])}>
      <strong className="block mb-1">{title}</strong>
      <span className="text-sm">{children}</span>
    </div>
  );
};
