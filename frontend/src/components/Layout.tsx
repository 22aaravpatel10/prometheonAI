import React, { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  LayoutDashboard,
  Database,
  Box,
  Activity,
  Users,
  LogOut,
  Menu,
  X,
  Settings,
  Zap,
  ChevronRight,
  Globe,
  Cpu,
  FileText
} from 'lucide-react';
import ManufacturingCopilotPanel from './ManufacturingCopilotPanel';
import { AnimatePresence, motion } from 'framer-motion';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleLogout = () => {
    // Demo mode - no logout needed
    toast.success('Demo mode - logout disabled');
  };

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Recipes', href: '/recipes', icon: FileText },
    { name: 'Equipment', href: '/equipment', icon: Database },
    { name: 'Inventory', href: '/inventory', icon: Box },
    { name: 'Progress', href: '/progress', icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-gray-300 font-sans selection:bg-[#007A73] selection:text-white overflow-hidden flex flex-col">

      {/* Top Bar */}
      <header className="h-14 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-4 z-50 shrink-0 relative">
        {/* Tech Borders */}
        <div className="absolute bottom-0 left-0 w-4 h-[1px] bg-white/50"></div>
        <div className="absolute bottom-0 right-0 w-4 h-[1px] bg-white/50"></div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-sm transition-colors border border-transparent hover:border-white/10"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#007A73] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#007A73]"></span>
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-tech font-bold text-lg tracking-[0.2em] text-white">BATCH<span className="text-[#007A73]">OS</span></span>
              <span className="text-[9px] text-gray-500 font-mono tracking-widest">SYSTEM V.2.4.0</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* PrometheonAI Button */}
          <button
            onClick={() => setIsCopilotOpen(true)}
            className="group flex items-center gap-2 px-3 py-1.5 bg-[#007A73]/10 border border-[#007A73]/50 text-[#007A73] hover:bg-[#007A73] hover:text-white rounded-sm transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            <Zap size={16} className="group-hover:fill-current" />
            <span className="font-tech font-bold text-sm tracking-wider">PROMETHEON</span>
          </button>

          {/* Settings Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-sm transition-colors border border-transparent hover:border-white/10"
            >
              <Settings size={20} />
            </button>

            <AnimatePresence>
              {isSettingsOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsSettingsOpen(false)}
                  ></div>
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-2 w-56 bg-[#0a0a0a] border border-white/10 shadow-[0_0_30px_-5px_rgba(0,0,0,0.5)] rounded-sm z-50 py-1"
                  >
                    <div className="px-4 py-3 border-b border-white/5 bg-white/5">
                      <p className="text-[10px] text-[#007A73] font-mono tracking-widest mb-1">CURRENT OPERATOR</p>
                      <p className="text-sm font-bold text-white truncate font-tech tracking-wide">{user?.email}</p>
                    </div>
                    <Link
                      to="/users"
                      className="flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors group"
                      onClick={() => setIsSettingsOpen(false)}
                    >
                      <Users size={16} className="group-hover:text-[#007A73] transition-colors" />
                      <span className="font-mono text-xs tracking-wider">USER MANAGEMENT</span>
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsSettingsOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left group"
                    >
                      <LogOut size={16} className="group-hover:text-red-500 transition-colors" />
                      <span className="font-mono text-xs tracking-wider">SYSTEM LOGOUT</span>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Side Menu (Drawer) */}
        <AnimatePresence>
          {isMenuOpen && (
            <>
              <motion.div
                initial={{ x: -300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -300, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="absolute top-0 left-0 bottom-0 w-64 bg-[#0a0a0a]/95 backdrop-blur-xl border-r border-white/10 z-40"
              >
                <div className="p-4 space-y-1">
                  <div className="mb-6 px-4 py-2 border-b border-white/10">
                    <p className="text-[10px] text-gray-500 font-mono tracking-[0.2em] uppercase">Navigation</p>
                  </div>
                  {navigation.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => setIsMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-sm transition-all duration-200 group relative overflow-hidden ${isActive
                          ? 'text-[#007A73] bg-[#007A73]/5 border-l-2 border-[#007A73]'
                          : 'text-gray-400 hover:text-white hover:bg-white/5 border-l-2 border-transparent'
                          }`}
                      >
                        <item.icon size={18} className={isActive ? "animate-pulse" : ""} />
                        <span className="font-tech font-medium tracking-wide uppercase text-sm">{item.name}</span>
                        {isActive && (
                          <motion.div
                            layoutId="activeNav"
                            className="absolute right-4"
                          >
                            <ChevronRight size={14} />
                          </motion.div>
                        )}
                      </Link>
                    );
                  })}
                </div>

                {/* System Status Footer */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-black/20">
                  <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono">
                    <span>STATUS</span>
                    <span className="text-[#007A73]">OPERATIONAL</span>
                  </div>
                  <div className="mt-2 h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-[#007A73] w-3/4 animate-pulse"></div>
                  </div>
                </div>
              </motion.div>

              {/* Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm z-30"
                onClick={() => setIsMenuOpen(false)}
              ></motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-[#050505] relative scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
          {/* Grid Background */}
          <motion.div
            className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
              backgroundSize: '30px 30px'
            }}
            animate={{
              backgroundPosition: ["0px 0px", "30px 15px", "0px 30px", "-15px 15px", "0px 0px"]
            }}
            transition={{
              repeat: Infinity,
              duration: 20,
              ease: "linear"
            }}
          >
          </motion.div>

          {/* Ambient Glow */}
          <motion.div
            animate={{
              opacity: [0.03, 0.05, 0.03],
              scale: [1, 1.1, 1]
            }}
            transition={{
              repeat: Infinity,
              duration: 8,
              ease: "easeInOut"
            }}
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#007A73] opacity-[0.03] blur-[100px] pointer-events-none rounded-full"
          ></motion.div>

          <div className="relative z-10 min-h-full">
            {children}
          </div>
        </main>
      </div>

      <ManufacturingCopilotPanel
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        onEventsUpdated={() => window.location.reload()}
      />
    </div>
  );
};

export default Layout;