import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import type { AppMode } from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
  activeApp: AppMode;
  onAppSelect: (app: AppMode) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeApp, onAppSelect }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col">
      {/* Floating Hamburger Button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="absolute top-4 left-4 z-30 p-3 bg-white/80 backdrop-blur shadow-md hover:shadow-lg rounded-full text-gray-700 transition-all duration-300 hover:scale-105 active:scale-95"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Sidebar Overlay */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeApp={activeApp}
        onAppSelect={onAppSelect}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full h-full relative z-10 overflow-hidden">
        {children}
      </main>
    </div>
  );
};
