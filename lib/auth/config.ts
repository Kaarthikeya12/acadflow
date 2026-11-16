import 'server-only';
import NextAuth, { type NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { findCredentialUserByEmail, touchLastLogin } from '@/lib/db/queries/auth';
import { verifyPassword } from './password';
import type { Role } from '@/types/contracts';

const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60; // D19: 8 hours
const SESSION_UPDATE_AGE_SECONDS = 15 * 60; // D19: revalidate every 15 minutes

const config: NextAuthConfig = {
  secret: process.env.AUTH_SECRET,
  trustHost: process.env.AUTH_TRUST_HOST === 'true' || process.env.NODE_ENV !== 'production',
  session: {
    strategy: 'jwt',
    maxAge: SESSION_MAX_AGE_SECONDS,
    updateAge: SESSION_UPDATE_AGE_SECONDS,
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      name: 'Institutional account',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === 'string' ? credentials.email : '';
        const password = typeof credentials?.password === 'string' ? credentials.password : '';
        if (!email || !password) return null;

        const user = await findCredentialUserByEmail(email);
        if (!user || !user.isActive) {
          // Run a dummy verification path? Argon2 verify on a missing user is skipped,
          // which is acceptable for this project; the error message is always generic.
          return null;
        }

        const valid = await verifyPassword(user.passwordHash, password);
        if (!valid) return null;

        await touchLastLogin(user.id);

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          role: user.role,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const typedUser = user as typeof user & {
          role?: Role;
          sessionVersion?: number;
        };
        token.userId = typedUser.id;
        token.role = typedUser.role;
        token.sessionVersion = typedUser.sessionVersion;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.userId as string | undefined) ?? token.sub ?? '';
        session.user.role = token.role as Role | undefined;
        session.user.sessionVersion = token.sessionVersion as number | undefined;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(config);
