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

## Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_ROOFLET_BACKEND_URL=http://localhost:8000
```

See `.env.example` for all available options.

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm lint:fix` - Fix ESLint issues
- `pnpm test` - Run tests
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:ui` - Run tests with UI

## Docker Deployment

Build and run with Docker Compose:

```bash
docker-compose up -d
```

The application will be available at [http://localhost:7002](http://localhost:7002)

## Project Structure

```
rooflet-ui/
├── app/              # Next.js app directory (pages and layouts)
├── components/       # React components
│   ├── ui/          # Base UI components (shadcn/ui)
│   └── ...          # Feature components
├── lib/             # Utilities and API clients
│   ├── api/         # API client functions
│   └── ...          # Helper functions
├── store/           # Redux store configuration
├── hooks/           # Custom React hooks
├── public/          # Static assets
└── nginx/           # Nginx configuration for production
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues and questions, please open an issue on GitHub.
