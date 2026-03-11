import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSearch } from "@/hooks/useSearch";

interface SearchBoxProps {
  onSelect?: (url: string) => void;
  className?: string;
}

export default function SearchBox({ onSelect, className }: SearchBoxProps) {
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { suggestions, suggest } = useSearch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) suggest(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, suggest]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (text: string) => {
    setQuery(text);
    navigate(`/search?q=${encodeURIComponent(text)}`);
    setShowSuggestions(false);
    if (onSelect) onSelect(`/search?q=${encodeURIComponent(text)}`);
  };

  return (
    <form onSubmit={handleSubmit} className={`relative ${className ?? ""}`}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        placeholder={t("search.placeholder", "Search...")}
        className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
      />
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
          {suggestions.map((s, i) => (
            <li
              key={i}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
              onMouseDown={() => handleSuggestionClick(s)}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
