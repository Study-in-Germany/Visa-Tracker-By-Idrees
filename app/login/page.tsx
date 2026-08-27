"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [publicId, setPublicId] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/applicant/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicId, accessCode }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Invalid Tracking ID or Access Code.");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div className="max-w-sm mx-auto">
      <div className="card p-6">
        <h1 className="text-xl font-bold text-navy-950">Applicant Login</h1>
        <p className="text-sm text-gray-500 mt-1">
          Use the Tracking ID and Access Code you received when you submitted your entry.
        </p>
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="label">Tracking ID</label>
            <input className="input" placeholder="PK-ISB-10482" value={publicId}
              onChange={(e) => setPublicId(e.target.value)} required />
          </div>
          <div>
            <label className="label">Access Code</label>
            <input className="input" placeholder="7K4T-92XQ" value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)} required />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "Logging in…" : "Log In"}
          </button>
        </form>
      </div>
      <p className="text-center text-sm text-gray-500 mt-4">
        Don't have an entry yet? <Link href="/submit" className="text-navy-700 font-medium hover:underline">Submit your journey</Link>
      </p>
    </div>
  );
}
