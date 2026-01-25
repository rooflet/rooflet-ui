import { tenantsApi } from "@/lib/api/tenants";
import type {
  CreateTenantRequest,
  TenantResponse,
  UpdateTenantRequest,
} from "@/lib/api/types";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

export interface TenantsState {
  tenants: TenantResponse[];
  isLoading: boolean;
  error: string | null;
}

const initialState: TenantsState = {
  tenants: [],
  isLoading: false,
  error: null,
};

export const fetchTenants = createAsyncThunk(
  "tenants/fetchAll",
  async (
    params: { activeOnly?: boolean; propertyId?: string } = {},
    { rejectWithValue },
  ) => {
    try {
      return await tenantsApi.getAll(params);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch tenants",
      );
    }
  },
);

export const createTenant = createAsyncThunk(
  "tenants/create",
  async (data: CreateTenantRequest, { rejectWithValue }) => {
    try {
      return await tenantsApi.create(data);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to create tenant",
      );
    }
  },
);

export const updateTenant = createAsyncThunk(
  "tenants/update",
  async (
    { id, data }: { id: string; data: UpdateTenantRequest },
    { rejectWithValue },
  ) => {
    try {
      return await tenantsApi.update(id, data);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to update tenant",
      );
    }
  },
);

export const archiveTenant = createAsyncThunk(
  "tenants/archive",
  async (id: string, { rejectWithValue }) => {
    try {
      await tenantsApi.archive(id);
      return id;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to archive tenant",
      );
    }
  },
);

export const unarchiveTenant = createAsyncThunk(
  "tenants/unarchive",
  async (id: string, { rejectWithValue }) => {
    try {
      return await tenantsApi.update(id, { archived: false });
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to unarchive tenant",
      );
    }
  },
);

export const deleteTenant = createAsyncThunk(
  "tenants/delete",
  async (id: string, { rejectWithValue }) => {
    try {
      await tenantsApi.deletePermanent(id);
      return id;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to delete tenant",
      );
    }
  },
);

const tenantsSlice = createSlice({
  name: "tenants",
  initialState,
  reducers: {
    resetTenants: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Fetch Tenants
      .addCase(fetchTenants.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTenants.fulfilled, (state, action) => {
        state.isLoading = false;
        state.tenants = action.payload;
      })
      .addCase(fetchTenants.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create Tenant
      .addCase(createTenant.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createTenant.fulfilled, (state, action) => {
        state.isLoading = false;
        state.tenants.push(action.payload);
      })
      .addCase(createTenant.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update Tenant
      .addCase(updateTenant.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateTenant.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.tenants.findIndex(
          (t) => t.id === action.payload.id,
        );
        if (index !== -1) {
          state.tenants[index] = action.payload;
        }
      })
      .addCase(updateTenant.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Archive Tenant
      .addCase(archiveTenant.fulfilled, (state, action) => {
        const index = state.tenants.findIndex((t) => t.id === action.payload);
        if (index !== -1) {
          state.tenants[index].archived = true;
        }
      })
      // Unarchive Tenant
      .addCase(unarchiveTenant.fulfilled, (state, action) => {
        const index = state.tenants.findIndex(
          (t) => t.id === action.payload.id,
        );
        if (index !== -1) {
          state.tenants[index] = action.payload;
        }
      })
      // Delete Tenant
      .addCase(deleteTenant.fulfilled, (state, action) => {
        state.tenants = state.tenants.filter((t) => t.id !== action.payload);
      });
  },
});

export const { resetTenants } = tenantsSlice.actions;
export default tenantsSlice.reducer;
