"use client";

import React from "react";
import AppLogo from "@/components/AppLogo";

/* ─────────────────────────────────────────────
   Icônes SVG inline légères
───────────────────────────────────────────── */
export const IconAt = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="18" height="18"
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" />
  </svg>
);

export const IconLock = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="18" height="18"
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export const IconUser = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="18" height="18"
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export const IconEye = ({ closed, className }: { closed?: boolean; className?: string }) =>
  closed ? (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="18" height="18"
      viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="18" height="18"
      viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

export const IconArrow = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="18" height="18"
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

export const IconAlert = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="16" height="16"
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

/* ─────────────────────────────────────────────
   Panneau gauche décoratif
───────────────────────────────────────────── */
export const LeftPanel = ({ title = "Votre espace<br />vous attend.", subtitle = "Connectez-vous pour accéder à vos conversations, vos outils et votre historique.", quote = "Une interface qui s'adapte vraiment à mon flux de travail. Je ne reviendrais plus en arrière.", quoteAuthor = "Maya R. — Product Designer", quoteInitials = "MR" }: { title?: React.ReactNode; subtitle?: string; quote?: string; quoteAuthor?: string; quoteInitials?: string }) => (
  <div
    className="
      hidden lg:flex
      w-[46%] shrink-0
      flex-col justify-between
      relative overflow-hidden
      p-12
    "
    style={{ background: "#0d1f35" }}
  >
    {/* Grille de fond */}
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage:
          "linear-gradient(rgba(240,180,41,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(240,180,41,0.045) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }}
    />

    {/* Orbe haut-droite */}
    <div
      aria-hidden="true"
      className="absolute -top-20 -right-20 w-72 h-72 rounded-full pointer-events-none"
      style={{ background: "rgba(240,180,41,0.09)" }}
    />

    {/* Orbe bas-gauche */}
    <div
      aria-hidden="true"
      className="absolute -bottom-14 -left-14 w-56 h-56 rounded-full pointer-events-none"
      style={{
        background: "rgba(26,58,92,0.5)",
        border: "1px solid rgba(240,180,41,0.10)",
      }}
    />

    {/* Brand */}
    <div className="relative z-10">
      {/* Logo */}
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-8"
        style={{ background: "var(--jaune)" }}
      >
        <AppLogo size={28} />
      </div>

      <h2
        className="text-3xl font-semibold leading-snug tracking-tight mb-3"
        style={{ color: "#fff", letterSpacing: "-0.4px" }}
      >
        {typeof title === "string" ? <span dangerouslySetInnerHTML={{ __html: title }} /> : title}
      </h2>
      <p className="text-sm leading-relaxed max-w-[270px]" style={{ color: "rgba(255,255,255,0.52)" }}>
        {subtitle}
      </p>
    </div>

    {/* Témoignage */}
    <blockquote
      className="relative z-10 rounded-2xl p-6 m-0"
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "0.5px solid rgba(255,255,255,0.10)",
      }}
    >
      <p className="text-sm leading-relaxed italic mb-4" style={{ color: "rgba(255,255,255,0.70)" }}>
        « {quote} »
      </p>
      <footer className="flex items-center gap-3">
        <span
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
          style={{ background: "var(--jaune)", color: "#0d1f35" }}
          aria-hidden="true"
        >
          {quoteInitials}
        </span>
        <cite className="not-italic text-xs font-medium" style={{ color: "rgba(255,255,255,0.50)" }}>
          {quoteAuthor}
        </cite>
      </footer>
    </blockquote>

    {/* Points décoratifs */}
    <div className="absolute bottom-11 right-11 flex gap-1.5 z-10" aria-hidden="true">
      <span
        className="h-1.5 rounded-full"
        style={{ width: 18, background: "var(--jaune)" }}
      />
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.22)" }} />
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.22)" }} />
    </div>
  </div>
);

/* ─────────────────────────────────────────────
   Champ de saisie réutilisable
───────────────────────────────────────────── */
interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
  inputProps: React.InputHTMLAttributes<HTMLInputElement | HTMLSelectElement>;
  isSelect?: boolean;
  children?: React.ReactNode;
}

export const Field = ({ id, label, hint, icon, trailing, inputProps, isSelect, children }: FieldProps) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={id} className="text-sm font-medium text-[var(--blue)]/70 dark:text-gray-400">
      {label}
    </label>
    <div className="relative group">
      {icon && (
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--blue)]/40 dark:text-gray-500 group-focus-within:text-[var(--blue)] dark:group-focus-within:text-[var(--jaune)] transition-colors pointer-events-none flex items-center">
          {icon}
        </span>
      )}
      {isSelect ? (
        <select
          id={id}
          {...(inputProps as React.SelectHTMLAttributes<HTMLSelectElement>)}
          className="
            w-full py-3 bg-white dark:bg-gray-800
            border border-[var(--blue)]/15 dark:border-gray-700
            rounded-xl text-[15px] text-[var(--blue)] dark:text-white
            placeholder:text-[var(--blue)]/30 dark:placeholder:text-gray-500
            focus:outline-none focus:ring-2 focus:ring-[var(--blue)]/10 dark:focus:ring-[var(--jaune)]/15
            focus:border-[var(--blue)]/40 dark:focus:border-[var(--jaune)]/40
            transition-all
            "
          style={{ paddingLeft: icon ? 44 : 14, paddingRight: trailing ? 44 : 14 }}
        >
          {children}
        </select>
      ) : (
        <input
          id={id}
          {...(inputProps as React.InputHTMLAttributes<HTMLInputElement>)}
          className="
            w-full py-3 bg-white dark:bg-gray-800
            border border-[var(--blue)]/15 dark:border-gray-700
            rounded-xl text-[15px] text-[var(--blue)] dark:text-white
            placeholder:text-[var(--blue)]/30 dark:placeholder:text-gray-500
            focus:outline-none focus:ring-2 focus:ring-[var(--blue)]/10 dark:focus:ring-[var(--jaune)]/15
            focus:border-[var(--blue)]/40 dark:focus:border-[var(--jaune)]/40
            transition-all
            "
          style={{ paddingLeft: icon ? 44 : 14, paddingRight: trailing ? 44 : 14 }}
        />
      )}
      {trailing && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
          {trailing}
        </span>
      )}
    </div>
    {hint && (
      <p className="text-xs text-[var(--blue)]/45 dark:text-gray-500 px-0.5">{hint}</p>
    )}
  </div>
);
