import type { PageSchema } from "@/types/schema";

export const contactSchema: PageSchema = {
  pageKey: "contact",
  label: "联系方式",
  fields: {
    hero: {
      type: "object",
      label: "Hero 区域",
      required: true,
      editable: true,
      fields: {
        title: { type: "localizedText", label: "标题", required: true, editable: true },
        subtitle: { type: "localizedText", label: "副标题", required: true, editable: true },
        backgroundColor: { type: "color", label: "背景颜色", required: false, editable: true },
      },
    },
    form: {
      type: "object",
      label: "表单配置",
      required: true,
      editable: true,
      fields: {
        title: { type: "localizedText", label: "标题", required: true, editable: true },
        subtitle: { type: "localizedText", label: "副标题", required: false, editable: true },
        submitLabel: { type: "localizedText", label: "提交按钮文本", required: true, editable: true },
      },
    },
    contactInfo: {
      type: "object",
      label: "联系信息",
      required: true,
      editable: true,
      fields: {
        phone: { type: "localizedText", label: "电话", required: false, editable: true },
        address: { type: "localizedText", label: "地址", required: false, editable: true },
      },
    },
  },
};
