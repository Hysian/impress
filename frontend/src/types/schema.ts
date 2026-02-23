/**
 * Schema type definitions for structured form editing.
 * Each FieldDescriptor describes one editable field in a page config.
 */

export type FieldType =
  | "localizedText"
  | "localizedRichText"
  | "mediaRef"
  | "cta"
  | "string"
  | "enum"
  | "color"
  | "array"
  | "object";

/** Base properties shared by all field descriptors */
interface FieldBase {
  type: FieldType;
  label: string;
  required?: boolean;
  editable?: boolean;
  /** Key used as the object property name when this field is inside an array's itemFields */
  key?: string;
}

export interface LocalizedTextField extends FieldBase {
  type: "localizedText";
}

export interface LocalizedRichTextField extends FieldBase {
  type: "localizedRichText";
}

export interface MediaRefField extends FieldBase {
  type: "mediaRef";
}

export interface CtaField extends FieldBase {
  type: "cta";
}

export interface StringField extends FieldBase {
  type: "string";
}

export interface EnumField extends FieldBase {
  type: "enum";
  options: { label: string; value: string }[];
}

export interface ColorField extends FieldBase {
  type: "color";
}

export interface ArrayField extends FieldBase {
  type: "array";
  itemFields: FieldDescriptor[];
  minItems?: number;
}

export interface ObjectField extends FieldBase {
  type: "object";
  fields: Record<string, FieldDescriptor>;
}

export type FieldDescriptor =
  | LocalizedTextField
  | LocalizedRichTextField
  | MediaRefField
  | CtaField
  | StringField
  | EnumField
  | ColorField
  | ArrayField
  | ObjectField;

/** Top-level page schema */
export interface PageSchema {
  pageKey: string;
  label: string;
  fields: Record<string, FieldDescriptor>;
}
