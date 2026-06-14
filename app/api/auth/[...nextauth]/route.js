import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { supabase } from "@/lib/supabase";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    CredentialsProvider({
      id: "credentials",
      name: "Mock Account",
      credentials: {
        userId: { label: "User ID", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.userId) return null;

        const { data: dbUser } = await supabase
          .from("users")
          .select("*")
          .eq("id", credentials.userId)
          .single();

        if (dbUser) {
          let permissions = [];
          if (dbUser.role) {
            const roleIds = dbUser.role.split(",").map(r => r.trim());
            const { data: rolesData } = await supabase
              .from("roles")
              .select("permissions")
              .in("id", roleIds);
            if (rolesData) {
              const allPerms = new Set();
              rolesData.forEach(r => {
                if (r.permissions) {
                  r.permissions.forEach(p => allPerms.add(p));
                }
              });
              permissions = Array.from(allPerms);
            }
          }

          // Fetch multiple subject groups managed by this user
          const { data: sgmList } = await supabase
            .from("subject_group_managers")
            .select("group_id")
            .eq("user_id", dbUser.id);
          const groupIds = sgmList ? sgmList.map(item => item.group_id) : [];

          return {
            id: dbUser.id,
            name: dbUser.name,
            email: dbUser.email || `${dbUser.id}@smnc.ac.th`,
            role: dbUser.role,
            dbId: dbUser.id,
            study_year: dbUser.study_year,
            group_id: groupIds[0] || dbUser.group_id || null,
            group_ids: groupIds,
            permissions: permissions,
          };
        }
        return null;
      },
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
          .select("id, role, study_year, group_id")
          .eq("email", email)
          .single();

        if (dbUser) {
          user.role = dbUser.role;
          user.dbId = dbUser.id;
          user.study_year = dbUser.study_year ?? null;
          
          // Fetch multiple subject groups managed by this user
          const { data: sgmList } = await supabase
            .from("subject_group_managers")
            .select("group_id")
            .eq("user_id", dbUser.id);
          const groupIds = sgmList ? sgmList.map(item => item.group_id) : [];

          user.group_id = groupIds[0] || dbUser.group_id || null;
          user.group_ids = groupIds;
          
          let permissions = [];
          if (dbUser.role) {
            const roleIds = dbUser.role.split(",").map(r => r.trim());
            const { data: rolesData } = await supabase
              .from("roles")
              .select("permissions")
              .in("id", roleIds);
            if (rolesData) {
              const allPerms = new Set();
              rolesData.forEach(r => {
                if (r.permissions) r.permissions.forEach(p => allPerms.add(p));
              });
              permissions = Array.from(allPerms);
            }
          }
          user.permissions = permissions;
          
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

        let studyYear = null;
        if (studentNo) {
          const prefix = studentNo.substring(0, 2);
          if (prefix === "69") studyYear = 1;
          else if (prefix === "68") studyYear = 2;
          else if (prefix === "67") studyYear = 3;
          else if (prefix === "66") studyYear = 4;
          else if (prefix === "65") studyYear = 5;
        }

        const newId = "u_" + Date.now();
        await supabase.from("users").insert({
          id: newId,
          name: user.name,
          email: email,
          role: role,
          student_no: studentNo,
          study_year: studyYear,
        });

        let permissions = [];
        const { data: roleData } = await supabase
          .from("roles")
          .select("permissions")
          .eq("id", role)
          .single();
        if (roleData) permissions = roleData.permissions || [];

        user.role = role;
        user.dbId = newId;
        user.study_year = studyYear;
        user.group_id = null;
        user.group_ids = [];
        user.permissions = permissions;
        return true;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.dbId = user.dbId || user.id;
        token.study_year = user.study_year ?? null;
        token.group_id = user.group_id || null;
        token.group_ids = user.group_ids || [];
        token.permissions = user.permissions || [];
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.role = token.role || "student";
        session.user.id = token.dbId || token.sub;
        session.user.study_year = token.study_year ?? null;
        session.user.group_id = token.group_id || null;
        session.user.group_ids = token.group_ids || [];
        session.user.permissions = token.permissions || [];
      }
      session.dbId = token.dbId || token.sub;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
