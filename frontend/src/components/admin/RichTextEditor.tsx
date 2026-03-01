import { useEditor, useEditorState, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Youtube from "@tiptap/extension-youtube";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Details from "@tiptap/extension-details";
import { DetailsContent, DetailsSummary } from "@tiptap/extension-details";
import { common, createLowlight } from "lowlight";
import { NodeSelection } from "@tiptap/pm/state";
import { useState, useEffect, useRef, useMemo, memo } from "react";
import type { Editor } from "@tiptap/react";
import ImagePickerModal from "@/components/admin/ImagePickerModal";
import MediaPickerModal from "@/components/admin/MediaPickerModal";
import GalleryPickerModal from "@/components/admin/GalleryPickerModal";
import EmbedUrlModal from "@/components/admin/EmbedUrlModal";
import ToolbarColorPicker from "@/components/admin/editor/ToolbarColorPicker";
import ToolbarDropdown from "@/components/admin/editor/ToolbarDropdown";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Iframe,
  Video,
  Audio,
  ImageGallery,
  Columns,
  Column,
  FontSize,
  LineHeight,
  ResizableMedia,
  SlashCommands,
  BlockHandle,
  BlockToolbar,
  ImagePaste,
} from "@/components/admin/tiptap-extensions";
import { uploadMedia } from "@/api/media";

const lowlight = createLowlight(common);

const FONT_SIZES = [
  { label: "默认", value: "" },
  { label: "12px", value: "12px" },
  { label: "14px", value: "14px" },
  { label: "16px", value: "16px" },
  { label: "18px", value: "18px" },
  { label: "20px", value: "20px" },
  { label: "24px", value: "24px" },
  { label: "28px", value: "28px" },
  { label: "32px", value: "32px" },
  { label: "36px", value: "36px" },
];

const LINE_HEIGHTS = [
  { label: "默认", value: "" },
  { label: "1.0", value: "1" },
  { label: "1.25", value: "1.25" },
  { label: "1.5", value: "1.5" },
  { label: "1.75", value: "1.75" },
  { label: "2.0", value: "2" },
  { label: "2.5", value: "2.5" },
  { label: "3.0", value: "3" },
];

/** Base extensions without ImagePaste (for external use without upload context) */
// eslint-disable-next-line react-refresh/only-export-components
export const EDITOR_EXTENSIONS = [
  StarterKit.configure({ codeBlock: false }),
  Image.configure({ inline: false, allowBase64: false }),
  Link.configure({ openOnClick: false, autolink: true }),
  Underline,
  Subscript,
  Superscript,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  TextStyle,
  Color,
  Highlight.configure({ multicolor: true }),
  FontSize,
  LineHeight,
  Table.configure({ resizable: true }),
  TableRow,
  TableHeader,
  TableCell,
  TaskList,
  TaskItem.configure({ nested: true }),
  Youtube.configure({ width: 640, height: 360 }),
  CodeBlockLowlight.configure({ lowlight }),
  Details,
  DetailsContent,
  DetailsSummary,
  Iframe,
  Video,
  Audio,
  ImageGallery,
  Columns,
  Column,
  ResizableMedia,
  SlashCommands,
  BlockHandle,
  BlockToolbar,
  Placeholder.configure({
    placeholder: ({ node }) => {
      if (node.type.name === "heading") {
        return `标题 ${node.attrs.level}`;
      }
      return "输入内容，或输入 / 选择内容块...";
    },
  }),
];

/** Full extensions with image paste/drop upload support */
// eslint-disable-next-line react-refresh/only-export-components
export function getEditorExtensions() {
  return [
    ...EDITOR_EXTENSIONS,
    ImagePaste.configure({
      uploadFn: async (file: File) => {
        const media = await uploadMedia(file);
        return { url: media.url, filename: media.filename };
      },
    }),
  ];
}

// ─── Toolbar (exported for external use) ───
export const EditorToolbar = memo(function EditorToolbar({ editor, modals }: { editor: Editor; modals: ModalControls }) {
  // Subscribe to editor state changes so toolbar buttons reflect current formatting
  // independent of parent re-renders.
  useEditorState({
    editor,
    selector: ({ transactionNumber }) => transactionNumber,
  });

  const currentFontSize = editor.getAttributes("textStyle").fontSize || "";
  const currentLineHeight = editor.getAttributes("paragraph").lineHeight || editor.getAttributes("heading").lineHeight || "";

  return (
    <>
      {/* Row 1: Text formatting */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 bg-gray-50">
        <ToolbarButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="粗体">
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="斜体">
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="下划线">
          <span className="underline">U</span>
        </ToolbarButton>
        <ToolbarButton active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} title="删除线">
          <s>S</s>
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton active={editor.isActive("superscript")} onClick={() => editor.chain().focus().toggleSuperscript().run()} title="上标">
          <span className="text-xs">X<sup>2</sup></span>
        </ToolbarButton>
        <ToolbarButton active={editor.isActive("subscript")} onClick={() => editor.chain().focus().toggleSubscript().run()} title="下标">
          <span className="text-xs">X<sub>2</sub></span>
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarDropdown
          label={currentFontSize || "字号"} title="字号"
          options={FONT_SIZES.map((s) => ({ label: s.label, value: s.value, active: currentFontSize === s.value }))}
          onSelect={(v) => { if (v) (editor.commands as any).setFontSize(v); else (editor.commands as any).unsetFontSize(); }}
        />
        <ToolbarDropdown
          label={currentLineHeight || "行高"} title="行高"
          options={LINE_HEIGHTS.map((h) => ({ label: h.label, value: h.value, active: currentLineHeight === h.value }))}
          onSelect={(v) => { if (v) (editor.commands as any).setLineHeight(v); else (editor.commands as any).unsetLineHeight(); }}
        />
        <ToolbarDivider />
        <ToolbarColorPicker
          color={editor.getAttributes("textStyle").color}
          onChange={(c) => editor.chain().focus().setColor(c).run()}
          onReset={() => editor.chain().focus().unsetColor().run()}
          icon={<span className="text-xs font-bold">A</span>} title="文字颜色"
        />
        <ToolbarColorPicker
          color={editor.getAttributes("highlight").color}
          onChange={(c) => editor.chain().focus().toggleHighlight({ color: c }).run()}
          onReset={() => editor.chain().focus().unsetHighlight().run()}
          icon={<span className="text-xs font-bold bg-yellow-200 px-0.5">H</span>} title="高亮颜色"
        />
        <ToolbarDivider />
        <ToolbarButton active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="标题 1">H1</ToolbarButton>
        <ToolbarButton active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="标题 2">H2</ToolbarButton>
        <ToolbarButton active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="标题 3">H3</ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="左对齐">
          <span className="text-xs">&#9776;</span>
        </ToolbarButton>
        <ToolbarButton active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="居中">
          <span className="text-xs">&#8801;</span>
        </ToolbarButton>
        <ToolbarButton active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} title="右对齐">
          <span className="text-xs leading-none" style={{ transform: "scaleX(-1)", display: "inline-block" }}>&#9776;</span>
        </ToolbarButton>
        <ToolbarButton active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()} title="两端对齐">
          <span className="text-xs">&#9783;</span>
        </ToolbarButton>
      </div>

      {/* Row 2: Block elements & media */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 bg-gray-50">
        <ToolbarButton active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="无序列表">
          <span className="text-xs">&#8226; 列表</span>
        </ToolbarButton>
        <ToolbarButton active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="有序列表">
          <span className="text-xs">1. 列表</span>
        </ToolbarButton>
        <ToolbarButton active={editor.isActive("taskList")} onClick={() => editor.chain().focus().toggleTaskList().run()} title="任务列表">
          <span className="text-xs">&#9745; 任务</span>
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="引用">
          <span className="text-xs">&ldquo; 引用</span>
        </ToolbarButton>
        <ToolbarButton active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="代码块">
          <span className="text-xs font-mono">&lt;/&gt;</span>
        </ToolbarButton>
        <ToolbarButton active={false} onClick={() => editor.chain().focus().setHorizontalRule().run()} title="分隔线">
          <span className="text-xs">&#8213;</span>
        </ToolbarButton>
        <ToolbarButton active={editor.isActive("details")} onClick={() => editor.chain().focus().setDetails().run()} title="折叠内容">
          <span className="text-xs">&#9654; 折叠</span>
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarDropdown
          label="表格" title="表格操作"
          options={[
            { label: "插入表格 (3x3)", value: "insert" },
            { label: "添加列 (右)", value: "addColumnAfter" },
            { label: "添加列 (左)", value: "addColumnBefore" },
            { label: "删除列", value: "deleteColumn" },
            { label: "添加行 (下)", value: "addRowAfter" },
            { label: "添加行 (上)", value: "addRowBefore" },
            { label: "删除行", value: "deleteRow" },
            { label: "删除表格", value: "deleteTable" },
            { label: "合并单元格", value: "mergeCells" },
            { label: "拆分单元格", value: "splitCell" },
          ]}
          onSelect={(v) => {
            const cmd = editor.chain().focus();
            switch (v) {
              case "insert": cmd.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); break;
              case "addColumnAfter": cmd.addColumnAfter().run(); break;
              case "addColumnBefore": cmd.addColumnBefore().run(); break;
              case "deleteColumn": cmd.deleteColumn().run(); break;
              case "addRowAfter": cmd.addRowAfter().run(); break;
              case "addRowBefore": cmd.addRowBefore().run(); break;
              case "deleteRow": cmd.deleteRow().run(); break;
              case "deleteTable": cmd.deleteTable().run(); break;
              case "mergeCells": cmd.mergeCells().run(); break;
              case "splitCell": cmd.splitCell().run(); break;
            }
          }}
        />
        <ToolbarDivider />
        <ToolbarButton active={false} onClick={() => (editor.commands as any).setColumns(2)} title="2 栏布局">
          <span className="text-xs">2栏</span>
        </ToolbarButton>
        <ToolbarButton active={false} onClick={() => (editor.commands as any).setColumns(3)} title="3 栏布局">
          <span className="text-xs">3栏</span>
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton active={false} onClick={() => modals.openImagePicker()} title="插入图片">
          <span className="text-xs">图片</span>
        </ToolbarButton>
        <ToolbarButton active={false} onClick={() => modals.openGalleryPicker()} title="图片集">
          <span className="text-xs">图片集</span>
        </ToolbarButton>
        <ToolbarButton active={false} onClick={() => modals.openVideoPicker()} title="插入视频">
          <span className="text-xs">视频</span>
        </ToolbarButton>
        <ToolbarButton active={false} onClick={() => modals.openAudioPicker()} title="插入音频">
          <span className="text-xs">音频</span>
        </ToolbarButton>
        <ToolbarButton active={false} onClick={() => modals.openEmbedUrl()} title="嵌入外部内容">
          <span className="text-xs">嵌入</span>
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton active={editor.isActive("link")} onClick={() => {
          const previousUrl = editor.getAttributes("link").href;
          const url = window.prompt("URL", previousUrl);
          if (url === null) return;
          if (url === "") { editor.chain().focus().extendMarkRange("link").unsetLink().run(); return; }
          editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
        }} title="链接">
          <span className="text-xs">链接</span>
        </ToolbarButton>
      </div>
    </>
  );
});

// ─── Modal Controls Interface ───
export interface ModalControls {
  openImagePicker: () => void;
  openGalleryPicker: () => void;
  openVideoPicker: () => void;
  openAudioPicker: () => void;
  openEmbedUrl: () => void;
}

// ─── Editor Modals (exported for external use) ───
export function EditorModals({ editor, state }: { editor: Editor; state: ModalState }) {
  const handleImageSelect = (item: { url: string; filename: string }) => {
    const { selection } = editor.state;
    // If an image is currently selected (NodeSelection on image), replace its src
    if (selection instanceof NodeSelection && selection.node.type.name === "image") {
      const tr = editor.state.tr.setNodeMarkup(selection.from, undefined, {
        ...selection.node.attrs,
        src: item.url,
        alt: item.filename,
      });
      editor.view.dispatch(tr);
      editor.commands.focus();
    } else {
      editor.chain().focus().setImage({ src: item.url, alt: item.filename }).run();
    }
    state.setShowImagePicker(false);
  };

  return (
    <>
      <ImagePickerModal
        open={state.showImagePicker}
        onClose={() => state.setShowImagePicker(false)}
        onSelect={handleImageSelect}
      />
      <GalleryPickerModal
        open={state.showGalleryPicker}
        onClose={() => state.setShowGalleryPicker(false)}
        onConfirm={(items) => {
          const images = items.map((i) => ({ src: i.url, alt: i.filename }));
          (editor.commands as any).setImageGallery({ images, columns: Math.min(images.length, 3) });
          state.setShowGalleryPicker(false);
        }}
      />
      <MediaPickerModal
        open={state.showVideoPicker}
        onClose={() => state.setShowVideoPicker(false)}
        onSelect={(item) => { (editor.commands as any).setVideo({ src: item.url }); state.setShowVideoPicker(false); }}
        accept="video/*" type="video" title="选择视频"
      />
      <MediaPickerModal
        open={state.showAudioPicker}
        onClose={() => state.setShowAudioPicker(false)}
        onSelect={(item) => { (editor.commands as any).setAudio({ src: item.url }); state.setShowAudioPicker(false); }}
        accept="audio/*" type="audio" title="选择音频"
      />
      <EmbedUrlModal
        open={state.showEmbedUrl}
        onClose={() => state.setShowEmbedUrl(false)}
        onConfirm={(result) => {
          if (result.type === "youtube") editor.commands.setYoutubeVideo({ src: result.url });
          else (editor.commands as any).setIframe({ src: result.url });
          state.setShowEmbedUrl(false);
        }}
      />
    </>
  );
}

export interface ModalState {
  showImagePicker: boolean;
  setShowImagePicker: (v: boolean) => void;
  showGalleryPicker: boolean;
  setShowGalleryPicker: (v: boolean) => void;
  showVideoPicker: boolean;
  setShowVideoPicker: (v: boolean) => void;
  showAudioPicker: boolean;
  setShowAudioPicker: (v: boolean) => void;
  showEmbedUrl: boolean;
  setShowEmbedUrl: (v: boolean) => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useModalState(): { modals: ModalControls; state: ModalState } {
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [showVideoPicker, setShowVideoPicker] = useState(false);
  const [showAudioPicker, setShowAudioPicker] = useState(false);
  const [showEmbedUrl, setShowEmbedUrl] = useState(false);

  // Memoize modals object — setState functions are stable, so deps are empty
  const modals = useMemo<ModalControls>(() => ({
    openImagePicker: () => setShowImagePicker(true),
    openGalleryPicker: () => setShowGalleryPicker(true),
    openVideoPicker: () => setShowVideoPicker(true),
    openAudioPicker: () => setShowAudioPicker(true),
    openEmbedUrl: () => setShowEmbedUrl(true),
  }), []);

  return {
    modals,
    state: {
      showImagePicker, setShowImagePicker,
      showGalleryPicker, setShowGalleryPicker,
      showVideoPicker, setShowVideoPicker,
      showAudioPicker, setShowAudioPicker,
      showEmbedUrl, setShowEmbedUrl,
    },
  };
}

// ─── Standalone RichTextEditor (backwards-compatible) ───

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const { modals, state } = useModalState();
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    extensions: getEditorExtensions(),
    content: value,
    onUpdate: ({ editor: e }) => {
      // Use ref to avoid re-creating editor on onChange identity change
      onChangeRef.current(e.getHTML());
    },
    editorProps: { attributes: { class: "tiptap" } },
  });

  // Wire up the "替换" button from ResizableMedia
  useEffect(() => {
    if (!editor) return;
    const handleReplace = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.type === "image") {
        state.setShowImagePicker(true);
      } else if (detail?.type === "video") {
        state.setShowVideoPicker(true);
      }
    };
    document.addEventListener("editor-replace-media", handleReplace);
    return () => document.removeEventListener("editor-replace-media", handleReplace);
  }, [editor, state]);

  // Sync external value to editor (only when parent changes value prop)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      <EditorToolbar editor={editor} modals={modals} />
      <EditorContent editor={editor} />
      <EditorModals editor={editor} state={state} />
    </div>
  );
}

// ─── Shared sub-components ───

export function ToolbarButton({ active, onClick, title, children }: {
  active: boolean; onClick: () => void; title: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button" onClick={onClick} title={title}
      className={`px-2 py-1 text-sm rounded transition-colors ${
        active ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-200 hover:text-gray-900"
      }`}
    >
      {children}
    </button>
  );
}

export function ToolbarDivider() {
  return <div className="w-px h-5 bg-gray-300 mx-1" />;
}

