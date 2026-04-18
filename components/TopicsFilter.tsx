"use client";

export default function TopicsFilter() {
  return (
    <input
      type="text"
      placeholder="Filter topics..."
      onChange={(e) => {
        const query = e.currentTarget.value.toLowerCase();
        document.querySelectorAll("[data-topic-card]").forEach((card) => {
          const name = card.getAttribute("data-topic-name")?.toLowerCase() ?? "";
          card.classList.toggle("hidden", !name.includes(query));
        });
      }}
      className="bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
    />
  );
}
