import { art } from "../email-builder/assets";
import { mk, standardFooter, theme, URL_PLACEHOLDER as U, type TemplateDefinition } from "./helpers";

/**
 * Second wave of built-in templates: seasonal / festival, e-commerce flows, newsletters & content,
 * service / SaaS and digital-product selling. All artwork is drawn by the app in the workspace's brand
 * colours, and all copy is generic sample text, so nothing here belongs to a third party.
 */

// --- palettes -----------------------------------------------------------------------------------
const noir = theme({ primary: "#F5B301", secondary: "#0B0B0F", accent: "#F5B301", bg: "#16161D", surface: "#1F1F29", text: "#F4F4F6", muted: "#A3A3B5", headingFont: "display", bodyFont: "sans", button: "square" });
const diya = theme({ primary: "#D9480F", secondary: "#3D0E00", accent: "#FFC53D", bg: "#FFF0DC", text: "#3D0E00", muted: "#8A5A3C", headingFont: "editorial", bodyFont: "sans", button: "pill" });
const crescent = theme({ primary: "#0F766E", secondary: "#042F2E", accent: "#E9C46A", bg: "#E7F3F0", text: "#042F2E", muted: "#4C7A75", headingFont: "editorial", bodyFont: "sans", button: "pill" });
const evergreen = theme({ primary: "#B91C1C", secondary: "#14352A", accent: "#D4A93A", bg: "#EAF2EC", text: "#14352A", muted: "#587566", headingFont: "editorial", bodyFont: "sans", button: "rounded" });
const confetti = theme({ primary: "#7C3AED", secondary: "#2E1065", accent: "#FB7185", bg: "#F3EBFF", text: "#2E1065", muted: "#6D5C99", headingFont: "rounded", bodyFont: "rounded", button: "pill" });
const paper = theme({ primary: "#1D4ED8", secondary: "#111827", accent: "#F59E0B", bg: "#F5F3EE", surface: "#FFFFFF", text: "#111827", muted: "#6B7280", headingFont: "serif", bodyFont: "sans", button: "square" });
const studio = theme({ primary: "#0EA5A4", secondary: "#0B2E33", accent: "#FF7A59", bg: "#E5F6F5", text: "#0B2E33", muted: "#4A7378", headingFont: "modern", bodyFont: "modern", button: "rounded" });
const ink = theme({ primary: "#4F46E5", secondary: "#0F172A", accent: "#22D3EE", bg: "#EEF0FF", text: "#0F172A", muted: "#5B6482", headingFont: "modern", bodyFont: "modern", button: "rounded" });
const blush = theme({ primary: "#DB2777", secondary: "#500724", accent: "#FDBA74", bg: "#FFE9F1", text: "#500724", muted: "#9D5470", headingFont: "rounded", bodyFont: "rounded", button: "pill" });
const sand = theme({ primary: "#A16207", secondary: "#292524", accent: "#65A30D", bg: "#F6F0E4", text: "#292524", muted: "#78716C", headingFont: "editorial", bodyFont: "sans", button: "rounded" });

// --- FREE ---------------------------------------------------------------------------------------
export const MORE_FREE_TEMPLATES: TemplateDefinition[] = [
  {
    key: "seasonal-black-friday", name: "Black Friday — Doorbuster", category: "SALE", tier: "FREE", sortOrder: 300, theme: noir,
    description: "Dark, high-contrast sale hero, big code box and a three-product shortlist.",
    subject: "Black Friday starts now — up to 60% off", previewText: "The biggest savings of the year. While stock lasts.",
    blocks: [
      mk("header", { brand: "{{business_name}}", links: [], bg: "@secondary", color: "#FFFFFF" }),
      mk("hero", { eyebrow: "Black Friday", headline: "Up to [[60% off]] everything", text: "Our biggest sale of the year is live. Early birds get first pick.", imageUrl: art("box"), imagePosition: "bottom", buttonLabel: "Shop the doorbusters", buttonUrl: U, bg: "@secondary", accent: "@accent" }),
      mk("coupon", { eyebrow: "Extra 10% off", headline: "BLACKFRIDAY", text: "Stack it on top of sale prices at checkout.", code: "BF10", buttonLabel: "Use code now", buttonUrl: U, bg: "@surface", accent: "@primary" }),
      mk("cards", { heading: "Doorbusters", columns: 3, boxed: true, bg: "@surface", accent: "@primary", cardBg: "@secondary", items: [
        { imageUrl: art("bottle"), badge: "-60%", title: "Best-seller", price: "$19", buttonLabel: "Grab it", buttonUrl: U },
        { imageUrl: art("jar"), badge: "-50%", title: "Value set", price: "$29", buttonLabel: "Grab it", buttonUrl: U },
        { imageUrl: art("tube"), badge: "-45%", title: "Fan favourite", price: "$12", buttonLabel: "Grab it", buttonUrl: U },
      ] }),
      mk("callout", { icon: "clock", headline: "Ends Monday at midnight", text: "Once it's gone, it's gone.", bg: "@primary", sectionBg: "@surface" }),
      ...standardFooter({ bg: "@secondary", iconBg: "@primary" }),
    ],
  },
  {
    key: "seasonal-diwali", name: "Festival of Lights — Greeting + Offer", category: "PROMOTIONAL", tier: "FREE", sortOrder: 310, theme: diya,
    description: "Warm festive greeting with a gifting offer and three gift ideas. Works for any festival of lights.",
    subject: "Wishing you a bright, joyful festival ✨", previewText: "A little gift from us: festive savings inside.",
    blocks: [
      mk("header", { brand: "{{business_name}}", links: [] }),
      mk("hero", { eyebrow: "Happy festival", headline: "May your home glow with [[joy]]", text: "From all of us at {{business_name}}, warm wishes to you and your family. Celebrate with 20% off gifts for everyone you love.", imageUrl: art("people"), imagePosition: "bottom", buttonLabel: "Shop festive gifts", buttonUrl: U, bg: "@primary", accent: "@accent" }),
      mk("wave", { shape: "scallop", top: "@primary", bottom: "@surface", height: 44 }),
      mk("coupon", { eyebrow: "Festive offer", headline: "20% OFF", text: "On all gift sets, this week only.", code: "FESTIVE20", bg: "@primarySoft", color: "@text", accent: "@primary" }),
      mk("cards", { heading: "Gift ideas", columns: 3, boxed: false, bg: "@surface", color: "@text", accent: "@primary", items: [
        { imageUrl: art("box"), title: "For family", text: "Curated sets everyone enjoys.", buttonLabel: "Shop", buttonUrl: U },
        { imageUrl: art("jar"), title: "For friends", text: "Small treats, big smiles.", buttonLabel: "Shop", buttonUrl: U },
        { imageUrl: art("basket"), title: "For the home", text: "Make the season special.", buttonLabel: "Shop", buttonUrl: U },
      ] }),
      ...standardFooter(),
    ],
  },
  {
    key: "seasonal-eid", name: "Eid & Ramadan — Warm Wishes", category: "PROMOTIONAL", tier: "FREE", sortOrder: 320, theme: crescent,
    description: "Calm, elegant greeting with a gift offer and a charity-giving callout.",
    subject: "Eid Mubarak from all of us", previewText: "Celebrate with something special — an Eid offer inside.",
    blocks: [
      mk("header", { brand: "{{business_name}}", links: [] }),
      mk("hero", { eyebrow: "Eid Mubarak", headline: "Blessings, joy and [[togetherness]]", text: "Wishing you and your loved ones a beautiful Eid. Enjoy a special thank-you from our team.", imageUrl: art("basket"), imagePosition: "bottom", buttonLabel: "See the Eid collection", buttonUrl: U, bg: "@primarySoft", color: "@text", accent: "@primary" }),
      mk("coupon", { headline: "Eid gift: 15% OFF", text: "Use this code on your order. Valid for one week.", code: "EID15", bg: "@surface", color: "@text", accent: "@primary" }),
      mk("list", { heading: "Make it extra special", style: "icons", boxed: false, bg: "@surface", accent: "@primary", items: [
        { icon: "gift", title: "Free gift wrapping", text: "On every order this week." },
        { icon: "truck", title: "Fast delivery", text: "Order early to receive it in time." },
        { icon: "heart", title: "Giving back", text: "A share of every order supports local charities." },
      ] }),
      ...standardFooter(),
    ],
  },
  {
    key: "seasonal-holiday-gifts", name: "Holiday Gift Guide", category: "PROMOTIONAL", tier: "FREE", sortOrder: 330, theme: evergreen,
    description: "Gift guide by recipient, delivery cut-off reminder and a gift-card callout.",
    subject: "Our holiday gift guide is here 🎁", previewText: "Find the perfect gift for everyone on your list.",
    blocks: [
      mk("header", { brand: "{{business_name}}", links: [] }),
      mk("hero", { eyebrow: "Holiday gift guide", headline: "Find the [[perfect]] gift", text: "Thoughtful picks for everyone on your list, whatever the budget.", imageUrl: art("box"), imagePosition: "bottom", buttonLabel: "Browse the guide", buttonUrl: U, bg: "@primary", accent: "@accent" }),
      mk("cards", { heading: "Shop by person", columns: 2, boxed: true, bg: "@surface", accent: "@primary", cardBg: "@primarySoft", items: [
        { imageUrl: art("bottle"), title: "For her", text: "Pampering picks she'll love.", buttonLabel: "Shop", buttonUrl: U },
        { imageUrl: art("tube"), title: "For him", text: "Useful gifts he'll actually use.", buttonLabel: "Shop", buttonUrl: U },
        { imageUrl: art("gummies"), title: "Stocking fillers", text: "Little extras under $15.", buttonLabel: "Shop", buttonUrl: U },
        { imageUrl: art("basket"), title: "Gift sets", text: "Wrapped and ready to give.", buttonLabel: "Shop", buttonUrl: U },
      ] }),
      mk("callout", { icon: "truck", headline: "Order by 15 December for delivery in time", text: "Free standard shipping over $50.", bg: "@secondary", sectionBg: "@surface" }),
      mk("callout", { icon: "gift", headline: "Can't decide? Send a gift card", text: "Delivered instantly by email.", buttonLabel: "Send a gift card", buttonUrl: U, bg: "@primary", sectionBg: "@surface" }),
      ...standardFooter(),
    ],
  },
  {
    key: "flow-review-request", name: "Review Request — How Did We Do?", category: "POST_PURCHASE", tier: "FREE", sortOrder: 340, theme: studio,
    description: "Friendly follow-up asking for a rating, with the product shown and a one-click review button.",
    subject: "How are you getting on with your order?", previewText: "Got a minute? Tell us what you think.",
    blocks: [
      mk("header", { brand: "{{business_name}}", links: [] }),
      mk("hero", { eyebrow: "Your feedback matters", headline: "How did we [[do]], {{first_name|friend}}?", text: "You've had your order for a little while now. A quick review helps other shoppers — and helps us improve.", imageUrl: art("jar"), imagePosition: "bottom", buttonLabel: "Leave a review", buttonUrl: U, bg: "@primarySoft", color: "@text", accent: "@primary" }),
      mk("list", { heading: "It only takes a minute", style: "numbers", boxed: false, bg: "@surface", accent: "@primary", items: [
        { title: "Tap the button above", text: "It opens your order, ready to review." },
        { title: "Rate and write a line or two", text: "Honest feedback is the most helpful." },
        { title: "Done", text: "Thank you — we read every review." },
      ] }),
      mk("callout", { icon: "message", headline: "Something not right?", text: "Reply to this email and we'll fix it personally.", bg: "@secondary", sectionBg: "@surface" }),
      ...standardFooter(),
    ],
  },
  {
    key: "flow-back-in-stock", name: "Back in Stock — It's Here", category: "PRODUCT_LAUNCH", tier: "FREE", sortOrder: 350, theme: ink,
    description: "Urgent restock alert with the product, a scarcity note and a single clear button.",
    subject: "It's back in stock (but not for long)", previewText: "You asked, we listened. Get yours before it sells out again.",
    blocks: [
      mk("header", { brand: "{{business_name}}", links: [] }),
      mk("hero", { eyebrow: "Back in stock", headline: "You asked. We [[restocked]].", text: "The one you've been waiting for is available again. Last time it sold out in days.", imageUrl: art("bottle"), imagePosition: "bottom", buttonLabel: "Get yours now", buttonUrl: U, bg: "@secondary", accent: "@accent" }),
      mk("list", { heading: "Why people love it", style: "checks", boxed: false, bg: "@surface", accent: "@primary", items: [
        { title: "Loved by thousands of customers" },
        { title: "Free returns within 30 days" },
        { title: "Ships within 24 hours" },
      ] }),
      mk("callout", { icon: "bolt", headline: "Limited quantity", text: "We only restocked a small batch.", buttonLabel: "Shop now", buttonUrl: U, bg: "@primary", sectionBg: "@surface" }),
      ...standardFooter(),
    ],
  },
  {
    key: "flow-birthday", name: "Birthday Treat", category: "PROMOTIONAL", tier: "FREE", sortOrder: 360, theme: confetti,
    description: "Playful birthday greeting with a personal discount that's valid all month.",
    subject: "Happy birthday, {{first_name|friend}}! A gift from us 🎂", previewText: "Your birthday treat is inside.",
    blocks: [
      mk("header", { brand: "{{business_name}}", links: [] }),
      mk("hero", { eyebrow: "Happy birthday", headline: "It's your [[day]], {{first_name|friend}}!", text: "We hope it's a great one. Here's a little something to celebrate.", imageUrl: art("gummies"), imagePosition: "bottom", bg: "@primary", accent: "@accent" }),
      mk("wave", { shape: "wave", top: "@primary", bottom: "@surface", height: 50 }),
      mk("coupon", { eyebrow: "Your birthday gift", headline: "25% OFF", text: "Valid for the whole month. Treat yourself.", code: "BDAY25", buttonLabel: "Treat yourself", buttonUrl: U, bg: "@primarySoft", color: "@text", accent: "@primary" }),
      ...standardFooter(),
    ],
  },
  {
    key: "digital-ebook-launch", name: "Digital Product — Ebook Launch", category: "PRODUCT_LAUNCH", tier: "FREE", sortOrder: 370, theme: paper,
    description: "Launch email for an ebook, template pack or guide: what's inside, who it's for and an early-bird price.",
    subject: "New: {{business_name}} guide is out now", previewText: "Instant download. Early-bird price for the first 48 hours.",
    blocks: [
      mk("header", { brand: "{{business_name}}", links: [] }),
      mk("hero", { eyebrow: "New release", headline: "The complete [[playbook]] is here", text: "Everything we've learned, in one practical guide you can start using today. Instant download.", imageUrl: art("laptop"), imagePosition: "bottom", buttonLabel: "Get the guide", buttonUrl: U, bg: "@surface", color: "@text", accent: "@primary" }),
      mk("list", { heading: "What's inside", style: "checks", boxed: true, bg: "@surface", accent: "@primary", cardBg: "@primarySoft", items: [
        { title: "12 step-by-step chapters", text: "From first idea to finished result." },
        { title: "Ready-to-use templates", text: "Copy, paste and make them yours." },
        { title: "Lifetime updates", text: "Free updates whenever we improve it." },
      ] }),
      mk("coupon", { eyebrow: "Early-bird price", headline: "$19 (then $39)", text: "First 48 hours only. Use this code at checkout.", code: "EARLYBIRD", buttonLabel: "Download now", buttonUrl: U, bg: "@primarySoft", color: "@text", accent: "@primary" }),
      ...standardFooter(),
    ],
  },
];

// --- PRO ----------------------------------------------------------------------------------------
export const MORE_PRO_TEMPLATES: TemplateDefinition[] = [
  {
    key: "pro-black-friday-countdown", name: "Black Friday — Early Access", category: "SALE", tier: "PRO", sortOrder: 400, theme: noir,
    description: "VIP early-access teaser with a countdown-style timeline, tiered offers and loyalty perks.",
    subject: "VIP early access: Black Friday starts for you today", previewText: "You're on the list. Shop 24 hours before everyone else.",
    blocks: [
      mk("header", { brand: "{{business_name}}", links: [], bg: "@secondary", color: "#FFFFFF" }),
      mk("hero", { eyebrow: "VIP early access", headline: "You're in. Black Friday is [[open]].", text: "As one of our best customers, you get a full 24 hours before the public sale. No code needed.", imageUrl: art("phone"), imagePosition: "top", buttonLabel: "Enter early access", buttonUrl: U, bg: "@secondary", accent: "@accent" }),
      mk("wave", { shape: "slant", top: "@secondary", bottom: "@surface", height: 56 }),
      mk("list", { heading: "How it works", style: "numbers", boxed: false, bg: "@surface", accent: "@primary", items: [
        { title: "Today: VIP early access", text: "Everything up to 50% off, only for you." },
        { title: "Friday: public sale opens", text: "Prices stay low through the weekend." },
        { title: "Monday: last chance", text: "Ends at midnight. Stock won't be restocked." },
      ] }),
      mk("cards", { heading: "Tiered savings", columns: 3, boxed: true, bg: "@surface", accent: "@primary", cardBg: "@secondary", items: [
        { icon: "tag", title: "Spend $50", text: "Take 15% off", buttonLabel: "Shop", buttonUrl: U },
        { icon: "gift", title: "Spend $100", text: "Take 25% off + free gift", buttonLabel: "Shop", buttonUrl: U },
        { icon: "award", title: "Spend $200", text: "Take 35% off + free shipping", buttonLabel: "Shop", buttonUrl: U },
      ] }),
      mk("testimonials", { heading: "Why shoppers come back", boxed: true, bg: "@surface", accent: "@primary", cardBg: "@secondary", items: [{ quote: "Best prices of the year and my order arrived in two days. I stocked up for everyone.", name: "Priya S.", role: "Verified buyer", rating: 5 }] }),
      ...standardFooter({ bg: "@secondary", iconBg: "@primary" }),
    ],
  },
  {
    key: "pro-festive-premium", name: "Festival of Lights — Premium", category: "PROMOTIONAL", tier: "PRO", sortOrder: 410, theme: diya,
    description: "Rich festive layout with a story hero, gift hampers, a countdown to last order date and a thank-you message.",
    subject: "Light up the season with {{business_name}}", previewText: "Festive hampers, handpicked for you.",
    blocks: [
      mk("header", { brand: "{{business_name}}", links: [{ label: "Hampers", url: U }, { label: "Sweets & treats", url: U }, { label: "Gifting", url: U }], bg: "@secondary", color: "#FFFFFF" }),
      mk("hero", { eyebrow: "The festive edit", headline: "Gifts that make every home [[sparkle]]", text: "Handpicked hampers, thoughtfully packed and delivered with care.", imageUrl: art("box", { c1: "@accent", c2: "@primary", c3: "#FFFFFF" }), imagePosition: "bottom", buttonLabel: "Explore hampers", buttonUrl: U, bg: "@primary", accent: "@accent" }),
      mk("wave", { shape: "scallop", top: "@primary", bottom: "@surface", height: 50 }),
      mk("cards", { heading: "Festive hampers", subheading: "Packed with love, ready to gift", columns: 2, boxed: true, bg: "@surface", accent: "@primary", cardBg: "@primarySoft", items: [
        { imageUrl: art("basket"), badge: "Popular", title: "The Family Hamper", text: "Sweets, snacks and surprises for the whole family.", price: "$49", buttonLabel: "Order now", buttonUrl: U },
        { imageUrl: art("box"), badge: "New", title: "The Luxe Collection", text: "Premium treats in a keepsake box.", price: "$89", buttonLabel: "Order now", buttonUrl: U },
      ] }),
      mk("split", { imageUrl: art("people"), imageSide: "left", eyebrow: "Corporate gifting", headline: "Thank your team and clients", text: "Custom-branded hampers with bulk pricing and doorstep delivery.", buttonLabel: "Get a quote", buttonUrl: U, bg: "@primarySoft", color: "@text", accent: "@primary" }),
      mk("callout", { icon: "clock", headline: "Last order date: 12th for delivery in time", text: "Order early. Festive slots fill up quickly.", bg: "@secondary", sectionBg: "@surface" }),
      ...standardFooter({ links: true }),
    ],
  },
  {
    key: "pro-eid-collection", name: "Eid — The Collection", category: "PROMOTIONAL", tier: "PRO", sortOrder: 420, theme: crescent,
    description: "Elegant collection launch: hero, three curated edits, a giving-back story and gift-card option.",
    subject: "The Eid collection has arrived", previewText: "Elegant pieces for gathering, gifting and giving.",
    blocks: [
      mk("header", { brand: "{{business_name}}", links: [{ label: "New", url: U }, { label: "Gifts", url: U }, { label: "Sale", url: U }] }),
      mk("hero", { eyebrow: "Eid collection", headline: "Celebrate in [[style]]", text: "New season pieces made for family gatherings, with free delivery on orders over $60.", imageUrl: art("photo"), imagePosition: "bottom", buttonLabel: "Shop the collection", buttonUrl: U, bg: "@primary", accent: "@accent" }),
      mk("cards", { heading: "Three edits", columns: 3, boxed: false, bg: "@surface", accent: "@primary", items: [
        { imageUrl: art("bottle"), title: "For the table", text: "Host with elegance.", buttonLabel: "Explore", buttonUrl: U },
        { imageUrl: art("jar"), title: "For gifting", text: "Beautifully boxed.", buttonLabel: "Explore", buttonUrl: U },
        { imageUrl: art("tube"), title: "For you", text: "Treat yourself, too.", buttonLabel: "Explore", buttonUrl: U },
      ] }),
      mk("wave", { shape: "curve", top: "@surface", bottom: "@primarySoft", height: 50 }),
      mk("split", { imageUrl: art("people"), imageSide: "right", eyebrow: "Giving back", headline: "Every order feeds a family", text: "For every order this month we donate a meal to a family in need. Thank you for celebrating generously.", bg: "@primarySoft", color: "@text", accent: "@primary" }),
      ...standardFooter({ bg: "@primarySoft" }),
    ],
  },
  {
    key: "pro-holiday-countdown", name: "Holiday — 12 Days of Deals", category: "SALE", tier: "PRO", sortOrder: 430, theme: evergreen,
    description: "Advent-style daily deals email with a featured deal, a week-at-a-glance list and free-shipping bar.",
    subject: "Day 1 of 12: today's deal is inside", previewText: "A new deal every day until the holidays.",
    blocks: [
      mk("header", { brand: "{{business_name}}", links: [] }),
      mk("hero", { eyebrow: "12 days of deals", headline: "Today's deal: [[40% off]]", text: "One new offer every day. Today's is available for the next 24 hours only.", imageUrl: art("gummies"), imagePosition: "bottom", buttonLabel: "Claim today's deal", buttonUrl: U, bg: "@primary", accent: "@accent" }),
      mk("wave", { shape: "drip", top: "@primary", bottom: "@surface", height: 50 }),
      mk("list", { heading: "Coming up", style: "icons", boxed: true, bg: "@surface", accent: "@primary", cardBg: "@primarySoft", items: [
        { icon: "gift", title: "Day 2: Free gift with purchase", text: "A little extra in every order." },
        { icon: "percent", title: "Day 3: Buy two, get one free", text: "Stock up for the whole family." },
        { icon: "truck", title: "Day 4: Free express shipping", text: "No minimum spend." },
      ] }),
      mk("callout", { icon: "sparkles", headline: "Don't miss a day", text: "Add us to your contacts so these deals land in your inbox, not your spam folder.", bg: "@secondary", sectionBg: "@surface" }),
      ...standardFooter(),
    ],
  },
  {
    key: "pro-digital-course-launch", name: "Digital Product — Course Launch", category: "PRODUCT_LAUNCH", tier: "PRO", sortOrder: 440, theme: ink,
    description: "Long-form launch: promise, curriculum, instructor story, testimonials, bonuses and an enrol deadline.",
    subject: "Enrolment is open: {{business_name}} Masterclass", previewText: "Learn at your own pace. 30-day money-back guarantee.",
    blocks: [
      mk("header", { brand: "{{business_name}}", links: [] }),
      mk("hero", { eyebrow: "Enrolment open", headline: "Master the skill in [[6 weeks]]", text: "A self-paced video course with templates, live Q&A and a private community. Start today.", imageUrl: art("laptop"), imagePosition: "bottom", buttonLabel: "Enrol now", buttonUrl: U, bg: "@secondary", accent: "@accent" }),
      mk("list", { heading: "What you'll learn", style: "numbers", boxed: false, bg: "@surface", accent: "@primary", items: [
        { title: "Module 1: Foundations", text: "Get the fundamentals right, fast." },
        { title: "Module 2: Hands-on projects", text: "Build real work for your portfolio." },
        { title: "Module 3: Launch & grow", text: "Turn the skill into income." },
      ] }),
      mk("split", { imageUrl: art("people"), imageSide: "left", eyebrow: "Your instructor", headline: "Learn from someone who's done it", text: "10+ years of hands-on experience, 5,000 students taught and a community that actually supports you.", bg: "@primarySoft", color: "@text", accent: "@primary" }),
      mk("testimonials", { heading: "Students say", boxed: true, bg: "@surface", accent: "@primary", cardBg: "@primarySoft", items: [
        { quote: "I got my first client within three weeks of finishing the course. Worth every penny.", name: "Aisha K.", role: "Freelancer", rating: 5 },
        { quote: "Clear, practical and no fluff. The templates alone saved me days.", name: "Marco R.", role: "Founder", rating: 5 },
      ] }),
      mk("callout", { icon: "gift", headline: "Enrol this week and get 3 bonuses", text: "Templates pack, private community and a 1:1 review of your first project.", buttonLabel: "Claim my bonuses", buttonUrl: U, bg: "@primary", sectionBg: "@surface" }),
      mk("callout", { icon: "shield", headline: "30-day money-back guarantee", text: "Try it risk-free. If it's not for you, we'll refund every penny.", bg: "@secondary", sectionBg: "@surface" }),
      ...standardFooter(),
    ],
  },
  {
    key: "pro-digital-download-ready", name: "Digital Product — Your Download Is Ready", category: "POST_PURCHASE", tier: "PRO", sortOrder: 450, theme: paper,
    description: "Delivery email with a prominent download button, getting-started steps, support links and a cross-sell.",
    subject: "Your download is ready 🎉", previewText: "Everything you need to get started is inside.",
    blocks: [
      mk("header", { brand: "{{business_name}}", links: [] }),
      mk("hero", { eyebrow: "Order confirmed", headline: "Thanks, {{first_name|friend}}. Your files are [[ready]]", text: "Download everything below. The link stays active in your account, so you can come back anytime.", imageUrl: art("laptop"), imagePosition: "bottom", buttonLabel: "Download now", buttonUrl: U, bg: "@primarySoft", color: "@text", accent: "@primary" }),
      mk("list", { heading: "Getting started", style: "numbers", boxed: false, bg: "@surface", accent: "@primary", items: [
        { title: "Download and unzip", text: "Save the files somewhere easy to find." },
        { title: "Open the quick-start guide", text: "It takes five minutes to read." },
        { title: "Join the community", text: "Ask questions, share your results." },
      ] }),
      mk("callout", { icon: "message", headline: "Need a hand?", text: "Reply to this email or visit our help centre. We reply within one working day.", buttonLabel: "Get help", buttonUrl: U, bg: "@secondary", sectionBg: "@surface" }),
      mk("cards", { heading: "You may also like", columns: 2, boxed: true, bg: "@surface", accent: "@primary", cardBg: "@primarySoft", items: [
        { imageUrl: art("photo"), title: "Pro template pack", price: "$29", buttonLabel: "View", buttonUrl: U },
        { imageUrl: art("phone"), title: "Advanced workshop", price: "$59", buttonLabel: "View", buttonUrl: U },
      ] }),
      ...standardFooter(),
    ],
  },
  {
    key: "pro-course-welcome", name: "Digital Product — Course Welcome", category: "WELCOME", tier: "PRO", sortOrder: 460, theme: studio,
    description: "Warm onboarding for new students: first lesson, a week-one plan, community and support.",
    subject: "Welcome aboard, {{first_name|friend}} — your first lesson is waiting", previewText: "Here's how to get the most from week one.",
    blocks: [
      mk("header", { brand: "{{business_name}}", links: [] }),
      mk("hero", { eyebrow: "Welcome", headline: "You're in, {{first_name|friend}}! Let's [[begin]]", text: "Your access is live. Start with lesson one. It takes about 10 minutes.", imageUrl: art("phone"), imagePosition: "bottom", buttonLabel: "Start lesson 1", buttonUrl: U, bg: "@primary", accent: "@accent" }),
      mk("list", { heading: "Your week-one plan", style: "checks", boxed: true, bg: "@surface", accent: "@primary", cardBg: "@primarySoft", items: [
        { title: "Day 1: Watch lesson one", text: "Set your goal for the course." },
        { title: "Day 3: Complete the first exercise", text: "Small wins build momentum." },
        { title: "Day 7: Share your progress", text: "Post in the community and get feedback." },
      ] }),
      mk("cards", { columns: 2, boxed: true, bg: "@surface", accent: "@primary", cardBg: "@primarySoft", items: [
        { icon: "users", title: "Join the community", text: "Meet other students.", buttonLabel: "Join", buttonUrl: U },
        { icon: "calendar", title: "Live Q&A", text: "Every Thursday at 6 pm.", buttonLabel: "Add to calendar", buttonUrl: U },
      ] }),
      ...standardFooter(),
    ],
  },
  {
    key: "pro-webinar-invite", name: "Webinar / Event Invitation", category: "NEWSLETTER", tier: "PRO", sortOrder: 470, theme: ink,
    description: "Event invite with date and time details, an agenda, speaker spotlight and an add-to-calendar callout.",
    subject: "You're invited: live session on {{business_name}}", previewText: "Free to attend. Save your seat.",
    blocks: [
      mk("header", { brand: "{{business_name}}", links: [] }),
      mk("hero", { eyebrow: "Free live webinar", headline: "Save your seat for [[Thursday]]", text: "60 minutes of practical advice, a live demo and open Q&A.", imageUrl: art("laptop"), imagePosition: "bottom", buttonLabel: "Register free", buttonUrl: U, bg: "@secondary", accent: "@accent" }),
      mk("cards", { columns: 3, boxed: true, bg: "@surface", accent: "@primary", cardBg: "@primarySoft", items: [
        { icon: "calendar", title: "Date", text: "Thursday, 14 Nov" },
        { icon: "clock", title: "Time", text: "6:00 pm (GST)" },
        { icon: "globe", title: "Where", text: "Online. Link sent after you register" },
      ] }),
      mk("list", { heading: "On the agenda", style: "checks", boxed: false, bg: "@surface", accent: "@primary", items: [
        { title: "The three mistakes almost everyone makes" },
        { title: "A live walk-through with real examples" },
        { title: "Your questions answered, live" },
      ] }),
      mk("split", { imageUrl: art("people"), imageSide: "left", eyebrow: "Your host", headline: "Meet the speaker", text: "Practitioner and educator with 10+ years of experience helping businesses grow.", bg: "@primarySoft", color: "@text", accent: "@primary" }),
      mk("callout", { icon: "calendar", headline: "Can't make it live?", text: "Register anyway and we'll send you the recording.", buttonLabel: "Register", buttonUrl: U, bg: "@primary", sectionBg: "@surface" }),
      ...standardFooter(),
    ],
  },
  {
    key: "pro-weekly-digest", name: "Weekly Digest — Editor's Picks", category: "NEWSLETTER", tier: "PRO", sortOrder: 480, theme: paper,
    description: "Magazine-style content digest: lead story, quick reads, a featured resource and a reader question.",
    subject: "This week: three ideas worth your time", previewText: "Our editor's picks, in five minutes.",
    blocks: [
      mk("header", { brand: "{{business_name}}", links: [{ label: "Read online", url: U }] }),
      mk("hero", { eyebrow: "This week's lead", headline: "The simple habit that [[changed]] everything", text: "A five-minute read on the small change that made the biggest difference.", imageUrl: art("photo"), imagePosition: "bottom", buttonLabel: "Read the story", buttonUrl: U, bg: "@surface", color: "@text", accent: "@primary", align: "left" }),
      mk("cards", { heading: "Quick reads", columns: 1, boxed: false, bg: "@surface", accent: "@primary", items: [
        { icon: "file", title: "How to plan your month in 15 minutes", text: "A repeatable routine you can steal.", buttonLabel: "Read", buttonUrl: U },
        { icon: "chart", title: "What the data really says about growth", text: "Three charts, zero jargon.", buttonLabel: "Read", buttonUrl: U },
        { icon: "sparkles", title: "Tools we're loving this month", text: "Small tools, big impact.", buttonLabel: "Read", buttonUrl: U },
      ] }),
      mk("split", { imageUrl: art("laptop"), imageSide: "right", eyebrow: "Free resource", headline: "The 2-page planning template", text: "Download it free and start the week with a clear plan.", buttonLabel: "Download", buttonUrl: U, bg: "@primarySoft", color: "@text", accent: "@primary" }),
      mk("callout", { icon: "message", headline: "Got a question?", text: "Hit reply. We answer our favourite reader questions every week.", bg: "@secondary", sectionBg: "@surface" }),
      ...standardFooter(),
    ],
  },
  {
    key: "pro-survey-feedback", name: "Customer Survey — Help Us Improve", category: "NEWSLETTER", tier: "PRO", sortOrder: 490, theme: blush,
    description: "Friendly feedback request with a 1–5 style rating row, an incentive and a short-survey promise.",
    subject: "2 minutes to help us improve (and win)", previewText: "Tell us what you think. There's a thank-you in it for you.",
    blocks: [
      mk("header", { brand: "{{business_name}}", links: [] }),
      mk("hero", { eyebrow: "Quick survey", headline: "Tell us what you [[really]] think", text: "Five questions. Two minutes. Your answers directly shape what we build next.", imageUrl: art("people"), imagePosition: "bottom", buttonLabel: "Take the survey", buttonUrl: U, bg: "@primarySoft", color: "@text", accent: "@primary" }),
      mk("cards", { heading: "How likely are you to recommend us?", columns: 3, boxed: true, bg: "@surface", accent: "@primary", cardBg: "@primarySoft", items: [
        { icon: "smile", title: "Love it", buttonLabel: "5", buttonUrl: U },
        { icon: "star", title: "It's good", buttonLabel: "3-4", buttonUrl: U },
        { icon: "message", title: "Needs work", buttonLabel: "1-2", buttonUrl: U },
      ] }),
      mk("callout", { icon: "gift", headline: "Win a $100 gift card", text: "Everyone who completes the survey is entered into the draw.", bg: "@primary", sectionBg: "@surface" }),
      ...standardFooter(),
    ],
  },
  {
    key: "pro-vip-loyalty", name: "VIP Loyalty — You've Levelled Up", category: "THANK_YOU", tier: "PRO", sortOrder: 500, theme: sand,
    description: "Loyalty status update with perks list, points balance callout and an exclusive first-look product row.",
    subject: "You're now a VIP, {{first_name|friend}}", previewText: "New perks are unlocked for you.",
    blocks: [
      mk("header", { brand: "{{business_name}}", links: [] }),
      mk("hero", { eyebrow: "Welcome to VIP", headline: "You've [[unlocked]] a new level", text: "Thank you for being one of our most loyal customers. Here's what's now yours.", imageUrl: art("box"), imagePosition: "bottom", buttonLabel: "See my perks", buttonUrl: U, bg: "@primarySoft", color: "@text", accent: "@primary" }),
      mk("list", { heading: "Your VIP perks", style: "icons", boxed: true, bg: "@surface", accent: "@primary", cardBg: "@primarySoft", items: [
        { icon: "truck", title: "Free shipping, always", text: "On every order, no minimum." },
        { icon: "gift", title: "Birthday gift", text: "A surprise on your special day." },
        { icon: "sparkles", title: "Early access", text: "Shop new launches before anyone else." },
        { icon: "award", title: "Double points", text: "Earn twice as fast, all year." },
      ] }),
      mk("callout", { icon: "star", headline: "Your points balance: 1,250", text: "That's $12.50 off your next order.", buttonLabel: "Use my points", buttonUrl: U, bg: "@primary", sectionBg: "@surface" }),
      ...standardFooter(),
    ],
  },
  {
    key: "pro-replenishment", name: "Replenishment — Time to Restock?", category: "POST_PURCHASE", tier: "PRO", sortOrder: 510, theme: studio,
    description: "Helpful reorder reminder based on usage, with subscribe-and-save, one-click reorder and a how-to tip.",
    subject: "Running low, {{first_name|friend}}? Reorder in one click", previewText: "Subscribe and save 15% on every refill.",
    blocks: [
      mk("header", { brand: "{{business_name}}", links: [] }),
      mk("hero", { eyebrow: "Time to restock", headline: "Don't run out of what you [[love]]", text: "Based on when you ordered, you're probably getting low. Reorder in one click.", imageUrl: art("bottle"), imagePosition: "bottom", buttonLabel: "Reorder now", buttonUrl: U, bg: "@primarySoft", color: "@text", accent: "@primary" }),
      mk("callout", { icon: "refresh", headline: "Subscribe & save 15%", text: "Get it delivered on your schedule. Skip, pause or cancel anytime.", buttonLabel: "Start saving", buttonUrl: U, bg: "@primary", sectionBg: "@surface" }),
      mk("list", { heading: "Get more from every refill", style: "bullets", boxed: false, bg: "@surface", accent: "@primary", items: [
        { title: "Store it somewhere cool and dry" },
        { title: "Use it consistently for the best results" },
        { title: "Questions? Our team is happy to help" },
      ] }),
      ...standardFooter(),
    ],
  },
  {
    key: "pro-saas-trial-ending", name: "SaaS — Trial Ending Soon", category: "WIN_BACK", tier: "PRO", sortOrder: 520, theme: ink,
    description: "Trial-expiry nudge: usage recap, what they'll lose, plan highlights and a clear upgrade path.",
    subject: "Your trial ends in 3 days", previewText: "Keep everything you've built. Upgrade in one click.",
    blocks: [
      mk("header", { brand: "{{business_name}}", links: [] }),
      mk("hero", { eyebrow: "3 days left", headline: "Your trial ends [[Friday]]", text: "Hi {{first_name|there}}, you've done great work so far. Upgrade now to keep your projects, data and settings.", imageUrl: art("laptop"), imagePosition: "bottom", buttonLabel: "Upgrade my account", buttonUrl: U, bg: "@secondary", accent: "@accent" }),
      mk("cards", { heading: "Your trial in numbers", columns: 3, boxed: true, bg: "@surface", accent: "@primary", cardBg: "@primarySoft", items: [
        { icon: "rocket", title: "12", text: "Projects created" },
        { icon: "users", title: "4", text: "Teammates invited" },
        { icon: "clock", title: "18 hrs", text: "Time saved" },
      ] }),
      mk("list", { heading: "What you keep when you upgrade", style: "checks", boxed: false, bg: "@surface", accent: "@primary", items: [
        { title: "All your projects and history" },
        { title: "Your team and permissions" },
        { title: "Priority support" },
      ] }),
      mk("callout", { icon: "message", headline: "Need more time or have questions?", text: "Reply to this email. We'll happily extend your trial or help you choose a plan.", bg: "@primary", sectionBg: "@surface" }),
      ...standardFooter(),
    ],
  },
  {
    key: "pro-product-update", name: "SaaS — What's New", category: "PRODUCT_LAUNCH", tier: "PRO", sortOrder: 530, theme: studio,
    description: "Release notes email: headline feature, three smaller improvements, a changelog link and a feedback ask.",
    subject: "What's new this month at {{business_name}}", previewText: "A big new feature and three small wins.",
    blocks: [
      mk("header", { brand: "{{business_name}}", links: [{ label: "Changelog", url: U }] }),
      mk("hero", { eyebrow: "New this month", headline: "Introducing [[smart]] automations", text: "Set up powerful workflows in minutes, with no code and no learning curve.", imageUrl: art("laptop"), imagePosition: "bottom", buttonLabel: "Try it now", buttonUrl: U, bg: "@primary", accent: "@accent" }),
      mk("list", { heading: "Smaller improvements", style: "icons", boxed: false, bg: "@surface", accent: "@primary", items: [
        { icon: "bolt", title: "2x faster dashboards", text: "Reports now load in under a second." },
        { icon: "lock", title: "Two-factor sign-in", text: "Extra protection for your account." },
        { icon: "users", title: "Team roles", text: "Control who can view and edit." },
      ] }),
      mk("callout", { icon: "message", headline: "Tell us what to build next", text: "We read every reply. What's the one thing you'd improve?", buttonLabel: "Share feedback", buttonUrl: U, bg: "@secondary", sectionBg: "@surface" }),
      ...standardFooter(),
    ],
  },
  {
    key: "pro-invoice-receipt", name: "Receipt — Thanks for Your Order", category: "POST_PURCHASE", tier: "PRO", sortOrder: 540, theme: paper,
    description: "Clean transactional receipt layout with order details, delivery info and support links.",
    subject: "Your receipt from {{business_name}}", previewText: "Order confirmed. Here are the details.",
    blocks: [
      mk("header", { brand: "{{business_name}}", links: [] }),
      mk("hero", { eyebrow: "Receipt", headline: "Thanks for your order, {{first_name|friend}}", text: "We've received your payment. A summary is below, and you can view full details in your account.", bg: "@surface", color: "@text", accent: "@primary", align: "left" }),
      mk("cards", { columns: 2, boxed: true, bg: "@surface", accent: "@primary", cardBg: "@primarySoft", items: [
        { icon: "file", title: "Order number", text: "#10234" },
        { icon: "calendar", title: "Date", text: "14 Nov 2026" },
        { icon: "cart", title: "Total paid", text: "$64.00" },
        { icon: "truck", title: "Delivery", text: "2–4 working days" },
      ] }),
      mk("button", { label: "View order", url: U }),
      mk("callout", { icon: "message", headline: "Questions about your order?", text: "Reply to this email and a real person will help.", bg: "@secondary", sectionBg: "@surface" }),
      ...standardFooter(),
    ],
  },
  {
    key: "pro-booking-reminder", name: "Booking Reminder — See You Soon", category: "POST_PURCHASE", tier: "PRO", sortOrder: 550, theme: studio,
    description: "Appointment reminder with date, place and what to bring, plus reschedule and directions buttons.",
    subject: "Reminder: your appointment is tomorrow", previewText: "We're looking forward to seeing you.",
    blocks: [
      mk("header", { brand: "{{business_name}}", links: [] }),
      mk("hero", { eyebrow: "See you soon", headline: "Your appointment is [[tomorrow]]", text: "Hi {{first_name|there}}, just a quick reminder of your booking.", bg: "@primarySoft", color: "@text", accent: "@primary", align: "left" }),
      mk("cards", { columns: 3, boxed: true, bg: "@surface", accent: "@primary", cardBg: "@primarySoft", items: [
        { icon: "calendar", title: "Date", text: "Tue, 15 Nov" },
        { icon: "clock", title: "Time", text: "10:30 am" },
        { icon: "map-pin", title: "Where", text: "12 Example Street" },
      ] }),
      mk("list", { heading: "Before you arrive", style: "checks", boxed: false, bg: "@surface", accent: "@primary", items: [
        { title: "Arrive 10 minutes early" },
        { title: "Bring a photo ID" },
        { title: "Wear something comfortable" },
      ] }),
      mk("callout", { icon: "refresh", headline: "Need to change your booking?", text: "Please give us 24 hours' notice.", buttonLabel: "Reschedule", buttonUrl: U, bg: "@primary", sectionBg: "@surface" }),
      ...standardFooter(),
    ],
  },
];
