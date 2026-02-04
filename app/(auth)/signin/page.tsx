import SignInForm from "../../../components/auth/SignInForm";

export const metadata = {
  title: "Sign In | Providence Tennis Academy",
  description: "Sign in to your Providence Tennis Academy account",
};

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-primary-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <SignInForm />
    </div>
  );
}
