import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { db } from "./db";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  basePath: "/api/auth",
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { username: credentials.username as string },
        });

        if (!user) {
          return null;
        }

        if (user.isRestricted) {
          return null;
        }

        // Check if user has a password (OAuth users don't have passwords)
        if (!user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        // Note: Email verification is no longer required for login
        // Users can verify their email from their profile page

        await db.user.update({
          where: { id: user.id },
          data: { lastActiveAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.username,
          role: user.role,
          isRestricted: user.isRestricted,
          emailVerified: user.emailVerified,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const email = user.email;
        if (!email) return false;

        let existingUser = await db.user.findUnique({
          where: { email },
        });

        if (!existingUser) {
          const username = email.split("@")[0] + "_" + Date.now().toString().slice(-4);
          existingUser = await db.user.create({
            data: {
              email,
              username,
              password: "",
              avatar: user.image || null,
              emailVerified: true,
            },
          });
        } else if (existingUser.isRestricted) {
          return false;
        }

        (user as any).id = existingUser.id;
        (user as any).role = existingUser.role;
        (user as any).isRestricted = existingUser.isRestricted;
        (user as any).emailVerified = !!existingUser.emailVerified;
        (user as any).needsPassword = !existingUser.password;
      }

      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.isRestricted = user.isRestricted;
        (token as any).emailVerified = (user as any).emailVerified ?? false;
      }
      // Check if user needs to set password on every token refresh
      if (token.id) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: { password: true },
        });
        (token as any).needsPassword = !dbUser?.password;
      }
      // Update lastActiveAt on each sign in
      if (trigger === "signIn" && token.id) {
        await db.user.update({
          where: { id: token.id as string },
          data: { lastActiveAt: new Date() },
        });
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
        session.user.isRestricted = !!token.isRestricted;
        (session.user as any).emailVerified = !!(token as any).emailVerified;
        (session.user as any).needsPassword = !!(token as any).needsPassword;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Relative paths (callbackUrl) are passed through
      if (url.startsWith("/")) {
        return baseUrl + url;
      }
      // Same-origin URLs
      if (url.startsWith(baseUrl)) {
        return url;
      }
      return baseUrl;
    },
  },
});