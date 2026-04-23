"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type SearchableEntry = {
  id: string;
  title: string;
  href: string;
  section: string;
  description?: string;
  author?: string;
  keywords?: string[];
  headings?: string[];
};

type SearchDirectoryProps = {
  title: string;
  subtitle?: string;
  entries: SearchableEntry[];
  emptyMessage?: string;
};

export default function SearchDirectory({
  title,
  subtitle,
  entries,
  emptyMessage = "No matching results.",
}: SearchDirectoryProps) {
  const [query, setQuery] = useState("");

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return entries;
    }

    return entries.filter((entry) => {
      const searchableParts = [
        entry.title,
        entry.section,
        entry.description ?? "",
        entry.author ?? "",
        ...(entry.keywords ?? []),
        ...(entry.headings ?? []),
      ];

      return searchableParts.some((value) =>
        value.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [entries, query]);

  const groupedEntries = useMemo(() => {
    return filteredEntries.reduce<Record<string, SearchableEntry[]>>(
      (groups, entry) => {
        if (!groups[entry.section]) {
          groups[entry.section] = [];
        }

        groups[entry.section].push(entry);
        return groups;
      },
      {}
    );
  }, [filteredEntries]);

  const sectionNames = Object.keys(groupedEntries);

  return (
    <aside className="w-full">
      <div className="bg-white/72 p-6  shadow-lg border border-black/20 rounded-lg backdrop-blur-sm">

        <div className="mt-1 text-2xl font-semibold text-black/80">{title}</div>

        {subtitle ? (
          <div className="mt-2 max-w-xs text-sm leading-6 text-black/55">
            {subtitle}
          </div>
        ) : null}

        <div className="mt-5">
          <label htmlFor="Directory-search" className="sr-only">
            Search content
          </label>
          <input
            id="Directory-search"
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title, keyword, section, or heading"
            className="w-full rounded-xl border border-black/8 bg-white/80 px-4 py-3 text-sm outline-none transition placeholder:text-black/35 focus:border-black/20"
          />
        </div>

        <div className="mt-8 flex flex-col gap-8">
          {sectionNames.length === 0 ? (
            <div className="text-sm text-black/50">{emptyMessage}</div>
          ) : (
            sectionNames.map((sectionName) => (
              <div key={sectionName}>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-black/40">
                  {sectionName}
                </div>

                <div className="mt-3 flex flex-col gap-4">
                  {groupedEntries[sectionName].map((entry) => (
                    <Link
                      key={entry.id}
                      href={entry.href}
                      className="block transition hover:opacity-70"
                    >
                      <div className="text-sm font-medium text-black/75">
                        {entry.title}
                      </div>

                      {entry.description ? (
                        <div className="mt-1 text-sm leading-6 text-black/45">
                          {entry.description}
                        </div>
                      ) : null}
                    </Link>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
