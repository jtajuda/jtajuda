import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import AdminPage from './pages/AdminPage'
import MeuPainelPage from './pages/MeuPainelPage'
import { useAuth } from './hooks/useAuth'

export default function App() {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
        <div style={{ textAlign:'center' }}>
          <p style={{ color:'#888', fontSize:'0.9rem' }}>Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/meu-painel" element={<MeuPainelPage />} />
      </Routes>
    </>
  )
}
