import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, FileText, Settings, X, Waypoints } from 'lucide-react';
import clsx from 'clsx';

export type AppMode = 'timekeeper' | 'worklog' | 'amidakuji' | 'settings';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeApp: AppMode;
  onAppSelect: (app: AppMode) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, activeApp, onAppSelect }) => {
  const menuItems: { id: AppMode; label: string; icon: React.FC<any> }[] = [
    { id: 'timekeeper', label: 'Timekeeper', icon: Clock },
    { id: 'worklog', label: '業務日誌生成', icon: FileText },
    { id: 'amidakuji', label: 'あみだくじ', icon: Waypoints },
    { id: 'settings', label: '設定 (共通)', icon: Settings },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 bottom-0 w-72 bg-white/90 backdrop-blur-md shadow-2xl z-50 flex flex-col"
          >
            <div className="p-6 flex justify-between items-center border-b border-gray-200">
              <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                SA-assist
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <nav className="flex-1 p-4 space-y-2">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onAppSelect(item.id);
                    onClose();
                  }}
                  className={clsx(
                    "w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200",
                    activeApp === item.id
                      ? "bg-blue-50 text-blue-700 font-medium shadow-sm"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <item.icon className={clsx(
                    "w-5 h-5",
                    activeApp === item.id ? "text-blue-600" : "text-gray-400"
                  )} />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>

            <div className="p-6 border-t border-gray-200 text-xs text-gray-400 text-center">
              Shared Settings via Firestore
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
