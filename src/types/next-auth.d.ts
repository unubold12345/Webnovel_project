import "next-auth";

declare module "next-auth" {
  interface User {
    role?: string;
    id?: string;
    isRestricted?: boolean;
    emailVerified?: boolean;
  }

  interface Session {
    user: User & {
      role: string;
      id: string;
      isRestricted: boolean;
      emailVerified: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    id?: string;
    isRestricted?: boolean;
    emailVerified?: boolean;
  }
}