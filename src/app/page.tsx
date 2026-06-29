"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/axios";
import { useRouter } from "next/navigation";
import AppLogo from "@/components/AppLogo";
import LoadingOverlay from "@/components/LoadingOverlay";

import { IconAt, IconLock, IconEye, IconArrow, IconAlert, GoogleIcon, LeftPanel, Field } from "@/components/AuthShared";
import { Browser } from "@capacitor/browser";

/* ─────────────────────────────────────────────
   Page principale
───────────────────────────────────────────── */
const LoginPage = () => {
  const [loginId, setLoginId]       = useState("");
  const [password, setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]           = useState("");
  const [isLoading, setIsLoading]   = useState(false);
  const [isSuccess, setIsSuccess]   = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    if (code) { handleGoogleLogin(code); return; }
    const token = localStorage.getItem("accessToken");
    if (token) router.replace("/chat");
  }, []);

  /* ── Connexion classique ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL;
      const url  = base ? `${base}/api/token/` : `/api/token/`;
      const { data } = await api.post(url, { username: loginId, password });

      if (!data.access || !data.refresh || !data.user)
        throw new Error("Réponse du serveur invalide");

      localStorage.setItem("accessToken",  data.access);
      localStorage.setItem("refreshToken", data.refresh);
      localStorage.setItem("user",         JSON.stringify(data.user));
      window.dispatchEvent(new Event("auth-changed"));

      setIsSuccess(true);
      await new Promise((r) => setTimeout(r, 2000));
      router.replace("/chat");
    } catch (err: any) {
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

  /* ── Connexion Google ── */
const handleGoogleLogin = async (code?: string) => {
  setError("");
  setIsLoading(true);

  const apiBase =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // ============================
  // 1) Demande connexion Google
  // ============================
  if (!code) {
    try {
      const isCapacitor =
        typeof window !== "undefined" &&
        !!(window as any).Capacitor;

      const redirectUri = isCapacitor
        ? "com.chatbeast.app://auth"
        : `${window.location.origin}/auth/google/callback`;

      const res = await fetch(
        `${apiBase}/auth/google/?redirect_uri=${encodeURIComponent(
          redirectUri
        )}`
      );

      if (!res.ok) {
        throw new Error("Impossible de récupérer URL Google");
      }

      const { authorization_url } = await res.json();

      if (!authorization_url) {
        throw new Error("URL Google manquante");
      }


      // Android Capacitor
      if (isCapacitor) {
        await Browser.open({
          url: authorization_url,
        });

      } 
      // Web normal
      else {
        window.location.href = authorization_url;
      }


    } catch (error) {

      console.error(
        "Google Login Error:",
        error
      );

      setError(
        "Impossible de se connecter à Google. Veuillez réessayer."
      );

    } finally {

      setIsLoading(false);

    }


  // ============================
  // 2) Retour Google avec code
  // ============================
  } else {

    try {

      const res = await fetch(
        `${apiBase}/auth/google/callback/?code=${encodeURIComponent(code)}`
      );


      if (!res.ok) {
        throw new Error(
          "Erreur callback Google"
        );
      }


      const data = await res.json();


      if (
        !data.access_token ||
        !data.user
      ) {
        throw new Error(
          "Token utilisateur absent"
        );
      }


      localStorage.setItem(
        "accessToken",
        data.access_token
      );


      if (data.refresh_token) {

        localStorage.setItem(
          "refreshToken",
          data.refresh_token
        );

      }


      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );


      window.dispatchEvent(
        new Event("auth-changed")
      );


      setIsSuccess(true);


      await new Promise(
        (resolve) =>
          setTimeout(resolve, 2000)
      );


      router.replace("/chat");


    } catch (error) {


      console.error(
        "Google Callback Error:",
        error
      );


      setError(
        "La connexion avec Google a échoué. Veuillez réessayer."
      );


      localStorage.removeItem(
        "accessToken"
      );

      localStorage.removeItem(
        "refreshToken"
      );

      localStorage.removeItem(
        "user"
      );


    } finally {


      setIsLoading(false);


    }
  }
};

  return (
    <div className="min-h-screen bg-[#f0f2f7] dark:bg-gray-950 flex items-center justify-center p-4 lg:p-8 transition-colors">

      {/* Overlay chargement / succès */}
      <LoadingOverlay
        visible={isLoading || isSuccess}
        message={isSuccess ? "Connexion réussie…" : "Connexion en cours…"}
      />

      {/* Carte principale */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="
          w-full max-w-[920px]
          flex
          rounded-3xl overflow-hidden
          shadow-2xl
          min-h-[600px]
        "
      >
        {/* ── Panneau gauche (desktop uniquement) ── */}
        <LeftPanel />

        {/* ── Panneau droit : formulaire ── */}
        <div className="
          flex-1
          bg-white dark:bg-gray-900
          flex flex-col justify-center
          px-8 py-12
          sm:px-12
          lg:px-14
        ">

          {/* En-tête */}
          <div className="mb-8">
            {/* Logo visible uniquement sur mobile (le panneau gauche est caché) */}
            <div className="flex lg:hidden justify-center mb-6">
              <AppLogo size={52} />
            </div>
            {/* <h1 className="text-2xl font-semibold text-[var(--blue)] dark:text-gray-100 tracking-tight mb-1.5">
              Bon retour 👋
            </h1> */}
            <p className="text-sm text-[var(--blue)]/55 dark:text-gray-400">
              Entrez vos identifiants pour continuer.
            </p>
          </div>

          {/* Erreur */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-2.5 p-3.5 mb-5 rounded-xl text-sm
                  bg-red-50 border border-red-200 text-red-700
                  dark:bg-red-950/30 dark:border-red-900/50 dark:text-red-400"
                >
                  <IconAlert className="shrink-0" />
                  <span>{error}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">

            {/* Email / identifiant */}
            <Field
              id="loginId"
              label="Email ou identifiant"
              hint="Utilisez l'email ou l'identifiant choisi à l'inscription."
              icon={<IconAt />}
              inputProps={{
                type: "text",
                value: loginId,
                onChange: (e) => setLoginId(e.target.value),
                placeholder: "vous@exemple.com ou @pseudo",
                autoComplete: "username",
                required: true,
              }}
            />

            {/* Mot de passe */}
            <div className="flex flex-col gap-1.5">
              <Field
                id="password"
                label="Mot de passe"
                icon={<IconLock />}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[var(--blue)]/40 hover:text-[var(--blue)] dark:text-gray-500 dark:hover:text-[var(--jaune)] transition-colors p-0.5"
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    <IconEye closed={showPassword} />
                  </button>
                }
                inputProps={{
                  type: showPassword ? "text" : "password",
                  value: password,
                  onChange: (e) => setPassword(e.target.value),
                  placeholder: "••••••••",
                  autoComplete: "current-password",
                  required: true,
                }}
              />
              {/* Mot de passe oublié — aligné à droite sous le champ */}
              <div className="flex justify-end">
                <a
                  href="/emailreset"
                  onClick={(e) => { e.preventDefault(); router.push("/emailreset"); }}
                  className="text-xs text-[var(--blue)]/55 hover:text-[var(--blue)] dark:text-gray-500 dark:hover:text-gray-300 transition-colors hover:underline underline-offset-2"
                >
                  Mot de passe oublié ?
                </a>
              </div>
            </div>

            {/* Bouton Se connecter */}
            <motion.button
              type="submit"
              disabled={isLoading || isSuccess}
              whileHover={{ scale: isLoading || isSuccess ? 1 : 1.015 }}
              whileTap={{ scale: isLoading || isSuccess ? 1 : 0.985 }}
              className="btn-jaune w-full rounded-xl disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
              style={{ padding: "14px 20px", minHeight: 52 }}
            >
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, lineHeight: 1 }}>
                <span>Se connecter</span>
                <IconArrow />
              </span>
            </motion.button>

            {/* Séparateur */}
            <div className="flex items-center gap-3 my-1">
              <hr className="flex-1 border-t border-[var(--blue)]/10 dark:border-gray-700" />
              <span className="text-xs text-[var(--blue)]/40 dark:text-gray-500 whitespace-nowrap">
                ou continuer avec
              </span>
              <hr className="flex-1 border-t border-[var(--blue)]/10 dark:border-gray-700" />
            </div>

            {/* Bouton Google */}
            <motion.button
              type="button"
              disabled={isLoading || isSuccess}
              onClick={() => handleGoogleLogin()}
              whileHover={{ scale: isLoading || isSuccess ? 1 : 1.015 }}
              whileTap={{ scale: isLoading || isSuccess ? 1 : 0.985 }}
              className="btn-blue w-full rounded-xl disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
              style={{ padding: "13px 20px", minHeight: 50 }}
            >
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, lineHeight: 1 }}>
                <GoogleIcon />
                <span>Se connecter avec Google</span>
              </span>
            </motion.button>

          </form>

          {/* Footer */}
          <p className="mt-8 text-center text-sm text-[var(--blue)]/55 dark:text-gray-400">
            Nouveau membre ?{" "}
            <a
              href="/register"
              className="text-[var(--jaune)] hover:text-[var(--blue)] dark:hover:text-gray-200 font-medium transition-colors"
            >
              Créer un compte
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;