import { api } from "@/lib/api-client";
import type {
  LoginResponse,
  UserResponse,
  ZipCodePreferenceResponse,
} from "@/lib/api/types";
import { zipCodePreferencesApi } from "@/lib/api/zip-code-preferences";
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface AuthState {
  isAuthenticated: boolean;
  user: UserResponse | null;
  isLoading: boolean;
  error: string | null;
  zipCodePreferences: ZipCodePreferenceResponse[];
  zipCodePreferencesLoading: boolean;
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  isLoading: false,
  error: null,
  zipCodePreferences: [],
  zipCodePreferencesLoading: false,
};

export const login = createAsyncThunk(
  "auth/login",
  async (
    credentials: { email: string; password: string },
    { rejectWithValue }
  ) => {
    try {
      // Backend uses session-based auth, returns LoginResponse
      const loginResponse = await api.post<LoginResponse>(
        "/api/users/login",
        credentials
      );

      // Fetch full user details
      const userResponse = await api.get<UserResponse>("/api/users/me");

      return { loginData: loginResponse, user: userResponse };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Login failed"
      );
    }
  }
);

export const logout = createAsyncThunk(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      await api.post("/api/users/logout", {});
    } catch (error) {
      // Continue with logout even if API call fails
      console.error("Logout API call failed:", error);
    }
  }
);

export const checkAuth = createAsyncThunk(
  "auth/checkAuth",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<UserResponse>("/api/users/me");
      return response;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Auth check failed"
      );
    }
  }
);

export const fetchZipCodePreferences = createAsyncThunk(
  "auth/fetchZipCodePreferences",
  async (_, { rejectWithValue }) => {
    try {
      const response = await zipCodePreferencesApi.getAll();
      return response;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to fetch zip code preferences"
      );
    }
  }
);

export const addZipCodePreference = createAsyncThunk(
  "auth/addZipCodePreference",
  async (zipCode: string, { rejectWithValue }) => {
    try {
      const response = await zipCodePreferencesApi.add({ zipCode });
      return response;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to add zip code preference"
      );
    }
  }
);

export const deleteZipCodePreference = createAsyncThunk(
  "auth/deleteZipCodePreference",
  async (zipCode: string, { rejectWithValue }) => {
    try {
      await zipCodePreferencesApi.delete(zipCode);
      return zipCode;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to delete zip code preference"
      );
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ user: UserResponse }>) => {
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.error = null;
    },
    clearAuth: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.error = null;
      })
      // Check Auth
      .addCase(checkAuth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload;
      })
      .addCase(checkAuth.rejected, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
      })
      // Fetch Zip Code Preferences
      .addCase(fetchZipCodePreferences.pending, (state) => {
        state.zipCodePreferencesLoading = true;
      })
      .addCase(fetchZipCodePreferences.fulfilled, (state, action) => {
        state.zipCodePreferencesLoading = false;
        state.zipCodePreferences = action.payload;
      })
      .addCase(fetchZipCodePreferences.rejected, (state) => {
        state.zipCodePreferencesLoading = false;
      })
      // Add Zip Code Preference
      .addCase(addZipCodePreference.pending, (state) => {
        state.zipCodePreferencesLoading = true;
      })
      .addCase(addZipCodePreference.fulfilled, (state, action) => {
        state.zipCodePreferencesLoading = false;
        state.zipCodePreferences.push(action.payload);
      })
      .addCase(addZipCodePreference.rejected, (state) => {
        state.zipCodePreferencesLoading = false;
      })
      // Delete Zip Code Preference
      .addCase(deleteZipCodePreference.pending, (state) => {
        state.zipCodePreferencesLoading = true;
      })
      .addCase(deleteZipCodePreference.fulfilled, (state, action) => {
        state.zipCodePreferencesLoading = false;
        state.zipCodePreferences = state.zipCodePreferences.filter(
          (pref) => pref.zipCode !== action.payload
        );
      })
      .addCase(deleteZipCodePreference.rejected, (state) => {
        state.zipCodePreferencesLoading = false;
      });
  },
});

export const { setCredentials, clearAuth } = authSlice.actions;
export default authSlice.reducer;
