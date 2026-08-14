import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

/**
 * VerifScan NextAuth configuration.
 *
 * - JWT strategy (no session DB rows needed)
 * - Credentials provider with bcrypt password verification
 * - Role injected into the JWT and exposed on the session
 *   (session.user.role: "SUPERADMIN" | "FABRICANT")
 * - Status check: SUSPENDED accounts cannot sign in
 */
export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email et mot de passe requis");
        }

        const email = credentials.email.toLowerCase().trim();

        const user = await db.user.findUnique({
          where: { email },
        });

        if (!user || !user.password) {
          throw new Error("Identifiants invalides");
        }

        if (user.status === "SUSPENDED") {
          throw new Error("Votre compte est suspendu. Contactez le support.");
        }

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) {
          throw new Error("Identifiants invalides");
        }

        // Update last login timestamp (non-blocking)
        db.user
          .update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          })
          .catch(() => undefined);

        // Audit log — record the login event for the SuperAdmin audit trail.
        // Non-blocking: if it fails, the user still signs in.
        db.auditLog
          .create({
            data: {
              userId: user.id,
              action: "LOGIN",
              entity: "User",
              entityId: user.id,
            },
          })
          .catch(() => undefined);

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role as "SUPERADMIN" | "FABRICANT",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      // On sign-in, attach the role + user id to the JWT
      if (user) {
        token.role = (user as { role?: string }).role ?? "FABRICANT";
        token.uid = (user as { id?: string }).id;
      }
      // Refresh role on session update (e.g. after profile change)
      if (trigger === "update") {
        const dbUser = await db.user.findUnique({
          where: { id: token.uid as string },
          select: { role: true, name: true, email: true, status: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.name = dbUser.name ?? undefined;
          token.email = dbUser.email;
          if (dbUser.status === "SUSPENDED") {
            // Force sign-out on next request via middleware
            token.role = "SUSPENDED";
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.uid as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// Augment the NextAuth types so `session.user.role` is typed
declare module "next-auth" {
  interface User {
    role?: string;
  }
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    uid?: string;
  }
}
