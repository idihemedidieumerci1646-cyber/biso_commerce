export default function Navbar() {
  return (
    <nav className="border-b border-white/10 bg-[#050b16]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2">

        <h1 className="flex items-center gap-2 text-lg font-black text-white">
          🏪 BISO-
          <span className="bg-gradient-to-r from-orange-400 to-yellow-300 bg-clip-text text-transparent">
            COMMERCE
          </span>
        </h1>

        <div className="flex items-center gap-3">
          

          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">
            ● En ligne
          </span>
        </div>

      </div>
    </nav>
  );
}