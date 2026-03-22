import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { sql, ensureTables } from "@/lib/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      await ensureTables(); // guarantees schema exists before inserting user
      try {
        await sql`
          INSERT INTO users (id, name, email, image)
          VALUES (${user.id}, ${user.name}, ${user.email}, ${user.image})
          ON CONFLICT (email) DO UPDATE
            SET name  = EXCLUDED.name,
                image = EXCLUDED.image;
        `;
        await sql`
          INSERT INTO user_stats (user_id)
          VALUES (${user.id})
          ON CONFLICT (user_id) DO NOTHING;
        `;
      } catch (err) {
        console.error("DB upsert error:", err);
      }
      return true;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
  pages: {
    signIn: "/login",
  },
});
