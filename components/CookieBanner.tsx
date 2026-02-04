"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already accepted cookies
    const cookieAccepted = localStorage.getItem("cookieAccepted");
    if (!cookieAccepted) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookieAccepted", "true");
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 text-white shadow-2xl"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex-1">
                <h4 className="text-lg font-bold mb-2">
                  This website uses cookies.
                </h4>
                <p className="text-sm text-gray-300 leading-relaxed">
                  We use cookies to analyze website traffic and optimize your
                  website experience. By accepting our use of cookies, your data
                  will be aggregated with all other user data.
                </p>
              </div>
              <button
                onClick={handleAccept}
                className="btn-primary whitespace-nowrap text-base"
              >
                ACCEPT
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}