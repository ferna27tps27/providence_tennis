"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { useAuth } from "@/lib/auth/auth-context";
import StripePaymentForm from "@/components/StripePaymentForm";
import {
  confirmPaymentOnServer,
  createPaymentIntent,
} from "@/lib/api/payment-api";
import {
  createSummerCampRegistration,
  SummerCampRegistrationResponse,
  SummerCampSessionPreference,
  SummerCampSkillLevel,
  SummerCampTrack,
} from "@/lib/api/summer-camp-api";

const weekOptions = [
  "Week 1 · June 15-19",
  "Week 2 · June 22-26",
  "Week 3 · June 29-July 3",
  "Week 4 · July 6-10",
  "Week 5 · July 13-17",
  "Week 6 · July 20-24",
  "Week 7 · July 27-31",
  "Week 8 · August 3-7",
  "Week 9 · August 10-14",
  "Week 10 · August 17-21",
];

const trackOptions: { value: SummerCampTrack; label: string; description: string }[] = [
  {
    value: "full_day",
    label: "Full Day",
    description: "Best for players who want the full development day from check-in to pickup.",
  },
  {
    value: "half_day",
    label: "Half Day",
    description: "Morning or afternoon training block with more flexibility for families.",
  },
  {
    value: "future_stars",
    label: "Future Stars",
    description: "A younger multi-sport option with tennis plus cross-training activities.",
  },
];

const skillOptions: { value: SummerCampSkillLevel; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "tournament", label: "Tournament player" },
];

const sessionOptions: { value: SummerCampSessionPreference; label: string }[] = [
  { value: "full_day", label: "Full day" },
  { value: "morning", label: "Morning block" },
  { value: "afternoon", label: "Afternoon block" },
  { value: "flexible", label: "Flexible" },
];

const emptyForm = {
  guardianName: "",
  guardianEmail: "",
  guardianPhone: "",
  playerName: "",
  playerAge: "",
  skillLevel: "intermediate" as SummerCampSkillLevel,
  track: "full_day" as SummerCampTrack,
  sessionPreference: "full_day" as SummerCampSessionPreference,
  notes: "",
  contactPreference: "email" as const,
  depositAcknowledged: false,
};

type FormState = typeof emptyForm;

const SUMMER_CAMP_DEPOSIT = 50;

export default function SummerCampRegistrationForm() {
  const { user, token } = useAuth();
  const [formData, setFormData] = useState<FormState>(emptyForm);
  const [selectedWeeks, setSelectedWeeks] = useState<string[]>([weekOptions[0]]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<SummerCampRegistrationResponse | null>(null);
  const [depositClientSecret, setDepositClientSecret] = useState<string | null>(null);
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);
  const [depositPaid, setDepositPaid] = useState(false);
  const [depositCheckoutDismissed, setDepositCheckoutDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;

    setFormData((current) => ({
      ...current,
      guardianName:
        current.guardianName || `${user.firstName || ""} ${user.lastName || ""}`.trim(),
      guardianEmail: current.guardianEmail || user.email || "",
      guardianPhone: current.guardianPhone || user.phone || "",
    }));
  }, [user]);

  const updateField = (
    key: keyof FormState,
    value: string | boolean | SummerCampTrack | SummerCampSessionPreference | SummerCampSkillLevel
  ) => {
    setFormData((current) => ({ ...current, [key]: value } as FormState));
  };

  const toggleWeek = (week: string) => {
    setSelectedWeeks((current) =>
      current.includes(week)
        ? current.filter((item) => item !== week)
        : [...current, week]
    );
  };

  const resetRegistrationFlow = () => {
    setSuccess(null);
    setErrorMessage(null);
    setSelectedWeeks([weekOptions[0]]);
    setFormData(emptyForm);
    setDepositClientSecret(null);
    setDepositLoading(false);
    setDepositError(null);
    setDepositPaid(false);
    setDepositCheckoutDismissed(false);
  };

  useEffect(() => {
    if (
      !success ||
      !token ||
      depositClientSecret ||
      depositLoading ||
      depositPaid ||
      depositCheckoutDismissed
    ) {
      return;
    }

    const createDepositIntent = async () => {
      setDepositLoading(true);
      setDepositError(null);

      try {
        const intent = await createPaymentIntent(token, {
          amount: SUMMER_CAMP_DEPOSIT,
          description: `Summer Camp Deposit - ${success.confirmationCode}`,
          metadata: {
            type: "program_fee",
            category: "summer_camp",
            registrationId: success.id,
            confirmationCode: success.confirmationCode,
            guardianName: success.guardianName,
            guardianEmail: success.guardianEmail,
            playerName: success.playerName,
            playerAge: String(success.playerAge),
            track: success.track,
            sessionPreference: success.sessionPreference,
            preferredWeeks: success.preferredWeeks.join(", "),
          },
        });

        setDepositClientSecret(intent.clientSecret);
      } catch (error: any) {
        setDepositError(error?.message || "We could not prepare the deposit checkout.");
      } finally {
        setDepositLoading(false);
      }
    };

    void createDepositIntent();
  }, [success, token, depositClientSecret, depositLoading, depositPaid, depositCheckoutDismissed]);

  const handleDepositSuccess = async (paymentIntentId: string) => {
    setDepositPaid(true);
    setDepositError(null);

    if (!token) {
      return;
    }

    try {
      await confirmPaymentOnServer(token, {
        paymentIntentId,
      });
    } catch (error: any) {
      setDepositError(
        error?.message ||
          "The deposit was processed, but we could not sync the payment record right away."
      );
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!selectedWeeks.length) {
      setErrorMessage("Please select at least one preferred week.");
      return;
    }

    const age = Number(formData.playerAge);
    if (!Number.isFinite(age) || age < 4 || age > 17) {
      setErrorMessage("Player age must be between 4 and 17.");
      return;
    }

    if (!formData.depositAcknowledged) {
      setErrorMessage("Please acknowledge the registration terms before submitting.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await createSummerCampRegistration({
        guardianName: formData.guardianName,
        guardianEmail: formData.guardianEmail,
        guardianPhone: formData.guardianPhone,
        playerName: formData.playerName,
        playerAge: age,
        skillLevel: formData.skillLevel,
        track: formData.track,
        sessionPreference: formData.sessionPreference,
        preferredWeeks: selectedWeeks,
        notes: formData.notes,
        contactPreference: formData.contactPreference,
        depositAcknowledged: formData.depositAcknowledged,
      });

      setSuccess(response);
    } catch (error: any) {
      setErrorMessage(error?.message || "We could not submit the registration.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="card border border-white/70 bg-white shadow-xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary-700">
            Registration received
          </p>
          <h4 className="mt-3 text-3xl font-bold text-gray-900">
            Your summer camp registration is received.
          </h4>
          <p className="mt-4 text-base leading-7 text-gray-700">
            We will review availability, confirm the week(s) you selected, and
            follow up with the next steps for deposit and arrival details.
          </p>

          <div className="mt-6 grid gap-3 rounded-3xl bg-primary-50 p-5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-gray-600">Confirmation code</span>
              <span className="rounded-full bg-white px-4 py-2 text-sm font-bold tracking-[0.16em] text-primary-700">
                {success.confirmationCode}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-gray-600">Player</span>
              <span className="text-sm font-semibold text-gray-900">{success.playerName}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-gray-600">Status</span>
              <span className="text-sm font-semibold text-gray-900 capitalize">
                {success.status.replace(/_/g, " ")}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-gray-600">Deposit</span>
              <span className="text-sm font-semibold text-gray-900">
                {depositPaid
                  ? "Paid"
                  : token
                  ? `$${SUMMER_CAMP_DEPOSIT.toFixed(2)} ready`
                  : "Sign in to pay"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={resetRegistrationFlow}
            className="btn-secondary mt-6 w-full"
          >
            Submit another registration
          </button>
        </div>

        <div className="grid gap-4">
          <div className="rounded-[2rem] bg-gradient-to-br from-primary-700 via-primary-600 to-emerald-600 p-6 text-white shadow-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-white/80">
              What happens next
            </p>
            <div className="mt-4 space-y-4">
              {[
                "Our team reviews your request and checks the selected weeks.",
                "We confirm your camp placement and share any follow-up details.",
                "If you selected multiple weeks, we will help finalize the schedule.",
              ].map((step, index) => (
                <div key={step} className="flex gap-3 rounded-2xl bg-white/10 p-4">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-primary-700">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-6 text-white/90">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-2xl">
            {depositPaid ? (
              <div className="rounded-[1.5rem] bg-emerald-50 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-700">
                  Deposit received
                </p>
                <h5 className="mt-3 text-2xl font-bold text-gray-900">
                  Your summer camp deposit is confirmed.
                </h5>
                <p className="mt-3 text-sm leading-6 text-gray-700">
                  We have recorded your deposit and the registration request is
                  now moving through the review queue.
                </p>
              </div>
            ) : token ? (
              <>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary-700">
                  Pay deposit now
                </p>
                <h5 className="mt-3 text-2xl font-bold text-gray-900">
                  Hold your spot with a ${SUMMER_CAMP_DEPOSIT.toFixed(2)} deposit.
                </h5>
                <p className="mt-3 text-sm leading-6 text-gray-600">
                  The registration is saved. Finish the deposit here using the
                  same Stripe checkout flow already used for court bookings.
                </p>

                <div className="mt-6">
                  {depositLoading && !depositClientSecret ? (
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-600">
                      Preparing deposit checkout...
                    </div>
                  ) : depositClientSecret ? (
                    <StripePaymentForm
                      clientSecret={depositClientSecret}
                      amount={SUMMER_CAMP_DEPOSIT}
                      title="Summer Camp Deposit"
                      onSuccess={handleDepositSuccess}
                      onError={(message) => setDepositError(message)}
                      onBack={() => {
                        setDepositClientSecret(null);
                        setDepositError(null);
                        setDepositCheckoutDismissed(true);
                      }}
                      loading={depositLoading}
                    />
                  ) : (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      {depositError || "We could not prepare the deposit checkout."}
                    </div>
                  )}
                </div>

                {depositError && depositClientSecret && (
                  <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {depositError}
                  </div>
                )}
                {!depositClientSecret && depositCheckoutDismissed && (
                  <button
                    type="button"
                    onClick={() => {
                      setDepositCheckoutDismissed(false);
                      setDepositError(null);
                    }}
                    className="btn-secondary mt-4 w-full"
                  >
                    Reopen deposit checkout
                  </button>
                )}
              </>
            ) : (
              <>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary-700">
                  Pay deposit later
                </p>
                <h5 className="mt-3 text-2xl font-bold text-gray-900">
                  Sign in to pay the deposit right away.
                </h5>
                <p className="mt-3 text-sm leading-6 text-gray-600">
                  Your camp request is saved. If you sign in, we can open the
                  Stripe deposit flow here. Otherwise our team will follow up
                  with the next steps.
                </p>
                <Link href="/signin" className="btn-primary mt-6 inline-flex w-full justify-center">
                  Sign In to Pay
                </Link>
              </>
            )}
          </div>

          <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-gray-500">
              Selected weeks
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {success.preferredWeeks.map((week) => (
                <span
                  key={week}
                  className="rounded-full bg-gray-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-gray-700"
                >
                  {week}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="card border border-white/80 bg-white shadow-2xl">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary-700">
              Register on site
            </p>
            <h4 className="mt-3 text-3xl font-bold text-gray-900">
              Register for camp without leaving the site.
            </h4>
          </div>
          <div className="rounded-full bg-accent-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-accent-700">
            Local registration
          </div>
        </div>

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Guardian name
              </label>
              <input
                value={formData.guardianName}
                onChange={(event) => updateField("guardianName", event.target.value)}
                required
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none transition focus:border-primary-400 focus:bg-white"
                placeholder="Parent or guardian"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Guardian email
              </label>
              <input
                type="email"
                value={formData.guardianEmail}
                onChange={(event) => updateField("guardianEmail", event.target.value)}
                required
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none transition focus:border-primary-400 focus:bg-white"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Guardian phone
              </label>
              <input
                type="tel"
                value={formData.guardianPhone}
                onChange={(event) => updateField("guardianPhone", event.target.value)}
                required
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none transition focus:border-primary-400 focus:bg-white"
                placeholder="401-555-1234"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Player name
              </label>
              <input
                value={formData.playerName}
                onChange={(event) => updateField("playerName", event.target.value)}
                required
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none transition focus:border-primary-400 focus:bg-white"
                placeholder="Player name"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Player age
              </label>
              <input
                type="number"
                min="4"
                max="17"
                value={formData.playerAge}
                onChange={(event) => updateField("playerAge", event.target.value)}
                required
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none transition focus:border-primary-400 focus:bg-white"
                placeholder="8"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Skill level
              </label>
              <select
                value={formData.skillLevel}
                onChange={(event) => updateField("skillLevel", event.target.value as SummerCampSkillLevel)}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none transition focus:border-primary-400 focus:bg-white"
              >
                {skillOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Contact preference
              </label>
              <select
                value={formData.contactPreference}
                onChange={(event) =>
                  updateField("contactPreference", event.target.value as "email" | "phone")
                }
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none transition focus:border-primary-400 focus:bg-white"
              >
                <option value="email">Email</option>
                <option value="phone">Phone</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Camp track
              </label>
              <select
                value={formData.track}
                onChange={(event) => updateField("track", event.target.value as SummerCampTrack)}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none transition focus:border-primary-400 focus:bg-white"
              >
                {trackOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Session preference
              </label>
              <select
                value={formData.sessionPreference}
                onChange={(event) =>
                  updateField(
                    "sessionPreference",
                    event.target.value as SummerCampSessionPreference
                  )
                }
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none transition focus:border-primary-400 focus:bg-white"
              >
                {sessionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-end justify-between gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700">
                  Preferred weeks
                </label>
                <p className="mt-1 text-sm text-gray-500">
                  Pick one or more weeks to request.
                </p>
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                {selectedWeeks.length} selected
              </p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {weekOptions.map((week) => {
                const active = selectedWeeks.includes(week);
                return (
                  <button
                    key={week}
                    type="button"
                    onClick={() => toggleWeek(week)}
                    className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                      active
                        ? "border-primary-500 bg-primary-50 text-primary-700 shadow-sm"
                        : "border-gray-200 bg-white text-gray-700 hover:border-primary-200 hover:bg-primary-50"
                    }`}
                  >
                    {week}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              rows={4}
              className="w-full rounded-3xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none transition focus:border-primary-400 focus:bg-white"
              placeholder="Anything we should know about your player, schedule, allergies, or goals?"
            />
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-3xl bg-accent-50 px-4 py-4">
            <input
              type="checkbox"
              checked={formData.depositAcknowledged}
              onChange={(event) =>
                updateField("depositAcknowledged", event.target.checked)
              }
              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm leading-6 text-gray-700">
              I understand this request holds a place in our camp review queue
              and that our team will follow up with confirmation and payment
              details.
            </span>
          </label>

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
            {isSubmitting ? "Submitting..." : "Submit Registration"}
          </button>
        </form>
      </div>

      <div className="grid gap-4">
        <div className="rounded-[2rem] bg-gradient-to-br from-primary-700 via-primary-600 to-emerald-600 p-6 text-white shadow-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-white/80">
            Why this is better
          </p>
          <h4 className="mt-3 text-2xl font-bold">
            A camp signup that stays on this site.
          </h4>
          <p className="mt-4 text-sm leading-7 text-white/90">
            Families can register without jumping to another platform. That
            keeps the page focused, faster to complete, and easier to edit when
            schedules or availability change.
          </p>
        </div>

        <div className="card border border-gray-200 bg-white">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary-700">
            At a glance
          </p>
          <div className="mt-5 space-y-3">
            <div className="rounded-2xl bg-primary-50 px-4 py-3 text-sm text-gray-700">
              <span className="font-semibold text-gray-900">Track:</span>{" "}
              {trackOptions.find((option) => option.value === formData.track)?.label}
            </div>
            <div className="rounded-2xl bg-accent-50 px-4 py-3 text-sm text-gray-700">
              <span className="font-semibold text-gray-900">Session:</span>{" "}
              {sessionOptions.find((option) => option.value === formData.sessionPreference)?.label}
            </div>
            <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
              <span className="font-semibold text-gray-900">Weeks:</span>{" "}
              {selectedWeeks.length ? selectedWeeks.join(", ") : "Pick at least one"}
            </div>
          </div>
        </div>

        <div className="card border border-gray-200 bg-white">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-gray-500">
            What happens next
          </p>
          <div className="mt-5 space-y-4">
            {[
              "We review your selected week(s) and player details.",
              "We confirm whether the camp fits your preferred schedule.",
              "We follow up with the payment and arrival information.",
            ].map((step, index) => (
              <div key={step} className="flex gap-3 rounded-2xl bg-gray-50 p-4">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">
                  {index + 1}
                </div>
                <p className="text-sm leading-6 text-gray-700">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
