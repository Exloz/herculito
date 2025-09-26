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
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 px-4 py-0.5 z-40">
      <div className="flex justify-around max-w-md mx-auto">
        <button
          onClick={() => onPageChange("dashboard")}
          className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${
            currentPage === "dashboard"
              ? "text-blue-400 bg-blue-900/20"
              : "text-gray-400 hover:text-white hover:bg-gray-700"
          }`}
        >
          <Home size={24} />
          <span className="text-xs font-medium">Inicio</span>
        </button>

        <button
          onClick={() => onPageChange("routines")}
          className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${
            currentPage === "routines"
              ? "text-blue-400 bg-blue-900/20"
              : "text-gray-400 hover:text-white hover:bg-gray-700"
          }`}
        >
          <Settings size={24} />
          <span className="text-xs font-medium">Rutinas</span>
        </button>
      </div>
    </nav>
  );
};
