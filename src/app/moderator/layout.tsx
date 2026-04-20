import ModeratorSidebar from "@/components/admin/ModeratorSidebar";
import { ToastProvider } from "@/components/ui/ToastContext";
import { ToastContainer } from "./ToastContainer";
import styles from "./layout.module.css";

export default function ModeratorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <div className={styles.layout}>
        <ModeratorSidebar />
        <div className={styles.content}>{children}</div>
      </div>
      <ToastContainer />
    </ToastProvider>
  );
}
