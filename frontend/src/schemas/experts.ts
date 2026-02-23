import type { PageSchema } from "@/types/schema";

export const expertsSchema: PageSchema = {
  pageKey: "experts",
  label: "专家",
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
    sectionTitle: { type: "localizedText", label: "板块标题", required: true, editable: true },
    experts: {
      type: "array",
      label: "专家列表",
      required: true,
      editable: true,
      itemFields: [
        { key: "id", type: "string", label: "ID", required: true, editable: false },
        { key: "name", type: "localizedText", label: "姓名", required: true, editable: true },
        { key: "title", type: "localizedText", label: "职称", required: true, editable: true },
        { key: "avatar", type: "mediaRef", label: "头像", required: true, editable: true },
        {
          key: "bioParagraphs",
          type: "array",
          label: "简介段落",
          required: true,
          editable: true,
          itemFields: [
            { type: "localizedRichText", label: "段落", required: true, editable: true },
          ],
        },
      ],
    },
  },
};
