// next.config.js
// Ce fichier doit être en JS pour être pris en compte par Render
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Générer un site 100% statique (remplace next export)
  output: 'export',
  // (Optionnel) Modifier le dossier de sortie si besoin
  // distDir: 'build',  
};

module.exports = nextConfig;
