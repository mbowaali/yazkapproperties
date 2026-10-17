import { MetadataRoute } from "next";
import { sql } from "@vercel/postgres";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://yazkapproperties.com";
  
  // Static pages that are always present
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: await getLatestFaqUpdate(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/properties`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.5,
    },
  ];

  // Add dynamic property pages from database
  let propertyPages: MetadataRoute.Sitemap = [];
  try {
    const { rows: units } = await sql`
      SELECT id, updated_at FROM units WHERE advertised = true
    `;
    
    propertyPages = units.map((unit: any) => ({
      url: `${baseUrl}/properties/${unit.id}`,
      lastModified: unit.updated_at || new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.85,
    }));
  } catch (error) {
    console.error("Failed to fetch units for sitemap:", error);
  }

  return [...staticPages, ...propertyPages];
}

// Get the latest FAQ update date for the FAQ page
async function getLatestFaqUpdate(): Promise<Date> {
  try {
    const { rows: faqs } = await sql`
      SELECT updated_at FROM faqs ORDER BY updated_at DESC LIMIT 1
    `;
    
    if (faqs.length > 0) {
      return new Date(faqs[0].updated_at);
    }
    return new Date();
  } catch (error) {
    console.error("Failed to fetch latest FAQ update:", error);
    return new Date();
  }
}