import { expensesApi } from "@/lib/api/expenses";
import type {
  CreateExpenseRequest,
  ExpenseResponse,
  UpdateExpenseRequest,
} from "@/lib/api/types";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

export interface ExpensesState {
  expenses: ExpenseResponse[];
  isLoading: boolean;
  error: string | null;
}

const initialState: ExpensesState = {
  expenses: [],
  isLoading: false,
  error: null,
};

export const fetchExpenses = createAsyncThunk(
  "expenses/fetchAll",
  async (
    params: { startDate?: string; endDate?: string; propertyId?: string } = {},
    { rejectWithValue },
  ) => {
    try {
      return await expensesApi.getAll(params);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch expenses",
      );
    }
  },
);

export const createExpense = createAsyncThunk(
  "expenses/create",
  async (data: CreateExpenseRequest, { rejectWithValue }) => {
    try {
      return await expensesApi.create(data);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to create expense",
      );
    }
  },
);

export const updateExpense = createAsyncThunk(
  "expenses/update",
  async (
    { id, data }: { id: string; data: UpdateExpenseRequest },
    { rejectWithValue },
  ) => {
    try {
      return await expensesApi.update(id, data);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to update expense",
      );
    }
  },
);

export const deleteExpense = createAsyncThunk(
  "expenses/delete",
  async (id: string, { rejectWithValue }) => {
    try {
      await expensesApi.delete(id);
      return id;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to delete expense",
      );
    }
  },
);

const expensesSlice = createSlice({
  name: "expenses",
  initialState,
  reducers: {
    resetExpenses: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Fetch Expenses
      .addCase(fetchExpenses.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchExpenses.fulfilled, (state, action) => {
        state.isLoading = false;
        state.expenses = action.payload;
      })
      .addCase(fetchExpenses.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create Expense
      .addCase(createExpense.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createExpense.fulfilled, (state, action) => {
        state.isLoading = false;
        state.expenses.push(action.payload);
      })
      .addCase(createExpense.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update Expense
      .addCase(updateExpense.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateExpense.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.expenses.findIndex(
          (e) => e.id === action.payload.id,
        );
        if (index !== -1) {
          state.expenses[index] = action.payload;
        }
      })
      .addCase(updateExpense.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Delete Expense
      .addCase(deleteExpense.fulfilled, (state, action) => {
        state.expenses = state.expenses.filter((e) => e.id !== action.payload);
      });
  },
});

export const { resetExpenses } = expensesSlice.actions;
export default expensesSlice.reducer;
