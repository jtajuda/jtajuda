import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import s from './Form.module.css'

function fmtTel(v) {
  return v.replace(/\D/g,'').replace(/(\d{2})(\d)/,'($1) $2').replace(/(\d{5})(\d)/,'$1-$2').slice(0,15)
}

export default function LoginForm({ onSuccess, onSwitchToCadastro }) {
  const { login } = useAuth()
  const [telefone, setTelefone] = useState('')
  const [senha, setSenha] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!telefone || !senha) { setError('Preencha todos os campos.'); return }

    setLoading(true)
    try {
      await login({ telefone, senha })
      onSuccess()
    } catch (err) {
      setError('Telefone ou senha incorretos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className={s.error}>{error}</div>}
      <div className={s.row}>
        <label>Telefone</label>
        <input value={telefone} onChange={e => setTelefone(fmtTel(e.target.value))} placeholder="(11) 99999-9999" maxLength={15} />
      </div>
      <div className={s.row}>
        <label>Senha</label>
        <input type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="Sua senha" />
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
