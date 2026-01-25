import { rentCollectionsApi } from "@/lib/api/rent-collections";
import type {
  CreateRentCollectionRequest,
  RentCollectionResponse,
  UpdateRentCollectionRequest,
} from "@/lib/api/types";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

export interface RentCollectionsState {
  rentCollections: RentCollectionResponse[];
  isLoading: boolean;
  error: string | null;
}

const initialState: RentCollectionsState = {
  rentCollections: [],
  isLoading: false,
  error: null,
};

export const fetchRentCollections = createAsyncThunk(
  "rentCollections/fetchAll",
  async (
    params: {
      startPeriod?: string;
      endPeriod?: string;
      tenantId?: string;
    } = {},
    { rejectWithValue },
  ) => {
    try {
      return await rentCollectionsApi.getAll(params);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to fetch rent collections",
      );
    }
  },
);

export const createRentCollection = createAsyncThunk(
  "rentCollections/create",
  async (data: CreateRentCollectionRequest, { rejectWithValue }) => {
    try {
      return await rentCollectionsApi.create(data);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to create rent collection",
      );
    }
  },
);

export const updateRentCollection = createAsyncThunk(
  "rentCollections/update",
  async (
    { id, data }: { id: string; data: UpdateRentCollectionRequest },
    { rejectWithValue },
  ) => {
    try {
      return await rentCollectionsApi.update(id, data);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to update rent collection",
      );
    }
  },
);

export const deleteRentCollection = createAsyncThunk(
  "rentCollections/delete",
  async (id: string, { rejectWithValue }) => {
    try {
      await rentCollectionsApi.delete(id);
      return id;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to delete rent collection",
      );
    }
  },
);

const rentCollectionsSlice = createSlice({
  name: "rentCollections",
  initialState,
  reducers: {
    resetRentCollections: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Fetch Rent Collections
      .addCase(fetchRentCollections.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchRentCollections.fulfilled, (state, action) => {
        state.isLoading = false;
        state.rentCollections = action.payload;
      })
      .addCase(fetchRentCollections.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create Rent Collection
      .addCase(createRentCollection.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createRentCollection.fulfilled, (state, action) => {
        state.isLoading = false;
        state.rentCollections.push(action.payload);
      })
      .addCase(createRentCollection.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update Rent Collection
      .addCase(updateRentCollection.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateRentCollection.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.rentCollections.findIndex(
          (rc) => rc.id === action.payload.id,
        );
        if (index !== -1) {
          state.rentCollections[index] = action.payload;
        }
      })
      .addCase(updateRentCollection.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Delete Rent Collection
      .addCase(deleteRentCollection.fulfilled, (state, action) => {
        state.rentCollections = state.rentCollections.filter(
          (rc) => rc.id !== action.payload,
        );
      });
  },
});

export const { resetRentCollections } = rentCollectionsSlice.actions;
export default rentCollectionsSlice.reducer;
