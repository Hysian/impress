import type { ThemePackage } from "../types";
import { defaultTokens } from "../../tokens";

const defaultTheme: ThemePackage = {
  id: "default",
  name: "经典蓝绿",
  description: "印迹咨询经典配色，专业沉稳的蓝绿色调",
  author: "Blotting Consultancy",
  version: "1.0.0",
  preview: "linear-gradient(135deg, #1a5f8f 0%, #8bc34a 100%)",
  tokens: defaultTokens,
};
export default defaultTheme;
