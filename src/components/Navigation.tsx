import React from "react";
import { Home, Settings } from "lucide-react";

interface NavigationProps {
  currentPage: "dashboard" | "routines";
  onPageChange: (page: "dashboard" | "routines") => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentPage,
  onPageChange,
}) => {
  return (
    <nav className="fixed bottom-4 left-1/2 z-40 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-mist/60 bg-charcoal/85 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-soft backdrop-blur">
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onPageChange("dashboard")}
          className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-colors ${
            currentPage === "dashboard"
              ? "bg-mint/15 text-mint"
              : "text-slate-300 hover:text-white hover:bg-slateDeep/60"
          }`}
        >
          <Home size={22} />
          <span className="text-xs font-semibold">Inicio</span>
        </button>

        <button
          onClick={() => onPageChange("routines")}
          className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-colors ${
            currentPage === "routines"
              ? "bg-mint/15 text-mint"
              : "text-slate-300 hover:text-white hover:bg-slateDeep/60"
          }`}
        >
          <Settings size={22} />
          <span className="text-xs font-semibold">Rutinas</span>
        </button>
      </div>
    </nav>
  );
};
