"use client";

export default function GlobalRootError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="tr">
      <body
        style={{
          background: "#0F0D0A",
          color: "#fff",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            border: "1px solid #2E2820",
            background: "#1C1814",
            borderRadius: 20,
            padding: 40,
            textAlign: "center",
            maxWidth: 400,
          }}
        >
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Bir Şeyler Ters Gitti</h1>
          <p style={{ marginTop: 8, fontSize: 14, color: "#A69B8A" }}>
            Uygulama beklenmedik bir hatayla karşılaştı.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 16,
              color: "#E8A63C",
              background: "none",
              border: "none",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Tekrar dene
          </button>
        </div>
      </body>
    </html>
  );
}
