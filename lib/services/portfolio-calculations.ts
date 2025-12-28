/**
 * Portfolio Calculations Service
 *
 * This service contains all the calculation logic for the portfolio analysis page.
 * It provides pure functions for calculating various real estate investment metrics.
 */

export interface PropertyData {
  address: string;
  state?: string;
  marketValue: number;
  equity: number;
  debt: number;
  equityPercent: number;
  rent: number;
  hoa: number;
  reTax: number;
  insurance: number;
  otherExpenses: number;
  interestRate: number;
  debtService: number;
  noiMonthly: number;
  noiYearly: number;
  cashflow: number;
  returnPercent: number;
  isNew?: boolean;
}

export interface PortfolioTotals {
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

export interface PortfolioMetrics {
  totalRentAnnual: number;
  totalRentMonthly: number;
  activeUnits: number;
  rentPerUnitPerMonth: number;
  cocReturn: number;
  leverage: number;
  dscr: number;
  leveredCashYield: number;
  unleveredCashYield: number;
  capRate: number;
  grm: number;
  opexRatio: number;
  propertyCount: number;
  avgPropertyValue: number;
  avgRentPerProperty: number;
}

/**
 * Calculate monthly debt service (mortgage payment) using standard amortization formula
 * Assumes a 30-year (360 months) fixed-rate mortgage
 *
 * @param debt - Total loan amount
 * @param interestRate - Annual interest rate as a percentage (e.g., 6.5 for 6.5%)
 * @returns Monthly payment amount
 */
export const calculateDebtService = (
  debt: number,
  interestRate: number
): number => {
  const safeDebt = debt ?? 0;
  const safeInterestRate = interestRate ?? 0;

  if (safeDebt === 0 || safeInterestRate === 0) return 0;

  const monthlyRate = safeInterestRate / 100 / 12;
  const numPayments = 360; // 30-year mortgage

  return (
    (safeDebt * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1)
  );
};

/**
 * Recalculate all derived fields for a property based on its input values
 * This ensures consistency across all calculated metrics
 *
 * @param property - Property with updated input values
 * @returns Property with all calculated fields updated
 */
export const recalculateProperty = (property: PropertyData): PropertyData => {
  const marketValue = property.marketValue ?? 0;
  const debt = property.debt ?? 0;
  const rent = property.rent ?? 0;
  const hoa = property.hoa ?? 0;
  const reTax = property.reTax ?? 0;
  const insurance = property.insurance ?? 0;
  const otherExpenses = property.otherExpenses ?? 0;
  const interestRate = property.interestRate ?? 0;

  // Calculate equity and equity percentage
  const equity = marketValue - debt;
  const equityPercent = marketValue > 0 ? (equity / marketValue) * 100 : 0;

  // Calculate debt service (monthly mortgage payment)
  const debtService = calculateDebtService(debt, interestRate);

  // Calculate Net Operating Income (NOI)
  const noiMonthly = rent - hoa - reTax - insurance - otherExpenses;
  const noiYearly = noiMonthly * 12;

  // Calculate cash flow (NOI minus debt service)
  const cashflow = noiMonthly - debtService;

  // Calculate return percentage (Cash-on-Cash return)
  const returnPercent = equity > 0 ? ((cashflow * 12) / equity) * 100 : 0;

  return {
    ...property,
    marketValue,
    debt,
    rent,
    hoa,
    reTax,
    insurance,
    otherExpenses,
    interestRate,
    equity,
    equityPercent,
    debtService,
    noiMonthly,
    noiYearly,
    cashflow,
    returnPercent,
  };
};

/**
 * Calculate portfolio-wide totals from an array of properties
 *
 * @param properties - Array of property data
 * @returns Object containing all portfolio totals
 */
export const calculatePortfolioTotals = (
  properties: PropertyData[]
): PortfolioTotals => {
  return {
    noiMonthly: properties.reduce((sum, p) => sum + (p.noiMonthly ?? 0), 0),
    noiYearly: properties.reduce((sum, p) => sum + (p.noiYearly ?? 0), 0),
    debtService: properties.reduce((sum, p) => sum + (p.debtService ?? 0), 0),
    cashflowMonthly: properties.reduce((sum, p) => sum + (p.cashflow ?? 0), 0),
    cashflowYearly: properties.reduce(
      (sum, p) => sum + (p.cashflow ?? 0) * 12,
      0
    ),
    totalAssets: properties.reduce((sum, p) => sum + (p.marketValue ?? 0), 0),
    totalDebt: properties.reduce((sum, p) => sum + (p.debt ?? 0), 0),
    totalEquity: properties.reduce((sum, p) => sum + (p.equity ?? 0), 0),
    totalExpensesMonthly: properties.reduce(
      (sum, p) =>
        sum +
        (p.hoa ?? 0) +
        (p.reTax ?? 0) +
        (p.insurance ?? 0) +
        (p.otherExpenses ?? 0),
      0
    ),
  };
};

/**
 * Calculate advanced portfolio metrics based on totals
 *
 * @param properties - Array of property data
 * @param totals - Pre-calculated portfolio totals
 * @returns Object containing all portfolio metrics
 */
export const calculatePortfolioMetrics = (
  properties: PropertyData[],
  totals: PortfolioTotals
): PortfolioMetrics => {
  // Rental income calculations
  const totalRentAnnual = properties.reduce(
    (sum, p) => sum + (p.rent ?? 0) * 12,
    0
  );
  const totalRentMonthly = properties.reduce(
    (sum, p) => sum + (p.rent ?? 0),
    0
  );
  const activeUnits = properties.filter((p) => (p.rent ?? 0) > 0).length;
  const rentPerUnitPerMonth =
    activeUnits > 0 ? totalRentMonthly / activeUnits : 0;

  // Return metrics
  const cocReturn =
    totals.totalEquity > 0
      ? (totals.cashflowYearly / totals.totalEquity) * 100
      : 0;
  const leveredCashYield = cocReturn; // Same calculation as CoC Return
  const unleveredCashYield =
    totals.totalAssets > 0 ? (totals.noiYearly / totals.totalAssets) * 100 : 0;

  // Leverage and debt coverage
  const leverage =
    totals.totalAssets > 0 ? (totals.totalDebt / totals.totalAssets) * 100 : 0;
  const dscr =
    totals.debtService > 0 ? totals.noiYearly / (totals.debtService * 12) : 0;

  // Valuation metrics
  const capRate =
    totals.totalAssets > 0 ? (totals.noiYearly / totals.totalAssets) * 100 : 0;
  const grm = totalRentAnnual > 0 ? totals.totalAssets / totalRentAnnual : 0;

  // Efficiency metrics
  const opexRatio =
    totalRentAnnual > 0
      ? ((totals.totalExpensesMonthly * 12) / totalRentAnnual) * 100
      : 0;

  // Portfolio size metrics
  const propertyCount = properties.length;
  const avgPropertyValue =
    propertyCount > 0 ? totals.totalAssets / propertyCount : 0;
  const avgRentPerProperty =
    propertyCount > 0 ? totalRentMonthly / propertyCount : 0;

  return {
    totalRentAnnual,
    totalRentMonthly,
    activeUnits,
    rentPerUnitPerMonth,
    cocReturn,
    leverage,
    dscr,
    leveredCashYield,
    unleveredCashYield,
    capRate,
    grm,
    opexRatio,
    propertyCount,
    avgPropertyValue,
    avgRentPerProperty,
  };
};

/**
 * Create a new empty property with default values
 *
 * @param address - Optional address for the property
 * @returns A new property with all fields initialized to zero
 */
export const createEmptyProperty = (
  address: string = "New Property"
): PropertyData => {
  return {
    address,
    marketValue: 0,
    equity: 0,
    debt: 0,
    equityPercent: 0,
    rent: 0,
    hoa: 0,
    reTax: 0,
    insurance: 0,
    otherExpenses: 0,
    interestRate: 0,
    debtService: 0,
    noiMonthly: 0,
    noiYearly: 0,
    cashflow: 0,
    returnPercent: 0,
    isNew: true,
  };
};
