import type { FieldSchema } from "./fields/types";
import { lazy, Suspense, type ComponentType } from "react";
import {
  TextField, TextareaField, BilingualField, BilingualTextareaField,
  MediaField, ColorField, SelectField, NumberField, BooleanField,
  StringArrayField,
} from "./fields";
import type { FieldProps } from "./fields/types";

// Lazy-import ArrayField to break circular: ArrayField -> FieldRenderer -> ArrayField
const ArrayField = lazy(() => import("./fields/ArrayField"));

const FIELD_MAP: Record<string, ComponentType<FieldProps>> = {
  text: TextField,
  textarea: TextareaField,
  bilingual: BilingualField,
  "bilingual-textarea": BilingualTextareaField,
  media: MediaField,
  color: ColorField,
  select: SelectField,
  number: NumberField,
  boolean: BooleanField,
  "string-array": StringArrayField,
};

interface FieldRendererProps {
  schema: FieldSchema;
  value: unknown;
  onChange: (value: unknown) => void;
}

export default function FieldRenderer({ schema, value, onChange }: FieldRendererProps) {
  if (schema.hidden) return null;

  if (schema.type === "array") {
    return (
      <Suspense fallback={null}>
        <ArrayField schema={schema} value={value} onChange={onChange} />
      </Suspense>
    );
  }

  const Component = FIELD_MAP[schema.type];
  if (!Component) return null;
  return <Component schema={schema} value={value} onChange={onChange} />;
}
