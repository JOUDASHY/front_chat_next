export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface Profile {
  image: string | null;
  lieu: string | null;
  date_naiv: string | null;
  status: string | null;
  passion: string | null;
  // New fields
  gender: string | null;
  phone_number: string | null;
  profession: string | null;
  website: string | null;
  bio: string | null;
  last_seen: string | null;
  is_verified: boolean;
  theme_preference: string | null;
  language_preference: string | null;
  age: number | null;
  created_at: string;
  updated_at: string;
  cover_image?: string;
}