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
