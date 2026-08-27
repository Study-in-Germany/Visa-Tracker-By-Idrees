import { redirect } from "next/navigation";

// Registering an account and submitting your first visa-journey entry are
// the same action here — submitting creates your Tracking ID + Access Code.
export default function RegisterPage() {
  redirect("/submit");
}
