import "./globals.css";
import SessionProvider from "./session-provider";

export const metadata = {
  title: "Tasty Media – Manager Portal",
  description: "Internal dashboard for sales & attendance monitoring",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
