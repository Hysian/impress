import type { PageSchema } from "@/types/schema";

export const coreServicesSchema: PageSchema = {
  pageKey: "core-services",
  label: "核心服务",
  fields: {
    hero: {
      type: "object",
      label: "Hero 区域",
      required: true,
      editable: true,
      fields: {
        label: { type: "localizedText", label: "标签", required: false, editable: true },
        title: { type: "localizedText", label: "标题", required: true, editable: true },
        image: { type: "mediaRef", label: "图片", required: false, editable: true },
      },
    },
    services: {
      type: "array",
      label: "服务列表",
      required: true,
      editable: true,
      itemFields: [
        { type: "localizedText", label: "标题", required: true, editable: true },
        { type: "localizedRichText", label: "描述", required: true, editable: true },
        { type: "mediaRef", label: "图片", required: true, editable: true },
      ],
    },
  },
};
