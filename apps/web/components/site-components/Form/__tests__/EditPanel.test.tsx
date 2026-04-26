import { __resetEditorStoreForTests, useEditorStore } from "@/lib/editor-state/store";
import type { ComponentNode, SiteConfig } from "@/lib/site-config";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { FormEditPanel } from "../EditPanel";

function makeFixtureConfig(formProps: Record<string, unknown>): SiteConfig {
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
            {
              id: "cmp_form",
              type: "Form",
              props: formProps,
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

function hydrateWith(formProps: Record<string, unknown>) {
  __resetEditorStoreForTests();
  useEditorStore.getState().hydrate({
    siteId: "s",
    siteSlug: "x",
    workingVersionId: "v",
    initialConfig: makeFixtureConfig(formProps),
  });
}

beforeEach(() => {
  hydrateWith({ formName: "contact_us", successMessage: "Thank you." });
});

describe("FormEditPanel", () => {
  it("editing the Form Name field writes node.props.formName through the store", () => {
    render(<PanelHost id="cmp_form" Panel={FormEditPanel} />);
    fireEvent.change(screen.getByTestId("form-name"), { target: { value: "newsletter" } });
    expect(getNode("cmp_form").props.formName).toBe("newsletter");
  });

  it("editing the Success Message field writes node.props.successMessage through the store", () => {
    render(<PanelHost id="cmp_form" Panel={FormEditPanel} />);
    fireEvent.change(screen.getByTestId("form-success-message"), {
      target: { value: "Thanks — we'll be in touch." },
    });
    expect(getNode("cmp_form").props.successMessage).toBe("Thanks — we'll be in touch.");
  });

  it("renders the 'Required for submissions to be saved.' helper when formName is empty", () => {
    hydrateWith({ formName: "", successMessage: "Thank you." });
    render(<PanelHost id="cmp_form" Panel={FormEditPanel} />);
    expect(screen.getByText(/Required for submissions to be saved\./)).toBeInTheDocument();
  });

  it("does NOT expose a submitLabel field — that prop stays in the schema but is authored via a child Button", () => {
    render(<PanelHost id="cmp_form" Panel={FormEditPanel} />);
    expect(screen.queryByLabelText(/Submit Label/i)).toBeNull();
  });

  it("renders the help copy directing the user to drop an InputField + a submit Button", () => {
    render(<PanelHost id="cmp_form" Panel={FormEditPanel} />);
    expect(
      screen.getByText(
        /Drop an InputField for each value you want to collect, then a Button with type Submit at the bottom\./,
      ),
    ).toBeInTheDocument();
  });
});
