import "./globals.css";
import Providers from "./session-provider";

export const metadata = {
  title: "Tasty Media – Manager Portal",
  description: "Internal dashboard for sales & attendance monitoring",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
