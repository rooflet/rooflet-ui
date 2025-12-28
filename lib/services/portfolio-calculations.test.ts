import { describe, expect, it } from "vitest";
import {
  calculateDebtService,
  calculatePortfolioMetrics,
  calculatePortfolioTotals,
  createEmptyProperty,
  recalculateProperty,
  type PropertyData,
} from "./portfolio-calculations";

describe("Portfolio Calculations Service", () => {
  describe("calculateDebtService", () => {
    it("should calculate monthly debt service correctly for a standard mortgage", () => {
      // $300,000 loan at 6% interest for 30 years
      const debtService = calculateDebtService(300000, 6);
      expect(debtService).toBeCloseTo(1798.65, 2);
    });

    it("should calculate monthly debt service for a different loan amount", () => {
      // $500,000 loan at 5.5% interest for 30 years
      const debtService = calculateDebtService(500000, 5.5);
      expect(debtService).toBeCloseTo(2838.95, 2);
    });

    it("should return 0 when debt is 0", () => {
      const debtService = calculateDebtService(0, 6);
      expect(debtService).toBe(0);
    });

    it("should return 0 when interest rate is 0", () => {
      const debtService = calculateDebtService(300000, 0);
      expect(debtService).toBe(0);
    });

    it("should handle null/undefined values gracefully", () => {
      const debtService = calculateDebtService(null as any, undefined as any);
      expect(debtService).toBe(0);
    });

    it("should calculate higher payments for higher interest rates", () => {
      const lowRate = calculateDebtService(300000, 4);
      const highRate = calculateDebtService(300000, 7);
      expect(highRate).toBeGreaterThan(lowRate);
    });
  });

  describe("recalculateProperty", () => {
    it("should calculate all derived fields correctly for a typical property", () => {
      const input: PropertyData = {
        address: "123 Main St",
        marketValue: 500000,
        debt: 300000,
        rent: 3000,
        hoa: 200,
        reTax: 400,
        insurance: 150,
        otherExpenses: 100,
        interestRate: 6,
        // The following will be calculated
        equity: 0,
        equityPercent: 0,
        debtService: 0,
        noiMonthly: 0,
        noiYearly: 0,
        cashflow: 0,
        returnPercent: 0,
      };

      const result = recalculateProperty(input);

      // Check equity calculations
      expect(result.equity).toBe(200000); // 500000 - 300000
      expect(result.equityPercent).toBeCloseTo(40, 1); // (200000 / 500000) * 100

      // Check debt service (should match calculateDebtService test)
      expect(result.debtService).toBeCloseTo(1798.65, 2);

      // Check NOI calculations
      expect(result.noiMonthly).toBe(2150); // 3000 - 200 - 400 - 150 - 100
      expect(result.noiYearly).toBe(25800); // 2150 * 12

      // Check cashflow (NOI - debt service)
      expect(result.cashflow).toBeCloseTo(351.35, 2); // 2150 - 1798.65

      // Check return percentage (Cash-on-Cash return)
      expect(result.returnPercent).toBeCloseTo(2.11, 2); // (351.35 * 12 / 200000) * 100
    });

    it("should handle a property with no debt", () => {
      const input: PropertyData = {
        address: "456 Oak Ave",
        marketValue: 400000,
        debt: 0,
        rent: 2500,
        hoa: 0,
        reTax: 300,
        insurance: 100,
        otherExpenses: 50,
        interestRate: 0,
        equity: 0,
        equityPercent: 0,
        debtService: 0,
        noiMonthly: 0,
        noiYearly: 0,
        cashflow: 0,
        returnPercent: 0,
      };

      const result = recalculateProperty(input);

      expect(result.equity).toBe(400000);
      expect(result.equityPercent).toBe(100);
      expect(result.debtService).toBe(0);
      expect(result.noiMonthly).toBe(2050); // 2500 - 300 - 100 - 50
      expect(result.cashflow).toBe(2050); // Same as NOI when no debt service
      expect(result.returnPercent).toBeCloseTo(6.15, 2); // (2050 * 12 / 400000) * 100
    });

    it("should handle negative cash flow correctly", () => {
      const input: PropertyData = {
        address: "789 Elm St",
        marketValue: 300000,
        debt: 250000,
        rent: 1500,
        hoa: 300,
        reTax: 500,
        insurance: 200,
        otherExpenses: 100,
        interestRate: 7,
        equity: 0,
        equityPercent: 0,
        debtService: 0,
        noiMonthly: 0,
        noiYearly: 0,
        cashflow: 0,
        returnPercent: 0,
      };

      const result = recalculateProperty(input);

      expect(result.noiMonthly).toBe(400); // 1500 - 300 - 500 - 200 - 100
      expect(result.debtService).toBeCloseTo(1663.26, 2);
      expect(result.cashflow).toBeCloseTo(-1263.26, 2); // Negative cashflow
      expect(result.returnPercent).toBeCloseTo(-30.32, 2); // Negative return
    });

    it("should handle zero equity correctly", () => {
      const input: PropertyData = {
        address: "999 Pine Rd",
        marketValue: 300000,
        debt: 300000,
        rent: 2000,
        hoa: 100,
        reTax: 300,
        insurance: 150,
        otherExpenses: 50,
        interestRate: 6,
        equity: 0,
        equityPercent: 0,
        debtService: 0,
        noiMonthly: 0,
        noiYearly: 0,
        cashflow: 0,
        returnPercent: 0,
      };

      const result = recalculateProperty(input);

      expect(result.equity).toBe(0);
      expect(result.equityPercent).toBe(0);
      expect(result.returnPercent).toBe(0); // Can't calculate return with no equity
    });

    it("should preserve non-calculated fields", () => {
      const input: PropertyData = {
        address: "111 Maple Dr",
        marketValue: 350000,
        debt: 200000,
        rent: 2200,
        hoa: 150,
        reTax: 350,
        insurance: 125,
        otherExpenses: 75,
        interestRate: 5.5,
        equity: 0,
        equityPercent: 0,
        debtService: 0,
        noiMonthly: 0,
        noiYearly: 0,
        cashflow: 0,
        returnPercent: 0,
        isNew: true,
      };

      const result = recalculateProperty(input);

      expect(result.address).toBe("111 Maple Dr");
      expect(result.isNew).toBe(true);
    });

    it("should handle null/undefined values in input", () => {
      const input: PropertyData = {
        address: "Test Address",
        marketValue: null as any,
        debt: undefined as any,
        rent: null as any,
        hoa: 0,
        reTax: 0,
        insurance: 0,
        otherExpenses: 0,
        interestRate: 0,
        equity: 0,
        equityPercent: 0,
        debtService: 0,
        noiMonthly: 0,
        noiYearly: 0,
        cashflow: 0,
        returnPercent: 0,
      };

      const result = recalculateProperty(input);

      expect(result.equity).toBe(0);
      expect(result.equityPercent).toBe(0);
      expect(result.noiMonthly).toBe(0);
      expect(result.cashflow).toBe(0);
    });
  });

  describe("calculatePortfolioTotals", () => {
    const sampleProperties: PropertyData[] = [
      {
        address: "Property 1",
        marketValue: 500000,
        debt: 300000,
        equity: 200000,
        rent: 3000,
        hoa: 200,
        reTax: 400,
        insurance: 150,
        otherExpenses: 100,
        interestRate: 6,
        equityPercent: 40,
        debtService: 1798.65,
        noiMonthly: 2150,
        noiYearly: 25800,
        cashflow: 351.35,
        returnPercent: 2.11,
      },
      {
        address: "Property 2",
        marketValue: 400000,
        debt: 250000,
        equity: 150000,
        rent: 2500,
        hoa: 150,
        reTax: 350,
        insurance: 125,
        otherExpenses: 75,
        interestRate: 5.5,
        equityPercent: 37.5,
        debtService: 1419.47,
        noiMonthly: 1800,
        noiYearly: 21600,
        cashflow: 380.53,
        returnPercent: 3.04,
      },
    ];

    it("should calculate totals correctly for multiple properties", () => {
      const totals = calculatePortfolioTotals(sampleProperties);

      expect(totals.noiMonthly).toBeCloseTo(3950, 2);
      expect(totals.noiYearly).toBeCloseTo(47400, 2);
      expect(totals.debtService).toBeCloseTo(3218.12, 2);
      expect(totals.cashflowMonthly).toBeCloseTo(731.88, 2);
      expect(totals.cashflowYearly).toBeCloseTo(8782.56, 2);
      expect(totals.totalAssets).toBe(900000);
      expect(totals.totalDebt).toBe(550000);
      expect(totals.totalEquity).toBe(350000);
      expect(totals.totalExpensesMonthly).toBe(1550);
    });

    it("should return zero totals for empty portfolio", () => {
      const totals = calculatePortfolioTotals([]);

      expect(totals.noiMonthly).toBe(0);
      expect(totals.noiYearly).toBe(0);
      expect(totals.debtService).toBe(0);
      expect(totals.cashflowMonthly).toBe(0);
      expect(totals.cashflowYearly).toBe(0);
      expect(totals.totalAssets).toBe(0);
      expect(totals.totalDebt).toBe(0);
      expect(totals.totalEquity).toBe(0);
      expect(totals.totalExpensesMonthly).toBe(0);
    });

    it("should handle portfolio with single property", () => {
      const totals = calculatePortfolioTotals([sampleProperties[0]]);

      expect(totals.noiMonthly).toBeCloseTo(2150, 2);
      expect(totals.totalAssets).toBe(500000);
      expect(totals.totalEquity).toBe(200000);
    });

    it("should handle null/undefined values in properties", () => {
      const propertiesWithNulls: PropertyData[] = [
        {
          address: "Test",
          marketValue: null as any,
          debt: undefined as any,
          equity: 0,
          rent: null as any,
          hoa: 0,
          reTax: 0,
          insurance: 0,
          otherExpenses: 0,
          interestRate: 0,
          equityPercent: 0,
          debtService: 0,
          noiMonthly: null as any,
          noiYearly: 0,
          cashflow: undefined as any,
          returnPercent: 0,
        },
      ];

      const totals = calculatePortfolioTotals(propertiesWithNulls);

      expect(totals.noiMonthly).toBe(0);
      expect(totals.totalAssets).toBe(0);
      expect(totals.cashflowMonthly).toBe(0);
    });
  });

  describe("calculatePortfolioMetrics", () => {
    const sampleProperties: PropertyData[] = [
      {
        address: "Property 1",
        marketValue: 500000,
        debt: 300000,
        equity: 200000,
        rent: 3000,
        hoa: 200,
        reTax: 400,
        insurance: 150,
        otherExpenses: 100,
        interestRate: 6,
        equityPercent: 40,
        debtService: 1798.65,
        noiMonthly: 2150,
        noiYearly: 25800,
        cashflow: 351.35,
        returnPercent: 2.11,
      },
      {
        address: "Property 2",
        marketValue: 400000,
        debt: 250000,
        equity: 150000,
        rent: 2500,
        hoa: 150,
        reTax: 350,
        insurance: 125,
        otherExpenses: 75,
        interestRate: 5.5,
        equityPercent: 37.5,
        debtService: 1419.47,
        noiMonthly: 1800,
        noiYearly: 21600,
        cashflow: 380.53,
        returnPercent: 3.04,
      },
    ];

    const sampleTotals = calculatePortfolioTotals(sampleProperties);

    it("should calculate rental income metrics correctly", () => {
      const metrics = calculatePortfolioMetrics(sampleProperties, sampleTotals);

      expect(metrics.totalRentAnnual).toBe(66000); // (3000 + 2500) * 12
      expect(metrics.totalRentMonthly).toBe(5500); // 3000 + 2500
      expect(metrics.activeUnits).toBe(2);
      expect(metrics.rentPerUnitPerMonth).toBe(2750); // 5500 / 2
    });

    it("should calculate return metrics correctly", () => {
      const metrics = calculatePortfolioMetrics(sampleProperties, sampleTotals);

      expect(metrics.cocReturn).toBeCloseTo(2.51, 2); // (8782.56 / 350000) * 100
      expect(metrics.leveredCashYield).toBeCloseTo(2.51, 2); // Same as CoC
      expect(metrics.unleveredCashYield).toBeCloseTo(5.27, 2); // (47400 / 900000) * 100
    });

    it("should calculate leverage and debt coverage metrics correctly", () => {
      const metrics = calculatePortfolioMetrics(sampleProperties, sampleTotals);

      expect(metrics.leverage).toBeCloseTo(61.11, 2); // (550000 / 900000) * 100
      expect(metrics.dscr).toBeCloseTo(1.23, 2); // 47400 / (3218.12 * 12)
    });

    it("should calculate valuation metrics correctly", () => {
      const metrics = calculatePortfolioMetrics(sampleProperties, sampleTotals);

      expect(metrics.capRate).toBeCloseTo(5.27, 2); // (47400 / 900000) * 100
      expect(metrics.grm).toBeCloseTo(13.64, 2); // 900000 / 66000
    });

    it("should calculate efficiency metrics correctly", () => {
      const metrics = calculatePortfolioMetrics(sampleProperties, sampleTotals);

      expect(metrics.opexRatio).toBeCloseTo(28.18, 2); // (1550 * 12 / 66000) * 100
    });

    it("should calculate portfolio size metrics correctly", () => {
      const metrics = calculatePortfolioMetrics(sampleProperties, sampleTotals);

      expect(metrics.propertyCount).toBe(2);
      expect(metrics.avgPropertyValue).toBe(450000); // 900000 / 2
      expect(metrics.avgRentPerProperty).toBe(2750); // 5500 / 2
    });

    it("should handle portfolio with no active units", () => {
      const noRentProperties: PropertyData[] = [
        {
          ...sampleProperties[0],
          rent: 0,
        },
      ];
      const noRentTotals = calculatePortfolioTotals(noRentProperties);
      const metrics = calculatePortfolioMetrics(noRentProperties, noRentTotals);

      expect(metrics.activeUnits).toBe(0);
      expect(metrics.rentPerUnitPerMonth).toBe(0);
      expect(metrics.totalRentMonthly).toBe(0);
    });

    it("should handle portfolio with no debt", () => {
      const noDebtProperties: PropertyData[] = [
        {
          address: "Property 1",
          marketValue: 500000,
          debt: 0,
          equity: 500000,
          rent: 3000,
          hoa: 200,
          reTax: 400,
          insurance: 150,
          otherExpenses: 100,
          interestRate: 0,
          equityPercent: 100,
          debtService: 0,
          noiMonthly: 2150,
          noiYearly: 25800,
          cashflow: 2150,
          returnPercent: 5.16,
        },
      ];
      const noDebtTotals = calculatePortfolioTotals(noDebtProperties);
      const metrics = calculatePortfolioMetrics(noDebtProperties, noDebtTotals);

      expect(metrics.leverage).toBe(0);
      expect(metrics.dscr).toBe(0); // No debt service
      expect(metrics.cocReturn).toBeCloseTo(5.16, 2);
    });

    it("should handle empty portfolio", () => {
      const emptyTotals = calculatePortfolioTotals([]);
      const metrics = calculatePortfolioMetrics([], emptyTotals);

      expect(metrics.propertyCount).toBe(0);
      expect(metrics.activeUnits).toBe(0);
      expect(metrics.totalRentMonthly).toBe(0);
      expect(metrics.cocReturn).toBe(0);
      expect(metrics.leverage).toBe(0);
      expect(metrics.capRate).toBe(0);
      expect(metrics.grm).toBe(0);
      expect(metrics.avgPropertyValue).toBe(0);
    });

    it("should handle division by zero gracefully", () => {
      const zeroValueProperties: PropertyData[] = [
        {
          address: "Property 1",
          marketValue: 0,
          debt: 0,
          equity: 0,
          rent: 0,
          hoa: 0,
          reTax: 0,
          insurance: 0,
          otherExpenses: 0,
          interestRate: 0,
          equityPercent: 0,
          debtService: 0,
          noiMonthly: 0,
          noiYearly: 0,
          cashflow: 0,
          returnPercent: 0,
        },
      ];
      const zeroTotals = calculatePortfolioTotals(zeroValueProperties);
      const metrics = calculatePortfolioMetrics(
        zeroValueProperties,
        zeroTotals
      );

      expect(metrics.cocReturn).toBe(0);
      expect(metrics.leverage).toBe(0);
      expect(metrics.dscr).toBe(0);
      expect(metrics.capRate).toBe(0);
      expect(metrics.grm).toBe(0);
      expect(metrics.opexRatio).toBe(0);
    });
  });

  describe("createEmptyProperty", () => {
    it("should create a property with default address", () => {
      const property = createEmptyProperty();

      expect(property.address).toBe("New Property");
      expect(property.isNew).toBe(true);
    });

    it("should create a property with custom address", () => {
      const property = createEmptyProperty("123 Custom St");

      expect(property.address).toBe("123 Custom St");
      expect(property.isNew).toBe(true);
    });

    it("should initialize all numeric fields to zero", () => {
      const property = createEmptyProperty();

      expect(property.marketValue).toBe(0);
      expect(property.debt).toBe(0);
      expect(property.equity).toBe(0);
      expect(property.rent).toBe(0);
      expect(property.hoa).toBe(0);
      expect(property.reTax).toBe(0);
      expect(property.insurance).toBe(0);
      expect(property.otherExpenses).toBe(0);
      expect(property.interestRate).toBe(0);
      expect(property.equityPercent).toBe(0);
      expect(property.debtService).toBe(0);
      expect(property.noiMonthly).toBe(0);
      expect(property.noiYearly).toBe(0);
      expect(property.cashflow).toBe(0);
      expect(property.returnPercent).toBe(0);
    });

    it("should be compatible with recalculateProperty", () => {
      const property = createEmptyProperty();
      const recalculated = recalculateProperty(property);

      expect(recalculated.equity).toBe(0);
      expect(recalculated.noiMonthly).toBe(0);
      expect(recalculated.cashflow).toBe(0);
    });
  });

  describe("Integration Tests", () => {
    it("should calculate complete portfolio workflow correctly", () => {
      // Create a new property
      const newProperty = createEmptyProperty("456 Integration Ave");

      // Set input values
      newProperty.marketValue = 350000;
      newProperty.debt = 250000;
      newProperty.rent = 2200;
      newProperty.hoa = 175;
      newProperty.reTax = 325;
      newProperty.insurance = 140;
      newProperty.otherExpenses = 60;
      newProperty.interestRate = 5.8;

      // Recalculate derived values
      const calculatedProperty = recalculateProperty(newProperty);

      // Verify calculations
      expect(calculatedProperty.equity).toBe(100000);
      expect(calculatedProperty.equityPercent).toBeCloseTo(28.57, 2);
      expect(calculatedProperty.noiMonthly).toBe(1500);
      expect(calculatedProperty.cashflow).toBeGreaterThan(0);

      // Add to portfolio
      const portfolio = [calculatedProperty];
      const totals = calculatePortfolioTotals(portfolio);
      const metrics = calculatePortfolioMetrics(portfolio, totals);

      // Verify portfolio metrics
      expect(metrics.propertyCount).toBe(1);
      expect(metrics.totalRentMonthly).toBe(2200);
      expect(metrics.capRate).toBeCloseTo(5.14, 2);
      expect(totals.totalEquity).toBe(100000);
    });

    it("should handle portfolio modifications correctly", () => {
      // Start with initial properties
      const property1 = createEmptyProperty("Property 1");
      property1.marketValue = 400000;
      property1.debt = 250000;
      property1.rent = 2500;
      property1.hoa = 150;
      property1.reTax = 300;
      property1.insurance = 120;
      property1.otherExpenses = 80;
      property1.interestRate = 5.5;

      const property2 = createEmptyProperty("Property 2");
      property2.marketValue = 300000;
      property2.debt = 200000;
      property2.rent = 2000;
      property2.hoa = 100;
      property2.reTax = 250;
      property2.insurance = 100;
      property2.otherExpenses = 50;
      property2.interestRate = 6.0;

      // Recalculate
      const calc1 = recalculateProperty(property1);
      const calc2 = recalculateProperty(property2);

      // Calculate initial metrics
      const initialPortfolio = [calc1, calc2];
      const initialTotals = calculatePortfolioTotals(initialPortfolio);
      const initialMetrics = calculatePortfolioMetrics(
        initialPortfolio,
        initialTotals
      );

      // Modify property 1 (increase rent)
      calc1.rent = 2800;
      const modifiedCalc1 = recalculateProperty(calc1);

      // Recalculate portfolio metrics
      const modifiedPortfolio = [modifiedCalc1, calc2];
      const modifiedTotals = calculatePortfolioTotals(modifiedPortfolio);
      const modifiedMetrics = calculatePortfolioMetrics(
        modifiedPortfolio,
        modifiedTotals
      );

      // Verify that metrics changed appropriately
      expect(modifiedMetrics.totalRentMonthly).toBeGreaterThan(
        initialMetrics.totalRentMonthly
      );
      expect(modifiedTotals.noiMonthly).toBeGreaterThan(
        initialTotals.noiMonthly
      );
      expect(modifiedMetrics.cocReturn).toBeGreaterThan(
        initialMetrics.cocReturn
      );
    });
  });
});
