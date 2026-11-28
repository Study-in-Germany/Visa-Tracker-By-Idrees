import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Journey",
};

export default function TrackerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
