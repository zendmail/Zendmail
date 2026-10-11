import { art } from "../email-builder/assets";
import type { EmailBlock } from "@/db/schema";
import { mk, standardFooter, theme, URL_PLACEHOLDER as U, type TemplateDefinition } from "./helpers";

/** Pro tier: richer, brand-style layouts inspired by leading DTC, wellness, SaaS and service emails. */

// ---------------------------------------------------------------------------
// Wellness — three colourways of one layout (bold product hero, discount, "choose yours", reviews)
// ---------------------------------------------------------------------------

function wellness(key: string, name: string, order: number, headline: string, preview: string, t: ReturnType<typeof theme>, productArt: "jar" | "bottle", copy: string): TemplateDefinition {
  const blocks: EmailBlock[] = [
    mk("header", { brand: "{{business_name}}", links: [], bg: "@primary", color: "#FFFFFF" }),
    mk("hero", { headline, imageUrl: art(productArt, { c1: "@accent", c2: "@secondary", c3: "#FACC15" }), imagePosition: "top", bg: "@primary", accent: "@accent" }),
    mk("wave", { shape: "curve", top: "@primary", bottom: "@surface", height: 60 }),
    mk("coupon", { headline: "15% Discount", text: copy, code: "SAVE15", buttonLabel: "Shop now", buttonUrl: U, bg: "@surface", color: "@text", accent: "@primary" }),
    mk("cards", { heading: "Choose your favourite", columns: 2, boxed: false, bg: "@surface", color: "@text", accent: "@primary", items: [
      { imageUrl: art("jar", { c1: "@primary", c2: "@secondary", c3: "#FACC15" }), title: "Daily support", text: "Our classic formula, made to be enjoyed every day.", buttonLabel: "Shop now", buttonUrl: U },
      { imageUrl: art("bottle", { c1: "@accent", c2: "@secondary", c3: "#FACC15" }), title: "Extra strength", text: "More of what you love, for when you need it most.", buttonLabel: "Shop now", buttonUrl: U },
    ] }),
    mk("wave", { shape: "wave", top: "@surface", bottom: "@primarySoft", height: 50 }),
    mk("testimonials", { heading: "What others say", boxed: false, bg: "@primarySoft", color: "@text", accent: "@primary", items: [
      { quote: "After a couple of weeks I noticed a real difference. I feel more energised and relaxed.", name: "Alex", rating: 5 },
      { quote: "Tastes great and easy to remember. I'd recommend it to anyone.", name: "Bobby", rating: 5 },
    ] }),
    mk("links", { style: "inline", bg: "@primarySoft", links: [{ label: "Store locator", url: U }, { label: "Wholesale", url: U }] }),
    ...standardFooter({ bg: "@primarySoft", iconBg: "@primary", text: "Feel better without feeling worse.\n*Offer applies to one-time purchases. {{business_name}}." }),
  ];
  return {
    key, name, category: "PROMOTIONAL", tier: "PRO", sortOrder: order, theme: t, blocks,
    description: "Bold product hero, big discount code, product picks and customer reviews.",
    subject: "15% off, just for you", previewText: preview,
  };
}

const oceanTheme = theme({ primary: "#1F6F96", secondary: "#0F3B52", accent: "#7DD3FC", bg: "#DCEBF3", text: "#0F3B52", muted: "#4C6F82", headingFont: "editorial", bodyFont: "sans", button: "rounded" });
const mintTheme = theme({ primary: "#16A34A", secondary: "#0B3D1E", accent: "#86EFAC", bg: "#DDF3E4", text: "#0B3D1E", muted: "#4B7A5A", headingFont: "editorial", bodyFont: "sans", button: "rounded" });
const berryTheme = theme({ primary: "#E11D9A", secondary: "#4A0A33", accent: "#F9A8D4", bg: "#FBE5F3", text: "#4A0A33", muted: "#8A4F70", headingFont: "editorial", bodyFont: "sans", button: "pill" });

// ---------------------------------------------------------------------------

const hydro = theme({ primary: "#0B6FB3", secondary: "#0B2540", accent: "#38BDF8", bg: "#C9DDEC", text: "#0B2540", muted: "#4A6A86", headingFont: "modern", bodyFont: "modern", button: "rounded" });
const curl = theme({ primary: "#8E83D6", secondary: "#3A2F6B", accent: "#B8F28E", bg: "#E5E0F6", text: "#2E2556", muted: "#6A6196", headingFont: "rounded", bodyFont: "rounded", button: "pill" });
const member = theme({ primary: "#3B2FE0", secondary: "#1B1B6B", accent: "#FF8A5B", bg: "#E8EAFF", text: "#1B1B4B", muted: "#5B5B8F", headingFont: "modern", bodyFont: "modern", button: "pill" });
const care = theme({ primary: "#7B2CBF", secondary: "#2A0A4A", accent: "#FF7A59", bg: "#E9E4F7", text: "#2A0A4A", muted: "#6B5A85", headingFont: "modern", bodyFont: "modern", button: "pill" });
const matcha = theme({ primary: "#6B7BB8", secondary: "#2E3A6B", accent: "#7DB233", bg: "#E9E2CE", surface: "#F7F0DB", text: "#2B2F4A", muted: "#5C6080", headingFont: "display", bodyFont: "sans", button: "rounded" });
const violet = theme({ primary: "#6D28D9", secondary: "#1E1B4B", accent: "#C084FC", bg: "#E7DDFA", text: "#1E1B4B", muted: "#5F5A8F", headingFont: "modern", bodyFont: "modern", button: "rounded" });
const kitchen = theme({ primary: "#B45309", secondary: "#2B1B10", accent: "#4D7C0F", bg: "#F1E6D5", text: "#2B1B10", muted: "#7A6552", headingFont: "editorial", bodyFont: "sans", button: "square" });

export const PRO_TEMPLATES: TemplateDefinition[] = [
  wellness("wellness-ocean", "Wellness — Ocean", 110, "Finally, a quiet night's [[sleep]]", "Your 15% code is inside.", oceanTheme, "jar", "Silence. Our all-natural gummies help you drift off — and wake up refreshed."),
  wellness("wellness-mint", "Wellness — Mint", 120, "Feel [[great]]. Focus all day.", "Your 15% code is inside.", mintTheme, "bottle", "Pure clarity, every single day. Made with care and powered by nature."),
  wellness("wellness-berry", "Wellness — Berry", 130, "Unlock your brain's full [[potential]]", "Your 15% code is inside.", berryTheme, "jar", "Enhance your focus and concentration with delicious, playful gummies."),
  {
    key: "hydration-feature", name: "Product Feature — Hydration", category: "PRODUCT_LAUNCH", tier: "PRO", sortOrder: 140, theme: hydro,
    description: "Hero product on water, benefit tiles, technology split, review and product ladder.",
    subject: "Hydration = health (and savings!)", previewText: "Let's celebrate — and save.",
    blocks: [
      mk("header", { brand: "{{business_name}}", links: [] }),
      mk("hero", { headline: "Hydration = [[Health]]", text: "Let's celebrate (and save!)", imageUrl: art("water"), imagePosition: "bottom", buttonLabel: "Shop the sale →", buttonUrl: U, bg: "@primarySoft", color: "@text", accent: "@primary" }),
      mk("wave", { shape: "wave", top: "@primarySoft", bottom: "@surface", height: 50 }),
      mk("list", { heading: "Why it matters", subheading: "Better hydration isn't just about drinking more water — it's about what's in it.", style: "icons", boxed: true, bg: "@surface", cardBg: "@surface", accent: "@primary", items: [
        { icon: "flask", title: "Reduces oxidative stress" }, { icon: "brain", title: "Supports cellular and brain health" },
        { icon: "bolt", title: "Boosts energy and focus" }, { icon: "heart", title: "Supports gut health" },
      ] }),
      mk("split", { imageUrl: art("laptop"), imageSide: "left", eyebrow: "Our technology", headline: "Advanced filtration, simple to use", text: "Premium materials and smart engineering in a bottle that fits your day.", buttonLabel: "Feel the difference", buttonUrl: U, bg: "@primarySoft", color: "@text", accent: "@primary" }),
      mk("testimonials", { boxed: false, bg: "@surface", color: "@text", accent: "@primary", items: [{ quote: "As a fitness instructor, staying hydrated is crucial. I notice a real boost in my energy and recovery after workouts.", name: "Sebby G.", role: "Fitness instructor", rating: 5 }] }),
      mk("cards", { heading: "Ready to hydrate better?", subheading: "Claim your hydration sale offer now.", columns: 3, boxed: true, bg: "@primarySoft", color: "@text", accent: "@primary", cardBg: "@surface", items: [
        { imageUrl: art("water"), badge: "Sale", title: "Bottle", buttonLabel: "Shop", buttonUrl: U },
        { imageUrl: art("jar"), badge: "Sale", title: "Jug", buttonLabel: "Shop", buttonUrl: U },
        { imageUrl: art("tube"), badge: "Sale", title: "Pitcher", buttonLabel: "Shop", buttonUrl: U },
      ] }),
      ...standardFooter({ bg: "@primary", color: "#D6E9F7", iconBg: "#FFFFFF", links: true, text: "{{business_name}} · All rights reserved.\nNo longer want to receive these emails?" }),
    ],
  },
  {
    key: "curl-care-editorial", name: "Editorial — Do's & Don'ts", category: "NEWSLETTER", tier: "PRO", sortOrder: 150, theme: curl,
    description: "Playful purple editorial with do/don't guide, product grid and a free-gift callout.",
    subject: "The do's and don'ts of deep conditioning", previewText: "Level up your routine with a few simple rules.",
    blocks: [
      mk("header", { brand: "{{business_name}}", links: [], bg: "@primary", color: "#FFFFFF" }),
      mk("hero", { eyebrow: "The guide", headline: "The Do's and Don'ts of [[deep conditioning]]", text: "Avoid common mistakes and get the best results from your routine.", imageUrl: art("tube", { c1: "@accent", c2: "@secondary", c3: "#FFFFFF" }), imagePosition: "bottom", buttonLabel: "Shop the range", buttonUrl: U, bg: "@primary", accent: "@accent" }),
      mk("wave", { shape: "scallop", top: "@primary", bottom: "@surface", height: 46 }),
      mk("list", { heading: "Level up your game", subheading: "Here's what to do — and what to skip.", style: "icons", boxed: true, bg: "@surface", cardBg: "@primarySoft", accent: "@primary", items: [
        { icon: "x", title: "Don't use too much product", text: "A little goes a long way — more doesn't mean better." },
        { icon: "x", title: "Don't rinse with hot water", text: "It strips moisture. Go lukewarm, finish cool." },
        { icon: "check", title: "Do apply to damp hair", text: "Damp strands absorb treatments best." },
        { icon: "check", title: "Do leave it in", text: "Give it at least 10 minutes to work." },
      ] }),
      mk("cards", { heading: "Shop curl care", columns: 2, boxed: true, bg: "@surface", color: "@text", accent: "@primary", cardBg: "@primarySoft", items: [
        { imageUrl: art("tube"), title: "2-in-1 leave-in", price: "$18", buttonLabel: "Shop now", buttonUrl: U },
        { imageUrl: art("jar"), title: "Define custard", price: "$22", buttonLabel: "Shop now", buttonUrl: U },
        { imageUrl: art("bottle"), title: "Softening shampoo", price: "$16", buttonLabel: "Shop now", buttonUrl: U },
        { imageUrl: art("water"), title: "Refresher spray", price: "$14", buttonLabel: "Shop now", buttonUrl: U },
      ] }),
      mk("callout", { icon: "gift", headline: "Spot it, snap it, get a free gift", text: "Snap a pic of you using your favourite product, tag us, and we'll send you a free gift as a thank-you.", buttonLabel: "Get the details", buttonUrl: U, bg: "@accent", sectionBg: "@surface", color: "@secondary" }),
      mk("wave", { shape: "wave", top: "@surface", bottom: "@primary", height: 50 }),
      mk("links", { style: "pills", bg: "@primary", color: "#FFFFFF", links: [{ label: "Shop all", url: U }, { label: "About us", url: U }, { label: "Contact", url: U }] }),
      ...standardFooter({ bg: "@primary", color: "#E7E3F8", iconBg: "#FFFFFF" }),
    ],
  },
  {
    key: "membership-reactivate", name: "Win-back — Rejoin Offer", category: "WIN_BACK", tier: "PRO", sortOrder: 160, theme: member,
    description: "Price-led comeback offer with feature highlights and an expert-support callout.",
    subject: "Come back for $10/month", previewText: "Your first month is on us.",
    blocks: [
      mk("header", { brand: "{{business_name}}", links: [] }),
      mk("hero", { eyebrow: "Welcome back offer", headline: "Gain better health — without losing [[summer fun]]", text: "Don't choose between your goals and good times.", imageUrl: art("food"), imagePosition: "bottom", bg: "@primary", accent: "@accent" }),
      mk("coupon", { eyebrow: "Just", headline: "$10/month", text: "+ Get your first month free with code", code: "WELCOME10", buttonLabel: "Reactivate my account", buttonUrl: U, bg: "@surface", color: "@text", accent: "@primary" }),
      mk("split", { imageUrl: art("phone"), imageSide: "left", eyebrow: "You have options", headline: "A plan that fits your life", text: "Choose the programme that works for you — and switch whenever you like.", bg: "@primarySoft", color: "@text", accent: "@primary" }),
      mk("split", { imageUrl: art("laptop"), imageSide: "right", eyebrow: "Our app is better", headline: "Easier and faster than before", text: "Find your favourite features and track your meals in a few taps.", bg: "@surface", color: "@text", accent: "@primary" }),
      mk("list", { heading: "Recommit to the results you deserve", subheading: "3 ways this time will be different.", style: "checks", boxed: true, bg: "@primarySoft", cardBg: "@surface", accent: "@primary", items: [
        { title: "Make progress, forget 'perfect'", text: "Small, consistent habits that make a real impact." },
        { title: "Get support when you need it", text: "Coaches and community, anywhere, anytime." },
        { title: "See what's working", text: "Smart insights show you what to do next." },
      ] }),
      mk("callout", { icon: "users", headline: "Meet 1:1 with a registered expert", text: "Personalised advice that fits your body, preferences and journey.", buttonLabel: "See if you qualify", buttonUrl: U, bg: "@primary", sectionBg: "@surface" }),
      ...standardFooter({ text: "*Offer for returning members. Plans auto-renew monthly at the standard rate until you cancel.\n{{business_name}}" }),
    ],
  },
  {
    key: "care-service-intro", name: "Service Welcome — Safety & Steps", category: "WELCOME", tier: "PRO", sortOrder: 170, theme: care,
    description: "Trust-building welcome for service businesses: safety checklist and how-it-works steps.",
    subject: "Welcome — here's how it works", previewText: "Care that comes to you.",
    blocks: [
      mk("header", { brand: "{{business_name}}", links: [{ label: "How it works", url: U }, { label: "About", url: U }, { label: "Locations", url: U }] }),
      mk("hero", { headline: "Care that comes to [[you]]", text: "Expert help at your home or office, on your schedule.", imageUrl: art("people"), imagePosition: "top", buttonLabel: "Get started", buttonUrl: U, bg: "@secondary", accent: "@accent" }),
      mk("list", { heading: "Our commitment to safety", subheading: "Your wellbeing comes first, always.", style: "checks", boxed: true, bg: "@accentSoft", cardBg: "@surface", accent: "@primary", items: [
        { title: "All of our providers are fully vaccinated" },
        { title: "Equipment is disinfected before every visit" },
        { title: "Providers sanitise hands between every client" },
        { title: "Strict cleaning protocols, every time" },
      ] }),
      mk("list", { heading: "How it works", style: "icons", boxed: true, bg: "@surface", cardBg: "@primarySoft", accent: "@primary", items: [
        { icon: "calendar", title: "Book your first visit", text: "Pick a time that suits you in under two minutes." },
        { icon: "map-pin", title: "We come to you", text: "Home, office or anywhere you're comfortable." },
        { icon: "target", title: "A plan built for you", text: "Personalised guidance to help you reach your goals." },
      ] }),
      mk("callout", { icon: "phone", headline: "Ready when you are", text: "Book online in minutes or call us any time.", buttonLabel: "Book a visit", buttonUrl: U, bg: "@primary", sectionBg: "@surface" }),
      ...standardFooter({ bg: "@primary", color: "#EADDF8", iconBg: "#FFFFFF" }),
    ],
  },
  {
    key: "appointment-confirmation", name: "Appointment Confirmation", category: "POST_PURCHASE", tier: "PRO", sortOrder: 180, theme: care,
    description: "Clear booking details, preparation checklist, intake-form callout and cancellation policy.",
    subject: "Your appointment is confirmed", previewText: "Date, time and everything to prepare.",
    blocks: [
      mk("header", { brand: "{{business_name}}", links: [] }),
      mk("hero", { headline: "Hello {{first_name|there}}!", text: "Your appointment is confirmed. Please review the details below.", bg: "@surface", color: "@text", accent: "@primary" }),
      mk("list", { heading: "Your appointment", style: "icons", boxed: true, bg: "@primarySoft", cardBg: "@surface", accent: "@primary", items: [
        { icon: "calendar", title: "Date and time", text: "Jan 1st, 10:00 am – 12:00 pm" },
        { icon: "users", title: "Your provider", text: "Alex Morgan, Specialist" },
        { icon: "map-pin", title: "Address", text: "123 Wildrose Lane, Springfield" },
      ] }),
      mk("callout", { icon: "file", headline: "Requested before your visit", text: "Please complete the intake form so we can prepare. It takes 5–10 minutes.", buttonLabel: "Take the form", buttonUrl: U, bg: "@secondary", sectionBg: "@surface" }),
      mk("list", { heading: "Preparing for your visit", style: "checks", boxed: false, bg: "@surface", accent: "@primary", items: [
        { title: "Set up two chairs for your session" },
        { title: "Choose a spot with a little open space" },
        { title: "Wear comfortable clothes" },
      ] }),
      mk("callout", { icon: "calendar", headline: "Cancellation and rescheduling", text: "There's no fee if you cancel or reschedule with more than 24 hours' notice. Less than 24 hours' notice incurs a $90 fee.", bg: "@accentSoft", color: "@text", accent: "@primary", sectionBg: "@surface" }),
      ...standardFooter({ bg: "@primary", color: "#EADDF8", iconBg: "#FFFFFF", text: "Thanks,\n{{business_name}}" }),
    ],
  },
  {
    key: "founder-story", name: "Brand Story — Our Kitchen", category: "NEWSLETTER", tier: "PRO", sortOrder: 190, theme: matcha,
    description: "Warm founder story with a team photo, ceremony-vs-premium picks and drip dividers.",
    subject: "From our kitchen to your cup", previewText: "The story behind {{business_name}}.",
    blocks: [
      mk("header", { brand: "{{business_name}}", links: [] }),
      mk("hero", { eyebrow: "Our story", headline: "From our kitchen to your [[cup]]", imageUrl: art("people"), imagePosition: "top", bg: "@primary", accent: "#FFFFFF" }),
      mk("hero", { eyebrow: "Hi, we're the founders", headline: "Two friends. One simple mission.", text: "It started when we couldn't find the real thing anywhere, so we made it ourselves. Today we work directly with growers we trust to bring you quality that's honest, simple and made without compromise.\n\nThank you for being part of the story.", align: "left", bg: "@surface", color: "@text", accent: "@primary" }),
      mk("wave", { shape: "drip", top: "@surface", bottom: "@primary", height: 70 }),
      mk("cards", { heading: "Ceremonial [[or]] premium", subheading: "Both sourced directly from our growers.", columns: 2, boxed: false, bg: "@primary", color: "#FFFFFF", accent: "#FFFFFF", items: [
        { imageUrl: art("jar", { c1: "#FFFFFF", c2: "@secondary", c3: "@accent" }), title: "Ceremonial", text: "First harvest leaves. Rich, bold and silky — perfect for sipping straight.", buttonLabel: "Shop now", buttonUrl: U },
        { imageUrl: art("tube", { c1: "#FFFFFF", c2: "@secondary", c3: "@accent" }), title: "Premium", text: "Smoother and lighter. Ideal for daily lattes.", buttonLabel: "Shop now", buttonUrl: U },
      ] }),
      mk("wave", { shape: "drip", top: "@primary", bottom: "@surface", height: 70 }),
      mk("links", { style: "inline", bg: "@surface", links: [{ label: "Shop all", url: U }, { label: "About us", url: U }, { label: "How to enjoy", url: U }] }),
      ...standardFooter({ iconBg: "@primary" }),
    ],
  },
  {
    key: "cart-bold", name: "Abandoned Cart — Bold", category: "ABANDONED_CART", tier: "PRO", sortOrder: 200, theme: matcha,
    description: "Punchy cart reminder with an oversized headline, waiting items and free-shipping nudge.",
    subject: "Psst… your cart's still full", previewText: "You're one step away.",
    blocks: [
      mk("hero", { headline: "Psst… your cart's still [[full]]", text: "You're one step away from your order. Everything is still waiting for you.", imageUrl: art("basket", { c1: "@primary", c2: "@secondary", c3: "#FFFFFF" }), imagePosition: "top", buttonLabel: "Return to cart", buttonUrl: U, bg: "@accent", color: "#FFFFFF", accent: "#FFFFFF" }),
      mk("cards", { heading: "Here's what's waiting", columns: 2, boxed: true, bg: "@surface", color: "@text", accent: "@primary", cardBg: "@primarySoft", items: [
        { imageUrl: art("box", { c1: "@primary", c2: "@secondary", c3: "@accent" }), title: "Starter kit", price: "$39.99", buttonLabel: "Return to cart", buttonUrl: U },
        { imageUrl: art("jar", { c1: "@primary", c2: "@secondary", c3: "@accent" }), title: "Everyday jar", price: "$24.00", buttonLabel: "Return to cart", buttonUrl: U },
      ] }),
      mk("wave", { shape: "drip", top: "@surface", bottom: "@primary", height: 70 }),
      mk("list", { heading: "Build your own ritual", subheading: "Free shipping on orders over $50.", style: "checks", boxed: false, bg: "@primary", color: "#FFFFFF", accent: "@accent", items: [{ title: "Quality you can taste" }, { title: "Sourced directly from growers" }, { title: "Love it or we'll make it right" }] }),
      mk("wave", { shape: "drip", top: "@primary", bottom: "@surface", height: 70 }),
      ...standardFooter({ iconBg: "@primary" }),
    ],
  },
  {
    key: "saas-onboarding", name: "SaaS Onboarding — Get Started", category: "WELCOME", tier: "PRO", sortOrder: 210, theme: violet,
    description: "Product-led welcome: dashboard hero, four action cards with icons and a help-center callout.",
    subject: "Welcome to {{business_name}} — let's get you set up", previewText: "Four quick things to do first.",
    blocks: [
      mk("header", { brand: "{{business_name}}", links: [] }),
      mk("hero", { headline: "Welcome to [[{{business_name}}]]", text: "You're all set. Here's how to get set up for success in the next few minutes.", imageUrl: art("laptop", { c1: "#FFFFFF", c2: "@secondary", c3: "@accent" }), imagePosition: "bottom", buttonLabel: "Get started →", buttonUrl: U, bg: "@primary", accent: "@accent" }),
      mk("cards", { heading: "Let's get you started", subheading: "Here are a few things you can do to set up for success.", columns: 2, boxed: true, bg: "@surface", color: "@text", accent: "@primary", cardBg: "@surface", items: [
        { icon: "users", title: "1. Import your contacts", text: "Bring in your existing audience in just a few clicks.", buttonLabel: "Import contacts →", buttonUrl: U },
        { icon: "message", title: "2. Track conversations", text: "Automatically log emails, calls and notes.", buttonLabel: "Explore activity →", buttonUrl: U },
        { icon: "chart", title: "3. Set up your pipeline", text: "Create a pipeline that matches your sales process.", buttonLabel: "Create pipeline →", buttonUrl: U },
        { icon: "target", title: "4. Track your progress", text: "See what's working and where to focus next.", buttonLabel: "View dashboard →", buttonUrl: U },
      ] }),
      mk("callout", { icon: "rocket", headline: "Built to help you sell smarter", text: "Powerful tools, insights and automation to build stronger relationships and close more deals.", buttonLabel: "Get started now", buttonUrl: U, bg: "@secondary", sectionBg: "@surface", accent: "@accent" }),
      mk("callout", { icon: "message", headline: "Need help getting started?", text: "Our team is here for you.", buttonLabel: "Visit help center", buttonUrl: U, bg: "@primarySoft", color: "@text", accent: "@primary", sectionBg: "@surface" }),
      ...standardFooter({ iconBg: "@primary" }),
    ],
  },
  {
    key: "starter-kit-welcome", name: "Order Welcome — Starter Kit", category: "PRODUCT_LAUNCH", tier: "PRO", sortOrder: 220, theme: kitchen,
    description: "Unboxing-style welcome: what's in the box, why it's special and first-use tips.",
    subject: "Your starter kit is on its way", previewText: "Here's what's inside — and how to get started.",
    blocks: [
      mk("header", { brand: "{{business_name}}", links: [] }),
      mk("hero", { eyebrow: "You're all set", headline: "Meet your [[starter kit]]", text: "Everything you need to get going is in the box. Here's a peek at what's inside.", imageUrl: art("box"), imagePosition: "bottom", bg: "@primarySoft", color: "@text", accent: "@primary" }),
      mk("list", { heading: "What's in the box", style: "icons", boxed: true, bg: "@surface", cardBg: "@primarySoft", accent: "@primary", items: [
        { icon: "package", title: "The essentials", text: "Everything you need for your first month." },
        { icon: "leaf", title: "Premium ingredients", text: "Sourced directly from growers we trust." },
        { icon: "gift", title: "A little surprise", text: "A free extra tucked inside, just because." },
      ] }),
      mk("split", { imageUrl: art("jar"), imageSide: "right", eyebrow: "Quick start", headline: "Your first week, made easy", text: "Start small. Try it once a day and build from there — we'll email you tips along the way.", buttonLabel: "See the guide", buttonUrl: U, bg: "@surface", color: "@text", accent: "@primary" }),
      mk("callout", { icon: "message", headline: "Questions? Just ask.", text: "Reply to this email and a real person will help.", bg: "@secondary", sectionBg: "@surface" }),
      ...standardFooter({ iconBg: "@primary" }),
    ],
  },
];
