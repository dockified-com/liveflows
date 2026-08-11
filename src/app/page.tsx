import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Home() {
  const { isAuthenticated, orgSlug } = await auth();

  if (isAuthenticated) {
    if (orgSlug) {
      redirect(`/w/${orgSlug}`);
    } else {
      redirect("/session-tasks/choose-organization");
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 selection:bg-neutral-800">
      <main className="relative isolate">
        {/* Background Gradients */}
        <div
          className="absolute inset-x-0 top-[-10rem] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[-20rem]"
          aria-hidden="true"
        >
          <div className="relative left-1/2 -z-10 aspect-[1155/678] w-[36.125rem] max-w-none -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#3b82f6] to-[#8b5cf6] opacity-20 sm:left-[calc(50%-40rem)] sm:w-[72.1875rem]"></div>
        </div>

        {/* Navbar */}
        <header className="absolute inset-x-0 top-0 z-50">
          <nav className="flex items-center justify-between p-6 lg:px-8" aria-label="Global">
            <div className="flex lg:flex-1">
              <span className="text-xl font-bold tracking-tight text-white">LiveFlows</span>
            </div>
            <div className="flex flex-1 justify-end gap-x-6 items-center">
              <Link href="/sign-in" className="text-sm font-semibold leading-6 text-white hover:text-neutral-300 transition-colors">
                Log in
              </Link>
              <Link
                href="/sign-up"
                className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md hover:bg-white/20 transition-all border border-white/10"
              >
                Sign up
              </Link>
            </div>
          </nav>
        </header>

        {/* Hero Section */}
        <div className="mx-auto max-w-7xl px-6 pb-24 pt-48 sm:pb-32 lg:flex lg:px-8 lg:py-40">
          <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-xl lg:flex-shrink-0 lg:pt-8 text-center lg:text-left">
            <h1 className="mt-10 text-4xl font-bold tracking-tight text-white sm:text-6xl text-balance">
              Collaborative System Design in Realtime.
            </h1>
            <p className="mt-6 text-lg leading-8 text-neutral-400">
              Brainstorm architecture, map out systems, and design infrastructure with your entire team. LiveFlows provides a powerful Excalidraw canvas synchronized perfectly across workspaces.
            </p>
            <div className="mt-10 flex items-center justify-center lg:justify-start gap-x-6">
              <Link
                href="/sign-up"
                className="rounded-md bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors"
              >
                Get Started for free
              </Link>
              <Link href="/sign-in" className="text-sm font-semibold leading-6 text-white group">
                Sign in to workspace <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </div>
          <div className="mx-auto mt-16 flex max-w-2xl sm:mt-24 lg:ml-10 lg:mr-0 lg:mt-0 lg:max-w-none lg:flex-none xl:ml-32">
            <div className="max-w-3xl flex-none sm:max-w-5xl lg:max-w-none">
              <div className="rounded-xl bg-white/5 p-2 ring-1 ring-white/10 backdrop-blur-lg">
                <div className="rounded-md bg-neutral-900/80 p-8 shadow-2xl h-[400px] w-[600px] flex items-center justify-center border border-white/5">
                  <p className="text-neutral-500 font-mono text-sm">[ Interactive Canvas Demo ]</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-24 sm:py-32">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-500">Deploy faster</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Everything you need to map out systems
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-white">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                    </svg>
                  </div>
                  Realtime Sync
                </dt>
                <dd className="mt-2 text-base leading-7 text-neutral-400">
                  Powered by Liveblocks, see your team's cursors and updates instantly with zero lag.
                </dd>
              </div>
              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-white">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </div>
                  Strict Workspace Isolation
                </dt>
                <dd className="mt-2 text-base leading-7 text-neutral-400">
                  Projects are securely bound to Clerk Organizations, ensuring enterprise-grade data isolation.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </main>
    </div>
  );
}
