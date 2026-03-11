import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { searchContent, searchSuggest, type SearchResponse } from "@/api/search";

export function useSearch() {
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { i18n } = useTranslation();

  const search = useCallback(
    async (query: string, contentType = "", page = 1) => {
      setLoading(true);
      try {
        const resp = await searchContent(query, i18n.language, contentType, page);
        setResults(resp);
      } finally {
        setLoading(false);
      }
    },
    [i18n.language]
  );

  const suggest = useCallback(
    async (prefix: string) => {
      if (prefix.length < 2) {
        setSuggestions([]);
        return;
      }
      const items = await searchSuggest(prefix, i18n.language);
      setSuggestions(items);
    },
    [i18n.language]
  );

  return { results, suggestions, loading, search, suggest };
}
