# Rooflet UI

A modern property management dashboard built with Next.js, designed for landlords to manage portfolios, properties, tenants, rent collection, and expenses.

## Features

- 📊 **Dashboard Overview** - Real-time statistics and insights
- 🏠 **Property Management** - Track and manage multiple properties
- 👥 **Tenant Management** - Manage tenant information and leases
- 💰 **Rent Collection** - Track rent payments and outstanding balances
- 💸 **Expense Tracking** - Record and categorize property expenses
- 📈 **Reports** - Generate reports for properties, tenants, and expenses
- 🎯 **Portfolio Management** - Organize properties into portfolios
- 🌓 **Dark Mode** - Built-in theme support

## Tech Stack

- **Framework:** Next.js 15
- **UI Components:** Radix UI with shadcn/ui
- **Styling:** Tailwind CSS
- **State Management:** Redux Toolkit
- **Forms:** React Hook Form + Zod validation
- **Charts:** Recharts
- **Testing:** Vitest + Testing Library

## Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

## Getting Started

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/rooflet-ui.git
   cd rooflet-ui
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and configure your backend API URL.

4. **Run the development server**

   ```bash
   pnpm dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)
