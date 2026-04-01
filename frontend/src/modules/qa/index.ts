export { default as QAWidget } from "./widget/QAWidget";

export const qaModuleConfig = {
  name: "qa",
  adminRoute: {
    path: "qa",
    lazy: () => import("./admin/page").then((m) => ({ Component: m.default })),
  },
  sidebar: {
    label: "知识问答",
    path: "/admin/qa",
    permissionKey: "qa",
  },
};
