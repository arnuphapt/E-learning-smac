import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { supabase } from "@/lib/supabase";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account.provider === "google") {
        const { data: dbUser } = await supabase
          .from("users")
          .select("id, role, status")
          .eq("email", user.email)
          .single();

        if (dbUser) {
          if (dbUser.status === "suspended") return "/login?error=AccessDenied";
          user.role = dbUser.role;
          user.dbId = dbUser.id;
          return true;
        } else {
          // Auto-create as student for testing
          const newId = "u_" + Date.now();
          await supabase.from("users").insert({
            id: newId,
            name: user.name,
            email: user.email,
            role: "student",
            status: "active",
          });
          user.role = "student";
          user.dbId = newId;
          return true;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.dbId = user.dbId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.role = token.role || "student";
        session.user.id = token.dbId || token.sub;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
