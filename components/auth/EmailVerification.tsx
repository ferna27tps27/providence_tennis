"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";
import { verifyEmail } from "../../lib/api/auth-api";
import Link from "next/link";

export default function EmailVerification() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (token) {
      handleVerify();
    } else if (email) {
      setStatus("loading");
      setMessage("Please check your email for the verification link.");
    } else {
      setStatus("error");
      setMessage("Invalid verification link.");
    }
  }, [token, email]);

  const handleVerify = async () => {
    if (!token) return;

    try {
      const result = await verifyEmail({ token });
      setStatus("success");
      setMessage(result.message || "Email verified successfully!");
      setTimeout(() => {
        router.push("/signin");
      }, 3000);
    } catch (error: any) {
      setStatus("error");
      setMessage(error.message || "Failed to verify email. The link may have expired.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="card max-w-md mx-auto text-center"
    >
      {status === "loading" && (
        <>
          <div className="text-6xl mb-4">📧</div>
          <h2 className="text-3xl font-bold mb-4">
            <span className="gradient-text">Verify Your Email</span>
          </h2>
          <p className="text-gray-600 mb-6">{message || "Verifying your email address..."}</p>
          {token && (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          )}
        </>
      )}

      {status === "success" && (
        <>
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-3xl font-bold mb-4 text-green-600">Email Verified!</h2>
          <p className="text-gray-600 mb-6">{message}</p>
          <p className="text-sm text-gray-500 mb-6">Redirecting to sign in...</p>
          <Link href="/signin" className="btn-primary inline-block">
            Go to Sign In
          </Link>
        </>
      )}

      {status === "error" && (
        <>
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-3xl font-bold mb-4 text-red-600">Verification Failed</h2>
          <p className="text-gray-600 mb-6">{message}</p>
          <div className="space-y-3">
            <Link href="/signin" className="btn-primary inline-block w-full">
              Go to Sign In
            </Link>
            <Link href="/forgot-password" className="btn-secondary inline-block w-full">
              Request New Verification Email
            </Link>
          </div>
        </>
      )}
    </motion.div>
  );
}
