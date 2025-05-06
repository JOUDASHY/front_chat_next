import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Générer un site 100% statique (remplace next export)
  output: 'export',
  // (Optionnel) Modifier le dossier de sortie si besoin
  // distDir: 'build',  
};

export default nextConfig;
