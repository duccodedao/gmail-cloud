import React, { useEffect, useState } from "react";
import { Layers, ShieldCheck, MailQuestion, Activity, Lock, MinusCircle } from "lucide-react";
import { DashboardStats } from "../types";
import { motion } from "motion/react";

interface CounterProps {
  value: number;
}

const AnimatedCounter: React.FC<CounterProps> = ({ value }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (end === 0) {
      setCount(0);
      return;
    }
    const duration = 1000; // 1s
    const increment = Math.ceil(end / 40) || 1;
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, duration / 40);

    return () => clearInterval(timer);
  }, [value]);

  return <span>{count}</span>;
};

interface StatsCardsProps {
  stats: DashboardStats;
  onSelectStatusFilter: (status: string | null) => void;
  selectedFilter: string | null;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats, onSelectStatusFilter, selectedFilter }) => {
  const cardData = [
    {
      id: "all",
      filterValue: null,
      label: "Tổng Tài Khoản",
      count: stats.total,
      icon: Layers,
      color: "from-blue-500/10 to-indigo-500/10 border-blue-500/25 text-blue-600 dark:text-blue-400",
      glowColor: "rgba(59, 130, 246, 0.15)",
      desc: "Tổng số Gmail trong bộ nhớ"
    },
    {
      id: "active",
      filterValue: "ACTIVE",
      label: "Đang Hoạt Động",
      count: stats.active,
      icon: ShieldCheck,
      color: "from-emerald-500/10 to-teal-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400",
      glowColor: "rgba(16, 185, 129, 0.15)",
      desc: "Email sẵn sàng sử dụng"
    },
    {
      id: "unused",
      filterValue: "UNUSED",
      label: "Chưa Sử Dụng",
      count: stats.unused,
      icon: MinusCircle,
      color: "from-amber-500/10 to-orange-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400",
      glowColor: "rgba(245, 158, 11, 0.15)",
      desc: "Email mới, chưa kích hoạt"
    },
    {
      id: "locked",
      filterValue: "LOCKED",
      label: "Đã Bị Khóa",
      count: stats.locked,
      icon: Lock,
      color: "from-rose-500/10 to-red-500/10 border-rose-500/25 text-rose-600 dark:text-rose-400",
      glowColor: "rgba(244, 63, 94, 0.15)",
      desc: "Bị vô hiệu hóa bởi Google"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8" id="stats-grid">
      {cardData.map((card) => {
        const Icon = card.icon;
        const isSelected = selectedFilter === card.filterValue;

        return (
          <motion.div
            key={card.id}
            whileHover={{ y: -3, scale: 1.01 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            onClick={() => onSelectStatusFilter(card.filterValue)}
            className={`relative p-5 rounded-2xl border bg-white dark:bg-slate-900 cursor-pointer transition-all ${
              isSelected 
                ? "border-[#4285F4] dark:border-[#4285F4] ring-2 ring-[#4285F4]/15" 
                : "border-slate-200/90 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700"
            }`}
            style={{ 
              boxShadow: isSelected 
                ? `0 12px 20px -10px ${card.glowColor}` 
                : "0 2px 8px -2px rgba(0,0,0,0.04)"
            }}
            id={`stat-card-${card.id}`}
          >
            {/* Background Accent Subtle Glow (Clean Minimalism style) */}
            <div 
              className="stat-card-glow" 
              style={{ 
                background: card.id === "all" ? "#4285F4" : card.id === "active" ? "#22C55E" : card.id === "unused" ? "#F59E0B" : card.id === "locked" ? "#EF4444" : "#64748B" 
              }} 
            />

            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {card.label}
              </span>
              <div className={`p-2 rounded-xl bg-gradient-to-tr ${card.color} shadow-sm`}>
                <Icon className="w-4.5 h-4.5" />
              </div>
            </div>

            <div className="flex items-baseline gap-1">
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
                <AnimatedCounter value={card.count} />
              </h3>
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">t.khoản</span>
            </div>

            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 leading-relaxed font-medium">
              {card.desc}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
};
