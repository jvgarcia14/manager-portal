import "./globals.css";
import Providers from "./session-provider";

export const metadata = {
  title: "Manager Portal",
  description: "Internal portal for sales & attendance monitoring",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
