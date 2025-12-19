import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      // Restrict sign-in to @circuithouse.tech domain only
      if (account?.provider === "google") {
        const email = profile?.email;
        const allowedDomain = process.env.ALLOWED_DOMAIN || "circuithouse.tech";

        if (!email?.endsWith(`@${allowedDomain}`)) {
          return false;
        }

        // Create or update user in database
        if (email) {
          await prisma.user.upsert({
            where: { email },
            update: {
              name: profile?.name,
              image: (profile as { picture?: string })?.picture,
            },
            create: {
              email,
              name: profile?.name,
              image: (profile as { picture?: string })?.picture,
            },
          });
        }

        return true;
      }
      return false;
    },
    async jwt({ token, account, profile }) {
      // On initial sign in, add user info to token
      if (account && profile) {
        token.email = profile.email;
        token.name = profile.name;
        token.picture = (profile as { picture?: string }).picture;

        // Get user ID from database
        if (profile.email) {
          const dbUser = await prisma.user.findUnique({
            where: { email: profile.email },
            select: { id: true },
          });
          if (dbUser) {
            token.userId = dbUser.id;
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      // Add token info to session
      if (session.user && token) {
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string;
        (session.user as { id?: string }).id = token.userId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
    error: "/",
  },
  session: {
    strategy: "jwt",
  },
};
