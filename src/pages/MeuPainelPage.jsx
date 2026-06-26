import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Modal from '../components/Modal'
import s from '../components/Form.module.css'
import styles from './MeuPainelPage.module.css'

function fmtBRL(v) {
  return 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}
function fmtCPF(v) {
  return v.replace(/\D/g,'').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2').slice(0,14)
}
function fmtTel(v) {
  return v.replace(/\D/g,'').replace(/(\d{2})(\d)/,'($1) $2').replace(/(\d{5})(\d)/,'$1-$2').slice(0,15)
}
function getPublicUrl(path) {
  const { data } = supabase.storage.from('reclamacoes-imagens').getPublicUrl(path)
  return data.publicUrl
}

const STATUS_LABEL = { pending: 'Aguardando aprovação', approved: 'Aprovada', rejected: 'Rejeitada' }
const STATUS_COLOR = { pending: '#F5A623', approved: '#28a745', rejected: '#dc3545' }
const SITES = ['Shopee','Mercado Livre','Amazon','Shein','AliExpress','Magazine Luiza','Americanas','Outro']

export default function MeuPainelPage() {
  const { profile, session, loading } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('reclamacoes')
  const [recls, setRecls] = useState([])
  const [editRecl, setEditRecl] = useState(null)
  const [dadosForm, setDadosForm] = useState({})
  const [dadosMsg, setDadosMsg] = useState('')
  const [reclForm, setReclForm] = useState({})
  const [reclMsg, setReclMsg] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!loading && !profile) navigate('/')
  }, [loading, profile, navigate])

  useEffect(() => {
    if (profile) {
      setDadosForm({
        nome: profile.nome || '',
        endereco: profile.endereco || '',
        telefone: profile.telefone ? fmtTel(profile.telefone) : '',
      })
    }
  }, [profile])

  const loadRecls = useCallback(async () => {
    if (!session) return
    const { data } = await supabase
      .from('reclamacoes')
      .select('*, reclamacao_imagens(storage_path)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
    setRecls(data || [])
  }, [session])

  useEffect(() => { loadRecls() }, [loadRecls])

  async function salvarDados(e) {
    e.preventDefault()
    setBusy(true)
    setDadosMsg('')
    const { error } = await supabase.from('profiles').update({
      nome: dadosForm.nome,
      endereco: dadosForm.endereco,
      telefone: dadosForm.telefone.replace(/\D/g,''),
    }).eq('id', session.user.id)
    setBusy(false)
    setDadosMsg(error ? 'Erro ao salvar.' : 'Dados atualizados com sucesso!')
  }

  function openEditRecl(r) {
    setReclForm({
      titulo: r.titulo,
      site: SITES.includes(r.site) ? r.site : 'Outro',
      outraSite: SITES.includes(r.site) ? '' : r.site,
      produto: r.tipo || '',
      valor: r.valor,
      descricao: r.descricao,
    })
    setReclMsg('')
    setEditRecl(r)
  }

  async function salvarRecl(e) {
    e.preventDefault()
    setBusy(true)
    setReclMsg('')
    const siteReal = reclForm.site === 'Outro' ? (reclForm.outraSite || 'Outro') : reclForm.site
    const { error } = await supabase.from('reclamacoes').update({
      titulo: reclForm.titulo,
      site: siteReal,
      tipo: reclForm.produto || null,
      valor: parseFloat(reclForm.valor),
      descricao: reclForm.descricao,
      status: 'pending', // volta para análise após edição
    }).eq('id', editRecl.id)
    setBusy(false)
    if (error) { setReclMsg('Erro ao salvar.'); return }
    setReclMsg('Reclamação atualizada! Voltou para análise.')
    await loadRecls()
    setTimeout(() => setEditRecl(null), 1500)
  }

  if (loading || !profile) return null

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.userCard}>
          <div className={styles.avatar}>{profile.nome?.[0]?.toUpperCase()}</div>
          <div>
            <div className={styles.userName}>{profile.nome}</div>
            <div className={styles.userEmail}>{session?.user?.email}</div>
          </div>
        </div>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'reclamacoes' ? styles.tabActive : ''}`} onClick={() => setTab('reclamacoes')}>
          Minhas reclamações <span className={styles.tabCount}>{recls.length}</span>
        </button>
        <button className={`${styles.tab} ${tab === 'dados' ? styles.tabActive : ''}`} onClick={() => setTab('dados')}>
          Meus dados
        </button>
      </div>

      {/* RECLAMAÇÕES */}
      {tab === 'reclamacoes' && (
        <div>
          {recls.length === 0 ? (
            <div className={styles.empty}>
              <span style={{ fontSize:'2rem', display:'block', marginBottom:'0.5rem' }}>📭</span>
              Você ainda não registrou nenhuma reclamação.
            </div>
          ) : (
            <div className={styles.list}>
              {recls.map(r => (
                <div key={r.id} className={styles.reclCard}>
                  <div className={styles.reclTop}>
                    <div className={styles.reclTitle}>{r.titulo}</div>
                    <span className={styles.statusBadge} style={{ background: STATUS_COLOR[r.status] + '22', color: STATUS_COLOR[r.status] }}>
                      {STATUS_LABEL[r.status]}
                    </span>
                  </div>
                  <div className={styles.reclMeta}>
                    <span>🛒 {r.site}</span>
                    {r.tipo && <span>📦 {r.tipo}</span>}
                    <span style={{ color:'#C0152A', fontWeight:600 }}>{fmtBRL(r.valor)}</span>
                    <span>📅 {new Date(r.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <p className={styles.reclDesc}>{r.descricao}</p>
                  {r.reclamacao_imagens?.length > 0 && (
                    <div className={styles.imgRow}>
                      {r.reclamacao_imagens.map((img, i) => (
                        <a key={i} href={getPublicUrl(img.storage_path)} target="_blank" rel="noreferrer">
                          <img src={getPublicUrl(img.storage_path)} alt="" className={styles.imgThumb} />
                        </a>
                      ))}
                    </div>
                  )}
                  <button className={styles.editBtn} onClick={() => openEditRecl(r)}>✏ Editar reclamação</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DADOS */}
      {tab === 'dados' && (
        <div className={styles.dadosCard}>
          <h2 className={styles.sectionTitle}>Meus dados</h2>
          <form onSubmit={salvarDados}>
            <div className={s.row}>
              <label>Nome completo</label>
              <input value={dadosForm.nome || ''} onChange={e => setDadosForm(f => ({...f, nome: e.target.value}))} />
            </div>
            <div className={s.row}>
              <label>Endereço</label>
              <input value={dadosForm.endereco || ''} onChange={e => setDadosForm(f => ({...f, endereco: e.target.value}))} />
            </div>
            <div className={s.row}>
              <label>Telefone</label>
              <input value={dadosForm.telefone || ''} onChange={e => setDadosForm(f => ({...f, telefone: fmtTel(e.target.value)}))} maxLength={15} />
            </div>
            <div className={s.row}>
              <label>E-mail</label>
              <input value={session?.user?.email || ''} disabled style={{ opacity:0.6 }} />
              <span style={{ fontSize:'0.72rem', color:'#999' }}>O e-mail não pode ser alterado.</span>
            </div>
            {dadosMsg && <div style={{ fontSize:'0.85rem', color: dadosMsg.includes('Erro') ? '#C0152A' : '#28a745', marginBottom:'0.5rem' }}>{dadosMsg}</div>}
            <button type="submit" className={s.submit} disabled={busy}>{busy ? 'Salvando...' : 'Salvar alterações'}</button>
          </form>
        </div>
      )}

      {/* MODAL EDITAR RECLAMAÇÃO */}
      <Modal isOpen={!!editRecl} onClose={() => setEditRecl(null)} title="Editar reclamação">
        {editRecl && (
          <form onSubmit={salvarRecl}>
            <div className={s.row}>
              <label>Título *</label>
              <input value={reclForm.titulo} onChange={e => setReclForm(f => ({...f, titulo: e.target.value}))} />
            </div>
            <div className={s.twoCol}>
              <div className={s.row}>
                <label>Plataforma *</label>
                <select value={reclForm.site} onChange={e => setReclForm(f => ({...f, site: e.target.value}))}>
                  {SITES.map(s => <option key={s}>{s}</option>)}
                </select>
                {reclForm.site === 'Outro' && (
                  <input style={{ marginTop:6 }} value={reclForm.outraSite} onChange={e => setReclForm(f => ({...f, outraSite: e.target.value}))} placeholder="Nome da plataforma" />
                )}
              </div>
              <div className={s.row}>
                <label>Valor (R$) *</label>
                <input type="number" value={reclForm.valor} onChange={e => setReclForm(f => ({...f, valor: e.target.value}))} min="0" step="0.01" />
              </div>
            </div>
            <div className={s.row}>
              <label>Produto (opcional)</label>
              <input value={reclForm.produto} onChange={e => setReclForm(f => ({...f, produto: e.target.value}))} />
            </div>
            <div className={s.row}>
              <label>Descrição *</label>
              <textarea value={reclForm.descricao} onChange={e => setReclForm(f => ({...f, descricao: e.target.value}))} style={{ minHeight:'90px' }} />
            </div>
            <div style={{ fontSize:'0.78rem', color:'#F5A623', background:'#fffbf0', padding:'8px 12px', borderRadius:'6px', marginBottom:'0.75rem' }}>
              ⚠ Ao salvar, sua reclamação voltará para análise antes de ser publicada novamente.
            </div>
            {reclMsg && <div style={{ fontSize:'0.85rem', color: reclMsg.includes('Erro') ? '#C0152A' : '#28a745', marginBottom:'0.5rem' }}>{reclMsg}</div>}
            <button type="submit" className={s.submit} disabled={busy}>{busy ? 'Salvando...' : 'Salvar alterações'}</button>
          </form>
        )}
      </Modal>
    </div>
  )
}
