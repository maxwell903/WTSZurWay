import { ButtonEditPanel } from "@/components/site-components/Button/EditPanel";
import { FooterEditPanel } from "@/components/site-components/Footer/EditPanel";
import { HeadingEditPanel } from "@/components/site-components/Heading/EditPanel";
import { ImageEditPanel } from "@/components/site-components/Image/EditPanel";
import { InputFieldEditPanel } from "@/components/site-components/InputField/EditPanel";
import { NavBarEditPanel } from "@/components/site-components/NavBar/EditPanel";
import { ParagraphEditPanel } from "@/components/site-components/Paragraph/EditPanel";
import { __resetEditorStoreForTests, useEditorStore } from "@/lib/editor-state/store";
import type { ComponentNode, SiteConfig } from "@/lib/site-config";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { beforeEach, describe, expect, it } from "vitest";

function makeFixtureConfig(): SiteConfig {
  return {
    meta: { siteName: "X", siteSlug: "x" },
    brand: { palette: "ocean", fontFamily: "Inter" },
    global: {
      navBar: { links: [], logoPlacement: "left", sticky: false },
      footer: { columns: [], copyright: "" },
    },
    pages: [
      {
        id: "p_home",
        slug: "home",
        name: "Home",
        kind: "static",
        rootComponent: {
          id: "cmp_root",
          type: "Section",
          props: {},
          style: {},
          children: [
            { id: "cmp_heading", type: "Heading", props: { text: "Hi", level: 2 }, style: {} },
            { id: "cmp_para", type: "Paragraph", props: { text: "Body" }, style: {} },
            {
              id: "cmp_btn",
              type: "Button",
              props: { label: "Go", linkMode: "static" },
              style: {},
            },
            {
              id: "cmp_img",
              type: "Image",
              props: { src: "/x.png", alt: "X", fit: "cover" },
              style: {},
            },
            {
              id: "cmp_navbar",
              type: "NavBar",
              props: { links: [], logoPlacement: "left", sticky: false },
              style: {},
            },
            {
              id: "cmp_footer",
              type: "Footer",
              props: { columns: [], copyright: "" },
              style: {},
            },
            {
              id: "cmp_input",
              type: "InputField",
              props: { name: "field", inputType: "text" },
              style: {},
            },
          ],
        },
      },
    ],
    forms: [],
  };
}

function findById(root: ComponentNode, id: string): ComponentNode | null {
  if (root.id === id) return root;
  for (const c of root.children ?? []) {
    const f = findById(c, id);
    if (f) return f;
  }
  return null;
}

function getNode(id: string): ComponentNode {
  const page = useEditorStore.getState().draftConfig.pages[0];
  if (!page) throw new Error("no page");
  const found = findById(page.rootComponent, id);
  if (!found) throw new Error(`no node ${id}`);
  return found;
}

// Mirrors what EditPanelShell does in production: subscribes to the store
// for the live node so the rendered panel re-renders after each mutation.
function PanelHost({
  id,
  Panel,
}: {
  id: string;
  Panel: ComponentType<{ node: ComponentNode }>;
}) {
  const node = useEditorStore((s) => {
    for (const page of s.draftConfig.pages) {
      const found = findById(page.rootComponent, id);
      if (found) return found;
    }
    return null;
  });
  if (!node) return null;
  return <Panel node={node} />;
}

beforeEach(() => {
  __resetEditorStoreForTests();
  useEditorStore.getState().hydrate({
    siteId: "s",
    siteSlug: "x",
    workingVersionId: "v",
    initialConfig: makeFixtureConfig(),
  });
});

describe("HeadingEditPanel", () => {
  it("editing text writes node.props.text through the store", () => {
    render(<PanelHost id="cmp_heading" Panel={HeadingEditPanel} />);
    fireEvent.change(screen.getByTestId("heading-text"), {
      target: { value: "Welcome to Aurora" },
    });
    expect(getNode("cmp_heading").props.text).toBe("Welcome to Aurora");
  });

  it("changing the level writes node.props.level as a number", () => {
    render(<PanelHost id="cmp_heading" Panel={HeadingEditPanel} />);
    fireEvent.change(screen.getByTestId("heading-level"), { target: { value: "3" } });
    expect(getNode("cmp_heading").props.level).toBe(3);
  });
});

describe("ParagraphEditPanel", () => {
  it("editing text writes node.props.text through the store", () => {
    render(<PanelHost id="cmp_para" Panel={ParagraphEditPanel} />);
    fireEvent.change(screen.getByTestId("paragraph-text"), { target: { value: "New body" } });
    expect(getNode("cmp_para").props.text).toBe("New body");
  });
});

describe("ButtonEditPanel", () => {
  it("switching to Detail mode disables the Href input and writes linkMode=detail", () => {
    render(<PanelHost id="cmp_btn" Panel={ButtonEditPanel} />);
    fireEvent.click(screen.getByTestId("button-link-mode-detail"));
    expect(getNode("cmp_btn").props.linkMode).toBe("detail");
    expect(screen.getByTestId("button-href")).toBeDisabled();
  });

  it("switching back to Static clears detailPageSlug", () => {
    useEditorStore.getState().addPage({
      name: "Unit Detail",
      slug: "unit",
      kind: "detail",
      detailDataSource: "units",
    });
    useEditorStore.getState().setCurrentPageSlug("home");
    useEditorStore.getState().setComponentProps("cmp_btn", {
      label: "Go",
      linkMode: "detail",
      detailPageSlug: "unit",
    });
    render(<PanelHost id="cmp_btn" Panel={ButtonEditPanel} />);
    fireEvent.click(screen.getByTestId("button-link-mode-static"));
    const updated = getNode("cmp_btn");
    expect(updated.props.linkMode).toBe("static");
    expect(updated.props.detailPageSlug).toBeUndefined();
  });
});

describe("ImageEditPanel", () => {
  it("editing src/alt/fit writes through the store", () => {
    render(<PanelHost id="cmp_img" Panel={ImageEditPanel} />);
    fireEvent.change(screen.getByTestId("image-src"), { target: { value: "/y.png" } });
    fireEvent.change(screen.getByTestId("image-alt"), { target: { value: "Y" } });
    fireEvent.change(screen.getByTestId("image-fit"), { target: { value: "contain" } });
    const p = getNode("cmp_img").props;
    expect(p.src).toBe("/y.png");
    expect(p.alt).toBe("Y");
    expect(p.fit).toBe("contain");
  });
});

describe("NavBarEditPanel", () => {
  it("adds a link defaulted to kind=page; switching to external exposes label+href", () => {
    render(<PanelHost id="cmp_navbar" Panel={NavBarEditPanel} />);
    fireEvent.click(screen.getByTestId("navbar-links-add"));
    const afterAdd = getNode("cmp_navbar").props.links as { kind: string }[];
    expect(afterAdd).toHaveLength(1);
    expect(afterAdd[0]?.kind).toBe("page");
    // Switch to external mode and fill in label+href.
    fireEvent.click(screen.getByTestId("navbar-links-kind-0-external"));
    fireEvent.change(screen.getByTestId("navbar-links-label-0"), {
      target: { value: "Home" },
    });
    fireEvent.change(screen.getByTestId("navbar-links-href-0"), { target: { value: "/" } });
    const links = getNode("cmp_navbar").props.links as {
      kind: string;
      label: string;
      href: string;
    }[];
    expect(links[0]).toMatchObject({ kind: "external", label: "Home", href: "/" });
    fireEvent.click(screen.getByTestId("navbar-links-remove-0"));
    expect((getNode("cmp_navbar").props.links as unknown[]).length).toBe(0);
  });
});

describe("FooterEditPanel", () => {
  it("adding and removing a column writes the new array", () => {
    render(<PanelHost id="cmp_footer" Panel={FooterEditPanel} />);
    fireEvent.click(screen.getByTestId("footer-columns-add"));
    expect((getNode("cmp_footer").props.columns as unknown[]).length).toBe(1);
    fireEvent.change(screen.getByTestId("footer-columns-title-0"), {
      target: { value: "About" },
    });
    expect((getNode("cmp_footer").props.columns as { title: string }[])[0]?.title).toBe("About");
    fireEvent.click(screen.getByTestId("footer-columns-remove-0"));
    expect((getNode("cmp_footer").props.columns as unknown[]).length).toBe(0);
  });
});

describe("InputFieldEditPanel", () => {
  it("setting defaultValueFromQueryParam writes the prop; clearing writes undefined", () => {
    render(<PanelHost id="cmp_input" Panel={InputFieldEditPanel} />);
    fireEvent.change(screen.getByTestId("input-default-from-query"), {
      target: { value: "propertyId" },
    });
    expect(getNode("cmp_input").props.defaultValueFromQueryParam).toBe("propertyId");
    fireEvent.change(screen.getByTestId("input-default-from-query"), { target: { value: "" } });
    expect(getNode("cmp_input").props.defaultValueFromQueryParam).toBeUndefined();
  });
});
