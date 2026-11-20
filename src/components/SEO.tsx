import { useEffect } from "react";

export interface FAQItem {
  question: string;
  answer: string;
}

export interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  canonical?: string;
  ogType?: "website" | "article" | "product";
  ogImage?: string;
  // Dynamic flags to inject predefined high-value schemas
  includeOrganization?: boolean;
  includeWebSite?: boolean;
  includeProductRating?: boolean;
  faqs?: FAQItem[];
  // Fallback / custom schemas
  customSchemas?: any[];
}

// Helper to update or create meta tags dynamically
function updateMetaTag(attributeName: string, attributeValue: string, content: string) {
  let element = document.querySelector(`meta[${attributeName}="${attributeValue}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attributeName, attributeValue);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

// Helper to update or create link tags dynamically
function updateLinkTag(rel: string, href: string) {
  let element = document.querySelector(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
}

// Schema generators for technical SEO microdata structures
export const getOrgSchema = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "EZSignNow",
  "url": "https://www.ezsignnow.com",
  "logo": "https://www.ezsignnow.com/favicon.svg",
  "description": "Secure, fast, and legally binding e-signature platform that scales with your business.",
  "sameAs": [
    "https://twitter.com/ezsignnow",
    "https://www.linkedin.com/company/ezsignnow"
  ]
});

export const getWebSiteSchema = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "EZSignNow",
  "url": "https://www.ezsignnow.com",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://www.ezsignnow.com/blog?search={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
});

// No aggregateRating here: Google treats review markup without real,
// verifiable reviews as spam and can penalize the whole site.
export const getProductSchema = () => ({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "EZSignNow",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "url": "https://www.ezsignnow.com/",
  "image": "https://www.ezsignnow.com/favicon.svg",
  "description": "Free forever for personal use. Electronic signatures with signing order, audit certificates and PDF tools; business plans from $4 per sender.",
  "offers": [
    {
      "@type": "Offer",
      "name": "Personal",
      "price": "0",
      "priceCurrency": "USD",
      "url": "https://www.ezsignnow.com/#pricing"
    },
    {
      "@type": "Offer",
      "name": "Small Business",
      "price": "5.00",
      "priceCurrency": "USD",
      "url": "https://www.ezsignnow.com/#pricing"
    }
  ]
});

export const getFAQSchema = (faqs: FAQItem[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faqs.map((faq) => ({
    "@type": "Question",
    "name": faq.question,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": faq.answer
    }
  }))
});

export function SEO({
  title,
  description,
  keywords,
  canonical,
  ogType = "website",
  ogImage,
  includeOrganization = false,
  includeWebSite = false,
  includeProductRating = false,
  faqs,
  customSchemas = []
}: SEOProps) {
  // Aggregate all active schemas to inject
  const schemas: any[] = [...customSchemas];

  if (includeOrganization) {
    schemas.push(getOrgSchema());
  }

  if (includeWebSite) {
    schemas.push(getWebSiteSchema());
  }

  if (includeProductRating) {
    schemas.push(getProductSchema());
  }

  if (faqs && faqs.length > 0) {
    schemas.push(getFAQSchema(faqs));
  }

  const schemasString = JSON.stringify(schemas);

  useEffect(() => {
    // 1. Title Injection
    if (title) {
      document.title = title;
    }

    // 2. Meta Tag Injection
    if (description) {
      updateMetaTag("name", "description", description);
      updateMetaTag("property", "og:description", description);
      updateMetaTag("name", "twitter:description", description);
    }

    if (keywords) {
      updateMetaTag("name", "keywords", keywords);
    } else {
      // Remove meta keywords if none provided to keep it clean
      const existingKeywords = document.querySelector("meta[name='keywords']");
      if (existingKeywords) existingKeywords.remove();
    }

    // 3. Canonical Link Injection
    // Canonical is always the www host with no query string or hash, so
    // ezsignnow.com and www.ezsignnow.com aren't indexed as duplicates.
    const canonicalUrl = canonical || `https://www.ezsignnow.com${window.location.pathname}`;
    updateLinkTag("canonical", canonicalUrl);
    updateMetaTag("property", "og:url", canonicalUrl);

    // 4. Social & Open Graph Type / Title / Image Injection
    if (title) {
      updateMetaTag("property", "og:title", title);
      updateMetaTag("name", "twitter:title", title);
    }

    updateMetaTag("property", "og:type", ogType);

    const imageUrl = ogImage || "https://www.ezsignnow.com/assets/hero-esign.jpg";
    updateMetaTag("property", "og:image", imageUrl);
    updateMetaTag("name", "twitter:image", imageUrl);
    updateMetaTag("name", "twitter:card", "summary_large_image");

    // 5. JSON-LD Microdata Script Injection
    // Clean up old scripts to avoid duplicate schemas during client routing
    const oldScripts = document.querySelectorAll("script.seo-jsonld-schema");
    oldScripts.forEach((script) => script.remove());

    const activeSchemas = JSON.parse(schemasString);
    if (activeSchemas.length > 0) {
      activeSchemas.forEach((schema: any) => {
        const script = document.createElement("script");
        script.type = "application/ld+json";
        script.className = "seo-jsonld-schema";
        script.text = JSON.stringify(schema);
        document.head.appendChild(script);
      });
    }

    return () => {
      // Cleanup schemas on unmount to keep head clean
      const scriptsToRemove = document.querySelectorAll("script.seo-jsonld-schema");
      scriptsToRemove.forEach((script) => script.remove());
    };
  }, [title, description, keywords, canonical, ogType, ogImage, schemasString]);

  // Non-rendering component
  return null;
}



