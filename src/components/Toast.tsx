import React, { useEffect } from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";
import { ToastMessage } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface ToastProps extends ToastMessage {
  onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ id, message, type, duration = 3000, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);
    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const getThemeDetails = () => {
    switch (type) {
      case "success":
        return {
          bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500/20 dark:border-emerald-500/30",
          text: "text-emerald-800 dark:text-emerald-200",
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
          progress: "bg-emerald-500"
        };
      case "error":
        return {
          bg: "bg-rose-50 dark:bg-rose-950/30 border-rose-500/20 dark:border-rose-500/30",
          text: "text-rose-800 dark:text-rose-200",
          icon: <AlertCircle className="w-5 h-5 text-rose-500" />,
          progress: "bg-rose-500"
        };
      case "warning":
        return {
          bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-500/20 dark:border-amber-500/30",
          text: "text-amber-800 dark:text-amber-200",
          icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
          progress: "bg-amber-500"
        };
      case "info":
      default:
        return {
          bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-500/20 dark:border-blue-500/30",
          text: "text-blue-800 dark:text-blue-200",
          icon: <Info className="w-5 h-5 text-blue-500" />,
          progress: "bg-blue-500"
        };
    }
  };

  const theme = getThemeDetails();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
      className={`relative flex items-center justify-between p-4 mb-3 w-80 md:w-96 rounded-xl border shadow-lg backdrop-blur-md ${theme.bg} ${theme.text} overflow-hidden pointer-events-auto`}
      style={{ boxShadow: "0 10px 30px -10px rgba(0,0,0,0.15)" }}
      id={`toast-${id}`}
    >
      <div className="flex items-center gap-3">
        {theme.icon}
        <p className="text-sm font-medium pr-4 leading-relaxed">{message}</p>
      </div>
      <button
        onClick={() => onClose(id)}
        className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500/20 cursor-pointer"
        aria-label="Close notification"
        id={`toast-close-${id}`}
      >
        <X className="w-4 h-4 opacity-60 hover:opacity-100" />
      </button>

      {/* Animated self-draining progress bar */}
      <motion.div
        initial={{ width: "100%" }}
        animate={{ width: "0%" }}
        transition={{ duration: duration / 1000, ease: "linear" }}
        className={`absolute bottom-0 left-0 h-1 ${theme.progress}`}
      />
    </motion.div>
  );
};

interface ToastContainerProps {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end pointer-events-none max-w-full">
      <AnimatePresence mode="popLayout">
        {toasts.map(toast => (
          <Toast key={toast.id} {...toast} onClose={onClose} />
        ))}
      </AnimatePresence>
    </div>
  );
};
