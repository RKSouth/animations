"use client";

import SearchDirectory, { SearchableEntry } from "./components/searchDirectory";
import Link from "next/link";
export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">

        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Animations and games portfolio
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Looking for a starting point or more instructions? Head over to{" "}
          </p>

              <SearchDirectory
            title="Explore the portfolio"
            subtitle="Search by title, keyword, section, or heading"
            emptyMessage="No results found."
            entries={[] as SearchableEntry[]}
          />
        </div>

         <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <Link
            href="/animations"
            className="inline-block bg-orange-600/72 p-2  shadow-lg border-none rounded-lg backdrop-blur-sm text-sm font-medium transition hover:text-blue/80"
          >
            All Animations
          </Link>
             <Link
            href="/games"
            className="inline-block bg-orange-600/72 p-2  shadow-lg border-none rounded-lg backdrop-blur-sm text-sm font-medium transition hover:text-blue/80"
          >
            All Games
          </Link>
         </div>

        <div className="flex flex-col gap-4 text-base font-medium sm:flex-col">
      <p>Created by Rachael Kelm-Southworth</p>
      <p>email <strong className="text-semibold text-orange-500">rkelmsouthworth@gmail.com</strong> for use and more ideas</p>
        </div>
      </main>
    </div>
  );
}
