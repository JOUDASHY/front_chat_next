"use client";

import { useState } from "react";
import api from "@/lib/axios";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import AppLogo from "@/components/AppLogo";
import LoadingOverlay from "@/components/LoadingOverlay";
import { IconAt, IconLock, IconEye, IconArrow, IconAlert, IconUser, LeftPanel, Field } from "@/components/AuthShared";

const RegisterPage = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);

    try {
      const res = await api.post("/api/register/", {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        password,
        gender,
      });
      setMessage(res.data.message);
      setIsSuccess(true);
      setTimeout(() => router.push("/"), 2000);
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: Record<string, string[] | string> } };
      const data = apiErr.response?.data;
      if (data && typeof data === 'object') {
        const first = Object.values(data).flat()[0];
        if (typeof first === 'string') {
          setError(first);
          return;
        }
      }
      setError("Une erreur est survenue lors de l'inscription.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f7] dark:bg-gray-950 flex items-center justify-center p-4 lg:p-8 transition-colors">

      <LoadingOverlay
        visible={isLoading || isSuccess}
        message={isSuccess ? "Inscription réussie…" : "Création de votre compte…"}
      />

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
        <LeftPanel 
          title="Rejoignez<br /><em class='not-italic' style='color: var(--jaune)'>l'aventure.</em>"
          subtitle="Créez votre compte en quelques secondes et commencez à discuter."
          quote="La meilleure plateforme pour rester connecté avec mon équipe et mes amis."
          quoteAuthor="Alex D. — Développeur"
          quoteInitials="AD"
        />

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
            <div className="flex lg:hidden justify-center mb-6">
              <AppLogo size={52} />
            </div>
            <h1 className="text-2xl font-semibold text-[var(--blue)] dark:text-gray-100 tracking-tight mb-1.5">
              Créer un compte ✨
            </h1>
            <p className="text-sm text-[var(--blue)]/55 dark:text-gray-400">
              Remplissez les champs ci-dessous pour vous inscrire.
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
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            
            <div className="grid grid-cols-2 gap-3">
              <Field
                id="firstName"
                label="Prénom"
                icon={<IconUser />}
                inputProps={{
                  type: "text",
                  value: firstName,
                  onChange: (e) => setFirstName(e.target.value),
                  placeholder: "John",
                  required: true,
                }}
              />
              <Field
                id="lastName"
                label="Nom"
                icon={<IconUser />}
                inputProps={{
                  type: "text",
                  value: lastName,
                  onChange: (e) => setLastName(e.target.value),
                  placeholder: "Doe",
                  required: true,
                }}
              />
            </div>

            <Field
              id="email"
              label="Adresse email"
              icon={<IconAt />}
              inputProps={{
                type: "email",
                value: email,
                onChange: (e) => setEmail(e.target.value),
                placeholder: "vous@exemple.com",
                autoComplete: "email",
                required: true,
              }}
            />

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
                required: true,
              }}
            />

            <Field
              id="gender"
              label="Sexe"
              isSelect={true}
              inputProps={{
                value: gender,
                onChange: (e) => setGender(e.target.value),
                required: true,
              }}
            >
              <option value="" disabled>Sélectionnez votre sexe</option>
              <option value="M">Masculin</option>
              <option value="F">Féminin</option>
              <option value="O">Autre</option>
            </Field>

            <motion.button
              type="submit"
              disabled={isLoading || isSuccess}
              whileHover={{ scale: isLoading || isSuccess ? 1 : 1.015 }}
              whileTap={{ scale: isLoading || isSuccess ? 1 : 0.985 }}
              className="btn-jaune w-full rounded-xl disabled:opacity-60 disabled:cursor-not-allowed transition-opacity mt-2"
              style={{ padding: "14px 20px", minHeight: 52 }}
            >
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, lineHeight: 1 }}>
                <span>Commencer l'aventure</span>
                <IconArrow />
              </span>
            </motion.button>

          </form>

          {/* Footer */}
          <p className="mt-8 text-center text-sm text-[var(--blue)]/55 dark:text-gray-400">
            Déjà membre ?{" "}
            <a
              href="/"
              className="text-[var(--jaune)] hover:text-[var(--blue)] dark:hover:text-gray-200 font-medium transition-colors"
            >
              Connectez-vous
            </a>
          </p>

        </div>
      </motion.div>
    </div>
  );
};

export default RegisterPage;
