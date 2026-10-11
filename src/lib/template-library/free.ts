import { art } from "../email-builder/assets";
import { mk, standardFooter, theme, URL_PLACEHOLDER as U, type TemplateDefinition } from "./helpers";

/** Free tier: clean, conversion-focused layouts for the everyday campaigns. Upgrades the original 9 built-ins in place. */

const ocean = theme({});
const editorial = theme({ primary: "#C2410C", secondary: "#1C1917", accent: "#C2410C", bg: "#F3EEE6", text: "#1C1917", muted: "#57534E", headingFont: "editorial", bodyFont: "sans" });
const sunset = theme({ primary: "#EA580C", secondary: "#3B1D0F", accent: "#F59E0B", bg: "#FFF1E4", text: "#3B1D0F", muted: "#7A5A45", headingFont: "display", bodyFont: "sans", button: "pill" });
const forest = theme({ primary: "#0F8B6D", secondary: "#10302A", accent: "#F59E0B", bg: "#E6F1EC", text: "#10302A", muted: "#4F6B63", headingFont: "rounded", bodyFont: "rounded", button: "pill" });
const lavender = theme({ primary: "#6D5BD0", secondary: "#2A2350", accent: "#F7B267", bg: "#ECE8FA", text: "#2A2350", muted: "#625C8C", headingFont: "modern", bodyFont: "modern" });
const berry = theme({ primary: "#C026D3", secondary: "#3B0A45", accent: "#F472B6", bg: "#F9E9FA", text: "#3B0A45", muted: "#7A4E85", headingFont: "display", bodyFont: "sans", button: "pill" });
const slate = theme({ primary: "#2563EB", secondary: "#0F172A", accent: "#22D3EE", bg: "#E8EDF5", text: "#0F172A", muted: "#53627C", headingFont: "display", bodyFont: "sans" });
const bold = theme({ primary: "#E11D48", secondary: "#1F0A12", accent: "#FACC15", bg: "#FDE8EC", text: "#1F0A12", muted: "#7A4655", headingFont: "display", bodyFont: "sans", button: "pill" });
const sage = theme({ primary: "#4D7C5B", secondary: "#1F2D24", accent: "#D97757", bg: "#EEF1EA", text: "#1F2D24", muted: "#5A6B5F", headingFont: "editorial", bodyFont: "sans" });

export const FREE_TEMPLATES: TemplateDefinition[] = [
  {
    key: "welcome-gradient", replacesName: "Welcome email", name: "Welcome — Bold Hero", category: "WELCOME", tier: "FREE", sortOrder: 10, theme: ocean,
    description: "Big colour hero with product mockup, 3 numbered steps and a help callout.",
    subject: "Welcome to {{business_name}}", previewText: "Here's how to get the most out of your first week.",
    blocks: [
      mk("header", { brand: "{{business_name}}", links: [] }),
      mk("hero", { eyebrow: "Welcome aboard", headline: "Hi {{first_name|there}}, [[welcome]] to {{business_name}}", text: "We're so glad you're here. Here's a quick look at what you can do to get the most out of us.", imageUrl: art("laptop"), imagePosition: "bottom", buttonLabel: "Get started", buttonUrl: U, bg: "@primary" }),
      mk("list", { heading: "Get started in 3 steps", style: "numbers", bg: "@surface", accent: "@primary", items: [
        { title: "Set up your profile", text: "Add your details so everything feels like yours." },
        { title: "Explore what's inside", text: "Take a two-minute tour of the features you'll use most." },
        { title: "Make your first move", text: "Start small — you can always change things later." },
      ] }),
      mk("callout", { icon: "message", headline: "Questions? We're here to help.", text: "Reply to this email and a real person will get back to you.", buttonLabel: "Contact us", buttonUrl: U, bg: "@secondary", sectionBg: "@surface" }),
      ...standardFooter(),
    ],
  },
  {
    key: "newsletter-clean", replacesName: "Monthly newsletter", name: "Newsletter — Editorial", category: "NEWSLETTER", tier: "FREE", sortOrder: 20, theme: editorial,
    description: "Magazine-style monthly edit with a featured story, two articles and quick reads.",
    subject: "The {{business_name}} monthly edit", previewText: "Stories, tips and a few things we're loving this month.",
    blocks: [
      mk("header", { brand: "{{business_name}}", links: [{ label: "Shop", url: U }, { label: "Journal", url: U }, { label: "About", url: U }] }),
      mk("hero", { eyebrow: "The monthly edit", headline: "What's new at [[{{business_name}}]]", text: "A few stories, tips and things we've been loving lately — grab a coffee and settle in.", imageUrl: art("photo"), imagePosition: "bottom", buttonLabel: "Read the full story", buttonUrl: U, bg: "@surface", color: "@text", accent: "@primary", align: "left" }),
      mk("split", { imageUrl: art("people"), imageSide: "left", eyebrow: "Featured", headline: "Behind the scenes with the team", text: "Meet the people who make everything happen and the thinking behind our latest work.", buttonLabel: "Read more", buttonUrl: U, bg: "@surface", color: "@text", accent: "@primary" }),
      mk("split", { imageUrl: art("photo"), imageSide: "right", eyebrow: "How-to", headline: "Three simple habits that make a big difference", text: "Small changes you can start today — no special equipment needed.", buttonLabel: "Read more", buttonUrl: U, bg: "@primarySoft", color: "@text", accent: "@primary" }),
      mk("cards", { heading: "Quick reads", columns: 3, boxed: false, bg: "@surface", color: "@text", accent: "@primary", items: [
        { title: "Our favourite tools", text: "What's on our desks this month.", buttonLabel: "Read", buttonUrl: U },
        { title: "Customer spotlight", text: "How Sam turned a hobby into a business.", buttonLabel: "Read", buttonUrl: U },
        { title: "Coming soon", text: "A sneak peek at what's next.", buttonLabel: "Read", buttonUrl: U },
      ] }),
      ...standardFooter({ links: true }),
    ],
  },
  {
    key: "promo-coupon", replacesName: "Promotional offer", name: "Promo — Coupon Code", category: "PROMOTIONAL", tier: "FREE", sortOrder: 30, theme: sunset,
    description: "Big discount number, dashed code box, two product cards and a dark footer wave.",
    subject: "20% off, just for you", previewText: "Use code SAVE20 at checkout — this week only.",
    blocks: [
      mk("header", { brand: "{{business_name}}", links: [] }),
      mk("coupon", { eyebrow: "This week only", headline: "20% OFF", text: "Treat yourself to something you'll love. Use the code below at checkout.", code: "SAVE20", buttonLabel: "Shop now", buttonUrl: U, bg: "@primarySoft", color: "@text", accent: "@primary" }),
      mk("cards", { heading: "Shop the favourites", columns: 2, boxed: true, bg: "@surface", color: "@text", accent: "@primary", cardBg: "@primarySoft", items: [
        { imageUrl: art("bottle"), title: "Daily essential", text: "Our best-seller, loved by thousands.", price: "$24", buttonLabel: "Shop now", buttonUrl: U },
        { imageUrl: art("jar"), title: "Limited edition", text: "Back for a short time only.", price: "$32", badge: "New", buttonLabel: "Shop now", buttonUrl: U },
      ] }),
      mk("list", { style: "checks", bg: "@surface", accent: "@primary", items: [{ title: "Free shipping on orders over $50" }, { title: "Easy 30-day returns" }, { title: "Secure checkout" }] }),
      mk("wave", { shape: "wave", top: "@surface", bottom: "@secondary", height: 56 }),
      ...standardFooter({ bg: "@secondary", color: "#C9B8AC", iconBg: "@primary" }),
    ],
  },
  {
    key: "cart-reminder", replacesName: "Abandoned cart reminder", name: "Abandoned Cart — Friendly", category: "ABANDONED_CART", tier: "FREE", sortOrder: 40, theme: forest,
    description: "Warm reminder with the basket, the items left behind and reassurance points.",
    subject: "You left something behind", previewText: "Your cart is waiting — and so is free shipping.",
    blocks: [
      mk("header", { brand: "{{business_name}}", links: [] }),
      mk("hero", { headline: "You left something [[behind]]", text: "Hi {{first_name|there}}, the items in your cart are still available — but not for long.", imageUrl: art("basket"), imagePosition: "bottom", buttonLabel: "Return to cart", buttonUrl: U, bg: "@primarySoft", color: "@text", accent: "@primary" }),
      mk("cards", { heading: "Still in your cart", columns: 2, boxed: true, bg: "@surface", color: "@text", accent: "@primary", cardBg: "@surface", items: [
        { imageUrl: art("jar"), title: "Everyday essential", text: "Qty 1", price: "$28", buttonLabel: "Buy now", buttonUrl: U },
        { imageUrl: art("tube"), title: "Daily care", text: "Qty 1", price: "$19", buttonLabel: "Buy now", buttonUrl: U },
      ] }),
      mk("list", { style: "checks", boxed: true, bg: "@primarySoft", cardBg: "@surface", accent: "@primary", items: [{ title: "Free shipping on orders over $50" }, { title: "30-day money-back guarantee" }, { title: "Secure checkout" }] }),
      ...standardFooter(),
    ],
  },
  {
    key: "order-confirmation", replacesName: "Post-purchase thank you", name: "Order Confirmed — Next Steps", category: "POST_PURCHASE", tier: "FREE", sortOrder: 50, theme: lavender,
    description: "Thank-you hero, 3-step what-happens-next list, support callout and recommendations.",
    subject: "Thank you for your order!", previewText: "Your order is confirmed — here's what happens next.",
    blocks: [
      mk("header", { brand: "{{business_name}}", links: [] }),
      mk("hero", { eyebrow: "Order confirmed", headline: "Thank you, [[{{first_name|friend}}]]!", text: "We've received your order and we're getting it ready. You'll get another email as soon as it ships.", imageUrl: art("box"), imagePosition: "bottom", bg: "@primarySoft", color: "@text", accent: "@primary" }),
      mk("list", { heading: "What happens next", style: "numbers", boxed: true, bg: "@surface", cardBg: "@primarySoft", accent: "@primary", items: [
        { title: "We pack your order", text: "Usually within 1–2 business days." },
        { title: "It's on its way", text: "You'll receive a tracking link by email." },
        { title: "Enjoy!", text: "Tell us what you think — we love hearing from you." },
      ] }),
      mk("callout", { icon: "message", headline: "Questions about your order?", text: "Just reply to this email — we're happy to help.", buttonLabel: "Contact support", buttonUrl: U, bg: "@secondary", sectionBg: "@surface" }),
      mk("cards", { heading: "You might also like", columns: 3, boxed: false, bg: "@surface", color: "@text", accent: "@primary", items: [
        { imageUrl: art("tube"), title: "Daily care", price: "$19" },
        { imageUrl: art("jar"), title: "Everyday jar", price: "$28" },
        { imageUrl: art("bottle"), title: "Essentials", price: "$24" },
      ] }),
      ...standardFooter(),
    ],
  },
  {
    key: "win-back", replacesName: "Win-back", name: "Win-back — We Miss You", category: "WIN_BACK", tier: "FREE", sortOrder: 60, theme: berry,
    description: "Emotional hero, comeback discount and a look at what's new since they left.",
    subject: "We miss you, {{first_name|friend}}", previewText: "Come back and enjoy 15% off your next order.",
    blocks: [
      mk("header", { brand: "{{business_name}}", links: [] }),
      mk("hero", { eyebrow: "We miss you", headline: "It's been a while, [[{{first_name|friend}}]]", text: "A lot has changed since your last visit — and we'd love to show you.", imageUrl: art("people"), imagePosition: "bottom", buttonLabel: "Welcome me back", buttonUrl: U, bg: "@primary" }),
      mk("coupon", { eyebrow: "A little thank-you", headline: "15% OFF", text: "Your next order, on us. Use this code at checkout.", code: "COMEBACK15", bg: "@primarySoft", color: "@text", accent: "@primary" }),
      mk("cards", { heading: "What's new", columns: 3, boxed: false, bg: "@surface", color: "@text", accent: "@primary", items: [
        { imageUrl: art("bottle"), title: "Fresh formulas", text: "Re-made from the ground up." },
        { imageUrl: art("jar"), title: "New sizes", text: "More value, same quality." },
        { imageUrl: art("tube"), title: "Easier refills", text: "Subscribe and save." },
      ] }),
      ...standardFooter(),
    ],
  },
  {
    key: "product-launch", replacesName: "Product launch", name: "Product Launch — Spotlight", category: "PRODUCT_LAUNCH", tier: "FREE", sortOrder: 70, theme: slate,
    description: "Dark spotlight hero, benefit icons, split story section and a pre-order callout.",
    subject: "Meet the all-new {{business_name}} One", previewText: "It's here — and it's been worth the wait.",
    blocks: [
      mk("header", { brand: "{{business_name}}", links: [], bg: "@secondary", color: "#FFFFFF" }),
      mk("hero", { eyebrow: "Just launched", headline: "Meet the [[all-new]] One", text: "Designed from scratch, built for the way you actually live. Available today.", imageUrl: art("bottle"), imagePosition: "bottom", buttonLabel: "See what's new", buttonUrl: U, bg: "@secondary", accent: "@accent" }),
      mk("list", { heading: "Why you'll love it", style: "icons", boxed: false, bg: "@surface", accent: "@primary", items: [
        { icon: "bolt", title: "Twice as fast", text: "Noticeably quicker from the very first day." },
        { icon: "shield", title: "Built to last", text: "Backed by a 2-year guarantee." },
        { icon: "leaf", title: "Better for the planet", text: "Made with recycled materials." },
      ] }),
      mk("split", { imageUrl: art("jar"), imageSide: "right", eyebrow: "The details", headline: "Designed with you in mind", text: "We spent a year listening to feedback. Every detail you asked for is in here.", buttonLabel: "Learn more", buttonUrl: U, bg: "@primarySoft", color: "@text", accent: "@primary" }),
      mk("callout", { icon: "rocket", headline: "Be one of the first to get yours", text: "Launch week pricing ends Sunday.", buttonLabel: "Order now", buttonUrl: U, bg: "@primary", sectionBg: "@surface" }),
      ...standardFooter({ iconBg: "@secondary" }),
    ],
  },
  {
    key: "sale-bold", replacesName: "Sale announcement", name: "Sale — Big & Bold", category: "SALE", tier: "FREE", sortOrder: 80, theme: bold,
    description: "Loud headline, discount badges on a 3-up product row and a free-shipping bar.",
    subject: "The sale is on — up to 50% off", previewText: "This weekend only. Don't miss out.",
    blocks: [
      mk("hero", { eyebrow: "This weekend only", headline: "Big sale. [[Bigger]] savings.", text: "Up to 50% off our most-loved products.", buttonLabel: "Shop the sale", buttonUrl: U, bg: "@primary", accent: "@accent" }),
      mk("wave", { shape: "scallop", top: "@primary", bottom: "@surface", height: 44 }),
      mk("cards", { heading: "Top picks", columns: 3, boxed: false, bg: "@surface", color: "@text", accent: "@primary", items: [
        { imageUrl: art("bottle"), badge: "-30%", title: "Daily essential", price: "$17", buttonLabel: "Shop", buttonUrl: U },
        { imageUrl: art("box"), badge: "-40%", title: "Gift set", price: "$29", buttonLabel: "Shop", buttonUrl: U },
        { imageUrl: art("tube"), badge: "-50%", title: "Daily care", price: "$9", buttonLabel: "Shop", buttonUrl: U },
      ] }),
      mk("callout", { icon: "truck", headline: "Free shipping on orders over $50", text: "Plus easy 30-day returns on everything.", bg: "@secondary", sectionBg: "@surface" }),
      ...standardFooter(),
    ],
  },
  {
    key: "thank-you-simple", replacesName: "Thank you", name: "Thank You — Heartfelt", category: "THANK_YOU", tier: "FREE", sortOrder: 90, theme: sage,
    description: "Quiet, personal thank-you with a customer quote and a referral callout.",
    subject: "Thank you, {{first_name|friend}}", previewText: "We're so grateful to have you.",
    blocks: [
      mk("header", { brand: "{{business_name}}", links: [] }),
      mk("hero", { eyebrow: "Thank you", headline: "We're [[grateful]] for you", text: "Hi {{first_name|there}}, whether you've been with us for years or just joined, your support means the world to our small team.", imageUrl: art("people"), imagePosition: "bottom", bg: "@primarySoft", color: "@text", accent: "@primary" }),
      mk("testimonials", { heading: "Kind words from our community", boxed: true, bg: "@surface", cardBg: "@primarySoft", accent: "@primary", items: [{ quote: "I've been a customer for years and the quality has never dropped. It feels like a team that really cares.", name: "Jordan P.", role: "Customer since 2022", rating: 5 }] }),
      mk("callout", { icon: "heart", headline: "Share the love", text: "Know someone who'd enjoy us? Send them your link and you'll both get a thank-you.", buttonLabel: "Refer a friend", buttonUrl: U, bg: "@primary", sectionBg: "@surface" }),
      ...standardFooter(),
    ],
  },
];
