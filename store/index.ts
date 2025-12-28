import { combineReducers, configureStore } from "@reduxjs/toolkit";
import {
  FLUSH,
  PAUSE,
  PERSIST,
  persistReducer,
  persistStore,
  PURGE,
  REGISTER,
  REHYDRATE,
} from "redux-persist";
import createWebStorage from "redux-persist/lib/storage/createWebStorage";

import authReducer from "./slices/authSlice";
import expensesReducer from "./slices/expensesSlice";
import portfolioReducer from "./slices/portfolioSlice";
import propertiesReducer from "./slices/propertiesSlice";
import rentCollectionsReducer from "./slices/rentCollectionsSlice";
import tenantsReducer from "./slices/tenantsSlice";

// Create a noop storage for SSR
const createNoopStorage = () => {
  return {
    getItem(_key: string) {
      return Promise.resolve(null);
    },
    setItem(_key: string, value: any) {
      return Promise.resolve(value);
    },
    removeItem(_key: string) {
      return Promise.resolve();
    },
  };
};

// Use noop storage on server, localStorage on client
const storage =
  typeof window !== "undefined"
    ? createWebStorage("local")
    : createNoopStorage();

const persistConfig = {
  key: "root",
  version: 1,
  storage,
  whitelist: ["auth", "portfolio"], // Only persist auth and portfolio state
};

const rootReducer = combineReducers({
  auth: authReducer,
  portfolio: portfolioReducer,
  properties: propertiesReducer,
  tenants: tenantsReducer,
  rentCollections: rentCollectionsReducer,
  expenses: expensesReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
