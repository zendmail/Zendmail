import { Columns2, Heading, Image as ImageIcon, LayoutGrid, LayoutTemplate, Link2, ListChecks, Megaphone, Minus, MousePointerClick, MoveVertical, PanelBottom, PanelTop, Quote, Share2, Ticket, Type, Waves, type LucideIcon } from "lucide-react";
import type { EmailBlockType } from "@/db/schema";

export const BLOCK_ICONS: Record<EmailBlockType, LucideIcon> = {
  header: PanelTop, footer: PanelBottom, wave: Waves, divider: Minus, spacer: MoveVertical,
  hero: LayoutTemplate, split: Columns2, heading: Heading, text: Type, image: ImageIcon, button: MousePointerClick, callout: Megaphone,
  cards: LayoutGrid, coupon: Ticket, testimonials: Quote, list: ListChecks, links: Link2, social: Share2,
};
