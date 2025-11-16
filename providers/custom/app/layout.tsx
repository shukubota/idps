import './globals.css'

export const metadata = {
  title: 'Custom Identity Provider',
  description: 'Custom OpenID Connect Identity Provider',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 antialiased">{children}</body>
    </html>
  )
}
