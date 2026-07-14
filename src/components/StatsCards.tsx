import React, { useEffect, useState } from "react";
import { Layers, ShieldCheck, MailQuestion, Activity, Lock, MinusCircle, Users, CheckCircle, HelpCircle } from "lucide-react";
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
      color: "text-blue-500 bg-blue-50/80 dark:bg-blue-950/30",
      gradientAccent: "from-blue-500 to-indigo-500",
      glowColor: "rgba(59, 130, 246, 0.15)",
      desc: "Tổng số Gmail trong bộ nhớ"
    },
    {
      id: "active",
      filterValue: "ACTIVE",
      label: "Đang Hoạt Động",
      count: stats.active,
      icon: ShieldCheck,
      color: "text-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/30",
      gradientAccent: "from-emerald-500 to-teal-500",
      glowColor: "rgba(16, 185, 129, 0.15)",
      desc: "Email sẵn sàng sử dụng"
    },
    {
      id: "peermet",
      filterValue: "PEER_MET",
      label: "Đã Check",
      count: stats.peerMet,
      icon: CheckCircle,
      color: "text-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/30",
      gradientAccent: "from-indigo-500 to-purple-500",
      glowColor: "rgba(99, 102, 241, 0.15)",
      desc: "Đã peer meet trong 24h"
    },
    {
      id: "notpeermet",
      filterValue: "NOT_PEER_MET",
      label: "Chưa Check",
      count: stats.notPeerMet,
      icon: HelpCircle,
      color: "text-rose-500 bg-rose-50/80 dark:bg-rose-950/30",
      gradientAccent: "from-rose-500 to-pink-500",
      glowColor: "rgba(244, 63, 94, 0.15)",
      desc: "Cần thực hiện Check gấp"
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6" id="stats-grid">
      {cardData.map((card) => {
        const Icon = card.icon;
        const isSelected = selectedFilter === card.filterValue;

        return (
          <motion.div
            key={card.id}
            whileHover={{ y: -4, scale: 1.01 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            onClick={() => onSelectStatusFilter(card.filterValue)}
            className={`relative overflow-hidden p-5 rounded-2xl border bg-white dark:bg-slate-900 cursor-pointer transition-all ${
              isSelected 
                ? "border-[#4285F4] dark:border-[#4285F4] ring-4 ring-[#4285F4]/10 shadow-lg" 
                : "border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm"
            }`}
            style={{ 
              boxShadow: isSelected 
                ? `0 12px 20px -8px ${card.glowColor}` 
                : "0 4px 6px -1px rgba(0,0,0,0.01), 0 2px 4px -1px rgba(0,0,0,0.01)"
            }}
            id={`stat-card-${card.id}`}
          >
            {/* Top gradient line */}
            <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${card.gradientAccent}`} />

            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">
                  {card.label}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 line-clamp-1">
                  {card.desc}
                </span>
              </div>
              <div className={`p-2 rounded-xl ${card.color} shadow-sm shrink-0`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-end justify-between gap-2 mt-4">
              <div className="flex items-baseline gap-1">
                <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
                  <AnimatedCounter value={card.count} />
                </h3>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">t.k</span>
              </div>

              {stats.total > 0 && (card.id === "peermet" || card.id === "notpeermet" || card.id === "active") && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg shrink-0 ${
                  card.id === "peermet"
                    ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/40"
                    : card.id === "notpeermet"
                      ? "text-rose-600 dark:text-rose-400 bg-rose-50/80 dark:bg-rose-950/40"
                      : "text-emerald-600 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/40"
                }`}>
                  {card.id === "peermet" ? (
                    `${Math.round((stats.peerMet / stats.total) * 100)}%`
                  ) : card.id === "notpeermet" ? (
                    `${Math.round((stats.notPeerMet / stats.total) * 100)}%`
                  ) : (
                    `${Math.round((stats.active / stats.total) * 100)}%`
                  )}
                </span>
              )}
            </div>

            {stats.total > 0 && (card.id === "peermet" || card.id === "notpeermet") && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 dark:text-slate-500 mb-1">
                  <span>Tiến độ</span>
                  <span>
                    {card.id === "peermet" 
                      ? `${stats.peerMet}/${stats.total}` 
                      : `${stats.notPeerMet}/${stats.total}`}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${
                      card.id === "peermet"
                        ? "bg-gradient-to-r from-indigo-500 to-purple-500"
                        : "bg-gradient-to-r from-rose-500 to-pink-500"
                    }`}
                    style={{
                      width: `${Math.round(((card.id === "peermet" ? stats.peerMet : stats.notPeerMet) / stats.total) * 100)}%`
                    }}
                  />
                </div>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};
