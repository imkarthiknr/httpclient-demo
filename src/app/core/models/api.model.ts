/** json-server identifiers are always strings. */
export type Id = string;

export interface User {
  id: Id;
  name: string;
  username: string;
  email: string;
  address: { city: string };
  company: { name: string };
}

export interface Post {
  id: Id;
  userId: Id;
  title: string;
  body: string;
}

/** A user with their posts embedded (`GET /users/:id?_embed=posts`). */
export interface UserWithPosts extends User {
  posts: Post[];
}

/** json-server pagination envelope (`?_page=&_per_page=`). */
export interface Page<T> {
  first: number;
  prev: number | null;
  next: number | null;
  last: number;
  pages: number;
  items: number;
  data: T[];
}

export type NewPost = Omit<Post, 'id'>;
