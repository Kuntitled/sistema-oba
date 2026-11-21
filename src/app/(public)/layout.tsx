import { createClient } from "@/lib/supabase/server";
import { Navbar, type NavbarUserInfo } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let navUser: NavbarUserInfo | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const isAdmin = user.user_metadata?.role === "admin";
      let nickname: string =
        (typeof user.user_metadata?.full_name === "string" &&
          user.user_metadata.full_name) ||
        (typeof user.user_metadata?.name === "string" &&
          user.user_metadata.name) ||
        user.email?.split("@")[0] ||
        "Blader";
      let avatarUrl: string | null =
        typeof user.user_metadata?.avatar_url === "string"
          ? user.user_metadata.avatar_url
          : null;

      const { data: blader } = await supabase
        .from("bladers")
        .select("nickname, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (blader) {
        nickname = blader.nickname;
        avatarUrl = blader.avatar_url ?? avatarUrl;
      }

      navUser = {
        id: user.id,
        nickname,
        avatarUrl,
        isAdmin,
      };
    }
  } catch {
    navUser = null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar user={navUser} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
