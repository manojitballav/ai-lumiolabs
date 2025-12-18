import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Header from "@/components/Header";
import { prisma } from "@/lib/prisma";
import ProjectDetails from "@/components/ProjectDetails";

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/");
  }

  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!project) {
    notFound();
  }

  const isOwner = project.ownerId === session.user?.id;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <ProjectDetails
          project={JSON.parse(JSON.stringify(project))}
          isOwner={isOwner}
        />
      </main>
    </div>
  );
}
