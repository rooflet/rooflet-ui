"use client";

import { Spinner } from "@/components/ui/spinner";
import { persistor, store } from "@/store";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";

export function ReduxProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <PersistGate
        loading={
          <div className="flex items-center justify-center min-h-screen">
            <Spinner className="size-8" />
          </div>
        }
        persistor={persistor}
      >
        {typeof window === "undefined" ? children : children}
      </PersistGate>
    </Provider>
  );
}
