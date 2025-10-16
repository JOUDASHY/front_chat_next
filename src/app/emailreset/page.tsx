"use client";

import { useState } from "react";
import Image from "next/image";
import api from "@/lib/axios";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { EnvelopeIcon, CheckCircleIcon } from "@heroicons/react/24/outline";

const EmailResetPage = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await api.post("/api/password-reset/", {
        email: email,
      });

      setIsSuccess(true);
      setTimeout(() => router.push("/"), 2000);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
        "Échec de l'envoi de l'email. Veuillez réessayer plus tard."
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
                  Email envoyé !
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
            className="inline-block p-4 rounded-full bg-jaune"
          >
            <EnvelopeIcon className="h-8 w-8 text-white" />
          </motion.div>
          <h1 className="text-4xl font-bold text-[var(--blue)]">
            Réinitialisation du mot de passe
          </h1>
          <p className="text-[var(--blue)]/80">Entrez votre adresse email pour recevoir un lien de réinitialisation</p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Champ email */}
          <motion.div initial={{ x: -20 }} animate={{ x: 0 }} transition={{ delay: 0.2 }}>
            <div className="group relative">
              <EnvelopeIcon className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-[var(--blue)]/60 group-focus-within:text-[var(--jaune)] transition-all" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-[var(--light)]/30 border border-[var(--blue)]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--jaune)]/50 focus:border-[var(--jaune)]/30 placeholder-[var(--blue)]/50 text-[var(--blue)] transition-all"
                placeholder="Adresse email"
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
                <span className="text-[var(--jaune)]">⚠️</span>
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
                <Image src="/logo.png" alt="Loading" width={20} height={20} className="animate-spin" />
              </motion.div>
            ) : (
              <span className="relative z-10 flex items-center justify-center space-x-2">
                <span>Envoyer le lien</span>
                <span className="opacity-70">🔗</span>
              </span>
            )}
          </motion.button>
        </form>

        {/* Lien retour */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
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
      {/* Décor retiré pour un design plus sobre */}
    </div>
  );
};

export default EmailResetPage;
