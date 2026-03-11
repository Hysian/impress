import { http } from "./http";

export interface Comment {
  id: number;
  content: string;
  authorName: string;
  authorEmail?: string;
  authorUrl?: string;
  contentType: string;
  contentId: number;
  parentId: number | null;
  status: string;
  pinned: boolean;
  children?: Comment[];
  createdAt: string;
}

export interface CommentListResponse {
  comments: Comment[];
  total: number;
  page: number;
  pageSize: number;
}

export async function getComments(contentType: string, contentId: number, page = 1): Promise<CommentListResponse> {
  const { data } = await http.get<CommentListResponse>(
    `/public/comments?contentType=${contentType}&contentId=${contentId}&page=${page}`
  );
  return data;
}

export async function postComment(input: {
  content: string;
  authorName: string;
  authorEmail?: string;
  contentType: string;
  contentId: number;
  parentId?: number;
  captchaToken?: string;
}): Promise<Comment> {
  const { data } = await http.post<Comment>("/public/comments", input);
  return data;
}
