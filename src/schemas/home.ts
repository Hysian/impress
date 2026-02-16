import type { PageSchema } from "@/types/schema";

export const homeSchema: PageSchema = {
  pageKey: "home",
  label: "首页",
  fields: {
    hero: {
      type: "object",
      label: "Hero 区域",
      required: true,
      editable: true,
      fields: {
        title: { type: "localizedText", label: "标题", required: true, editable: true },
        subtitle: { type: "localizedText", label: "副标题", required: true, editable: true },
        backgroundImage: { type: "mediaRef", label: "背景图片", required: true, editable: true },
      },
    },
    about: {
      type: "object",
      label: "关于我们区域",
      required: true,
      editable: true,
      fields: {
        title: { type: "localizedText", label: "标题", required: true, editable: true },
        descriptions: {
          type: "array",
          label: "描述段落",
          required: true,
          editable: true,
          minItems: 1,
          itemFields: [
            { type: "localizedRichText", label: "段落", required: true, editable: true },
          ],
        },
        image: { type: "mediaRef", label: "图片", required: true, editable: true },
        cta: { type: "cta", label: "行动按钮", required: true, editable: true },
      },
    },
    advantages: {
      type: "object",
      label: "优势区域",
      required: true,
      editable: true,
      fields: {
        title: { type: "localizedText", label: "标题", required: true, editable: true },
        cards: {
          type: "array",
          label: "优势卡片",
          required: true,
          editable: true,
          minItems: 1,
          itemFields: [
            { type: "localizedText", label: "标题", required: true, editable: true },
            { type: "localizedText", label: "英文标题", required: true, editable: true },
            { type: "localizedRichText", label: "描述", required: true, editable: true },
            { type: "mediaRef", label: "图片", required: true, editable: true },
          ],
        },
      },
    },
    coreServices: {
      type: "object",
      label: "核心服务区域",
      required: true,
      editable: true,
      fields: {
        title: { type: "localizedText", label: "标题", required: true, editable: true },
        items: {
          type: "array",
          label: "服务列表",
          required: true,
          editable: true,
          minItems: 1,
          itemFields: [
            { type: "localizedText", label: "标题", required: true, editable: true },
            { type: "localizedRichText", label: "描述", required: true, editable: true },
            { type: "mediaRef", label: "图片", required: true, editable: true },
            { type: "cta", label: "行动按钮", required: true, editable: true },
          ],
        },
      },
    },
  },
};
