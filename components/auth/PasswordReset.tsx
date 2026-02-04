"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { resetPassword } from "../../lib/api/auth-api";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function PasswordReset() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Invalid reset token");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword({ token, password });
      setSuccess(true);
      setTimeout(() => {
        router.push("/signin");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Failed to reset password. The link may have expired.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="card max-w-md mx-auto text-center"
      >
        <div className="text-6xl mb-4">❌</div>
        <h2 className="text-3xl font-bold mb-4 text-red-600">Invalid Reset Link</h2>
        <p className="text-gray-600 mb-6">The password reset link is invalid or has expired.</p>
        <Link href="/forgot-password" className="btn-primary inline-block">
          Request New Reset Link
        </Link>
      </motion.div>
    );
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="card max-w-md mx-auto text-center"
      >
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-3xl font-bold mb-4 text-green-600">Password Reset!</h2>
        <p className="text-gray-600 mb-6">Your password has been reset successfully.</p>
        <p className="text-sm text-gray-500 mb-6">Redirecting to sign in...</p>
        <Link href="/signin" className="btn-primary inline-block">
          Go to Sign In
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="card max-w-md mx-auto"
    >
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">
          <span className="gradient-text">Reset Password</span>
        </h2>
        <p className="text-gray-600">Enter your new password</p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700"
        >
          {error}
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            New Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            placeholder="At least 8 characters"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
            Confirm New Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            placeholder="Confirm your new password"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Resetting password..." : "Reset Password"}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link href="/signin" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
          Back to Sign In
        </Link>
      </div>
    </motion.div>
  );
}
