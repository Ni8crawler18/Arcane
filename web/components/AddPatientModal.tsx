"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

export default function AddPatientModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [cancerType, setCancerType] = useState("");
  const [stage, setStage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    const doctorId = localStorage.getItem("oncofollow_doctor_id");
    if (!doctorId || !name.trim() || !contact.trim()) return;
    setSaving(true);
    await fetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doctorId, name, contact, cancerType, stage }),
    });
    setSaving(false);
    setName("");
    setContact("");
    setCancerType("");
    setStage("");
    onCreated();
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-text">Add a patient</h2>
              <button onClick={onClose} className="text-muted hover:text-text">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Patient name"
                className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
              <input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="Contact (phone or email)"
                className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
              <input
                value={cancerType}
                onChange={(e) => setCancerType(e.target.value)}
                placeholder="Cancer type (e.g. Breast cancer)"
                className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
              <input
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                placeholder="Stage / status (e.g. Post-chemo, surveillance)"
                className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
            <button
              onClick={submit}
              disabled={saving || !name.trim() || !contact.trim()}
              className="mt-5 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:opacity-50"
            >
              {saving ? "Adding..." : "Add patient"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
