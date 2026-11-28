import type { Metadata } from "next";
import { switzer } from "./fonts/switzer";
import "./styles/landing.css";

export const metadata: Metadata = {
  title: "Study in Germany by Idress",
  description:
    "German language classes (A1 to B1), university guidance, and live community student visa queue tracking for international students preparing for Germany.",
  openGraph: {
    title: "Study in Germany by Idress",
    description:
      "Learn German, shortlist public German universities, and inspect real community student visa timelines.",
    type: "website",
  },
};

export default function LandingPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={switzer.variable}>{children}</div>;
}
