import "./globals.css";

export const metadata = {
  title: "카드 사용 누계",
  description: "내 카드 사용 기록",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
