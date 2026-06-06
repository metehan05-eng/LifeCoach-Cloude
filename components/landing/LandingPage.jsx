"use client";

import { useState, useEffect } from "react";
import Navbar from "./Navbar";
import HeroSection from "./HeroSection";
import BetaBanner from "./BetaBanner";
import FeaturesSection from "./FeaturesSection";
import StepsSection from "./StepsSection";
import TestimonialsSection from "./TestimonialsSection";
import CTASection from "./CTASection";
import Footer from "./Footer";

function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(124,58,237,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(124,58,237,0.025) 1px, transparent 1px)
          `,
          backgroundSize: "64px 64px",
        }}
      />
      <div className="absolute -top-48 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-han-purple/10 blur-[100px]" />
      <div className="absolute -bottom-32 -right-24 h-[400px] w-[500px] rounded-full bg-han-indigo/8 blur-[80px]" />
    </div>
  );
}

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#060618] text-han-text">
      <Background />
      <Navbar mounted={mounted} />
      <HeroSection mounted={mounted} />
      <BetaBanner />
      <FeaturesSection />
      <StepsSection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </main>
  );
}
