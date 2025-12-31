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
 * Estimate monthly property tax based on property value
 * Using average US property tax rate of ~1.1% annually
 */
export function estimateMonthlyPropertyTax(propertyValue: number): number {
  const annualTaxRate = 0.011; // 1.1% average
  return (propertyValue * annualTaxRate) / 12;
}

/**
 * Estimate monthly insurance based on property value
 * Using average of ~$1,200/year for a typical home
 */
export function estimateMonthlyInsurance(propertyValue: number): number {
  // Rough estimate: $0.35 per $1000 of home value per month
  return (propertyValue / 1000) * 0.35;
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
