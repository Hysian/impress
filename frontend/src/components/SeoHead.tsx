import { useEffect, useRef } from "react";

export interface SeoHeadProps {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  canonicalUrl?: string;
  locale?: string;
}

function setMetaTag(attr: string, key: string, content: string): HTMLMetaElement {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
  return el;
}

export default function SeoHead({
  title,
  description,
  ogTitle,
  ogDescription,
  ogImage,
  ogType,
  canonicalUrl,
  locale,
}: SeoHeadProps) {
  const originalTitleRef = useRef<string>(document.title);
  const addedElementsRef = useRef<HTMLElement[]>([]);

  useEffect(() => {
    originalTitleRef.current = document.title;
    const added: HTMLElement[] = [];

    if (title) {
      document.title = title;
    }

    if (description) {
      added.push(setMetaTag("name", "description", description));
    }

    if (ogTitle) {
      added.push(setMetaTag("property", "og:title", ogTitle));
    }

    if (ogDescription) {
      added.push(setMetaTag("property", "og:description", ogDescription));
    }

    if (ogImage) {
      added.push(setMetaTag("property", "og:image", ogImage));
    }

    if (ogType) {
      added.push(setMetaTag("property", "og:type", ogType));
    }

    if (locale) {
      added.push(setMetaTag("property", "og:locale", locale));
    }

    if (canonicalUrl) {
      let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
      }
      link.setAttribute("href", canonicalUrl);
      added.push(link);
    }

    addedElementsRef.current = added;

    return () => {
      document.title = originalTitleRef.current;
      for (const el of added) {
        el.remove();
      }
    };
  }, [title, description, ogTitle, ogDescription, ogImage, ogType, canonicalUrl, locale]);

  return null;
}
