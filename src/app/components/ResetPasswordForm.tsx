"use client";

import { useState } from "react";
import Image from "next/image";
import api from "@/lib/axios";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LockClosedIcon, CheckCircleIcon } from "@heroicons/react/24/outline";

type ResetPasswordFormProps = {
  uid: string;
  token: string;
};

const ResetPasswordForm = ({ uid, token }: ResetPasswordFormProps) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  // ...existing code for handleSubmit and the entire JSX...
};

export default ResetPasswordForm;
