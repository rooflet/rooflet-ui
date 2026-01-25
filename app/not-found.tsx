import Link from "next/link";

export default function NotFound() {
  return (
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
          style={{ fontSize: "3rem", fontWeight: "bold", marginBottom: "1rem" }}
        >
          404
        </h1>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
          Page Not Found
        </h2>
        <p style={{ marginBottom: "2rem", color: "#666" }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div style={{ paddingTop: "1rem" }}>
          <Link
            href="/"
            style={{
              padding: "0.5rem 1rem",
              fontSize: "1rem",
              cursor: "pointer",
              borderRadius: "0.375rem",
              border: "1px solid #ddd",
              backgroundColor: "#fff",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
