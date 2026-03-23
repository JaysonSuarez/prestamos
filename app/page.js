"use client";
import dynamic from 'next/dynamic'

// Usamos importación dinámica con ssr: false para evitar errores de hidratación
// ya que el componente maneja estados locales y acceso al navegador (window/storage)
const App = dynamic(() => import('../prestamos.jsx'), { 
  ssr: false,
  loading: () => <div>Cargando...</div>
})

export default function Page() {
  return <App />;
}
