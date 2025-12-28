import { portfoliosApi } from "@/lib/api/portfolios";
import type { PortfolioResponse } from "@/lib/api/types";
import { getCurrentUserFromApi } from "@/lib/api/users";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

export interface PortfolioState {
  activePortfolioId: number | null;
  activePortfolioName: string;
  portfolios: PortfolioResponse[];
  isLoading: boolean;
  error: string | null;
  refreshKey: number;
}

const initialState: PortfolioState = {
  activePortfolioId: null,
  activePortfolioName: "",
  portfolios: [],
  isLoading: false,
  error: null,
  refreshKey: 0,
};

export const loadPortfolios = createAsyncThunk(
  "portfolio/loadPortfolios",
  async (_, { rejectWithValue }) => {
    try {
      const [portfolioList, userData] = await Promise.all([
        portfoliosApi.getAll(false),
        getCurrentUserFromApi(),
      ]);
      return {
        portfolios: portfolioList,
        activePortfolioId: userData.activePortfolioId || null,
        activePortfolioName: userData.activePortfolioName || "No Portfolio",
      };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to load portfolios"
      );
    }
  }
);

export const switchPortfolio = createAsyncThunk(
  "portfolio/switchPortfolio",
  async (
    {
      portfolioId,
      portfolioName,
    }: { portfolioId: number; portfolioName: string },
    { rejectWithValue }
  ) => {
    try {
      await portfoliosApi.switchPortfolio(portfolioId);
      return { portfolioId, portfolioName };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to switch portfolio"
      );
    }
  }
);

const portfolioSlice = createSlice({
  name: "portfolio",
  initialState,
  reducers: {
    incrementRefreshKey: (state) => {
      state.refreshKey += 1;
    },
    resetPortfolio: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Load Portfolios
      .addCase(loadPortfolios.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadPortfolios.fulfilled, (state, action) => {
        state.isLoading = false;
        state.portfolios = action.payload.portfolios;
        state.activePortfolioId = action.payload.activePortfolioId;
        state.activePortfolioName = action.payload.activePortfolioName;
        state.error = null;
      })
      .addCase(loadPortfolios.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Switch Portfolio
      .addCase(switchPortfolio.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(switchPortfolio.fulfilled, (state, action) => {
        state.isLoading = false;
        state.activePortfolioId = action.payload.portfolioId;
        state.activePortfolioName = action.payload.portfolioName;
        state.refreshKey += 1;
      })
      .addCase(switchPortfolio.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { incrementRefreshKey, resetPortfolio } = portfolioSlice.actions;
export default portfolioSlice.reducer;
