import './globals.css';
import AppShell from '@/components/layout/AppShell';

export const metadata = {
  title: 'PLAN2BUILD — Intelligent Infrastructure Project Controls & Execution Intelligence Platform',
  description: 'SIH26122 Real-Time Actual Progress Tracking & Planning-to-Execution Bridge',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 font-sans antialiased overflow-hidden">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
