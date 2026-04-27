"use client";

import Navbar from "./Navbar";
import Footer from "./Footer";
import GlobalToast from "./GlobalToast";

export default function LayoutShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <body className={className}>
      <GlobalToast />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
        }}
      >
        <Navbar />
        <main style={{ flex: 1 }}>{children}</main>
        <Footer />
      </div>
    </body>
  );
}
