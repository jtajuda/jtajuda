import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import s from './Form.module.css'

function fmtCPF(v) {
  return v.replace(/\D/g,'').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2').slice(0,14)
}
function fmtTel(v) {
  return v.replace(/\D/g,'').replace(/(\d{2})(\d)/,'($1) $2').replace(/(\d{5})(\d)/,'$1-$2').slice(0,15)
}

export default function CadastroForm({ onSuccess, onSwitchToLogin }) {
  const { cadastrar } = useAuth()
  const [form, setForm] = useState({ nome:'', cpf:'', endereco:'', telefone:'', senha:'' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.nome || !form.cpf || !form.endereco || !form.telefone || !form.senha) {
      setError('Preencha todos os campos.'); return
    }
    if (form.cpf.replace(/\D/g,'').length < 11) { setError('CPF inválido.'); return }
    if (form.senha.length < 6) { setError('Senha deve ter ao menos 6 caracteres.'); return }
    if (form.telefone.replace(/\D/g,'').length < 10) { setError('Telefone inválido.'); return }

    setLoading(true)
    try {
      await cadastrar(form)
      onSuccess()
    } catch (err) {
      setError(err.message || 'Erro ao criar conta. Tente novamente.')
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
        <input value={form.endereco} onChange={e => set('endereco', e.target.value)} placeholder="Rua, número, bairro, cidade/UF" />
      </div>
      <div className={s.twoCol}>
        <div className={s.row}>
          <label>Telefone (usado no login) *</label>
          <input value={form.telefone} onChange={e => set('telefone', fmtTel(e.target.value))} placeholder="(11) 99999-9999" maxLength={15} />
        </div>
        <div className={s.row}>
          <label>Senha *</label>
          <input type="password" value={form.senha} onChange={e => set('senha', e.target.value)} placeholder="Mínimo 6 caracteres" />
        </div>
      </div>
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
