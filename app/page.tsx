import { LandingAbout } from "@/components/landing/about"
import { LandingCta } from "@/components/landing/cta"
import { LandingFeatures } from "@/components/landing/features"
import { LandingFooter } from "@/components/landing/footer"
import { LandingHeader } from "@/components/landing/header"
import { LandingHero } from "@/components/landing/hero"
import { LandingMission } from "@/components/landing/mission"
import { LandingShell } from "@/components/landing/landing-shell"
import { LandingTopics } from "@/components/landing/topics"

export default function LandingPage() {
  return (
    <LandingShell>
      <LandingHeader />
      <main>
        <LandingHero />
        <LandingTopics />
        <LandingAbout />
        <LandingFeatures />
        <LandingMission />
        <LandingCta />
      </main>
      <LandingFooter />
    </LandingShell>
  )
}
