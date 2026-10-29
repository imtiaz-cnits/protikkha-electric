import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (token && verifyToken(token)) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
