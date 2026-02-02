import "./globals.css";
import Provider from "./session-provider";

export const metadata = {
  title: "Tasty Media Manager",
  description: "Internal manager portal",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
