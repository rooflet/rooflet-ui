import { propertiesApi } from "@/lib/api/properties";
import type {
  CreatePropertyRequest,
  PropertyResponse,
  UpdatePropertyRequest,
} from "@/lib/api/types";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

export interface PropertiesState {
  properties: PropertyResponse[];
  isLoading: boolean;
  error: string | null;
}

const initialState: PropertiesState = {
  properties: [],
  isLoading: false,
  error: null,
};

export const fetchProperties = createAsyncThunk(
  "properties/fetchAll",
  async (activeOnly: boolean = true, { rejectWithValue }) => {
    try {
      return await propertiesApi.getAll(activeOnly);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch properties"
      );
    }
  }
);

export const createProperty = createAsyncThunk(
  "properties/create",
  async (data: CreatePropertyRequest, { rejectWithValue }) => {
    try {
      return await propertiesApi.create(data);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to create property"
      );
    }
  }
);

export const updateProperty = createAsyncThunk(
  "properties/update",
  async (
    { id, data }: { id: number; data: UpdatePropertyRequest },
    { rejectWithValue }
  ) => {
    try {
      return await propertiesApi.update(id, data);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to update property"
      );
    }
  }
);

export const archiveProperty = createAsyncThunk(
  "properties/archive",
  async (id: number, { rejectWithValue }) => {
    try {
      await propertiesApi.archive(id);
      return id;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to archive property"
      );
    }
  }
);

export const unarchiveProperty = createAsyncThunk(
  "properties/unarchive",
  async (id: number, { rejectWithValue }) => {
    try {
      return await propertiesApi.update(id, { archived: false });
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to unarchive property"
      );
    }
  }
);

export const deleteProperty = createAsyncThunk(
  "properties/delete",
  async (id: number, { rejectWithValue }) => {
    try {
      await propertiesApi.deletePermanent(id);
      return id;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to delete property"
      );
    }
  }
);

const propertiesSlice = createSlice({
  name: "properties",
  initialState,
  reducers: {
    resetProperties: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Fetch Properties
      .addCase(fetchProperties.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProperties.fulfilled, (state, action) => {
        state.isLoading = false;
        state.properties = action.payload;
      })
      .addCase(fetchProperties.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create Property
      .addCase(createProperty.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createProperty.fulfilled, (state, action) => {
        state.isLoading = false;
        state.properties.push(action.payload);
      })
      .addCase(createProperty.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update Property
      .addCase(updateProperty.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateProperty.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.properties.findIndex(
          (p) => p.id === action.payload.id
        );
        if (index !== -1) {
          state.properties[index] = action.payload;
        }
      })
      .addCase(updateProperty.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Archive Property
      .addCase(archiveProperty.fulfilled, (state, action) => {
        const index = state.properties.findIndex(
          (p) => p.id === action.payload
        );
        if (index !== -1) {
          state.properties[index].archived = true;
        }
      })
      // Unarchive Property
      .addCase(unarchiveProperty.fulfilled, (state, action) => {
        const index = state.properties.findIndex(
          (p) => p.id === action.payload.id
        );
        if (index !== -1) {
          state.properties[index] = action.payload;
        }
      })
      // Delete Property
      .addCase(deleteProperty.fulfilled, (state, action) => {
        state.properties = state.properties.filter(
          (p) => p.id !== action.payload
        );
      });
  },
});

export const { resetProperties } = propertiesSlice.actions;
export default propertiesSlice.reducer;
