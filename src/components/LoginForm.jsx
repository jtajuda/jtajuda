import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import s from './Form.module.css'
import styles from './CadastroForm.module.css'

export default function LoginForm({ onSuccess, onSwitchToCadastro }) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [showSenha, setShowSenha] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!email || !senha) { setError('Preencha todos os campos.'); return }

    setLoading(true)
    try {
      await login({ email, senha })
      onSuccess()
    } catch (err) {
      setError('E-mail ou senha incorretos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className={s.error}>{error}</div>}

      <div className={s.row}>
        <label>E-mail</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="seu@email.com"
          autoComplete="email"
        />
      </div>

      <div className={s.row}>
        <label>Senha</label>
        <div className={styles.inputWrap}>
          <input
            type={showSenha ? 'text' : 'password'}
            value={senha}
            onChange={e => setSenha(e.target.value)}
            placeholder="Sua senha"
            autoComplete="current-password"
          />
          <button type="button" className={styles.eyeBtn} onClick={() => setShowSenha(v => !v)}>
            {showSenha ? '🙈' : '👁'}
          </button>
        </div>
      </div>

      <button type="submit" className={s.submit} disabled={loading}>
        {loading ? 'Entrando...' : 'Entrar'}
      </button>

      <div className={s.divider}><span>não tem conta?</span></div>
      <div style={{ textAlign: 'center' }}>
        <button type="button" className={s.linkBtn} onClick={onSwitchToCadastro}>Criar conta</button>
      </div>
    </form>
  )
}
