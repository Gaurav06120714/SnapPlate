import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SnapPlate — snap a meal, know what's in it",
  description:
    "Point your camera at any meal and get an instant calorie, macro, and nutrient breakdown with a tip to make it healthier. Powered by Claude vision.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
