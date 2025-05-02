"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import api from "@/lib/axios";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LockClosedIcon, UserIcon } from "@heroicons/react/24/outline";

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const { data } = await api.post("/api/token/", {
        username,
        password
      });

      if (!data.access || !data.refresh || !data.user) {
        throw new Error("Réponse du serveur invalide");
      }

      localStorage.setItem("accessToken", data.access);
      localStorage.setItem("refreshToken", data.refresh);
      localStorage.setItem("user", JSON.stringify(data.user));

      setIsSuccess(true);
      await new Promise(resolve => setTimeout(resolve, 2000));
      router.push("/chat");

    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
        "Échec de la connexion. Vérifiez vos identifiants."
      );
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--blue)] to-[var(--blue)]/90 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Arrière-plan animé */}
      <motion.div
        className="absolute inset-0 opacity-10"
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        <div className="w-full h-full bg-[url('https://www.transparenttextures.com/patterns/dark-stripes.png')]" />
      </motion.div>

      {/* Carte principale */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100 }}
        className="w-full max-w-md bg-[var(--light)]/20 backdrop-blur-xl rounded-3xl shadow-2xl p-8 relative border border-[var(--blue-ciel)]/20"
      >
        {/* Overlay de succès */}
        <AnimatePresence>
          {isSuccess && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute inset-0 bg-[var(--blue-ciel)]/10 backdrop-blur-sm flex items-center justify-center rounded-3xl"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-[var(--blue-ciel)] text-4xl"
              >
                ✓
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* En-tête */}
        <div className="text-center mb-10 space-y-4">
          <motion.div
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            className="inline-block p-4 rounded-full bg-gradient-to-r from-[var(--jaune)] to-[var(--blue-ciel)]"
          >
            <Image
              src="/logo.png"
              alt="Logo"
              width={48}
              height={48}
              className="object-contain"
            />
          </motion.div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[var(--blue-ciel)] to-[var(--jaune)] bg-clip-text text-transparent">
            Welcome Back
          </h1>
          <p className="text-[var(--blue)]/80">Votre univers personnel vous attend</p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Champ utilisateur */}
          <motion.div initial={{ x: -20 }} animate={{ x: 0 }} transition={{ delay: 0.2 }}>
            <div className="group relative">
              <UserIcon className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-[var(--blue)]/60 group-focus-within:text-[var(--blue-ciel)] transition-all" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-[var(--light)]/30 border border-[var(--blue)]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--blue-ciel)]/50 focus:border-[var(--blue-ciel)]/30 placeholder-[var(--blue)]/50 text-[var(--blue)] transition-all"
                placeholder="Nom d'utilisateur"
                required
              />
            </div>
          </motion.div>

          {/* Champ mot de passe */}
          <motion.div initial={{ x: -20 }} animate={{ x: 0 }} transition={{ delay: 0.3 }}>
            <div className="group relative">
              <LockClosedIcon className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-[var(--blue)]/60 group-focus-within:text-[var(--blue-ciel)] transition-all" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-12 py-4 bg-[var(--light)]/30 border border-[var(--blue)]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--blue-ciel)]/50 focus:border-[var(--blue-ciel)]/30 placeholder-[var(--blue)]/50 text-[var(--blue)] transition-all"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--blue)]/60 hover:text-[var(--blue-ciel)] transition-colors"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
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

          {/* Bouton de connexion */}
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
                <span>Se connecter</span>
                <span className="opacity-70">→</span>
              </span>
            )}
            <div className="absolute inset-0 opacity-0 hover:opacity-30 transition-opacity bg-gradient-to-r from-white/30 to-transparent" />
          </motion.button>
        </form>

        {/* Liens footer */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-8 text-center space-y-4 text-[var(--blue)]/80">
          <a
            href="/forgot-password"
            className="hover:text-[var(--blue-ciel)] transition-colors inline-block hover:underline hover:underline-offset-4"
          >
            Mot de passe oublié ?
          </a>
          <p>
            Nouveau membre ?{" "}
            <a
              href="/register"
              className="text-[var(--jaune)] hover:text-[var(--blue-ciel)] font-medium"
            >
              Créer un compte
            </a>
          </p>
        </motion.div>
      </motion.div>

      {/* Particules flottantes */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-[var(--blue-ciel)]/20 rounded-full"
          initial={{
            scale: 0,
            x: Math.random() * 100 - 50,
            y: Math.random() * 100 - 50
          }}
          animate={{
            scale: [0, 1, 0],
            x: "100vw",
            rotate: 360
          }}
          transition={{
            duration: 10 + Math.random() * 10,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      ))}
    </div>
  );
};

export default LoginPage;