"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <h1
              style={{
                fontSize: "3rem",
                fontWeight: "bold",
                marginBottom: "1rem",
              }}
            >
              Error
            </h1>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
              Something went wrong!
            </h2>
            <p style={{ marginBottom: "2rem", color: "#666" }}>
              An unexpected error has occurred.
            </p>
            <button
              onClick={() => reset()}
              style={{
                padding: "0.5rem 1rem",
                fontSize: "1rem",
                cursor: "pointer",
                borderRadius: "0.375rem",
                border: "1px solid #ddd",
                backgroundColor: "#fff",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
