# Portfolio Calculations Service

A comprehensive service for calculating real estate investment portfolio metrics. This service provides pure, testable functions for all portfolio-related calculations.

## Overview

The portfolio calculations service provides:

- **Property-level calculations**: Debt service, NOI, cash flow, returns
- **Portfolio-level aggregations**: Totals across all properties
- **Advanced metrics**: Cap rate, DSCR, leverage, GRM, and more
- **Full test coverage**: 32 unit tests covering all scenarios

## Installation

```typescript
import {
  recalculateProperty,
  calculatePortfolioTotals,
  calculatePortfolioMetrics,
  createEmptyProperty,
  type PropertyData,
} from "@/lib/services/portfolio-calculations";
```

## Core Functions

### `calculateDebtService(debt: number, interestRate: number): number`

Calculates monthly mortgage payment using standard amortization formula (30-year fixed).

```typescript
const monthlyPayment = calculateDebtService(300000, 6.0);
// Returns: 1798.65
```

**Parameters:**

- `debt`: Total loan amount
- `interestRate`: Annual interest rate as percentage (e.g., 6.5 for 6.5%)

**Returns:** Monthly payment amount

---

### `recalculateProperty(property: PropertyData): PropertyData`

Recalculates all derived fields for a property based on input values.

```typescript
const property = {
  address: "123 Main St",
  marketValue: 500000,
  debt: 300000,
  rent: 3000,
  hoa: 200,
  reTax: 400,
  insurance: 150,
  otherExpenses: 100,
  interestRate: 6,
  // ... other fields initialized to 0
};

const calculated = recalculateProperty(property);
// Returns property with calculated fields:
// - equity: 200000
// - equityPercent: 40
// - debtService: 1798.65
// - noiMonthly: 2150
// - cashflow: 351.35
// - returnPercent: 2.11
```

**Calculations performed:**

- **Equity** = Market Value - Debt
- **Equity %** = (Equity / Market Value) × 100
- **Debt Service** = Monthly mortgage payment
- **NOI Monthly** = Rent - HOA - Tax - Insurance - Other Expenses
- **NOI Yearly** = NOI Monthly × 12
- **Cash Flow** = NOI Monthly - Debt Service
- **Return %** = (Cash Flow × 12 / Equity) × 100

---

### `calculatePortfolioTotals(properties: PropertyData[]): PortfolioTotals`

Aggregates totals across all properties in the portfolio.

```typescript
const totals = calculatePortfolioTotals(properties);
// Returns:
// {
//   noiMonthly: 3950,
//   noiYearly: 47400,
//   debtService: 3218.12,
//   cashflowMonthly: 731.88,
//   cashflowYearly: 8782.56,
//   totalAssets: 900000,
//   totalDebt: 550000,
//   totalEquity: 350000,
//   totalExpensesMonthly: 1550
// }
```

---

### `calculatePortfolioMetrics(properties: PropertyData[], totals: PortfolioTotals): PortfolioMetrics`

Calculates advanced portfolio-level metrics and KPIs.

```typescript
const totals = calculatePortfolioTotals(properties);
const metrics = calculatePortfolioMetrics(properties, totals);
// Returns all metrics including:
// - Rental income metrics
// - Return metrics (CoC, Cap Rate, etc.)
// - Leverage and debt coverage
// - Valuation metrics
// - Efficiency ratios
```

**Key Metrics:**

| Metric                  | Description                           | Formula                                 |
| ----------------------- | ------------------------------------- | --------------------------------------- |
| **Cash-on-Cash Return** | Annual return on equity invested      | (Annual Cash Flow / Total Equity) × 100 |
| **Cap Rate**            | Property's yield without leverage     | (NOI / Market Value) × 100              |
| **Leverage**            | Percentage of assets financed by debt | (Total Debt / Total Assets) × 100       |
| **DSCR**                | Debt Service Coverage Ratio           | NOI / Debt Service                      |
| **GRM**                 | Gross Rent Multiplier                 | Market Value / Annual Rent              |
| **OpEx Ratio**          | Operating efficiency                  | (Operating Expenses / Gross Rent) × 100 |

---

### `createEmptyProperty(address?: string): PropertyData`

Creates a new property with all fields initialized to zero.

```typescript
const newProperty = createEmptyProperty("456 Oak Ave");
// Returns property with address set and all numeric fields = 0
```

## Type Definitions

### PropertyData

```typescript
interface PropertyData {
  // Input fields (editable)
  address: string;
  marketValue: number;
  debt: number;
  rent: number;
  hoa: number;
  reTax: number;
  insurance: number;
  otherExpenses: number;
  interestRate: number;

  // Calculated fields (derived)
  equity: number;
  equityPercent: number;
  debtService: number;
  noiMonthly: number;
  noiYearly: number;
  cashflow: number;
  returnPercent: number;

  // Optional flags
  isNew?: boolean;
}
```

### PortfolioTotals

```typescript
interface PortfolioTotals {
  noiMonthly: number;
  noiYearly: number;
  debtService: number;
  cashflowMonthly: number;
  cashflowYearly: number;
  totalAssets: number;
  totalDebt: number;
  totalEquity: number;
  totalExpensesMonthly: number;
}
```

### PortfolioMetrics

```typescript
interface PortfolioMetrics {
  // Rental metrics
  totalRentAnnual: number;
  totalRentMonthly: number;
  activeUnits: number;
  rentPerUnitPerMonth: number;

  // Return metrics
  cocReturn: number;
  leveredCashYield: number;
  unleveredCashYield: number;
  capRate: number;

  // Debt metrics
  leverage: number;
  dscr: number;

  // Valuation metrics
  grm: number;

  // Efficiency metrics
  opexRatio: number;

  // Portfolio size metrics
  propertyCount: number;
  avgPropertyValue: number;
  avgRentPerProperty: number;
}
```

## Usage Example

```typescript
import {
  recalculateProperty,
  calculatePortfolioTotals,
  calculatePortfolioMetrics,
  createEmptyProperty,
} from "@/lib/services/portfolio-calculations";

// 1. Create or load properties
const property1 = createEmptyProperty("123 Main St");
property1.marketValue = 500000;
property1.debt = 300000;
property1.rent = 3000;
property1.hoa = 200;
property1.reTax = 400;
property1.insurance = 150;
property1.otherExpenses = 100;
property1.interestRate = 6;

// 2. Calculate derived fields
const calculatedProperty = recalculateProperty(property1);

// 3. Add to portfolio
const portfolio = [calculatedProperty];

// 4. Calculate portfolio totals
const totals = calculatePortfolioTotals(portfolio);

// 5. Calculate advanced metrics
const metrics = calculatePortfolioMetrics(portfolio, totals);

console.log(`Total Equity: $${totals.totalEquity.toLocaleString()}`);
console.log(`Cash-on-Cash Return: ${metrics.cocReturn.toFixed(2)}%`);
console.log(`Cap Rate: ${metrics.capRate.toFixed(2)}%`);
console.log(`DSCR: ${metrics.dscr.toFixed(2)}x`);
```

## Testing

Run the comprehensive test suite:

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with UI
pnpm test:ui
```

The service includes 32 unit tests covering:

- ✅ Debt service calculations
- ✅ Property recalculations
- ✅ Portfolio totals aggregation
- ✅ Advanced metrics calculations
- ✅ Edge cases (zero values, negative cash flow, etc.)
- ✅ Integration scenarios

## Benefits

1. **Testability**: All calculations are pure functions that can be easily tested
2. **Reusability**: Single source of truth for all portfolio calculations
3. **Maintainability**: Clear separation of concerns, easy to update formulas
4. **Type Safety**: Full TypeScript support with proper interfaces
5. **Documentation**: Well-documented with JSDoc comments and examples
6. **Performance**: Efficient calculations optimized for large portfolios

## Notes

- All calculations handle `null` and `undefined` values gracefully by treating them as 0
- Assumes 30-year (360 months) fixed-rate mortgages for debt service calculations
- Percentages are returned as numbers (e.g., 5.5 represents 5.5%, not 0.055)
- Division by zero scenarios return 0 to prevent errors
