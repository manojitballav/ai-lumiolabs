import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Header from "@/components/Header";

export default async function Home() {
  const session = await getServerSession(authOptions);

  // If user is logged in, redirect to dashboard
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Header />

      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center">
          <div className="mx-auto mb-8 h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-3xl">LL</span>
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Lumio Labs
          </h1>

          <p className="mt-4 text-xl text-gray-600">
            Internal AI Project Hosting Platform
          </p>
        </div>

        {/* Information Card */}
        <div className="mt-16 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <svg
                  className="h-5 w-5 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                  />
                </svg>
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                About This Site
              </h2>
              <p className="mt-2 text-gray-600 leading-relaxed">
                This is an internal platform used by{" "}
                <strong>Circuit House Technologies</strong> to host and manage
                AI projects. The platform provides a centralized directory for
                team members to deploy and access various AI applications and
                experiments.
              </p>
            </div>
          </div>
        </div>

        {/* Access Notice */}
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-8">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <svg
                  className="h-5 w-5 text-amber-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-amber-900">
                Access Restricted
              </h2>
              <p className="mt-2 text-amber-800 leading-relaxed">
                This platform is restricted to authorized organization members
                only. If you are not a member of Circuit House Technologies,
                please do not attempt to access or probe this site.
                Unauthorized access attempts may be logged and reported.
              </p>
            </div>
          </div>
        </div>

        {/* Team Member CTA */}
        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-4">Are you a team member?</p>
          <p className="text-sm text-gray-500">
            Click &quot;Sign in with Google&quot; above using your{" "}
            <span className="font-medium">@circuithouse.tech</span> email
            address to access the platform.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-auto">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Circuit House Technologies.
            Internal use only.
          </p>
        </div>
      </footer>
    </div>
  );
}
