export { Canvas } from "./canvas/Canvas";
export {
  canAcceptChild,
  createDefaultNode,
  DndCanvasProvider,
  DragStateProvider,
  DropZoneIndicator,
  dropZoneId,
  findInsertionIndex,
  getChildrenPolicy,
  isDropZoneId,
  isNodeId,
  isPaletteId,
  nodeId,
  paletteId,
  PaletteDraggable,
  parseDropZoneId,
  parseNodeId,
  parsePaletteId,
  RESIZE_MATRIX,
  ResizeHandles,
  SortableProviderActive,
  useDragState,
  useNodeSortable,
} from "./canvas/dnd";
export type {
  DragStateValue,
  DropZoneId,
  NodeDragId,
  NodeSortableState,
  PaletteDragId,
} from "./canvas/dnd";
export { SelectionBreadcrumb } from "./canvas/SelectionBreadcrumb";
export {
  AdvancedTab,
  AnimationTab,
  ContentTabHost,
  DeleteComponentButton,
  EditPanelShell,
  EditPanelTabs,
  StyleTab,
  VisibilityTab,
} from "./edit-panels";
export { LeftSidebar } from "./sidebar/LeftSidebar";
export { RightSidebar } from "./sidebar/RightSidebar";
export { AddTab } from "./sidebar/add-tab/AddTab";
export { ComponentCard } from "./sidebar/add-tab/ComponentCard";
export { COMPONENT_CATALOG, COMPONENT_GROUP_ORDER } from "./sidebar/add-tab/component-catalog";
export type { ComponentCatalogEntry, ComponentGroup } from "./sidebar/add-tab/component-catalog";
export { DataTab } from "./sidebar/data-tab/DataTab";
export { SubmissionsModal } from "./sidebar/data-tab/SubmissionsModal";
export { AddPageDialog } from "./sidebar/pages-tab/AddPageDialog";
export { DeletePageConfirm } from "./sidebar/pages-tab/DeletePageConfirm";
export { PageRow } from "./sidebar/pages-tab/PageRow";
export { PagesTab } from "./sidebar/pages-tab/PagesTab";
export { RenamePageDialog } from "./sidebar/pages-tab/RenamePageDialog";
export { FontSelector } from "./sidebar/site-tab/FontSelector";
export { PaletteSelector } from "./sidebar/site-tab/PaletteSelector";
export { SiteTab } from "./sidebar/site-tab/SiteTab";
export { DeployButton } from "./topbar/DeployButton";
export { PageSelector } from "./topbar/PageSelector";
export { PreviewToggle } from "./topbar/PreviewToggle";
export { SaveIndicator } from "./topbar/SaveIndicator";
export { SiteNameInput } from "./topbar/SiteNameInput";
export { TopBar } from "./topbar/TopBar";
// Sprint 11 — AI Chat re-exports (alphabetical, appended).
export {
  AI_EDIT_NARRATION_STRINGS,
  AiEditNarration,
  Composer as AiChatComposer,
  MessageBubble as AiChatMessageBubble,
  MessageList as AiChatMessageList,
  NARRATION_INTERVAL_MS,
  RightSidebarAiChat,
  SelectionChip as AiChatSelectionChip,
  SuggestedPrompts as AiChatSuggestedPrompts,
  pendingSuggestionCount,
  suggestionsForSelection,
  useAiEditChat,
} from "./ai-chat";
export type {
  AiEditNarrationProps,
  AssistantMessage,
  Attachment as AiChatAttachment,
  LoadingState as AiChatLoadingState,
  Message as AiChatMessage,
  ProposedDiff,
  UseAiEditChat,
} from "./ai-chat";
