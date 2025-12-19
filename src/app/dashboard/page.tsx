import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Header from "@/components/Header";
import DashboardContent from "@/components/DashboardContent";
import { prisma } from "@/lib/prisma";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/");
  }

  const subdomains = await prisma.subdomainMapping.findMany({
    include: {
      owner: {
        select: { name: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <DashboardContent
          subdomains={JSON.parse(JSON.stringify(subdomains))}
          userId={session.user?.id || ""}
        />
      </main>
    </div>
  );
}
