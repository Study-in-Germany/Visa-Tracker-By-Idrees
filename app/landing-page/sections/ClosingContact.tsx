import Image from "next/image";
import { CLOSING_CONTENT, LANDING_ASSETS } from "../data/content";
import InquiryComposer from "../components/InquiryComposer";
import { WhatsAppGlyph } from "../components/LandingIcons";

export default function ClosingContact() {
  return (
    <section
      id="contact"
      aria-label="Contact Study in Germany by Idress"
      className="bg-[#181818] py-20 text-[#FFFFFF] md:py-28 lg:py-32"
    >
      <div className="sig-container">
        <div className="grid grid-cols-1 gap-12 border-b border-[#272727] pb-16 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <h2 className="sig-display-2 text-[#FFFFFF]">{CLOSING_CONTENT.heading}</h2>
          </div>
          <div className="lg:col-span-5">
            <p className="sig-body-3 text-[#A1A1AA]">{CLOSING_CONTENT.summary}</p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <a
                href={CLOSING_CONTENT.whatsappDirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="sig-btn-secondary-dark"
              >
                <WhatsAppGlyph size={17} />
                <span>Message {CLOSING_CONTENT.directPhone}</span>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-start lg:gap-16">
          <div className="lg:col-span-6">
            <div className="sig-photo-frame relative aspect-[16/10] w-full">
              <Image
                src={LANDING_ASSETS.marburgTown.src}
                alt={LANDING_ASSETS.marburgTown.alt}
                fill
                sizes="(max-width: 1024px) 100vw, 48vw"
                className="object-cover object-center"
              />
            </div>
          </div>

          <div className="lg:col-span-6">
            <h3 className="sig-heading-4 mb-6 text-[#FFFFFF]">
              Send a direct preparation inquiry
            </h3>
            <InquiryComposer />
          </div>
        </div>
      </div>
    </section>
  );
}
