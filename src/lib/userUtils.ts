export interface DisplayNameUser {
  username: string;
  first_name?: string | null;
  last_name?: string | null;
  display_name?: string | null;
}

/** Nom affiché : prénom + nom, sinon display_name API, sinon @username */
export function getDisplayName(user: DisplayNameUser | null | undefined): string {
  if (!user) return 'Utilisateur';
  if (user.display_name?.trim()) return user.display_name.trim();
  const full = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  return full || user.username;
}

/** Identifiant unique @pseudo */
export function getUsernameHandle(user: DisplayNameUser | null | undefined): string {
  if (!user?.username) return '';
  return `@${user.username}`;
}

/**
 * Formate une date de dernière connexion en texte relatif.
 * Exemples : "il y a 5 min", "il y a 2 h", "hier à 14h32", "le 12 juin"
 */
export function formatLastSeen(lastSeen: string | null | undefined): string {
  if (!lastSeen) return 'Hors ligne';

  const date = new Date(lastSeen);
  if (isNaN(date.getTime())) return 'Hors ligne';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'En ligne à l\'instant';
  if (diffMin < 60) return `En ligne il y a ${diffMin} min`;
  if (diffHour < 24) return `En ligne il y a ${diffHour} h`;
  if (diffDay === 1) {
    const hh = date.getHours().toString().padStart(2, '0');
    const mm = date.getMinutes().toString().padStart(2, '0');
    return `En ligne hier à ${hh}h${mm}`;
  }
  if (diffDay < 7) {
    const days = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];
    const hh = date.getHours().toString().padStart(2, '0');
    const mm = date.getMinutes().toString().padStart(2, '0');
    return `En ligne ${days[date.getDay()]}. à ${hh}h${mm}`;
  }
  // Plus d'une semaine : date courte
  const day = date.getDate();
  const months = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'aoû', 'sep', 'oct', 'nov', 'déc'];
  return `En ligne le ${day} ${months[date.getMonth()]}`;
}
