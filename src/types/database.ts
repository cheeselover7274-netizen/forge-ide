export type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
  total_support_received: number;
  created_at: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
};

export type Want = {
  id: string;
  user_id: string;
  category_id: string | null;
  title: string;
  description: string;
  price_id_pay: number | null;
  images: string[];
  tags: string[];
  support_count: number;
  comment_count: number;
  trending_score: number;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  categories?: Category;
};

export type Support = {
  id: string;
  user_id: string;
  want_id: string;
  created_at: string;
};

export type Comment = {
  id: string;
  user_id: string;
  want_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  profiles?: Profile;
};
