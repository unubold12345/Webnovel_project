import AdminSidebar from "@/components/admin/AdminSidebar";
import { ToastProvider } from "@/components/ui/ToastContext";
import { Toast } from "@/components/ui/Toast";
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
        <AdminSidebar />
        <div className={styles.content}>{children}</div>
      </div>
      <ToastContainer />
    </ToastProvider>
  );
}
