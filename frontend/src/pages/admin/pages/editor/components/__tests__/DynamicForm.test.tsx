import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import DynamicForm from "../DynamicForm";
import type { FieldSchema } from "../fields/types";

// Mock ImagePickerModal to avoid complex dependencies in tests
vi.mock("@/components/admin/ImagePickerModal", () => ({
  default: ({ open, onClose, onSelect }: any) =>
    open ? (
      <div data-testid="image-picker-modal">
        <button onClick={onClose}>close-modal</button>
        <button onClick={() => onSelect({ url: "/picked.jpg" })}>pick-image</button>
      </div>
    ) : null,
}));

describe("DynamicForm", () => {
  const heroSchema: FieldSchema[] = [
    { key: "title", type: "bilingual", label: "标题" },
    { key: "backgroundColor", type: "color", label: "背景色" },
  ];

  it("renders a field for each schema entry", () => {
    render(
      <DynamicForm
        schema={heroSchema}
        data={{ title: { zh: "你好", en: "Hi" }, backgroundColor: "#fff" }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByDisplayValue("你好")).toBeInTheDocument();
    expect(screen.getByDisplayValue("#fff")).toBeInTheDocument();
  });

  it("calls onChange with updated data", () => {
    const onChange = vi.fn();
    render(
      <DynamicForm
        schema={heroSchema}
        data={{ title: { zh: "你好", en: "Hi" }, backgroundColor: "#fff" }}
        onChange={onChange}
      />
    );
    fireEvent.change(screen.getByDisplayValue("#fff"), { target: { value: "#000" } });
    expect(onChange).toHaveBeenCalledWith({
      title: { zh: "你好", en: "Hi" },
      backgroundColor: "#000",
    });
  });

  it("skips hidden fields", () => {
    render(
      <DynamicForm
        schema={[{ key: "id", type: "text", label: "ID", hidden: true }]}
        data={{ id: "abc" }}
        onChange={vi.fn()}
      />
    );
    expect(screen.queryByDisplayValue("abc")).not.toBeInTheDocument();
  });
});
