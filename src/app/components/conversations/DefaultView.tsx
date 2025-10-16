import React from 'react';

const DefaultView: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col h-screen bg-[var(--blue)] overflow-hidden relative">
      {/* Arrière-plan dynamique */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute w-[50vw] h-[50vw] bg-[var(--blue-ciel)] rounded-full blur-[150px] -left-[15%] -top-[15%] animate-float" />
        <div className="absolute w-[50vw] h-[50vw] bg-[var(--jaune)] rounded-full blur-[150px] -right-[15%] -bottom-[15%] animate-float-delayed" />
      </div>

      {/* Contenu principal */}
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center py-10">
        <div className="w-full max-w-3xl mx-auto px-8 flex flex-col items-center">
          {/* Icône centrale */}
          <div className="mb-5 animate-bounce-slow">
            <svg
              className="w-[12vh] h-[12vh] lg:w-[20vh] lg:h-[20vh] text-[var(--jaune)]"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
            </svg>
          </div>

          {/* Titre */}
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-[var(--light)] text-center mb-5 max-w-2xl">
            BIENVENUE DANS VOTRE ESPACE DE DISCUSSION
          </h1>

          {/* Carte interactive */}
          <div className="w-full max-w-xl bg-[var(--light)]/10 backdrop-blur-xl rounded-2xl border border-[var(--blue-ciel)]/30 p-5 transition-all hover:border-[var(--jaune)]">
            <p className="text-[1.6vh] lg:text-[2.2vh] text-[var(--light)] text-center mb-[1.6vh] lg:mb-[2.2vh]">
              Sélectionnez une conversation ou créez-en une nouvelle
            </p>
            
            <div className="flex justify-center">
              <button className="bg-[var(--jaune)] hover:bg-[var(--blue-ciel)] text-[var(--blue)] text-[1.5vh] lg:text-[2vh] px-[3vw] lg:px-[5vw] py-[1.3vh] lg:py-[1.7vh] rounded-xl font-bold transition-all duration-300 hover:scale-105">
                DÉMARRER MAINTENANT
              </button>
            </div>
          </div>

          {/* Statut connexion */}
          <div className="mt-5 flex items-center justify-center space-x-2 text-[var(--light)]">
            <span className="relative flex h-[1vh] w-[1vh] lg:h-[1.5vh] lg:w-[1.5vh]">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--secondary-color)] opacity-75" />
              <span className="relative inline-flex rounded-full h-full w-full bg-[var(--secondary-color)]" />
            </span>
            <span className="text-[1.3vh] lg:text-[1.7vh]">Connecté - Prêt à discuter</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DefaultView;