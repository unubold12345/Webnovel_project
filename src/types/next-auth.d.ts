import "next-auth";

declare module "next-auth" {
  interface User {
    role?: string;
    id?: string;
    isRestricted?: boolean;
    emailVerified?: boolean;
    coins?: number;
    subscriptionPlan?: string | null;
    subscriptionExpiresAt?: string | null;
    acceptedTermsAt?: string | null;
  }

  interface Session {
    user: User & {
      role: string;
      id: string;
      isRestricted: boolean;
      emailVerified: boolean;
      coins: number;
      subscriptionPlan: string | null;
      subscriptionExpiresAt: string | null;
      acceptedTermsAt: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    id?: string;
    isRestricted?: boolean;
    emailVerified?: boolean;
    coins?: number;
    subscriptionPlan?: string | null;
    subscriptionExpiresAt?: string | null;
    acceptedTermsAt?: string | null;
  }
}
