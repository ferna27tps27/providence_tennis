import PasswordReset from "../../../components/auth/PasswordReset";

export const metadata = {
  title: "Reset Password | Providence Tennis Academy",
  description: "Reset your password",
};

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-primary-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <PasswordReset />
    </div>
  );
}
