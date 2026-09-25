"use client";

import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

export default function QuickAction({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-surface p-4 text-left shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-light text-primary-dark">
        <Icon size={16} />
      </div>
      <span className="text-sm font-medium text-text">{label}</span>
    </motion.button>
  );
}
