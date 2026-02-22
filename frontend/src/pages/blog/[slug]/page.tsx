import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPublicArticle } from "@/api/articles";
import type { Article } from "@/api/articles";

export default function BlogDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getPublicArticle(slug);
        setArticle(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load article");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [slug]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "Article not found"}</p>
          <button
            onClick={() => navigate("/blog")}
            className="text-blue-600 hover:text-blue-800"
          >
            Back to Blog
          </button>
        </div>
      </div>
    );
  }

  const title = article.zhTitle || article.enTitle;
  const body = article.zhBody || article.enBody;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <button
        onClick={() => navigate("/blog")}
        className="text-blue-600 hover:text-blue-800 mb-6 inline-flex items-center text-sm"
      >
        &larr; Back to Blog
      </button>

      {article.coverImage && (
        <div className="mb-8 rounded-lg overflow-hidden">
          <img
            src={article.coverImage}
            alt={title}
            className="w-full h-auto max-h-96 object-cover"
          />
        </div>
      )}

      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{title}</h1>
        <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
          <span>{formatDate(article.publishedAt || article.createdAt)}</span>
          {article.category && (
            <>
              <span>&middot;</span>
              <button
                onClick={() => navigate(`/blog?category=${article.category!.slug}`)}
                className="text-blue-600 hover:text-blue-800"
              >
                {article.category.zhName || article.category.enName}
              </button>
            </>
          )}
        </div>
        {article.tags && article.tags.length > 0 && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {article.tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => navigate(`/blog?tag=${tag.slug}`)}
                className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200"
              >
                {tag.zhName || tag.enName}
              </button>
            ))}
          </div>
        )}
      </header>

      <article className="prose prose-gray max-w-none">
        <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed text-gray-800 bg-transparent border-none p-0 overflow-visible">
          {body}
        </pre>
      </article>
    </div>
  );
}
