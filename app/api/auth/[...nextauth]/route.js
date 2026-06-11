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
        const email = user.email;
        const domain = email.split("@")[1];

        // 1. Check if the user already exists in public.users table (allows pre-registered admins, instructors, and students)
        const { data: dbUser } = await supabase
          .from("users")
          .select("id, role")
          .eq("email", email)
          .single();

        if (dbUser) {
          user.role = dbUser.role;
          user.dbId = dbUser.id;
          return true;
        }

        // 2. If not pre-registered, verify if the domain is allowed in database configuration
        const { data: allowedDomain } = await supabase
          .from("allowed_domains")
          .select("domain")
          .eq("domain", domain)
          .single();

        if (!allowedDomain) {
          return "/login?error=AccessDenied";
        }

        // 3. Since the domain is allowed, auto-create the user based on email format
        // e.g. digits only before the '@' (e.g. 66010001@smnc.ac.th) is a student
        const match = email.match(/^(\d+)@/);
        const role = match ? "student" : "instructor";
        const studentNo = match ? match[1] : null;

        const newId = "u_" + Date.now();
        await supabase.from("users").insert({
          id: newId,
          name: user.name,
          email: email,
          role: role,
          student_no: studentNo,
        });

        user.role = role;
        user.dbId = newId;
        return true;
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
