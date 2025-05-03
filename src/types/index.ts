export interface Profile {
  image?: string;
  lieu?: string | null;
  date_naiv?: string | null;
  status?: string | null;
  passion?: string | null;
}

export interface User {
  id: string | number;
  name?: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  profile?: Profile;
}