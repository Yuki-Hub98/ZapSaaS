import type { ReactNode } from "react";

interface PageWrapperProps {
  children: ReactNode;
}

export default function PageWrapper({ children }: PageWrapperProps) {
  return (
    <main className="flex-1 overflow-y-auto bg-theme-secondary">
      <div className="px-8 py-6 max-w-7xl mx-auto">
        {children}
      </div>
    </main>
  );
}