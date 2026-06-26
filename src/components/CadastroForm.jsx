import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import s from './Form.module.css'
import styles from './CadastroForm.module.css'

function fmtCPF(v) {
  return v.replace(/\D/g,'').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2').slice(0,14)
}
function fmtTel(v) {
  return v.replace(/\D/g,'').replace(/(\d{2})(\d)/,'($1) $2').replace(/(\d{5})(\d)/,'$1-$2').slice(0,15)
}

export default function CadastroForm({ onSuccess, onSwitchToLogin }) {
  const { cadastrar } = useAuth()
  const [form, setForm] = useState({ nome:'', cpf:'', endereco:'', telefone:'', email:'', senha:'', confirmarSenha:'' })
  const [showSenha, setShowSenha] = useState(false)
  const [showConfirmar, setShowConfirmar] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.nome || !form.cpf || !form.endereco || !form.telefone || !form.email || !form.senha || !form.confirmarSenha) {
      setError('Preencha todos os campos.'); return
    }
    if (form.cpf.replace(/\D/g,'').length < 11) { setError('CPF inválido.'); return }
    if (form.telefone.replace(/\D/g,'').length < 10) { setError('Telefone inválido.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setError('E-mail inválido.'); return }
    if (form.senha.length < 6) { setError('Senha deve ter ao menos 6 caracteres.'); return }
    if (form.senha !== form.confirmarSenha) { setError('As senhas não coincidem.'); return }

    setLoading(true)
    try {
      await cadastrar(form)
      onSuccess()
    } catch (err) {
      const msg = err.message || ''
      if (msg.includes('already registered') || msg.includes('already been registered')) {
        setError('Este e-mail já está cadastrado.')
      } else if (msg.includes('duplicate') && msg.includes('telefone')) {
        setError('Este telefone já está cadastrado.')
      } else if (msg.includes('duplicate') && msg.includes('cpf')) {
        setError('Este CPF já está cadastrado.')
      } else {
        setError(msg || 'Erro ao criar conta. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className={s.error}>{error}</div>}

      <div className={s.twoCol}>
        <div className={s.row}>
          <label>Nome completo *</label>
          <input value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Seu nome" />
        </div>
        <div className={s.row}>
          <label>CPF *</label>
          <input value={form.cpf} onChange={e => set('cpf', fmtCPF(e.target.value))} placeholder="000.000.000-00" maxLength={14} />
        </div>
      </div>

      <div className={s.row}>
        <label>Endereço completo *</label>
        <input value={form.endereco} onChange={e => set('endereco', e.target.value)} placeholder="Rua, número, bairro, Cidade/UF" />
      </div>

      <div className={s.twoCol}>
        <div className={s.row}>
          <label>Telefone *</label>
          <input value={form.telefone} onChange={e => set('telefone', fmtTel(e.target.value))} placeholder="(11) 99999-9999" maxLength={15} />
        </div>
        <div className={s.row}>
          <label>E-mail *</label>
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="seu@email.com" />
        </div>
      </div>

      <div className={s.twoCol}>
        <div className={s.row}>
          <label>Senha *</label>
          <div className={styles.inputWrap}>
            <input
              type={showSenha ? 'text' : 'password'}
              value={form.senha}
              onChange={e => set('senha', e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
            <button type="button" className={styles.eyeBtn} onClick={() => setShowSenha(v => !v)}>
              {showSenha ? '🙈' : '👁'}
            </button>
          </div>
        </div>
        <div className={s.row}>
          <label>Confirmar senha *</label>
          <div className={styles.inputWrap}>
            <input
              type={showConfirmar ? 'text' : 'password'}
              value={form.confirmarSenha}
              onChange={e => set('confirmarSenha', e.target.value)}
              placeholder="Repita a senha"
            />
            <button type="button" className={styles.eyeBtn} onClick={() => setShowConfirmar(v => !v)}>
              {showConfirmar ? '🙈' : '👁'}
            </button>
          </div>
        </div>
      </div>

      {/* Indicador de força da senha */}
      {form.senha && (
        <div className={styles.senhaStrength}>
          <div className={styles.senhaBar}>
            <div
              className={styles.senhaFill}
              style={{
                width: form.senha.length >= 10 ? '100%' : form.senha.length >= 8 ? '66%' : form.senha.length >= 6 ? '33%' : '10%',
                background: form.senha.length >= 10 ? '#28a745' : form.senha.length >= 8 ? '#F5A623' : form.senha.length >= 6 ? '#ffc107' : '#dc3545'
              }}
            />
          </div>
          <span className={styles.senhaLabel}>
            {form.senha.length >= 10 ? 'Senha forte' : form.senha.length >= 8 ? 'Senha boa' : form.senha.length >= 6 ? 'Senha fraca' : 'Muito curta'}
          </span>
        </div>
      )}

      {/* Match de senhas */}
      {form.confirmarSenha && (
        <div className={styles.senhaMatch} style={{ color: form.senha === form.confirmarSenha ? '#28a745' : '#dc3545' }}>
          {form.senha === form.confirmarSenha ? '✓ Senhas coincidem' : '✕ Senhas não coincidem'}
        </div>
      )}

      <button type="submit" className={s.submit} disabled={loading}>
        {loading ? 'Criando conta...' : 'Criar conta e entrar'}
      </button>

      <div className={s.divider}><span>já tem conta?</span></div>
      <div style={{ textAlign: 'center' }}>
        <button type="button" className={s.linkBtn} onClick={onSwitchToLogin}>Fazer login</button>
      </div>
    </form>
  )
}
