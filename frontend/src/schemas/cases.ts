import type { PageSchema } from "@/types/schema";

export const casesSchema: PageSchema = {
  pageKey: "cases",
  label: "案例",
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
    cases: {
      type: "array",
      label: "案例列表",
      required: true,
      editable: true,
      itemFields: [
        { type: "localizedText", label: "标题", required: true, editable: true },
        {
          type: "array",
          label: "条目",
          required: true,
          editable: true,
          itemFields: [
            { type: "localizedRichText", label: "内容", required: true, editable: true },
          ],
        },
      ],
    },
  },
};
