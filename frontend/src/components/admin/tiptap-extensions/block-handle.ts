import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

const pluginKey = new PluginKey("blockHandle");

/** Resolve a top-level block position from a mouse event */
function resolveBlockPos(view: EditorView, event: MouseEvent): { pos: number; node: any; dom: HTMLElement } | null {
  // Get the position in the document from coordinates
  const posInfo = view.posAtCoords({ left: event.clientX, top: event.clientY });
  if (!posInfo) return null;

  // Resolve to find the top-level block
  const resolved = view.state.doc.resolve(posInfo.pos);
  // Walk up to depth 1 (direct child of doc)
  let depth = resolved.depth;
  while (depth > 1) depth--;

  if (depth < 1) return null;

  const pos = resolved.before(depth);
  const node = view.state.doc.nodeAt(pos);
  if (!node) return null;

  const dom = view.nodeDOM(pos);
  if (!dom || !(dom instanceof HTMLElement)) return null;

  return { pos, node, dom };
}

export const BlockHandle = Extension.create({
  name: "blockHandle",

  addProseMirrorPlugins() {
    const editor = this.editor;
    let handleContainer: HTMLDivElement | null = null;
    let currentBlockPos: number | null = null;
    let menuEl: HTMLDivElement | null = null;

    const removeMenu = () => {
      if (menuEl) {
        menuEl.remove();
        menuEl = null;
      }
    };

    const removeHandles = () => {
      if (handleContainer) {
        handleContainer.remove();
        handleContainer = null;
      }
      currentBlockPos = null;
      removeMenu();
    };

    const showHandles = (view: EditorView, pos: number, node: any, dom: HTMLElement) => {
      if (currentBlockPos === pos && handleContainer) return;

      removeHandles();
      currentBlockPos = pos;

      // Create container
      handleContainer = document.createElement("div");
      handleContainer.className = "block-handle-container";
      handleContainer.contentEditable = "false";
      handleContainer.style.cssText = [
        "position: absolute",
        "display: flex",
        "align-items: center",
        "gap: 2px",
        "z-index: 20",
        "user-select: none",
      ].join(";");

      // + button
      const plusBtn = document.createElement("button");
      plusBtn.className = "block-handle-btn block-handle-plus";
      plusBtn.type = "button";
      plusBtn.innerHTML = "<svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><line x1='12' y1='5' x2='12' y2='19'/><line x1='5' y1='12' x2='19' y2='12'/></svg>";
      plusBtn.title = "添加内容块";

      plusBtn.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Insert a new paragraph after this block and type /
        const endPos = pos + node.nodeSize;
        editor.chain().focus().insertContentAt(endPos, { type: "paragraph", content: [{ type: "text", text: "/" }] }).setTextSelection(endPos + 2).run();
      });

      // Grip / action button
      const gripBtn = document.createElement("button");
      gripBtn.className = "block-handle-btn block-handle-grip";
      gripBtn.type = "button";
      gripBtn.innerHTML = "<svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><circle cx='9' cy='5' r='1.5' fill='currentColor'/><circle cx='15' cy='5' r='1.5' fill='currentColor'/><circle cx='9' cy='12' r='1.5' fill='currentColor'/><circle cx='15' cy='12' r='1.5' fill='currentColor'/><circle cx='9' cy='19' r='1.5' fill='currentColor'/><circle cx='15' cy='19' r='1.5' fill='currentColor'/></svg>";
      gripBtn.title = "操作";

      gripBtn.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleMenu(pos);
      });

      handleContainer.appendChild(plusBtn);
      handleContainer.appendChild(gripBtn);

      // Position it to the left of the block (account for scroll)
      const editorParent = view.dom.parentElement;
      const editorRect = view.dom.getBoundingClientRect();
      const blockRect = dom.getBoundingClientRect();
      const scrollTop = editorParent?.scrollTop || 0;

      handleContainer.style.top = `${blockRect.top - editorRect.top + scrollTop}px`;
      handleContainer.style.left = "-44px";
      handleContainer.style.height = `${Math.min(blockRect.height, 28)}px`;

      // Append to editor's parent (which should be positioned)
      if (editorParent) {
        if (getComputedStyle(editorParent).position === "static") {
          editorParent.style.position = "relative";
        }
        editorParent.appendChild(handleContainer);
      }
    };

    const toggleMenu = (pos: number) => {
      if (menuEl) {
        removeMenu();
        return;
      }

      menuEl = document.createElement("div");
      menuEl.className = "block-handle-menu";
      menuEl.contentEditable = "false";

      const items = [
        {
          label: "转化为...",
          action: () => {
            removeMenu();
            // Select the block by position and replace with / to trigger slash menu
            const currentNode = editor.state.doc.nodeAt(pos);
            if (!currentNode) return;
            editor.chain().focus()
              .setNodeSelection(pos)
              .deleteSelection()
              .insertContentAt(pos, { type: "paragraph", content: [{ type: "text", text: "/" }] })
              .setTextSelection(pos + 2).run();
          },
        },
        {
          label: "复制",
          action: () => {
            removeMenu();
            // Select the node and use document.execCommand
            editor.chain().focus().setNodeSelection(pos).run();
            document.execCommand("copy");
          },
        },
        {
          label: "删除",
          action: () => {
            removeMenu();
            editor.chain().focus().setNodeSelection(pos).deleteSelection().run();
          },
          danger: true,
        },
      ];

      items.forEach((item) => {
        const btn = document.createElement("button");
        btn.className = `block-handle-menu-item${(item as any).danger ? " block-handle-menu-danger" : ""}`;
        btn.type = "button";
        btn.textContent = item.label;
        btn.addEventListener("mousedown", (e) => {
          e.preventDefault();
          e.stopPropagation();
          item.action();
        });
        menuEl!.appendChild(btn);
      });

      // Position below the grip button
      if (handleContainer) {
        menuEl.style.cssText = [
          "position: absolute",
          "top: 100%",
          "left: 0",
          "margin-top: 4px",
          "min-width: 120px",
          "background: white",
          "border: 1px solid #e5e7eb",
          "border-radius: 8px",
          "box-shadow: 0 4px 12px rgba(0,0,0,0.1)",
          "padding: 4px",
          "z-index: 50",
        ].join(";");
        handleContainer.appendChild(menuEl);
      }
    };

    // Close menu on outside click
    const onDocClick = (e: MouseEvent) => {
      if (menuEl && !menuEl.contains(e.target as Node)) {
        removeMenu();
      }
    };

    return [
      new Plugin({
        key: pluginKey,

        props: {
          handleDOMEvents: {
            mousemove(view, event) {
              // Don't show handles if a menu is open
              if (menuEl) return false;

              const result = resolveBlockPos(view, event);
              if (!result) {
                // If mouse is far from editor content, hide handles
                const editorRect = view.dom.getBoundingClientRect();
                if (event.clientX < editorRect.left - 60 || event.clientX > editorRect.right + 20 ||
                    event.clientY < editorRect.top - 10 || event.clientY > editorRect.bottom + 10) {
                  removeHandles();
                }
                return false;
              }

              showHandles(view, result.pos, result.node, result.dom);
              return false;
            },
          },
        },

        view() {
          document.addEventListener("mousedown", onDocClick);
          return {
            update(view) {
              // If current block no longer exists at that position, remove handles
              if (currentBlockPos === null || !handleContainer) return;
              const node = view.state.doc.nodeAt(currentBlockPos);
              if (!node) {
                removeHandles();
                return;
              }
              // Reposition handles (document may have changed)
              const dom = view.nodeDOM(currentBlockPos);
              if (!dom || !(dom instanceof HTMLElement)) {
                removeHandles();
                return;
              }
              const editorRect = view.dom.getBoundingClientRect();
              const blockRect = dom.getBoundingClientRect();
              const scrollTop = view.dom.parentElement?.scrollTop || 0;
              handleContainer.style.top = `${blockRect.top - editorRect.top + scrollTop}px`;
              handleContainer.style.height = `${Math.min(blockRect.height, 28)}px`;
            },
            destroy() {
              removeHandles();
              document.removeEventListener("mousedown", onDocClick);
            },
          };
        },
      }),
    ];
  },
});
