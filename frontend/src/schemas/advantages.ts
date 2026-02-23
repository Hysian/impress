import type { PageSchema } from "@/types/schema";

export const advantagesSchema: PageSchema = {
  pageKey: "advantages",
  label: "优势",
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
    blocks: {
      type: "array",
      label: "优势模块",
      required: true,
      editable: true,
      itemFields: [
        { key: "title", type: "localizedText", label: "标题", required: true, editable: true },
        { key: "description", type: "localizedRichText", label: "描述", required: true, editable: true },
        { key: "image", type: "mediaRef", label: "图片", required: true, editable: true },
      ],
    },
  },
};
