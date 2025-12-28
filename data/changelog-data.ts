import type { ChangelogEntry } from "@/lib/changelog";

export const APP_VERSION = "0.1.0";

export const changelogData: ChangelogEntry[] = [
  {
    version: "0.1.0",
    date: "Dec 1, 2025",
    featured: true,
    changes: [
      {
        type: "feature",
        description:
          "Initial release of Rooflet - Property management platform for real estate investors",
      },
      {
        type: "feature",
        description:
          "Property management with address validation, purchase price, market value, and debt tracking",
      },
      {
        type: "feature",
        description:
          "Tenant management with contact info, lease tracking, and rent collection",
      },
      {
        type: "feature",
        description:
          "Expense tracking with 13 categories and property assignment",
      },
      {
        type: "feature",
        description:
          "Portfolio analysis with Pro Forma calculator, NOI, cash flow, and ROI calculations",
      },
      {
        type: "feature",
        description:
          "Comprehensive reports for properties, tenants, and expenses with data visualization and PDF export",
      },
      {
        type: "feature",
        description: "Guided onboarding wizard for first-time setup",
      },
      {
        type: "feature",
        description: "Dark mode support and fully responsive mobile design",
      },
    ],
  },
];
