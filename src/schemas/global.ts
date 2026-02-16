import type { PageSchema } from "@/types/schema";

export const globalSchema: PageSchema = {
  pageKey: "global",
  label: "全局配置",
  fields: {
    branding: {
      type: "object",
      label: "品牌",
      required: true,
      editable: true,
      fields: {
        logo: { type: "mediaRef", label: "Logo", required: true, editable: true },
        companyName: { type: "localizedText", label: "公司名称", required: true, editable: true },
      },
    },
    nav: {
      type: "object",
      label: "导航",
      required: true,
      editable: true,
      fields: {
        items: {
          type: "array",
          label: "导航项",
          required: true,
          editable: true,
          itemFields: [
            { type: "localizedText", label: "文字", required: true, editable: true },
            { type: "string", label: "链接", required: true, editable: true },
          ],
        },
      },
    },
    footer: {
      type: "object",
      label: "页脚",
      required: true,
      editable: true,
      fields: {
        address: { type: "localizedText", label: "地址", required: false, editable: true },
        phone: { type: "localizedText", label: "电话", required: false, editable: true },
        links: {
          type: "array",
          label: "链接",
          required: false,
          editable: true,
          itemFields: [
            { type: "localizedText", label: "文字", required: true, editable: true },
            { type: "string", label: "链接", required: true, editable: true },
          ],
        },
        copyright: { type: "localizedText", label: "版权信息", required: false, editable: true },
      },
    },
  },
};
