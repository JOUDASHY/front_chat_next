'use client';

import AppLogo from "@/components/AppLogo";
import { useState } from "react";
import api from "@/lib/axios";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LockClosedIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import type { JSX } from 'react';

interface PasswordResetFormProps {
  uid: string;
  token: string;
}

export default function PasswordResetForm({ uid, token }: PasswordResetFormProps): JSX.Element {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setIsLoading(true);

    try {
      await api.post("/api/password-reset/confirm/", {
        uid,
        token,
        new_password: newPassword,
      });

      setIsSuccess(true);
      setTimeout(() => router.push("/"), 2000);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
        "Échec de la réinitialisation. Le lien a peut-être expiré."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue flex items-center justify-center p-4 relative overflow-hidden">

      {/* Carte principale */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100 }}
        className="w-full max-w-md bg-light rounded-3xl shadow-2xl p-8 relative border border-[var(--blue)]/20"
      >
        {/* Overlay de succès */}
        <AnimatePresence>
          {isSuccess && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute inset-0 bg-[var(--jaune)]/10 backdrop-blur-sm flex items-center justify-center rounded-3xl"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-center space-y-4"
              >
                <CheckCircleIcon className="h-16 w-16 text-[var(--jaune)] mx-auto" />
                <p className="text-xl font-semibold text-[var(--jaune)]">
                  Mot de passe réinitialisé !
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* En-tête */}
        <div className="text-center mb-10 space-y-4">
          <motion.div
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            className="inline-flex items-center justify-center"
          >
            <AppLogo size={70} />
          </motion.div>
          <h1 className="text-4xl font-bold text-[var(--blue)]">
            Nouveau mot de passe
          </h1>
          <p className="text-[var(--blue)]/80">Choisissez un mot de passe sécurisé</p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Nouveau mot de passe */}
          <motion.div initial={{ x: -20 }} animate={{ x: 0 }} transition={{ delay: 0.2 }}>
            <div className="group relative">
              <LockClosedIcon className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-[var(--blue)]/60 group-focus-within:text-[var(--jaune)] transition-all" />
              <input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-12 pr-12 py-4 bg-[var(--light)]/30 border border-[var(--blue)]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--jaune)]/50 focus:border-[var(--jaune)]/30 placeholder-[var(--blue)]/50 text-[var(--blue)] transition-all"
                placeholder="Nouveau mot de passe"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--blue)]/60 hover:text-[var(--jaune)] transition-colors"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-[var(--blue)]/60 px-1">Minimum 8 caractères</p>
          </motion.div>

          {/* Confirmation mot de passe */}
          <motion.div initial={{ x: -20 }} animate={{ x: 0 }} transition={{ delay: 0.3 }}>
            <div className="group relative">
              <LockClosedIcon className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-[var(--blue)]/60 group-focus-within:text-[var(--jaune)] transition-all" />
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-12 pr-12 py-4 bg-[var(--light)]/30 border border-[var(--blue)]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--jaune)]/50 focus:border-[var(--jaune)]/30 placeholder-[var(--blue)]/50 text-[var(--blue)] transition-all"
                placeholder="Confirmer le mot de passe"
                required
              />
            </div>
          </motion.div>

          {/* Message d'erreur */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center p-4 bg-[var(--jaune)]/10 border border-[var(--jaune)]/20 rounded-xl text-[var(--jaune)] space-x-2"
              >
                <span>⚠️</span>
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bouton de validation */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading}
            className="w-full py-4 btn-jaune rounded-xl relative overflow-hidden"
          >
            {isLoading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="flex items-center justify-center"
              >
                <Image
                  src="/logo.png"
                  alt="Loading"
                  width={20}
                  height={20}
                  priority
                  unoptimized
                  style={{ maxWidth: '100%', height: 'auto' }}
                />
              </motion.div>
            ) : (
              <span className="relative z-10 flex items-center justify-center space-x-2">
                <span>Réinitialiser le mot de passe</span>
                <span className="opacity-70">→</span>
              </span>
            )}
            <div className="absolute inset-0 opacity-0 hover:opacity-30 transition-opacity bg-gradient-to-r from-white/30 to-transparent" />
          </motion.button>
        </form>

        {/* Lien retour */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center text-[var(--blue)]/80"
        >
          <a
            href="/"
            className="hover:color-jaune transition-colors inline-block hover:underline hover:underline-offset-4"
          >
            ← Retour à la connexion
          </a>
        </motion.div>
      </motion.div>
    </div>
  );
}
