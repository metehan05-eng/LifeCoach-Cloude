import NextAuth from "next-auth";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prismaClient } from "@/lib/prisma";

export const authOptions = {
  adapter: PrismaAdapter(prismaClient),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    GithubProvider({
      clientId: process.env.NEXT_PUBLIC_GITHUB_ID,
      clientSecret: process.env.NEXT_PUBLIC_GITHUB_SECRET,
    }),
  ],
  pages: {
    signIn: "/",
    signOut: "/user/logout",
  },
  callbacks: {
    async session({ session, user }) {
      // Add avatar to session from provider
      if (session?.user) {
        session.user.id = user.id;
        // Get avatar from database if available
        try {
          const dbUser = await prismaClient.user.findUnique({
            where: { email: session.user.email },
            select: { image: true }
          });
          if (dbUser?.image) {
            session.user.avatar = dbUser.image;
          } else if (user.image) {
            session.user.avatar = user.image;
          }
        } catch (e) {
          // If prisma fails, try to use user.image from provider
          if (user.image) {
            session.user.avatar = user.image;
          }
        }
      }
      return session;
    },
    async jwt({ token, user, account }) {
      // Add provider info to token
      if (account) {
        token.provider = account.provider;
        token.providerId = account.providerAccountId;
      }
      return token;
    }
  },
  session: {
    strategy: "jwt",
  },
};

export default NextAuth(authOptions);
