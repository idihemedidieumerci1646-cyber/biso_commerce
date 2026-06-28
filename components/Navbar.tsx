export default function Navbar() {
  return (
    <nav className="bg-slate-900 border-b border-slate-700 p-4">
      <div className="max-w-7xl mx-auto flex flex-wrap gap-4 items-center justify-between">

        <h1 className="text-white text-2xl font-bold">
          🏪 Biso-Commerce
        </h1>

        <div className="flex gap-4 text-white text-sm">
          <a href="/dashboard" className="hover:text-green-400">
            Dashboard
          </a>

          <a href="/products" className="hover:text-green-400">
            Produits
          </a>

          <a href="/products/add" className="hover:text-green-400">
            Ajouter
          </a>

          <a href="/login" className="hover:text-green-400">
            Connexion
          </a>

          <a href="/register" className="hover:text-green-400">
            Inscription
          </a>
        </div>

      </div>
    </nav>
  );
}
