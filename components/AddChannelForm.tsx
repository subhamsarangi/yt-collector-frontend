"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Step = "url" | "confirm";

export default function AddChannelForm() {
  const [step, setStep] = useState<Step>("url");
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [domains, setDomains] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setChecking(true);
    const [infoRes, domainsRes] = await Promise.all([
      fetch("/api/channels/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel_url: url }),
      }),
      fetch("/api/domains"),
    ]);
    setChecking(false);
    if (!infoRes.ok) {
      setError("Could not fetch channel. Check the URL and try again.");
      return;
    }
    const info = await infoRes.json();
    const domainsData = domainsRes.ok ? await domainsRes.json() : [];
    setName(info.name ?? "");
    setDomains(domainsData.map((d: { name: string }) => d.name));
    setDomain("");
    setStep("confirm");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, url, domain }),
    });
    setSubmitting(false);
    if (res.ok) {
      setUrl(""); setName(""); setDomain(""); setDomains([]);
      setStep("url");
      router.refresh();
    } else {
      setError("Failed to add channel.");
    }
  }

  function handleReset() {
    setStep("url");
    setError("");
    setName("");
    setDomain("");
  }

  return (
    <div className="flex flex-col gap-3">
      {step === "url" && (
        <form onSubmit={handleCheck} className="flex gap-2">
          <input
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(""); }}
            placeholder="https://www.youtube.com/@ChannelName"
            required
            className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm"
          />
          <button type="submit" disabled={checking || !url}
            className="bg-white text-black rounded px-4 py-2 text-sm font-medium hover:bg-neutral-200 disabled:opacity-50 whitespace-nowrap">
            {checking ? "Checking..." : "Check channel"}
          </button>
        </form>
      )}

      {step === "confirm" && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-xs text-neutral-400">Channel URL</label>
              <input value={url} disabled
                className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm text-neutral-500" />
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-xs text-neutral-400">Channel name <span className="text-red-500">*</span></label>
              <input value={name} onChange={(e) => setName(e.target.value)} required
                className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-neutral-400">Domain <span className="text-red-500">*</span></label>
              <select value={domain} onChange={(e) => setDomain(e.target.value)} required
                className="w-40 bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm">
                <option value="">Select domain</option>
                {domains.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={submitting || !name || !domain}
              className="bg-white text-black rounded px-4 py-2 text-sm font-medium hover:bg-neutral-200 disabled:opacity-50">
              {submitting ? "Adding..." : "Submit channel"}
            </button>
            <button type="button" onClick={handleReset}
              className="text-sm text-neutral-500 hover:text-white px-3 py-2">
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}
