export const metadata = {
  title: 'Sistema de Préstamos',
  description: 'Gestión eficiente de créditos y cobros',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  )
}
