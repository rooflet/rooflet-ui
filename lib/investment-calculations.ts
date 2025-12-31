/**
 * Investment calculation utilities for real estate analysis
 */

export interface FinancingStrategy {
  downPaymentPercent: number; // Percentage (e.g., 20 for 20%)
  interestRate: number; // Annual interest rate percentage (e.g., 6 for 6%)
  loanTermYears: number; // Loan term in years (e.g., 30)
}

export interface PropertyInvestmentMetrics {
  purchasePrice: number;
  expectedRent: number;
  monthlyMortgagePayment: number;
  downPayment: number;
  loanAmount: number;
  monthlyHoa?: number;
  monthlyPropertyTax?: number;
  monthlyInsurance?: number;
  totalMonthlyExpenses: number;
  monthlyNetIncome: number;
  annualNetIncome: number;
  cashOnCashReturn: number; // Percentage
  meets1PercentRule: boolean;
}

/**
 * Calculate monthly mortgage payment using standard amortization formula
 * P = L[c(1 + c)^n]/[(1 + c)^n - 1]
 * where:
 * P = monthly payment
 * L = loan amount
 * c = monthly interest rate (annual rate / 12)
 * n = number of payments (years * 12)
 */
export function calculateMonthlyMortgagePayment(
  loanAmount: number,
  annualInterestRate: number, // percentage (e.g., 6 for 6%)
  loanTermYears: number
): number {
  if (loanAmount <= 0) return 0;
  if (annualInterestRate <= 0) return loanAmount / (loanTermYears * 12);

  const monthlyRate = annualInterestRate / 100 / 12;
  const numberOfPayments = loanTermYears * 12;

  const payment =
    (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
    (Math.pow(1 + monthlyRate, numberOfPayments) - 1);

  return payment;
}

/**
 * Calculate the 1% rule
 * The 1% rule states that monthly rent should be at least 1% of purchase price
 */
export function meets1PercentRule(
  monthlyRent: number,
  purchasePrice: number
): boolean {
  if (purchasePrice <= 0) return false;
  const onePercent = purchasePrice * 0.01;
  return monthlyRent >= onePercent;
}

/**
 * Calculate Cash on Cash Return
 * CoC = (Annual Pre-Tax Cash Flow / Total Cash Invested) * 100
 * Annual Pre-Tax Cash Flow = Annual Rent - Annual Expenses
 * Total Cash Invested = Down Payment + Closing Costs (we'll assume 3% closing costs)
 */
export function calculateCashOnCashReturn(
  annualNetIncome: number,
  downPayment: number,
  closingCostsPercent: number = 3 // Default 3% of purchase price
): number {
  if (downPayment <= 0) return 0;

  // Closing costs will be factored into total cash invested
  const totalCashInvested = downPayment;
  const cocReturn = (annualNetIncome / totalCashInvested) * 100;

  return cocReturn;
}

/**
 * Calculate comprehensive investment metrics for a property
 */
export function calculateInvestmentMetrics(
  purchasePrice: number,
  expectedRent: number,
  financing: FinancingStrategy,
  monthlyHoa: number = 0,
  monthlyPropertyTax: number = 0,
  monthlyInsurance: number = 0
): PropertyInvestmentMetrics {
  // Calculate down payment and loan amount
  const downPayment = purchasePrice * (financing.downPaymentPercent / 100);
  const loanAmount = purchasePrice - downPayment;

  // Calculate monthly mortgage payment
  const monthlyMortgagePayment = calculateMonthlyMortgagePayment(
    loanAmount,
    financing.interestRate,
    financing.loanTermYears
  );

  // Calculate total monthly expenses (PITI + HOA)
  const totalMonthlyExpenses =
    monthlyMortgagePayment + monthlyHoa + monthlyPropertyTax + monthlyInsurance;

  // Calculate monthly and annual net income
  const monthlyNetIncome = expectedRent - totalMonthlyExpenses;
  const annualNetIncome = monthlyNetIncome * 12;

  // Calculate metrics
  const cashOnCashReturn = calculateCashOnCashReturn(
    annualNetIncome,
    downPayment
  );
  const meets1Percent = meets1PercentRule(expectedRent, purchasePrice);

  return {
    purchasePrice,
    expectedRent,
    monthlyMortgagePayment,
    downPayment,
    loanAmount,
    monthlyHoa,
    monthlyPropertyTax,
    monthlyInsurance,
    totalMonthlyExpenses,
    monthlyNetIncome,
    annualNetIncome,
    cashOnCashReturn,
    meets1PercentRule: meets1Percent,
  };
}

/**
 * Property tax rates by state (annual percentage)
 * Based on 2024-2025 average effective property tax rates
 */
const STATE_PROPERTY_TAX_RATES: Record<string, number> = {
  // Highest tax states
  NJ: 0.0223,
  CT: 0.0197,
  NH: 0.0196,
  NY: 0.0165,
  IL: 0.0202,
  VT: 0.0182,
  TX: 0.0172,
  WI: 0.0165,
  RI: 0.0152,
  NE: 0.0154,

  // High tax states
  MI: 0.0143,
  OH: 0.0141,
  PA: 0.0138,
  ME: 0.013,
  IA: 0.0138,
  KS: 0.0133,
  MA: 0.0112,
  MN: 0.0108,
  AK: 0.0107,
  SD: 0.0121,

  // Moderate tax states
  OR: 0.0091,
  MD: 0.0107,
  FL: 0.0089,
  GA: 0.0088,
  NC: 0.0078,
  VA: 0.008,
  MO: 0.0096,
  IN: 0.0085,
  WA: 0.0092,
  MT: 0.0082,

  // Lower tax states
  CA: 0.0073,
  AZ: 0.0062,
  NV: 0.0056,
  CO: 0.0051,
  UT: 0.0057,
  NM: 0.0079,
  ID: 0.0063,
  TN: 0.0068,
  SC: 0.0055,
  OK: 0.0087,

  // Lowest tax states
  AL: 0.0041,
  WV: 0.0058,
  WY: 0.0056,
  LA: 0.0055,
  HI: 0.0028,
  DE: 0.0057,
  AR: 0.0061,
  MS: 0.0079,
  KY: 0.0086,
  DC: 0.0056,
};

/**
 * Estimate monthly property tax based on property value and state
 * Falls back to national average of 1.1% if state is not found
 */
export function estimateMonthlyPropertyTax(
  propertyValue: number,
  state?: string
): number {
  const annualTaxRate =
    state && STATE_PROPERTY_TAX_RATES[state.toUpperCase()]
      ? STATE_PROPERTY_TAX_RATES[state.toUpperCase()]
      : 0.011; // National average fallback

  return (propertyValue * annualTaxRate) / 12;
}

/**
 * Estimate monthly insurance based on property value
 * Based on industry averages:
 * - Under $200k: ~0.5% annually ($83/mo per $100k)
 * - $200k-$500k: ~0.35% annually ($58/mo per $100k)
 * - Over $500k: ~0.25% annually ($42/mo per $100k)
 */
export function estimateMonthlyInsurance(propertyValue: number): number {
  let annualRate: number;

  if (propertyValue < 200000) {
    annualRate = 0.005; // 0.5% for lower-value homes
  } else if (propertyValue < 500000) {
    annualRate = 0.0035; // 0.35% for mid-range homes
  } else {
    annualRate = 0.0025; // 0.25% for higher-value homes
  }

  return (propertyValue * annualRate) / 12;
}

/**
 * Format currency values
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format percentage values
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Calculate the 2% rule
 * The 2% rule states that monthly rent should be at least 2% of purchase price
 * This is a more aggressive metric than the 1% rule
 */
export function meets2PercentRule(
  monthlyRent: number,
  purchasePrice: number
): boolean {
  if (purchasePrice <= 0) return false;
  const twoPercent = purchasePrice * 0.02;
  return monthlyRent >= twoPercent;
}

/**
 * Calculate the 50% rule
 * The 50% rule estimates that operating expenses will be ~50% of rental income
 * Returns true if net operating income (after 50% expenses) is positive
 */
export function meets50PercentRule(
  monthlyRent: number,
  monthlyMortgagePayment: number
): boolean {
  const estimatedExpenses = monthlyRent * 0.5;
  const netOperatingIncome = monthlyRent - estimatedExpenses;
  return netOperatingIncome > monthlyMortgagePayment;
}

/**
 * Calculate Price-to-Rent Ratio
 * Lower is better - ideal range is 1-15
 * Below 15: Generally favorable for buying
 * 15-20: Neutral
 * Above 20: Generally favorable for renting
 */
export function calculatePriceToRentRatio(
  purchasePrice: number,
  monthlyRent: number
): number {
  if (monthlyRent <= 0) return 0;
  const annualRent = monthlyRent * 12;
  return purchasePrice / annualRent;
}

/**
 * Calculate Cap Rate (Capitalization Rate)
 * Cap Rate = (Net Operating Income / Property Value) * 100
 * NOI = Annual Rent - Operating Expenses (estimated at 50% for quick calc)
 * Good cap rate varies by market but typically 4-10%
 */
export function calculateCapRate(
  purchasePrice: number,
  monthlyRent: number,
  operatingExpenseRatio: number = 0.5 // Default to 50% rule
): number {
  if (purchasePrice <= 0) return 0;
  const annualRent = monthlyRent * 12;
  const operatingExpenses = annualRent * operatingExpenseRatio;
  const noi = annualRent - operatingExpenses;
  return (noi / purchasePrice) * 100;
}

/**
 * Calculate Principal and Interest components of mortgage payment
 */
export function calculatePrincipalAndInterest(
  loanAmount: number,
  annualInterestRate: number,
  loanTermYears: number
): { principal: number; interest: number; totalPayment: number } {
  const monthlyPayment = calculateMonthlyMortgagePayment(
    loanAmount,
    annualInterestRate,
    loanTermYears
  );

  // First month's interest calculation
  const monthlyRate = annualInterestRate / 100 / 12;
  const firstMonthInterest = loanAmount * monthlyRate;
  const firstMonthPrincipal = monthlyPayment - firstMonthInterest;

  return {
    principal: firstMonthPrincipal,
    interest: firstMonthInterest,
    totalPayment: monthlyPayment,
  };
}

/**
 * Calculate Debt Service Coverage Ratio (DSCR)
 * DSCR = Net Operating Income / Annual Debt Service
 * Lenders typically want DSCR >= 1.25 (meaning NOI is 125% of debt payments)
 * > 1.25: Excellent - Strong cash flow coverage
 * 1.0-1.25: Good - Adequate coverage
 * < 1.0: Poor - Not enough income to cover debt
 */
export function calculateDSCR(
  monthlyRent: number,
  monthlyMortgagePayment: number,
  operatingExpenseRatio: number = 0.5 // Default to 50% rule
): number {
  const annualRent = monthlyRent * 12;
  const operatingExpenses = annualRent * operatingExpenseRatio;
  const noi = annualRent - operatingExpenses;
  const annualDebtService = monthlyMortgagePayment * 12;

  if (annualDebtService <= 0) return 0;
  return noi / annualDebtService;
}

/**
 * Calculate Break-Even Ratio
 * Break-Even Ratio = (Operating Expenses + Debt Service) / Gross Operating Income
 * Shows what percentage of income goes to expenses and debt
 * < 85%: Good - Provides cushion for vacancies
 * 85-100%: Acceptable - Tight but manageable
 * > 100%: Poor - Negative cash flow
 */
export function calculateBreakEvenRatio(
  monthlyRent: number,
  monthlyMortgagePayment: number,
  operatingExpenseRatio: number = 0.5
): number {
  const annualRent = monthlyRent * 12;
  const operatingExpenses = annualRent * operatingExpenseRatio;
  const annualDebtService = monthlyMortgagePayment * 12;

  if (annualRent <= 0) return 0;
  return ((operatingExpenses + annualDebtService) / annualRent) * 100;
}

/**
 * Calculate Operating Expense Ratio (OER)
 * OER = Operating Expenses / Gross Operating Income
 * Shows what percentage of income goes to operating expenses (excluding debt)
 * < 40%: Excellent efficiency
 * 40-50%: Good - Industry standard
 * > 50%: High - May indicate inefficiencies or high-expense property
 */
export function calculateOperatingExpenseRatio(
  monthlyRent: number,
  operatingExpenseRatio: number = 0.5
): number {
  return operatingExpenseRatio * 100;
}
