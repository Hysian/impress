import type { ReactNode } from "react";
import type { SidebarConfig } from "./types";

interface SidebarProps {
  config?: SidebarConfig;
  children?: ReactNode;
}

export default function Sidebar({ config, children }: SidebarProps) {
  const width = config?.width ?? "280px";

  return (
    <aside
      className="shrink-0 rounded-lg border border-gray-200 bg-gray-50 p-4"
      style={{ width }}
    >
      {children}
    </aside>
  );
}
