import EmailVerification from "../../../components/auth/EmailVerification";

export const metadata = {
  title: "Verify Email | Providence Tennis Academy",
  description: "Verify your email address",
};

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-primary-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <EmailVerification />
    </div>
  );
}
