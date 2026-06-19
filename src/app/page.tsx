"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/axios";
import { useRouter } from "next/navigation";
import { LockClosedIcon, AtSymbolIcon } from "@heroicons/react/24/outline";
import AppLogo from "@/components/AppLogo";
import LoadingOverlay from "@/components/LoadingOverlay";

const LoginPage = () => {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    // Si Google redirige avec un code → traiter en priorité, peu importe le token
    if (code) {
      handleGoogleLogin(code);
      return;
    }

    // Sinon, si déjà connecté → rediriger directement
    const token = localStorage.getItem('accessToken');
    if (token) {
      router.replace('/chat');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    console.log('API_URL', process.env.NEXT_PUBLIC_API_URL);
    console.log('axios baseURL', api.defaults.baseURL);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL;
      const url = base ? `${base}/api/token/` : `/api/token/`;
      const { data } = await api.post(url, {
        username: loginId,
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
      router.replace("/chat");

    } catch (err: any) {
      console.error('Login error', {
        status: err?.response?.status,
        data: err?.response?.data,
        url: err?.config?.url,
        method: err?.config?.method,
      });
      setError(
        err?.response?.data?.detail ||
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
        router.replace("/chat");
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
    <div className="min-h-screen bg-blue flex items-center justify-center p-4 relative overflow-hidden">

      {/* Overlay de chargement / succès plein écran */}
      <LoadingOverlay
        visible={isLoading || isSuccess}
        message={isSuccess ? 'Connexion réussie…' : 'Connexion en cours…'}
      />

      {/* Carte principale */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100 }}
        className="w-full max-w-md bg-light rounded-3xl shadow-2xl p-8 relative border border-[var(--blue)]/20"
      >
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
            Welcome Back
          </h1>
          <p className="text-[var(--blue)]/80">Votre univers personnel vous attend</p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Connexion : email ou identifiant */}
          <motion.div initial={{ x: -20 }} animate={{ x: 0 }} transition={{ delay: 0.2 }}>
            <div className="group relative">
              <AtSymbolIcon className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-[var(--blue)]/60 group-focus-within:text-[var(--jaune)] transition-all" />
              <input
                type="text"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-[var(--light)]/30 border border-[var(--blue)]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--jaune)]/50 focus:border-[var(--jaune)]/30 placeholder-[var(--blue)]/50 text-[var(--blue)] transition-all"
                placeholder="Email ou identifiant (@pseudo)"
                autoComplete="username"
                required
              />
            </div>
            <p className="mt-1.5 text-xs text-[var(--blue)]/60 px-1">
              Utilisez l&apos;email ou l&apos;identifiant choisi à l&apos;inscription
            </p>
          </motion.div>

          {/* Champ mot de passe */}
          <motion.div initial={{ x: -20 }} animate={{ x: 0 }} transition={{ delay: 0.3 }}>
            <div className="group relative">
              <LockClosedIcon className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-[var(--blue)]/60 group-focus-within:text-[var(--jaune)] transition-all" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-12 py-4 bg-[var(--light)]/30 border border-[var(--blue)]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--jaune)]/50 focus:border-[var(--jaune)]/30 placeholder-[var(--blue)]/50 text-[var(--blue)] transition-all"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--blue)]/60 hover:text-[var(--jaune)] transition-colors"
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

{/* Bouton Se connecter */}
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  type="submit"
  disabled={isLoading || isSuccess}
  className="w-full btn-jaune rounded-xl relative overflow-hidden"
  style={{ padding: '16px', fontSize: '16px', minHeight: '56px' }}
>
  <span className="relative z-10 flex items-center justify-center gap-3">
    <span>Se connecter</span>
    <span className="opacity-70">→</span>
  </span>
  <div className="absolute inset-0 opacity-0 hover:opacity-30 transition-opacity bg-gradient-to-r from-white/30 to-transparent" />
</motion.button>

{/* Bouton Google */}
<motion.button
  onClick={() => handleGoogleLogin()}
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  type="button"
  className="w-full mt-4 btn-blue rounded-xl relative overflow-hidden"
  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '16px', fontSize: '16px', minHeight: '56px' }}
>
  <svg width="20" height="20" viewBox="0 0 24 24" style={{ display: 'block', flexShrink: 0 }}>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
  <span style={{ lineHeight: 1 }}>Se connecter avec Google</span>
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
            className="hover:color-jaune transition-colors inline-block hover:underline hover:underline-offset-4"
          >
            Mot de passe oublié ?
          </a>
          <p>
            Nouveau membre ?{" "}
            <a
              href="/register"
              className="text-[var(--jaune)] hover:text-[var(--blue)] font-medium"
            >
              Créer un compte
            </a>
          </p>
        </motion.div>
      </motion.div>

      {/* Décor retiré pour un design plus simple et sobre */}
    </div>
  );
};

export default LoginPage;