'use client';

import { useState, useEffect } from "react";
import api from "@/lib/axios";
import { useRouter } from "next/navigation";
import { LockClosedIcon, UserIcon, AtSymbolIcon } from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

const RegisterPage = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState(""); // Ajout de l'état pour le sexe
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [particles, setParticles] = useState<{ id: number; initialX: number; initialY: number; duration: number }[]>([]);
  const router = useRouter();

  useEffect(() => {
    const particleData = Array(6).fill(0).map((_, i) => ({
      id: i,
      initialX: Math.random() * 100 - 50,
      initialY: Math.random() * 100 - 50,
      duration: 10 + Math.random() * 10
    }));
    setParticles(particleData);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const res = await api.post("/api/register/", { username, email, password, gender });
      setMessage(res.data.message);
      setIsSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      setError("Une erreur est survenue lors de l'inscription.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 120,
        damping: 12,
      },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--blue)] to-[var(--blue)]/90 flex items-center justify-center p-4 relative overflow-hidden">
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

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100 }}
        className="w-full max-w-md bg-[var(--light)]/20 backdrop-blur-xl rounded-3xl shadow-2xl p-8 relative border border-[var(--blue-ciel)]/20"
      >
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
            Bienvenue Parmi Nous
          </h1>
          <p className="text-[var(--blue)]/80">Commencez votre aventure dès maintenant</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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

          <motion.div initial={{ x: -20 }} animate={{ x: 0 }} transition={{ delay: 0.3 }}>
            <div className="group relative">
              <AtSymbolIcon className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-[var(--blue)]/60 group-focus-within:text-[var(--blue-ciel)] transition-all" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-[var(--light)]/30 border border-[var(--blue)]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--blue-ciel)]/50 focus:border-[var(--blue-ciel)]/30 placeholder-[var(--blue)]/50 text-[var(--blue)] transition-all"
                placeholder="Adresse email"
                required
              />
            </div>
          </motion.div>

          <motion.div initial={{ x: -20 }} animate={{ x: 0 }} transition={{ delay: 0.4 }}>
            <div className="group relative">
              <LockClosedIcon className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-[var(--blue)]/60 group-focus-within:text-[var(--blue-ciel)] transition-all" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-[var(--light)]/30 border border-[var(--blue)]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--blue-ciel)]/50 focus:border-[var(--blue-ciel)]/30 placeholder-[var(--blue)]/50 text-[var(--blue)] transition-all"
                placeholder="••••••••"
                required
              />
            </div>
          </motion.div>

          {/* Champ pour le sexe */}
          <motion.div initial={{ x: -20 }} animate={{ x: 0 }} transition={{ delay: 0.5 }}>
            <div className="group relative">
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full pl-4 pr-4 py-4 bg-[var(--light)]/30 border border-[var(--blue)]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--blue-ciel)]/50 focus:border-[var(--blue-ciel)]/30 text-[var(--blue)] transition-all"
                required
              >
                <option value="" disabled>Sélectionnez votre sexe</option>
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
                <option value="O">Autre</option>
              </select>
            </div>
          </motion.div>

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

          <motion.div variants={itemVariants}>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-jaune hover:bg-blue-ciel text-blue font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.01] flex items-center justify-center space-x-2 relative overflow-hidden shadow-lg hover:shadow-jaune/20"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Création en cours...</span>
                </>
              ) : (
                <>
                  <span>Commencer l'aventure</span>
                  <svg className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                  </svg>
                </>
              )}
            </button>
          </motion.div>
        </form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center space-y-4 text-[var(--blue)]/80"
        >
          <p>
            Déjà membre ?{" "}
            <a
              href="/login"
              className="text-[var(--jaune)] hover:text-[var(--blue-ciel)] font-medium"
            >
              Connectez-vous
            </a>
          </p>
        </motion.div>
      </motion.div>

      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute w-2 h-2 bg-[var(--blue-ciel)]/20 rounded-full"
          initial={{
            scale: 0,
            x: particle.initialX,
            y: particle.initialY
          }}
          animate={{
            scale: [0, 1, 0],
            x: "100vw",
            rotate: 360
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      ))}
    </div>
  );
};

export default RegisterPage;
