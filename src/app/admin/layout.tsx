import AdminTabs from "./AdminTabs";
import { ToastProvider } from "@/components/ui/ToastContext";
import { ToastContainer } from "./ToastContainer";
import styles from "./layout.module.css";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <div className={styles.layout}>
        <AdminTabs />
        <div className={styles.content}>{children}</div>
      </div>
      <ToastContainer />
    </ToastProvider>
  );
}
