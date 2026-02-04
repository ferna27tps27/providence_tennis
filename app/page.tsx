import TopBanner from "@/components/TopBanner";
import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import LatestNews from "@/components/LatestNews";
import MissionProgramsFacilities from "@/components/MissionProgramsFacilities";
import CountdownTimer from "@/components/CountdownTimer";
import ProgramsShowcase from "@/components/ProgramsShowcase";
import FeaturesSection from "@/components/FeaturesSection";
import SubscribeSection from "@/components/SubscribeSection";
import CourtReservation from "@/components/CourtReservation";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import CookieBanner from "@/components/CookieBanner";
import AIAssistant from "@/components/AIAssistant";

export default function Home() {
  return (
    <main className="min-h-screen">
      <TopBanner />
      <Navigation />
      <Hero />
      <LatestNews />
      <MissionProgramsFacilities />
      <CountdownTimer />
      <ProgramsShowcase />
      <CourtReservation />
      <FeaturesSection />
      <SubscribeSection />
      <ContactSection />
      <Footer />
      <CookieBanner />
      <AIAssistant />
    </main>
  );
}