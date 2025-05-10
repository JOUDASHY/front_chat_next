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
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
    // Check for Google auth code only on client side
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      if (code) {
        handleGoogleLogin(code);
      }
    }
  }, []);

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
  
  const handleGoogleLogin = async (code?: string) => {
    setError('');
    setIsLoading(true);
    
    if (!code) {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/auth/google/`
        );
        if (!response.ok) throw new Error("Erreur de connexion au serveur");
        const { authorization_url } = await response.json();
        if (typeof window !== 'undefined') {
          window.location.href = authorization_url;
        }
      } catch (error) {
        console.error("Erreur lors de la redirection vers Google :", error);
        setError("Impossible de se connecter à Google. Veuillez réessayer.");
      } finally {
        setIsLoading(false);
      }
    } else {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/auth/google/callback/?code=${code}`
        );
        if (!response.ok) throw new Error("Erreur d'authentification");
        const data = await response.json();

        if (!data.access_token || !data.user) {
          throw new Error("Réponse du serveur invalide");
        }

        localStorage.setItem("accessToken", data.access_token);
        localStorage.setItem("user", JSON.stringify(data.user));

        setIsSuccess(true);
        await new Promise(resolve => setTimeout(resolve, 2000));
        router.push("/chat");
      } catch (err: any) {
        console.error("Google login échoué :", err);
        setError("La connexion avec Google a échoué. Veuillez réessayer.");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleForgotPassword = () => {
    router.push("/emailreset");
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
            className="inline-block p-4 rounded-full bg-gradient-to-r from-[var(--jaune)] to-[var(--blue-ciel)] w-[80px] h-[80px] flex items-center justify-center"
          >
            <Image
              src="/logo.png"
              alt="Logo"
              width={40}
              height={40}
              priority
              unoptimized
              style={{
                maxWidth: '100%',
                height: 'auto'
              }}
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
                <Image 
                  src="/logo.png"
                  alt="Loading" 
                  width={20} 
                  height={20} 
                  priority
                  unoptimized
                  style={{
                    maxWidth: '100%',
                    height: 'auto'
                  }}
                />
              </motion.div>
            ) : (
              <span className="relative z-10 flex items-center justify-center space-x-2">
                <span>Se connecter</span>
                <span className="opacity-70">→</span>
              </span>
            )}
            <div className="absolute inset-0 opacity-0 hover:opacity-30 transition-opacity bg-gradient-to-r from-white/30 to-transparent" />
          </motion.button>

          {/* Bouton Google */}
          <motion.button
            onClick={() => handleGoogleLogin()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            className="w-full mt-4 py-4 bg-white text-gray-600 rounded-xl relative overflow-hidden flex items-center justify-center space-x-2 hover:bg-gray-50 transition-colors"
          >
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg"
              alt="Google"
              width={20}
              height={20}
              className="w-5 h-5"
            />
            <span>Se connecter avec Google</span>
          </motion.button>

        </form>

        {/* Liens footer */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-8 text-center space-y-4 text-[var(--blue)]/80">
          <a
            href="/emailreset"
            onClick={(e) => {
              e.preventDefault();
              handleForgotPassword();
            }}
            className="hovforgot-passworder:text-[var(--blue-ciel)] transition-colors inline-block hover:underline hover:underline-offset-4"
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

      {/* Particules flottantes - only render on client side */}
      {isClient && [...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-[var(--blue-ciel)]/20 rounded-full"
          initial={{
            scale: 0,
            x: `${Math.floor(i * 60)}%`,  // Use deterministic values based on index
            y: `${Math.floor(i * 40)}%`
          }}
          animate={{
            scale: [0, 1, 0],
            x: ["0%", "100%"],
            rotate: 360
          }}
          transition={{
            duration: 10 + i * 2, // Use index for different durations
            repeat: Infinity,
            ease: "linear"
          }}
        />
      ))}
    </div>
  );
};

export default LoginPage;