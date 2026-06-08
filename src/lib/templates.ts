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
    price: 450,
    monthlyPrice: 37.50,
    wasPrice: 1800,
    pitchTitle: "Polished Credibility Website Offer"
  },
  "Health & Wellness": {
    category: "Health & Wellness",
    potentialValue: "High",
    likelyNeeds: ["Booking systems", "Websites"],
    futureNeeds: ["Membership management", "Client records"],
    price: 400,
    monthlyPrice: 33,
    wasPrice: 1600,
    pitchTitle: "Booking & Information Website Offer"
  },
  "Hospitality & Food": {
    category: "Hospitality & Food",
    potentialValue: "Medium",
    likelyNeeds: ["Websites", "Online ordering"],
    futureNeeds: ["Booking systems"],
    price: 350,
    monthlyPrice: 29,
    wasPrice: 1400,
    pitchTitle: "Menu & Reservation Website Offer"
  },
  "Retail & Ecommerce": {
    category: "Retail & Ecommerce",
    potentialValue: "High",
    likelyNeeds: ["Ecommerce", "Websites"],
    futureNeeds: ["Stock systems", "Integrations"],
    price: 450,
    monthlyPrice: 37.50,
    wasPrice: 1800,
    pitchTitle: "Ecommerce Starter Website Offer"
  },
  "Property & Construction": {
    category: "Property & Construction",
    potentialValue: "Very High",
    likelyNeeds: ["Portals", "Websites"],
    futureNeeds: ["CRM", "Workflow automation"],
    price: 500,
    monthlyPrice: 41.50,
    wasPrice: 2000,
    pitchTitle: "Property Showcase Website Offer"
  },
  "Manufacturing & Engineering": {
    category: "Manufacturing & Engineering",
    potentialValue: "Very High",
    likelyNeeds: ["Quoting systems", "Websites"],
    futureNeeds: ["Production tracking", "Internal software"],
    price: 600,
    monthlyPrice: 50,
    wasPrice: 2400,
    pitchTitle: "Technical Capability Website Offer"
  },
  "Transport & Logistics": {
    category: "Transport & Logistics",
    potentialValue: "High",
    likelyNeeds: ["Tracking", "Scheduling"],
    futureNeeds: ["Fleet management", "Websites"],
    price: 450,
    monthlyPrice: 37.50,
    wasPrice: 1800,
    pitchTitle: "Showcase & Operations Website Offer"
  },
  "Education & Training": {
    category: "Education & Training",
    potentialValue: "High",
    likelyNeeds: ["Booking", "Websites"],
    futureNeeds: ["LMS", "Membership"],
    price: 400,
    monthlyPrice: 33,
    wasPrice: 1600,
    pitchTitle: "Training & Booking Website Offer"
  },
  "Creative & Media": {
    category: "Creative & Media",
    potentialValue: "Medium",
    likelyNeeds: ["Portfolio sites", "Websites"],
    futureNeeds: ["Client systems"],
    price: 350,
    monthlyPrice: 29,
    wasPrice: 1400,
    pitchTitle: "High-Impact Portfolio Website Offer"
  },
  "Technology": {
    category: "Technology",
    potentialValue: "High",
    likelyNeeds: ["Development partnerships", "Websites"],
    futureNeeds: ["Specialist projects"],
    price: 500,
    monthlyPrice: 41.50,
    wasPrice: 2000,
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

/**
 * Generates the default introduction letter template for local businesses.
 */
export const defaultLetterTemplate = (companyName: string, recipientName: string = "Business Owner") => `Dear ${recipientName},

I noticed that you've recently started a new business and just wanted to introduce myself.

My name's Stuart and I run a small software and web development business based in Wilnecote.

My main focus is software development, but I also enjoy helping local businesses get off to a good start online. To support newly registered businesses in the area, we're offering a professional website for £300 to businesses within their first three months of trading (1/4 of our normal price). 

Please note: To make sure every project gets the time and attention it deserves, we limit the number of these websites we take on each month.

[Offer Card]


The website would be professionally designed, mobile-friendly, fully managed and include a full year of hosting at no extra cost.

There's no hard sell and absolutely no obligation. If you'd like to have a friendly chat about your plans, or if you think I might be able to help with your online presence or creating software for your business, feel free to call, email, or visit our website.

Either way, I wish you every success with your new business.`;

// Tailored Letter Templates by Category (Humble, Respectful, Web-First Tone)
export const categoryLetterTemplates: Record<string, (companyName: string, recipientName: string) => string> = {
  "Local Trades": (companyName: string, recipientName: string) => `Dear ${recipientName},

Congratulations on starting ${companyName}! I noticed your new business registration and wanted to introduce myself.

My name's Stuart and I run a small software and web development business based in Wilnecote.

I know how demanding starting a new trade business can be, and you certainly know your trade better than anyone. I simply want to make the online side of things as easy as possible. To support local trades starting out, we're offering a clean, professional business starter website for £300 (which is 1/4 of our normal price).

[Offer Card]

We focus on building a solid website first to give you a professional presence. Later on, as your business establishes itself, we can easily add other tools to the site if you ever need them—such as a Google Business Profile setup, professional business email, or online quote request forms.

There's no hard sell and absolutely no obligation. If you'd like to have a friendly chat about setting up a website, feel free to call, email, or visit our website.

Either way, I wish you every success with your new business.`,

  "Professional Services": (companyName: string, recipientName: string) => `Dear ${recipientName},

Congratulations on starting ${companyName}! I noticed your new practice registration and wanted to introduce myself.

My name's Stuart and I run a small software and web development business based in Wilnecote.

In professional services, having a polished online presence is a key part of establishing credibility from day one. To support new firms in our area, we are offering a professional credibility website for £450 (which is 1/4 of our normal price). 

[Offer Card]

Our goal is simply to build you a high-quality website that represents your business beautifully. If you choose to expand your digital setup in the future, we can easily add features like client portals, online appointment scheduling, or document workflows to the site as your business grows.

There's no hard sell and absolutely no obligation. If you'd like to have a friendly chat about your website plans, feel free to call, email, or visit our website.

I wish you the very best with your new firm.`,

  "Health & Wellness": (companyName: string, recipientName: string) => `Dear ${recipientName},

Congratulations on starting ${companyName}! I noticed your new business registration and wanted to introduce myself.

My name's Stuart and I run a small software and web development business based in Wilnecote.

When launching in the health and wellness sector, making it straightforward for clients to find your details and get in touch is essential. To support your launch, we are offering a custom information and booking website for £400 (which is 1/4 of our normal price). 

[Offer Card]

Our initial focus is purely on getting you set up with a professional, easy-to-use website. If you ever need them down the line, we can easily expand the site to include features like membership portals, client record systems, or recurring booking tools.

There's no hard sell and absolutely no obligation. If you'd like to have a friendly chat about your website, feel free to call, email, or visit our website.

I wish you every success with your new practice.`,

  "Hospitality & Food": (companyName: string, recipientName: string) => `Dear ${recipientName},

Congratulations on starting ${companyName}! I noticed your new venture and wanted to introduce myself.

My name's Stuart and I run a small software and web development business based in Wilnecote.

In hospitality, having a clear online menu or landing page is a great way to welcome customers. To help you get started, we are offering a custom menu and reservation website for £350 (which is 1/4 of our normal price). 

[Offer Card]

We focus on building a professional showcase website for your business first. If you decide to add other services later, we can easily integrate commission-free online ordering, reservation systems, or event bookings directly into your website.

There's no hard sell and absolutely no obligation. If you'd like to have a friendly chat about your website, feel free to call, email, or visit our website.

I wish you every success with your new opening.`,

  "Retail & Ecommerce": (companyName: string, recipientName: string) => `Dear ${recipientName},

Congratulations on starting ${companyName}! I noticed your new retail business and wanted to introduce myself.

My name's Stuart and I run a small software and web development business based in Wilnecote.

To help you establish your new store online, we are offering an ecommerce starter website for £450 (which is 1/4 of our normal price). This provides a polished online storefront where you can showcase products and accept secure payments from day one.

[Offer Card]

We start with a clean online shop to get you selling. As your sales and inventory grow, we can add features like automated stock sync, wholesale portals, or marketplace integrations later if you ever need them.

There's no hard sell and absolutely no obligation. If you'd like to have a friendly chat about setting up your online shop, feel free to call, email, or visit our website.

I wish you all the best with your new store.`,

  "Property & Construction": (companyName: string, recipientName: string) => `Dear ${recipientName},

Congratulations on starting ${companyName}! I noticed your new business registration and wanted to introduce myself.

My name's Stuart and I run a small software and web development business based in Wilnecote.

For property and construction businesses, showcasing your listings or past builds online is a great way to build trust. To help you launch, we are offering a property showcase website for £500 (which is 1/4 of our normal price). 

[Offer Card]

Our goal is to deliver a high-quality showcase site to get your brand established. As your portfolio grows, we can easily add advanced features like landlord/tenant portals, CRM integrations, or project tracking tools to your website.

There's no hard sell and absolutely no obligation. If you'd like to have a friendly chat, feel free to call, email, or visit our website.

I wish you every success with your new business.`,

  "Manufacturing & Engineering": (companyName: string, recipientName: string) => `Dear ${recipientName},

Congratulations on starting ${companyName}! I noticed your new business registration and wanted to introduce myself.

My name's Stuart and I run a small software and web development business based in Wilnecote.

For engineering and manufacturing firms, presenting your technical capabilities clearly online is key to attracting industrial partners. We are offering a technical capability and info website for £600 (which is 1/4 of our normal price) to establish your digital presence.

[Offer Card]

We focus on building a robust capability website first. Down the line, if you ever need to automate processes, we can easily build custom quoting engines, order trackers, or internal workflow tools and connect them to your site.

There's no hard sell and absolutely no obligation. If you'd like to have a friendly chat, feel free to call, email, or visit our website.

I wish you the very best with your new firm.`,

  "Transport & Logistics": (companyName: string, recipientName: string) => `Dear ${recipientName},

Congratulations on starting ${companyName}! I noticed your new transport business and wanted to introduce myself.

My name's Stuart and I run a small software and web development business based in Wilnecote.

To help your new logistics or transport business establish a professional presence, we are offering a transport showcase and operations query website for £450 (which is 1/4 of our normal price) to capture service requests and inquiries.

[Offer Card]

Our priority is getting you set up with a professional website. As your operations expand, we can easily add operational features—such as shipment tracking forms, driver schedules, or fleet databases—to your site in the future.

There's no hard sell and absolutely no obligation. If you'd like to have a friendly chat about your website, feel free to call, email, or visit our website.

I wish you every success with your new operations.`,

  "Education & Training": (companyName: string, recipientName: string) => `Dear ${recipientName},

Congratulations on starting ${companyName}! I noticed your new training/education venture and wanted to introduce myself.

My name's Stuart and I run a small software and web development business based in Wilnecote.

For education, coaching, and training businesses, a clear website is a great way to present your courses or booking options. We are offering a training and booking website for £400 (which is 1/4 of our normal price) to help you get started.

[Offer Card]

We start with a professional info site to get you launched. If you choose to expand your digital offerings in the future, we can add learning portals, class schedules, or online student modules later as you grow.

There's no hard sell and absolutely no obligation. If you'd like to have a friendly chat, feel free to call, email, or visit our website.

I wish you the very best with your new venture.`,

  "Creative & Media": (companyName: string, recipientName: string) => `Dear ${recipientName},

Congratulations on starting ${companyName}! I noticed your new creative venture and wanted to introduce myself.

My name's Stuart and I run a small software and web development business based in Wilnecote.

In creative and media sectors, your website is the perfect canvas to display your projects. To help you launch, we are offering a high-impact portfolio website for £350 (which is 1/4 of our normal price) to showcase your work in style.

[Offer Card]

We focus on building a beautiful portfolio site first. As your client list grows, we can add tools like client proofing galleries, project delivery portals, or automated billing forms later on.

There's no hard sell and absolutely no obligation. If you'd like to have a friendly chat, feel free to call, email, or visit our website.

I wish you every success with your new studio.`,

  "Technology": (companyName: string, recipientName: string) => `Dear ${recipientName},

Congratulations on starting ${companyName}! As a fellow technology business in the local area, I wanted to introduce myself.

My name's Stuart and I run a small software and web development business based in Wilnecote.

To help you establish local presence and showcase your technical capabilities, we are offering a professional technical showcase website for £500 (which is 1/4 of our normal price).

[Offer Card]

Our goal is simply to build you a clean, professional website. If you ever need integration assistance, custom API setups, or specialist software engineering partnerships in the future, we would be delighted to discuss them as your business grows.

There's no hard sell and absolutely no obligation. If you'd like to have a friendly chat, feel free to call, email, or visit our website.

I wish you every success with your tech venture.`,

  "Other Local Services": (companyName: string, recipientName: string) => `Dear ${recipientName},

Congratulations on starting ${companyName}! I noticed your new business and wanted to introduce myself.

My name's Stuart and I run a small software and web development business based in Wilnecote.

To help your new service business get off to a great start, we are offering a professional business starter website for £300 (which is 1/4 of our normal price) to help clients find you and get in touch.

[Offer Card]

We focus on delivering a high-quality website first. If you want to expand your setup later on, we can easily add features like Google Business Profile registrations, professional email addresses, or booking inquiry forms as your business scales.

There's no hard sell and absolutely no obligation. If you'd like to have a friendly chat about your website, feel free to call, email, or visit our website.

Either way, I wish you every success with your new business.`
};

/**
 * Converts a string to proper title case (e.g. "EDGEWAYS DIGITAL LIMITED" to "Edgeways Digital Limited").
 */
export function toProperCase(str: string): string {
  if (!str) return "";
  return str.toLowerCase().replace(/(^|\s)\S/g, l => l.toUpperCase());
}

/**
 * Returns the tailored letter template body based on category.
 */
export function getLetterTemplate(category: string, companyName: string, recipientGreetingName: string = "Business Owner"): string {
  const cleanCompanyName = toProperCase(companyName);
  const templateFn = categoryLetterTemplates[category];
  if (templateFn) {
    return templateFn(cleanCompanyName, recipientGreetingName);
  }
  return defaultLetterTemplate(cleanCompanyName, recipientGreetingName);
}
