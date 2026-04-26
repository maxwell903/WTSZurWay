"use client";

import { ButtonEditPanel } from "@/components/site-components/Button/EditPanel";
import { ColumnEditPanel } from "@/components/site-components/Column/EditPanel";
import { DividerEditPanel } from "@/components/site-components/Divider/EditPanel";
import { FooterEditPanel } from "@/components/site-components/Footer/EditPanel";
import { FormEditPanel } from "@/components/site-components/Form/EditPanel";
import { GalleryEditPanel } from "@/components/site-components/Gallery/EditPanel";
import { HeadingEditPanel } from "@/components/site-components/Heading/EditPanel";
import { HeroBannerEditPanel } from "@/components/site-components/HeroBanner/EditPanel";
import { ImageEditPanel } from "@/components/site-components/Image/EditPanel";
import { InputFieldEditPanel } from "@/components/site-components/InputField/EditPanel";
import { LogoEditPanel } from "@/components/site-components/Logo/EditPanel";
import { MapEmbedEditPanel } from "@/components/site-components/MapEmbed/EditPanel";
import { NavBarEditPanel } from "@/components/site-components/NavBar/EditPanel";
import { ParagraphEditPanel } from "@/components/site-components/Paragraph/EditPanel";
import { PropertyCardEditPanel } from "@/components/site-components/PropertyCard/EditPanel";
import { RepeaterEditPanel } from "@/components/site-components/Repeater/EditPanel";
import { RowEditPanel } from "@/components/site-components/Row/EditPanel";
import { SectionEditPanel } from "@/components/site-components/Section/EditPanel";
import { SpacerEditPanel } from "@/components/site-components/Spacer/EditPanel";
import { UnitCardEditPanel } from "@/components/site-components/UnitCard/EditPanel";
import type { ComponentNode, ComponentType } from "@/lib/site-config";
import type { ComponentType as ReactComponentType } from "react";

type ContentPanel = ReactComponentType<{ node: ComponentNode }>;

const PANELS: Record<ComponentType, ContentPanel> = {
  Section: SectionEditPanel,
  Row: RowEditPanel,
  Column: ColumnEditPanel,
  Heading: HeadingEditPanel,
  Paragraph: ParagraphEditPanel,
  Button: ButtonEditPanel,
  Image: ImageEditPanel,
  Logo: LogoEditPanel,
  Spacer: SpacerEditPanel,
  Divider: DividerEditPanel,
  NavBar: NavBarEditPanel,
  Footer: FooterEditPanel,
  HeroBanner: HeroBannerEditPanel,
  PropertyCard: PropertyCardEditPanel,
  UnitCard: UnitCardEditPanel,
  Repeater: RepeaterEditPanel,
  InputField: InputFieldEditPanel,
  Form: FormEditPanel,
  MapEmbed: MapEmbedEditPanel,
  Gallery: GalleryEditPanel,
};

export type ContentTabHostProps = {
  node: ComponentNode;
};

export function ContentTabHost({ node }: ContentTabHostProps) {
  const Panel = PANELS[node.type];
  return (
    <div className="p-3" data-testid="content-tab-host">
      <Panel node={node} />
    </div>
  );
}
