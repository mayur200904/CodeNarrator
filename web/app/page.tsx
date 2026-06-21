import { LandingNav }       from "@/components/landing/nav"
import { HeroSection }      from "@/components/landing/hero"
import { MarqueeSection }   from "@/components/landing/marquee"
import { HowItWorksSection } from "@/components/landing/how-it-works"
import { FeaturesSection }  from "@/components/landing/features"
import { StatsSection }     from "@/components/landing/stats"
import { UseCasesSection }  from "@/components/landing/use-cases"
import { CtaSection }       from "@/components/landing/cta"
import { LandingFooter }    from "@/components/landing/footer"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#05050a] text-white overflow-x-hidden">
      <LandingNav />
      <HeroSection />
      <MarqueeSection />
      <HowItWorksSection />
      <FeaturesSection />
      <StatsSection />
      <UseCasesSection />
      <CtaSection />
      <LandingFooter />
    </div>
  )
}
