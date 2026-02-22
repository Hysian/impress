import type { FieldDescriptor } from "@/types/schema";
import LocalizedTextField from "./LocalizedTextField";
import LocalizedRichTextField from "./LocalizedRichTextField";
import MediaRefField from "./MediaRefField";
import CtaField from "./CtaField";
import StringField from "./StringField";
import EnumField from "./EnumField";
import ColorField from "./ColorField";
import ArrayField from "./ArrayField";
import ObjectField from "./ObjectField";

interface FieldRendererProps {
  descriptor: FieldDescriptor;
  value: unknown;
  onChange: (value: unknown) => void;
  path: string;
  disabled?: boolean;
  onPickImage?: (onSelect: (url: string) => void) => void;
}

export default function FieldRenderer({
  descriptor,
  value,
  onChange,
  path,
  disabled,
  onPickImage,
}: FieldRendererProps) {
  const isDisabled = disabled || descriptor.editable === false;

  switch (descriptor.type) {
    case "localizedText":
      return (
        <LocalizedTextField
          value={value as { zh: string; en: string } | undefined}
          onChange={onChange as (v: { zh: string; en: string }) => void}
          label={descriptor.label}
          required={descriptor.required}
          disabled={isDisabled}
          path={path}
        />
      );

    case "localizedRichText":
      return (
        <LocalizedRichTextField
          value={value as { zh: string; en: string } | undefined}
          onChange={onChange as (v: { zh: string; en: string }) => void}
          label={descriptor.label}
          required={descriptor.required}
          disabled={isDisabled}
          path={path}
        />
      );

    case "mediaRef":
      return (
        <MediaRefField
          value={value as { url: string; alt: { zh: string; en: string } } | undefined}
          onChange={onChange as (v: { url: string; alt: { zh: string; en: string } }) => void}
          label={descriptor.label}
          required={descriptor.required}
          disabled={isDisabled}
          path={path}
          onPickImage={onPickImage}
        />
      );

    case "cta":
      return (
        <CtaField
          value={value as { label: { zh: string; en: string }; href: string; target?: string } | undefined}
          onChange={onChange as (v: { label: { zh: string; en: string }; href: string; target?: string }) => void}
          label={descriptor.label}
          required={descriptor.required}
          disabled={isDisabled}
          path={path}
        />
      );

    case "string":
      return (
        <StringField
          value={value as string | undefined}
          onChange={onChange as (v: string) => void}
          label={descriptor.label}
          required={descriptor.required}
          disabled={isDisabled}
          path={path}
        />
      );

    case "enum":
      return (
        <EnumField
          value={value as string | undefined}
          onChange={onChange as (v: string) => void}
          label={descriptor.label}
          required={descriptor.required}
          disabled={isDisabled}
          path={path}
          options={descriptor.options}
        />
      );

    case "color":
      return (
        <ColorField
          value={value as string | undefined}
          onChange={onChange as (v: string) => void}
          label={descriptor.label}
          required={descriptor.required}
          disabled={isDisabled}
          path={path}
        />
      );

    case "array":
      return (
        <ArrayField
          value={value as unknown[] | undefined}
          onChange={onChange as (v: unknown[]) => void}
          label={descriptor.label}
          required={descriptor.required}
          disabled={isDisabled}
          path={path}
          itemFields={descriptor.itemFields}
          minItems={descriptor.minItems}
          onPickImage={onPickImage}
        />
      );

    case "object":
      return (
        <ObjectField
          value={value as Record<string, unknown> | undefined}
          onChange={onChange as (v: Record<string, unknown>) => void}
          label={descriptor.label}
          required={descriptor.required}
          disabled={isDisabled}
          path={path}
          fields={descriptor.fields}
          onPickImage={onPickImage}
        />
      );

    default:
      return (
        <div className="text-sm text-red-500">
          未知字段类型: {(descriptor as FieldDescriptor).type}
        </div>
      );
  }
}
