import { redirect } from "next/navigation";

// Middleware handles auth redirect; this just sends unauthenticated users to login
export default function Home() {
  redirect("/dashboard");
}
