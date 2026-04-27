import Link from "next/link";
import styles from "@/components/auth/AuthForms.module.css";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = params.error;

  const errorMessages: Record<string, string> = {
    default: "Баталгаажуулалтын үед алдаа гарлаа.",
    configuration: "Серверийн тохиргоонд асуудал байна.",
    accessdenied: "Танд нэвтрэх эрх байхгүй байна.",
    verification: "Баталгаажуулах токен хүчингүй болсон эсвэл аль хэдийн ашиглагдсан байна.",
    signin: "Өөр бүртгэлээр нэвтрэхийг оролдоно уу.",
    oauthsignin: "OAuth нэвтрэхэд алдаа гарлаа. Өөр бүртгэлээр нэвтрэхийг оролдоно уу.",
    oauthcallback: "OAuth буцаах үед алдаа гарлаа. Өөр бүртгэлээр нэвтрэхийг оролдоно уу.",
    oauthcreateaccount: "OAuth хэрэглэгчийн бүртгэл үүсгэж чадсангүй. Өөр бүртгэлээр нэвтрэхийг оролдоно уу.",
    emailcreateaccount: "Имэйл хэрэглэгчийн бүртгэл үүсгэж чадсангүй. Өөр бүртгэлээр нэвтрэхийг оролдоно уу.",
    callback: "OAuth буцаах үед алдаа гарлаа. Өөр бүртгэлээр нэвтрэхийг оролдоно уу.",
    oauthaccountnotlinked: "Хэн гэдгээ баталгаажуулахын тулд анх ашигласан бүртгэлээрээ нэвтэрнэ үү.",
    emailsignin: "Имэйл илгээж чадсангүй. Имэйл хаяг зөв эсэхийг шалгана уу.",
    credentialssignin: "Нэвтрэх амжилтгүй боллоо. Оруулсан мэдээлэл зөв эсэхийг шалгана уу.",
    sessionrequired: "Энэ хуудсанд нэвтэрч орох шаардлагатай.",
  };

  const errorMessage = error ? errorMessages[error.toLowerCase()] || errorMessages.default : errorMessages.default;

  return (
    <div className={styles.authWrapper}>
    <div className={styles.form}>
      <h1 className={styles.title}>Баталгаажуулалтын алдаа</h1>
      <p className={styles.error}>{errorMessage}</p>
      <Link href="/auth/login" className={styles.button} style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
        Нэвтрэх хуудас руу буцах
      </Link>
    </div>
    </div>
  );
}
