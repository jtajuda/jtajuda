import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Modal from './Modal'
import CadastroForm from './CadastroForm'
import LoginForm from './LoginForm'
import styles from './Navbar.module.css'

export default function Navbar() {
  const { profile, logout } = useAuth()
  const [modal, setModal] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)

  function initials(name) {
    if (!name) return '?'
    const parts = name.trim().split(' ')
    return parts.length > 1
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0][0].toUpperCase()
  }

  return (
    <>
      <nav className={styles.nav}>
        <Link to="/" className={styles.logo}>J&amp;T EXPRESS <span>AJUDA</span></Link>

        <div className={styles.actions}>
          {profile ? (
            <>
              <div className={styles.userWrap} onClick={() => setMenuOpen(v => !v)}>
                <div className={styles.avatar}>{initials(profile.nome)}</div>
                <span className={styles.userName}>{profile.nome.split(' ')[0]}</span>
                <span className={styles.chevron}>{menuOpen ? '▲' : '▼'}</span>
              </div>
              {menuOpen && (
                <div className={styles.dropdown}>
                  <Link to="/meu-painel" className={styles.dropItem} onClick={() => setMenuOpen(false)}>
                    👤 Meu painel
                  </Link>
                  {profile.is_admin && (
                    <Link to="/admin" className={styles.dropItem} onClick={() => setMenuOpen(false)}>
                      ⚙ Painel admin
                    </Link>
                  )}
                  <button className={styles.dropItem} onClick={() => { logout(); setMenuOpen(false) }}>
                    🚪 Sair
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <button className={styles.btnSecondary} onClick={() => setModal('login')}>Entrar</button>
              <button className={styles.btnPrimary} onClick={() => setModal('cadastro')}>Cadastrar</button>
            </>
          )}
        </div>
      </nav>

      <Modal isOpen={modal === 'cadastro'} onClose={() => setModal(null)} title="Criar conta">
        <CadastroForm onSuccess={() => setModal(null)} onSwitchToLogin={() => setModal('login')} />
      </Modal>
      <Modal isOpen={modal === 'login'} onClose={() => setModal(null)} title="Entrar">
        <LoginForm onSuccess={() => setModal(null)} onSwitchToCadastro={() => setModal('cadastro')} />
      </Modal>
    </>
  )
}
