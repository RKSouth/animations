"use client";  
import SearchDirectory, { SearchableEntry } from "../components/searchDirectory";
import Link from "next/link";


export default function AllAnimations() {  

    return (  

         <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
            
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
                        <Link
            href="/"
            className="me-4 inline-block bg-orange-600/22 p-2  shadow-lg border-none rounded-lg backdrop-blur-sm text-sm font-medium transition hover:text-blue/80"
          >
            Home
          </Link>
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
      Games
       
          </h1>

          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            These are some of the games I have created. I am always looking for new ideas and inspiration.
          </p>
    
        </div>

         <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          {/* <Link
            href="/games/spinmaster"
            className="inline-block bg-orange-600/72 p-2  shadow-lg border-none rounded-lg backdrop-blur-sm text-sm font-medium transition hover:text-blue/80"
          >
            Spin Master
          </Link>
         */}
         </div>

        <div className="flex flex-col gap-4 text-base font-medium sm:flex-col">
      <p>Created by Rachael Kelm-Southworth</p>
      <p>email <strong className="text-semibold text-orange-500">rkelmsouthworth@gmail.com</strong> for use and more ideas</p>
        </div>
      </main>

          <div  className= "sticky m-4 justify-start">  <SearchDirectory
            title="Explore the portfolio"
            subtitle="Search by title, keyword, section, or heading"
            emptyMessage="No results found."
            entries={[] as SearchableEntry[]}
           
          /></div>
             
    </div>



    );
}