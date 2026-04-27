"use client";

import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import GlobalToast from "./GlobalToast";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return isMobile;
}

export default function LayoutShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const isAuthPage = pathname?.startsWith("/auth") ?? false;
  const showNavFooter = !(isAuthPage && isMobile);

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
        {showNavFooter && <Navbar />}
        <main style={{ flex: 1 }}>{children}</main>
        {showNavFooter && <Footer />}
      </div>
    </body>
  );
}
