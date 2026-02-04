import SignUpForm from "../../../components/auth/SignUpForm";

export const metadata = {
  title: "Sign Up | Providence Tennis Academy",
  description: "Create a new account with Providence Tennis Academy",
};

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-primary-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <SignUpForm />
    </div>
  );
}
