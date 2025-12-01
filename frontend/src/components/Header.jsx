// src/components/Header.jsx
import React from "react";
import { motion } from "framer-motion";

export default function Header({ title = "Media Studio", subtitle }) {
  return (
    <motion.header
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      style={{ maxWidth: 1100, margin: "12px auto 0", display: "flex", gap: 16, alignItems: "center" }}
    >
      <div style={{ width: 56, height: 56, borderRadius: 12, display: "grid", placeItems: "center", background: "linear-gradient(135deg,#6366f1,#06b6d4)" }}>
        <div style={{ color: "white", fontWeight: 800, fontSize: 20 }}>D</div>
      </div>

      <div style={{ flex: 1 }}>
        <h1 style={{ margin: 0, fontSize: 22, lineHeight: 1, background: "linear-gradient(90deg,#fff,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: 800 }}>
          {title}
        </h1>
        {subtitle && <p style={{ margin: "6px 0 0", color: "#9aa6b8" }}>{subtitle}</p>}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <motion.button whileHover={{ scale: 1.05 }} style={{ padding: 8, borderRadius: 10, border: "none", background: "rgba(255,255,255,0.02)", color: "#9aa6b8" }}>
          Settings
        </motion.button>
        <motion.button whileHover={{ scale: 1.05 }} style={{ padding: 8, borderRadius: 10, border: "none", background: "linear-gradient(90deg,#06b6d4,#3b82f6)", color: "white" }}>
          Sign in
        </motion.button>
      </div>
    </motion.header>
  );
}
