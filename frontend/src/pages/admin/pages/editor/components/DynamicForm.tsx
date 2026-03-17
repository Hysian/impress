import FieldRenderer from "./FieldRenderer";
import type { FieldSchema } from "./fields/types";

interface DynamicFormProps {
  schema: FieldSchema[];
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}

export default function DynamicForm({ schema, data, onChange }: DynamicFormProps) {
  const handleFieldChange = (key: string, value: unknown) => {
    onChange({ ...data, [key]: value });
  };

  return (
    <div className="space-y-4">
      {schema.map((field) => (
        <FieldRenderer
          key={field.key}
          schema={field}
          value={data[field.key]}
          onChange={(val) => handleFieldChange(field.key, val)}
        />
      ))}
    </div>
  );
}
