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
function fmtCEP(v) {
  return v.replace(/\D/g,'').replace(/(\d{5})(\d)/,'$1-$2').slice(0,9)
}

export default function CadastroForm({ onSuccess, onSwitchToLogin }) {
  const { cadastrar } = useAuth()
  const [form, setForm] = useState({
    nome:'', cpf:'', telefone:'', email:'',
    cep:'', rua:'', numero:'', bairro:'', cidade:'', estado:'',
    senha:'', confirmarSenha:''
  })
  const [showSenha, setShowSenha] = useState(false)
  const [showConfirmar, setShowConfirmar] = useState(false)
  const [cepLoading, setCepLoading] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function buscarCEP(cep) {
    const cepLimpo = cep.replace(/\D/g,'')
    if (cepLimpo.length !== 8) return
    setCepLoading(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setForm(f => ({
          ...f,
          rua: data.logradouro || f.rua,
          bairro: data.bairro || f.bairro,
          cidade: data.localidade || f.cidade,
          estado: data.uf || f.estado,
        }))
      }
    } catch (_) {}
    setCepLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.nome || !form.cpf || !form.telefone || !form.email || !form.cep || !form.rua || !form.cidade || !form.estado || !form.senha || !form.confirmarSenha) {
      setError('Preencha todos os campos obrigatórios.'); return
    }
    if (form.cpf.replace(/\D/g,'').length < 11) { setError('CPF inválido.'); return }
    if (form.telefone.replace(/\D/g,'').length < 10) { setError('Telefone inválido.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setError('E-mail inválido.'); return }
    if (form.senha.length < 6) { setError('Senha deve ter ao menos 6 caracteres.'); return }
    if (form.senha !== form.confirmarSenha) { setError('As senhas não coincidem.'); return }

    const endereco = `${form.rua}${form.numero ? ', '+form.numero : ''}, ${form.bairro ? form.bairro+', ' : ''}${form.cidade}/${form.estado}, CEP ${form.cep}`

    setLoading(true)
    try {
      await cadastrar({ ...form, endereco })
      onSuccess()
    } catch (err) {
      const msg = err.message || ''
      if (msg.includes('already registered') || msg.includes('already been registered')) setError('Este e-mail já está cadastrado.')
      else if (msg.includes('telefone')) setError('Este telefone já está cadastrado.')
      else if (msg.includes('cpf') || msg.includes('CPF')) setError('Este CPF já está cadastrado.')
      else setError(msg || 'Erro ao criar conta. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const senhaForca = form.senha.length >= 10 ? 'forte' : form.senha.length >= 8 ? 'boa' : form.senha.length >= 6 ? 'fraca' : 'curta'
  const senhaColor = { forte:'#28a745', boa:'#F5A623', fraca:'#ffc107', curta:'#dc3545' }
  const senhaWidth = { forte:'100%', boa:'66%', fraca:'33%', curta:'10%' }

  return (
    <form onSubmit={handleSubmit}>
      {/* Aviso de proteção de dados */}
      <div className={styles.privacyBanner}>
        🔒 <strong>Seus dados estão protegidos.</strong> Utilizamos criptografia e armazenamento seguro. Suas informações serão usadas exclusivamente para fins do processo coletivo e nunca serão compartilhadas com terceiros.
      </div>

      {error && <div className={s.error}>{error}</div>}

      {/* Dados pessoais */}
      <div className={styles.sectionLabel}>Dados pessoais</div>
      <div className={s.twoCol}>
        <div className={s.row}>
          <label>Nome completo *</label>
          <input value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Seu nome completo" />
        </div>
        <div className={s.row}>
          <label>CPF *</label>
          <input value={form.cpf} onChange={e => set('cpf', fmtCPF(e.target.value))} placeholder="000.000.000-00" maxLength={14} />
        </div>
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

      {/* Endereço */}
      <div className={styles.sectionLabel}>Endereço</div>
      <div className={s.twoCol}>
        <div className={s.row}>
          <label>CEP *</label>
          <div className={styles.cepWrap}>
            <input
              value={form.cep}
              onChange={e => {
                const v = fmtCEP(e.target.value)
                set('cep', v)
                if (v.replace(/\D/g,'').length === 8) buscarCEP(v)
              }}
              placeholder="00000-000"
              maxLength={9}
            />
            {cepLoading && <span className={styles.cepSpinner}>⏳</span>}
          </div>
        </div>
        <div className={s.row}>
          <label>Número</label>
          <input value={form.numero} onChange={e => set('numero', e.target.value)} placeholder="Ex: 123" />
        </div>
      </div>
      <div className={s.row}>
        <label>Rua / Logradouro *</label>
        <input value={form.rua} onChange={e => set('rua', e.target.value)} placeholder="Preenchido automaticamente pelo CEP" />
      </div>
      <div className={s.twoCol}>
        <div className={s.row}>
          <label>Bairro</label>
          <input value={form.bairro} onChange={e => set('bairro', e.target.value)} placeholder="Seu bairro" />
        </div>
        <div className={s.row}>
          <label>Cidade *</label>
          <input value={form.cidade} onChange={e => set('cidade', e.target.value)} placeholder="Sua cidade" />
        </div>
      </div>
      <div className={s.row} style={{ maxWidth: '160px' }}>
        <label>Estado *</label>
        <select value={form.estado} onChange={e => set('estado', e.target.value)}>
          <option value="">UF</option>
          {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
            <option key={uf} value={uf}>{uf}</option>
          ))}
        </select>
      </div>

      {/* Senha */}
      <div className={styles.sectionLabel}>Senha</div>
      <div className={s.twoCol}>
        <div className={s.row}>
          <label>Senha *</label>
          <div className={styles.inputWrap}>
            <input type={showSenha ? 'text' : 'password'} value={form.senha} onChange={e => set('senha', e.target.value)} placeholder="Mínimo 6 caracteres" />
            <button type="button" className={styles.eyeBtn} onClick={() => setShowSenha(v => !v)}>{showSenha ? '🙈' : '👁'}</button>
          </div>
        </div>
        <div className={s.row}>
          <label>Confirmar senha *</label>
          <div className={styles.inputWrap}>
            <input type={showConfirmar ? 'text' : 'password'} value={form.confirmarSenha} onChange={e => set('confirmarSenha', e.target.value)} placeholder="Repita a senha" />
            <button type="button" className={styles.eyeBtn} onClick={() => setShowConfirmar(v => !v)}>{showConfirmar ? '🙈' : '👁'}</button>
          </div>
        </div>
      </div>

      {form.senha && (
        <div className={styles.senhaStrength}>
          <div className={styles.senhaBar}>
            <div className={styles.senhaFill} style={{ width: senhaWidth[senhaForca], background: senhaColor[senhaForca] }} />
          </div>
          <span className={styles.senhaLabel} style={{ color: senhaColor[senhaForca] }}>Senha {senhaForca}</span>
        </div>
      )}
      {form.confirmarSenha && (
        <div className={styles.senhaMatch} style={{ color: form.senha === form.confirmarSenha ? '#28a745' : '#dc3545' }}>
          {form.senha === form.confirmarSenha ? '✓ Senhas coincidem' : '✕ Senhas não coincidem'}
        </div>
      )}

      <button type="submit" className={s.submit} disabled={loading}>
        {loading ? 'Criando conta...' : 'Criar conta e entrar'}
      </button>
      <div className={s.divider}><span>já tem conta?</span></div>
      <div style={{ textAlign:'center' }}>
        <button type="button" className={s.linkBtn} onClick={onSwitchToLogin}>Fazer login</button>
      </div>
    </form>
  )
}
