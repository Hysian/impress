import { lazy, Suspense } from "react";
import type { ThemePageDefinition } from "./types";

const DynamicPage = lazy(() => import("@/theme/DynamicPage"));

function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-gray-400 animate-pulse">加载中...</div>
    </div>
  );
}

interface ThemePageWrapperProps {
  pageDef: ThemePageDefinition;
}

export default function ThemePageWrapper({ pageDef }: ThemePageWrapperProps) {
  if (pageDef.renderMode === "hardcoded") {
    if (pageDef.lazyComponent) {
      const LazyComp = lazy(pageDef.lazyComponent);
      return (
        <Suspense fallback={<Loading />}>
          <LazyComp />
        </Suspense>
      );
    }
    if (pageDef.component) {
      const Comp = pageDef.component;
      return <Comp />;
    }
  }

  // dynamic mode — use DynamicPage for CMS-driven rendering
  return (
    <Suspense fallback={<Loading />}>
      <DynamicPage />
    </Suspense>
  );
}
