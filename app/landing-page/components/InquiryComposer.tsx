"use client";

import { useState } from "react";
import { whatsappSupport } from "@/lib/whatsapp";
import { CLOSING_CONTENT } from "../data/content";
import { WhatsAppGlyph } from "./LandingIcons";

export default function InquiryComposer() {
  const [name, setName] = useState("");
  const [topic, setTopic] = useState(CLOSING_CONTENT.composerTopics[0]);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Enter your name before opening WhatsApp.");
      return;
    }

    setError("");
    const lines = [
      `Hi Idress, my name is ${trimmedName}.`,
      `Topic: ${topic}.`,
      note.trim() ? `Details: ${note.trim()}` : "",
    ].filter(Boolean);

    const url = `https://wa.me/${whatsappSupport.phone}?text=${encodeURIComponent(lines.join("\n"))}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <label htmlFor="sig-inquiry-name" className="sig-caption-1 block text-[#E4E4E7]">
          Your name
        </label>
        <input
          id="sig-inquiry-name"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError("");
          }}
          placeholder="Full name"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "sig-inquiry-error" : undefined}
          className="sig-focus-dark mt-2 min-h-[46px] w-full rounded-[4px] border border-[#3F3F46] bg-[#1F1F1F] px-3.5 py-2.5 text-[15px] text-[#FFFFFF] placeholder:text-[#71717A] focus:border-[#FFFFFF] focus:outline-none"
        />
        {error && (
          <p id="sig-inquiry-error" role="alert" className="mt-2 text-[13px] font-medium text-[#FCA5A5]">
            {error}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="sig-inquiry-topic" className="sig-caption-1 block text-[#E4E4E7]">
          Preparation focus
        </label>
        <select
          id="sig-inquiry-topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="sig-focus-dark mt-2 min-h-[46px] w-full rounded-[4px] border border-[#3F3F46] bg-[#1F1F1F] px-3.5 py-2.5 text-[15px] text-[#FFFFFF] focus:border-[#FFFFFF] focus:outline-none"
        >
          {CLOSING_CONTENT.composerTopics.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="sig-inquiry-note" className="sig-caption-1 block text-[#E4E4E7]">
          Optional note (current German level or target intake)
        </label>
        <textarea
          id="sig-inquiry-note"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="For example: Starting A1 or applying for Winter intake"
          className="sig-focus-dark mt-2 w-full rounded-[4px] border border-[#3F3F46] bg-[#1F1F1F] px-3.5 py-2.5 text-[15px] text-[#FFFFFF] placeholder:text-[#71717A] focus:border-[#FFFFFF] focus:outline-none"
        />
      </div>

      <div className="pt-2">
        <button type="submit" className="sig-btn-primary w-full sm:w-auto">
          <WhatsAppGlyph size={17} />
          <span>Continue on WhatsApp</span>
        </button>
      </div>
    </form>
  );
}
