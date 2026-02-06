"use client";

import { useState, useEffect } from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe, Stripe, StripeElementsOptions } from "@stripe/stripe-js";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

let stripePromiseCache: Promise<Stripe | null> | null = null;

/**
 * Fetch the publishable key from the backend and load Stripe.
 * The promise is cached so it only fetches once.
 */
function getStripePromise(): Promise<Stripe | null> {
  if (stripePromiseCache) return stripePromiseCache;

  stripePromiseCache = fetch(`${API_BASE_URL}/api/config/stripe`)
    .then((res) => {
      if (!res.ok) return null;
      return res.json();
    })
    .then((data) => {
      if (!data?.publishableKey) return null;
      return loadStripe(data.publishableKey);
    })
    .catch(() => null);

  return stripePromiseCache;
}

interface PaymentFormInnerProps {
  amount: number; // in dollars
  onSuccess: (paymentIntentId: string) => void;
  onError: (message: string) => void;
  onBack: () => void;
  loading?: boolean;
}

function PaymentFormInner({
  amount,
  onSuccess,
  onError,
  onBack,
  loading: externalLoading,
}: PaymentFormInnerProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: "if_required",
      });

      if (error) {
        setErrorMessage(error.message || "Payment failed. Please try again.");
        onError(error.message || "Payment failed");
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        onSuccess(paymentIntent.id);
      } else {
        setErrorMessage("Payment was not completed. Please try again.");
        onError("Payment was not completed");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
      onError(err.message || "An unexpected error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  const isLoading = isProcessing || externalLoading;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 bg-primary-50 rounded-lg border border-primary-200">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            Court Booking - 1 Hour
          </span>
          <span className="text-xl font-bold text-primary-700">
            ${amount.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <PaymentElement
          options={{
            layout: "tabs",
          }}
        />
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{errorMessage}</p>
        </div>
      )}

      <div className="flex gap-4">
        <button
          type="button"
          onClick={onBack}
          disabled={isLoading}
          className="btn-secondary flex-1 disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={!stripe || !elements || isLoading}
          className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Processing...
            </span>
          ) : (
            `Pay $${amount.toFixed(2)}`
          )}
        </button>
      </div>

      <p className="text-xs text-gray-500 text-center">
        Your payment is securely processed by Stripe. Card details never touch
        our servers.
      </p>
    </form>
  );
}

interface StripePaymentFormProps {
  clientSecret: string;
  amount: number; // in dollars
  onSuccess: (paymentIntentId: string) => void;
  onError: (message: string) => void;
  onBack: () => void;
  loading?: boolean;
}

export default function StripePaymentForm({
  clientSecret,
  amount,
  onSuccess,
  onError,
  onBack,
  loading,
}: StripePaymentFormProps) {
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [stripeReady, setStripeReady] = useState(false);
  const [stripeError, setStripeError] = useState(false);

  useEffect(() => {
    const promise = getStripePromise();
    setStripePromise(promise);
    promise.then((s) => {
      if (s) {
        setStripeReady(true);
      } else {
        setStripeError(true);
      }
    });
  }, []);

  if (stripeError) {
    return (
      <div className="p-6 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
        <h4 className="font-semibold text-yellow-800 mb-2">
          Payment Not Available
        </h4>
        <p className="text-sm text-yellow-700">
          Stripe is not configured. Please set{" "}
          <code className="bg-yellow-100 px-1 rounded">
            NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
          </code>{" "}
          in your <code className="bg-yellow-100 px-1 rounded">backend/.env</code>{" "}
          file.
        </p>
        <button onClick={onBack} className="btn-secondary mt-4">
          Go Back
        </button>
      </div>
    );
  }

  if (!stripePromise || !stripeReady) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
        <p className="mt-4 text-gray-600">Loading payment form...</p>
      </div>
    );
  }

  const elementsOptions: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: "stripe",
      variables: {
        colorPrimary: "#0d9488",
        colorBackground: "#ffffff",
        colorText: "#1f2937",
        colorDanger: "#dc2626",
        fontFamily: "system-ui, -apple-system, sans-serif",
        borderRadius: "8px",
        spacingUnit: "4px",
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={elementsOptions}>
      <PaymentFormInner
        amount={amount}
        onSuccess={onSuccess}
        onError={onError}
        onBack={onBack}
        loading={loading}
      />
    </Elements>
  );
}
