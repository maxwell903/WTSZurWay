// Sprint 9: Repeater EditPanel — exercises the §8.9 controls (Data Source,
// Limit, Empty State) end-to-end through the editor store. The full
// QueryBuilder UI is covered indirectly by the integration test plus the
// `applyFilters` unit tests; this file focuses on the pieces unique to the
// Repeater panel.

import { useEditorStore } from "@/lib/editor-state";
import type { ComponentNode, SiteConfig } from "@/lib/site-config";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RepeaterEditPanel } from "../EditPanel";

// Test-only host: re-reads the live Repeater node from the store on every
// store change so the panel reflects each `setComponentDataBinding` write.
// In production the host (ContentTabHost) does the same via
// `selectSelectedComponentNode`.
function PanelHost() {
  const node = useEditorStore((s) => s.draftConfig.pages[0]?.rootComponent.children?.[0]);
  if (!node) return null;
  return <RepeaterEditPanel node={node} />;
}

function makeRepeaterNode(over: Partial<ComponentNode> = {}): ComponentNode {
  return {
    id: "cmp_rep",
    type: "Repeater",
    props: {},
    style: {},
    ...over,
  };
}

function makeConfigWithRepeater(repeater: ComponentNode): SiteConfig {
  const root: ComponentNode = {
    id: "cmp_root",
    type: "Section",
    props: {},
    style: {},
    children: [
      repeater,
      {
        id: "cmp_q",
        type: "InputField",
        props: { name: "q", label: "Search" },
        style: {},
      },
    ],
  };
  return {
    meta: { siteName: "T", siteSlug: "t" },
    brand: { palette: "ocean", fontFamily: "Inter" },
    global: {
      navBar: { links: [], logoPlacement: "left", sticky: false },
      footer: { columns: [], copyright: "" },
    },
    pages: [{ id: "p_home", slug: "home", name: "Home", kind: "static", rootComponent: root }],
    forms: [],
  };
}

beforeEach(() => {
  const repeater = makeRepeaterNode();
  useEditorStore.setState({
    siteId: "s",
    siteSlug: "t",
    workingVersionId: "v",
    draftConfig: makeConfigWithRepeater(repeater),
    currentPageSlug: "home",
    selectedComponentId: "cmp_rep",
    hoveredComponentId: null,
    previewMode: false,
    leftSidebarTab: "pages",
    leftSidebarMode: "element-edit",
    elementEditTab: "content",
    saveState: "idle",
    lastSavedAt: null,
    saveError: null,
  });
});

afterEach(() => {
  useEditorStore.setState({ draftConfig: makeConfigWithRepeater(makeRepeaterNode()) });
});

describe("<RepeaterEditPanel>", () => {
  it("emits the expected data-component-edit-panel attribute on its root", () => {
    const { container } = render(<RepeaterEditPanel node={makeRepeaterNode()} />);
    expect(container.querySelector("[data-component-edit-panel='Repeater']")).not.toBeNull();
  });

  it("changing the Data Source writes a new dataBinding on the node and flips saveState to dirty", () => {
    render(<PanelHost />);
    fireEvent.change(screen.getByTestId("repeater-source"), { target: { value: "properties" } });
    const updated = useEditorStore.getState().draftConfig.pages[0]?.rootComponent.children?.[0];
    expect(updated?.dataBinding?.source).toBe("properties");
    expect(useEditorStore.getState().saveState).toBe("dirty");
  });

  it("changing the Limit writes a numeric limit and clears it on empty input", () => {
    useEditorStore.setState({
      draftConfig: makeConfigWithRepeater(makeRepeaterNode({ dataBinding: { source: "units" } })),
    });
    render(<PanelHost />);
    fireEvent.change(screen.getByTestId("repeater-limit"), { target: { value: "5" } });
    let updated = useEditorStore.getState().draftConfig.pages[0]?.rootComponent.children?.[0];
    expect(updated?.dataBinding?.limit).toBe(5);

    fireEvent.change(screen.getByTestId("repeater-limit"), { target: { value: "" } });
    updated = useEditorStore.getState().draftConfig.pages[0]?.rootComponent.children?.[0];
    expect(updated?.dataBinding?.limit).toBeUndefined();
  });

  it("typing an empty-state message stores it as a Paragraph node on dataBinding.emptyState", () => {
    useEditorStore.setState({
      draftConfig: makeConfigWithRepeater(makeRepeaterNode({ dataBinding: { source: "units" } })),
    });
    render(<PanelHost />);
    fireEvent.change(screen.getByTestId("repeater-empty-state"), {
      target: { value: "No matches" },
    });
    const updated = useEditorStore.getState().draftConfig.pages[0]?.rootComponent.children?.[0];
    expect(updated?.dataBinding?.emptyState?.type).toBe("Paragraph");
    expect(updated?.dataBinding?.emptyState?.props?.text).toBe("No matches");
  });

  it("hides the filters builder when source is 'company'", () => {
    render(<RepeaterEditPanel node={makeRepeaterNode({ dataBinding: { source: "company" } })} />);
    expect(screen.queryByTestId("repeater-filters")).toBeNull();
  });

  it("renders the connected-inputs editor and adds a new connection row on click", () => {
    useEditorStore.setState({
      draftConfig: makeConfigWithRepeater(makeRepeaterNode({ dataBinding: { source: "units" } })),
    });
    render(<PanelHost />);
    expect(screen.getByTestId("repeater-connected-inputs")).toBeInTheDocument();
    expect(screen.queryByTestId("repeater-connection-0")).toBeNull();

    fireEvent.click(screen.getByTestId("repeater-connection-add"));
    expect(screen.getByTestId("repeater-connection-0")).toBeInTheDocument();
    const updated = useEditorStore.getState().draftConfig.pages[0]?.rootComponent.children?.[0];
    expect(updated?.dataBinding?.connectedInputs).toHaveLength(1);
    // The current page's only InputField is `cmp_q`, so the new row picks it.
    expect(updated?.dataBinding?.connectedInputs?.[0]?.inputId).toBe("cmp_q");
  });

  it("shows the single-row note when source is 'company' (connected inputs are kept visible)", () => {
    render(<RepeaterEditPanel node={makeRepeaterNode({ dataBinding: { source: "company" } })} />);
    const note = within(screen.getByTestId("repeater-connected-inputs")).getByText(/single row/i);
    expect(note).toBeInTheDocument();
  });
});
