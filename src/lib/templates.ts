export interface CategoryMetadata {
  category: string;
  potentialValue: "Low" | "Medium" | "High" | "Very High" | "Variable";
  likelyNeeds: string[];
  futureNeeds: string[];
  price: number;
  monthlyPrice: number;
  wasPrice: number;
  pitchTitle: string;
}

export interface LetterCategoryCopy {
  openingContext: string;
  websiteReason: string;
}

export const CATEGORY_METADATA_MAP: Record<string, CategoryMetadata> = {
  "Local Trades": {
    category: "Local Trades",
    potentialValue: "Medium",
    likelyNeeds: ["Website", "Google Business Profile", "Professional email"],
    futureNeeds: ["Lead generation", "Quote forms", "Job management software"],
    price: 300,
    monthlyPrice: 25,
    wasPrice: 1200,
    pitchTitle: "Business Starter Website Offer"
  },
  "Professional Services": {
    category: "Professional Services",
    potentialValue: "High",
    likelyNeeds: ["Credibility website", "Appointment booking"],
    futureNeeds: ["Client portals", "Document workflows"],
    price: 300,
    monthlyPrice: 25,
    wasPrice: 1200,
    pitchTitle: "Polished Credibility Website Offer"
  },
  "Health & Wellness": {
    category: "Health & Wellness",
    potentialValue: "High",
    likelyNeeds: ["Booking systems", "Websites"],
    futureNeeds: ["Membership management", "Client records"],
    price: 300,
    monthlyPrice: 25,
    wasPrice: 1200,
    pitchTitle: "Booking & Information Website Offer"
  },
  "Hospitality & Food": {
    category: "Hospitality & Food",
    potentialValue: "Medium",
    likelyNeeds: ["Websites", "Online ordering"],
    futureNeeds: ["Booking systems"],
    price: 300,
    monthlyPrice: 25,
    wasPrice: 1200,
    pitchTitle: "Menu & Reservation Website Offer"
  },
  "Retail & Ecommerce": {
    category: "Retail & Ecommerce",
    potentialValue: "High",
    likelyNeeds: ["Ecommerce", "Websites"],
    futureNeeds: ["Stock systems", "Integrations"],
    price: 300,
    monthlyPrice: 25,
    wasPrice: 1200,
    pitchTitle: "Ecommerce Starter Website Offer"
  },
  "Property & Construction": {
    category: "Property & Construction",
    potentialValue: "Very High",
    likelyNeeds: ["Portals", "Websites"],
    futureNeeds: ["CRM", "Workflow automation"],
    price: 300,
    monthlyPrice: 25,
    wasPrice: 1200,
    pitchTitle: "Property Showcase Website Offer"
  },
  "Manufacturing & Engineering": {
    category: "Manufacturing & Engineering",
    potentialValue: "Very High",
    likelyNeeds: ["Quoting systems", "Websites"],
    futureNeeds: ["Production tracking", "Internal software"],
    price: 300,
    monthlyPrice: 25,
    wasPrice: 1200,
    pitchTitle: "Technical Capability Website Offer"
  },
  "Transport & Logistics": {
    category: "Transport & Logistics",
    potentialValue: "High",
    likelyNeeds: ["Tracking", "Scheduling"],
    futureNeeds: ["Fleet management", "Websites"],
    price: 300,
    monthlyPrice: 25,
    wasPrice: 1200,
    pitchTitle: "Showcase & Operations Website Offer"
  },
  "Education & Training": {
    category: "Education & Training",
    potentialValue: "High",
    likelyNeeds: ["Booking", "Websites"],
    futureNeeds: ["LMS", "Membership"],
    price: 300,
    monthlyPrice: 25,
    wasPrice: 1200,
    pitchTitle: "Training & Booking Website Offer"
  },
  "Creative & Media": {
    category: "Creative & Media",
    potentialValue: "Medium",
    likelyNeeds: ["Portfolio sites", "Websites"],
    futureNeeds: ["Client systems"],
    price: 300,
    monthlyPrice: 25,
    wasPrice: 1200,
    pitchTitle: "High-Impact Portfolio Website Offer"
  },
  "Technology": {
    category: "Technology",
    potentialValue: "High",
    likelyNeeds: ["Development partnerships", "Websites"],
    futureNeeds: ["Specialist projects"],
    price: 300,
    monthlyPrice: 25,
    wasPrice: 1200,
    pitchTitle: "Technical Showcase Website Offer"
  },
  "Other Local Services": {
    category: "Other Local Services",
    potentialValue: "Medium",
    likelyNeeds: ["Website", "Contact form"],
    futureNeeds: ["Lead generation", "Booking forms"],
    price: 300,
    monthlyPrice: 25,
    wasPrice: 1200,
    pitchTitle: "Business Starter Website Offer"
  }
};

export const CATEGORY_LETTER_COPY_MAP: Record<string, LetterCategoryCopy> = {
  "Local Trades": {
    openingContext: "I noticed that you've recently started a new trade business and just wanted to introduce myself.",
    websiteReason:
      "For many trades businesses, one of the first challenges is helping potential customers find you and feel confident picking up the phone. A professional website can be a great way to showcase your services, previous work and contact details from day one."
  },
  "Professional Services": {
    openingContext: "I noticed that you've recently started a new professional services business and just wanted to introduce myself.",
    websiteReason:
      "In professional services, first impressions matter. A well-designed website can help establish credibility, explain your services clearly and give potential clients confidence in choosing you."
  },
  "Health & Wellness": {
    openingContext: "I noticed that you've recently started a new health / wellness business and just wanted to introduce myself.",
    websiteReason:
      "When people are choosing a healthcare or wellness provider, they often want to quickly understand what services you offer and how to get in touch. A professional website can help make that process simple and straightforward."
  },
  "Hospitality & Food": {
    openingContext: "I noticed that you've recently started a new hospitality / food business and just wanted to introduce myself.",
    websiteReason:
      "Whether customers are looking for your menu, opening hours, location or contact details, a professional website can make it much easier for people to discover your business and plan a visit."
  },
  "Retail & Ecommerce": {
    openingContext: "I noticed that you've recently started a new retail / ecommerce business and just wanted to introduce myself.",
    websiteReason:
      "A professional website can help customers find your business, learn more about what you offer and build confidence in your brand from the outset."
  },
  "Property & Construction": {
    openingContext: "I noticed that you've recently started a new property / construction business and just wanted to introduce myself.",
    websiteReason:
      "Whether you're showcasing developments, attracting new clients or building credibility in the local area, a professional website can be a valuable asset from the very beginning."
  },
  "Manufacturing & Engineering": {
    openingContext: "I noticed that you've recently started a new manufacturing or engineering business and just wanted to introduce myself.",
    websiteReason:
      "Many engineering and manufacturing businesses rely on reputation, referrals and business relationships. A professional website can help reinforce that credibility and provide potential customers with a clear understanding of your capabilities."
  },
  "Transport & Logistics": {
    openingContext: "I noticed that you've recently started a new transport / logistics business and just wanted to introduce myself.",
    websiteReason:
      "A professional website can help customers understand the services you provide, make enquiries and build confidence in your business from the outset."
  },
  "Education & Training": {
    openingContext: "I noticed that you've recently started a new education / training business and just wanted to introduce myself.",
    websiteReason:
      "A clear, professional website can help potential learners understand what you offer, find key information and get in touch easily."
  },
  "Creative & Media": {
    openingContext: "I noticed that you've recently started a new creative / media business and just wanted to introduce myself.",
    websiteReason:
      "For creative businesses, your website is often one of the first examples of your work that potential clients will see. A professional website can help you showcase your skills and make a strong first impression."
  },
  "Technology": {
    openingContext: "I noticed that you've recently started a new technology business and just wanted to introduce myself.",
    websiteReason:
      "For technology businesses, a clear and professional website can help explain what you do, build credibility and give potential clients or partners confidence from the outset."
  },
  "Other Local Services": {
    openingContext: "I noticed that you've recently started a new local service business and just wanted to introduce myself.",
    websiteReason:
      "A professional website can help customers find your business, understand what you offer and get in touch quickly when they need your services."
  }
};

export function getCategoryVariant(industryCategory: string | null): string {
  if (!industryCategory) return "other_local_services";
  return industryCategory
    .toLowerCase()
    .replace(/ & /g, "_and_")
    .replace(/ \/ /g, "_or_")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

/**
 * Converts a string to proper title case.
 * Example: "EDGEWAYS DIGITAL LIMITED" -> "Edgeways Digital Limited"
 */
export function toProperCase(str: string): string {
  if (!str) return "";

  return str.toLowerCase().replace(/(^|\s)\S/g, letter => letter.toUpperCase());
}

/**
 * Formats prices so whole pounds do not show unnecessary decimals.
 * Example: 37.5 -> "37.50", 25 -> "25"
 */
export function formatPrice(price: number): string {
  return Number.isInteger(price) ? price.toString() : price.toFixed(2);
}

/**
 * Generates the default introduction letter template for local businesses.
 */
export const defaultLetterTemplate = (
  companyName: string,
  recipientName: string = "Business Owner"
) => `Dear ${recipientName},

I noticed that you've recently started a new business and just wanted to introduce myself.

My name's Stuart and I run a small software and web development business based in Wilnecote.

My main focus is software development, but I also enjoy helping local businesses get off to a good start online. To support newly registered businesses in the area, we're offering a professional website for £300 to businesses within their first three months of trading (1/4 of our normal price). 

Please note: To make sure every project gets the time and attention it deserves, we limit the number of these websites we take on each month.

[Offer Card]

The website would be professionally designed, mobile-friendly, fully managed and include a full year of hosting at no extra cost.

There's no hard sell and absolutely no obligation. If you'd like to have a friendly chat about your plans, or if you think I might be able to help with your online presence or creating software for your business, feel free to call, email, or visit our website.

Either way, I wish you every success with your new business.`;

/**
 * Generates a tailored category letter using shared structure plus category-specific copy.
 */
export function generateCategoryLetterTemplate(
  category: string,
  companyName: string,
  recipientName: string = "Business Owner"
): string {
  const metadata = CATEGORY_METADATA_MAP[category];
  const copy = CATEGORY_LETTER_COPY_MAP[category];

  if (!metadata || !copy) {
    return defaultLetterTemplate(companyName, recipientName);
  }

  const monthlyPrice = formatPrice(metadata.monthlyPrice);

  return `Dear ${recipientName},

${copy.openingContext}

My name's Stuart and I run a small software and web development business based in Wilnecote.

${copy.websiteReason}

To support newly registered businesses in the area, we're offering a professional website for £${metadata.price} to businesses within their first three months of trading (1/4 of our normal price).

Please note: To make sure every project gets the time and attention it deserves, we limit the number of these websites we take on each month.

[Offer Card]

The website would be professionally designed, mobile-friendly, fully managed and include a full year of hosting at no extra cost.

There's no hard sell and absolutely no obligation. If you'd like to have a friendly chat about your plans, or if you think I might be able to help with your online presence or creating software for your business, feel free to call, email, or visit our website at www.edgewaysdigital.com.

Either way, I wish you every success with your new business.`;
}

/**
 * Backwards-compatible map in case existing code expects categoryLetterTemplates[category](...).
 */
export const categoryLetterTemplates: Record<
  string,
  (companyName: string, recipientName: string) => string
> = Object.keys(CATEGORY_METADATA_MAP).reduce((templates, category) => {
  templates[category] = (companyName: string, recipientName: string) =>
    generateCategoryLetterTemplate(category, companyName, recipientName);

  return templates;
}, {} as Record<string, (companyName: string, recipientName: string) => string>);

/**
 * Returns the tailored letter template body based on category.
 */
export function getLetterTemplate(
  category: string,
  companyName: string,
  recipientGreetingName: string = "Business Owner"
): string {
  const cleanCompanyName = toProperCase(companyName);

  if (CATEGORY_METADATA_MAP[category] && CATEGORY_LETTER_COPY_MAP[category]) {
    return generateCategoryLetterTemplate(category, cleanCompanyName, recipientGreetingName);
  }

  return defaultLetterTemplate(cleanCompanyName, recipientGreetingName);
}