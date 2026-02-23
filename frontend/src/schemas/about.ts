import type { PageSchema } from "@/types/schema";

export const aboutSchema: PageSchema = {
  pageKey: "about",
  label: "关于我们",
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
    companyProfile: {
      type: "object",
      label: "公司简介",
      required: true,
      editable: true,
      fields: {
        title: { type: "localizedText", label: "标题", required: true, editable: true },
        description: { type: "localizedRichText", label: "描述", required: true, editable: true },
      },
    },
    blocks: {
      type: "array",
      label: "内容块",
      required: true,
      editable: true,
      itemFields: [
        {
          key: "layout",
          type: "enum",
          label: "布局",
          required: true,
          editable: true,
          options: [
            { label: "图片在左", value: "imageLeft" },
            { label: "图片在右", value: "imageRight" },
          ],
        },
        { key: "title", type: "localizedText", label: "标题", required: false, editable: true },
        { key: "description", type: "localizedRichText", label: "描述", required: true, editable: true },
        { key: "image", type: "mediaRef", label: "图片", required: true, editable: true },
      ],
    },
  },
};
