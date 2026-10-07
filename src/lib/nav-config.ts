import {
  LayoutGrid,
  Send,
  Waypoints,
  LayoutTemplate,
  Users,
  Network,
  FileText,
  SquareMousePointer,
  Sparkles,
  Wand2,
  Store,
  UserRound,
  ShoppingCart,
  Package,
  ShoppingBag,
  BarChart3,
  LineChart,
  Activity,
  DollarSign,
  Plug,
  UsersRound,
  CreditCard,
  Settings,
  Globe,
  HeartPulse,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

export interface NavGroup {
  label: string | null;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    label: null,
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
      { label: "Campaigns", href: "/campaigns", icon: Send },
      { label: "Automations", href: "/automations", icon: Waypoints },
      { label: "Templates", href: "/templates", icon: LayoutTemplate },
      { label: "Contacts", href: "/contacts", icon: Users },
      { label: "Segments", href: "/segments", icon: Network },
      { label: "Forms", href: "/forms", icon: FileText },
      { label: "Landing Pages", href: "/landing-pages", icon: SquareMousePointer },
    ],
  },
  {
    label: "AI",
    items: [
      { label: "AI Studio", href: "/ai/studio", icon: Sparkles },
      { label: "Audience Builder", href: "/ai/audience-builder", icon: Wand2 },
    ],
  },
  {
    label: "Commerce",
    items: [
      { label: "Stores", href: "/commerce/stores", icon: Store },
      { label: "Customers", href: "/commerce/customers", icon: UserRound },
      { label: "Orders", href: "/commerce/orders", icon: ShoppingCart },
      { label: "Products", href: "/commerce/products", icon: Package },
      { label: "Abandoned Carts", href: "/commerce/abandoned-carts", icon: ShoppingBag },
    ],
  },
  {
    label: "Analytics",
    items: [
      { label: "Overview", href: "/analytics", icon: BarChart3 },
      { label: "Campaign Analytics", href: "/analytics/campaigns", icon: LineChart },
      { label: "Automation Analytics", href: "/analytics/automations", icon: Activity },
      { label: "Revenue", href: "/analytics/revenue", icon: DollarSign },
    ],
  },
  {
    label: "Workspace",
    items: [
      { label: "Integrations", href: "/integrations", icon: Plug },
      { label: "Team", href: "/workspace/team", icon: UsersRound },
      { label: "Billing", href: "/workspace/billing", icon: CreditCard },
      { label: "Settings", href: "/workspace/settings", icon: Settings },
      { label: "Sending Domains", href: "/workspace/sending-domains", icon: Globe },
      { label: "Sending Health", href: "/workspace/sending-health", icon: HeartPulse },
    ],
  },
];
