import "./globals.css";

export const metadata = {
  title: "Pick-a-Date",
  description: "A simple way to plan a date together.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
