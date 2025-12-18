import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Header from "@/components/Header";
import DashboardContent from "@/components/DashboardContent";
import { prisma } from "@/lib/prisma";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);

  // Redirect to home if not authenticated
  if (!session) {
    redirect("/");
  }

  // Fetch all projects
  const projects = await prisma.project.findMany({
    include: {
      owner: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <DashboardContent
          projects={JSON.parse(JSON.stringify(projects))}
          userEmail={session.user?.email || ""}
        />
      </main>
    </div>
  );
}
