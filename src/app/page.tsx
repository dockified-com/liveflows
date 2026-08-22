import { auth } from "@clerk/nextjs/server";
import { ArchitectureModes } from "@/components/landing/architecture-modes";
import { ArchitecturePillars } from "@/components/landing/architecture-pillars";
import { EcosystemCta } from "@/components/landing/ecosystem-cta";
import { HeroSection } from "@/components/landing/hero-section";
import { InteractiveCanvasPreview } from "@/components/landing/interactive-canvas-preview";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";
import { TechnicalBenchmarks } from "@/components/landing/technical-benchmarks";

export default async function Home() {
  const { isAuthenticated, orgSlug } = await auth();
  const workspaceUrl = isAuthenticated
    ? orgSlug
      ? `/w/${orgSlug}`
      : "/session-tasks/choose-organization"
    : null;

  return (
    <div
      className="landing-dark relative min-h-screen bg-[#030304] text-zinc-100 font-sans selection:bg-white/20 selection:text-white"
      style={{
        backgroundColor: "#030305",
        color: "#f1f5f9",
        minHeight: "100vh",
      }}
    >
      {/* Page Content Layers */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <LandingHeader workspaceUrl={workspaceUrl} />
        <main className="flex-1">
          <HeroSection />
          <InteractiveCanvasPreview />
          <ArchitecturePillars />
          <ArchitectureModes />
          <TechnicalBenchmarks />
          <EcosystemCta />
        </main>
        <LandingFooter />
      </div>
    </div>
  );
}
