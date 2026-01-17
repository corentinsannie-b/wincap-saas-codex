import { ReactNode } from "react";

interface CommentaryProps {
  children: ReactNode;
}

export const Commentary = ({ children }: CommentaryProps) => {
  return (
    <div className="bg-secondary/50 border-l-4 border-primary px-6 py-5 rounded-r-lg my-6">
      {children}
    </div>
  );
};
