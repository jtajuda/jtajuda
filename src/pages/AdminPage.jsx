import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import styles from './AdminPage.module.css'

function fmtBRL(v) {
  return 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}
function getPublicUrl(path) {
  const { data } = supabase.storage.from('reclamacoes-imagens').getPublicUrl(path)
  return data.publicUrl
}

export default function AdminPage() {
  const { profile, loading } = useAuth()
  const navigate = useNavigate()
  const [recls, setRecls] = useState([])
  const [contatos, setContatos] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [tab, setTab] = useState('pending')
  const [busy, setBusy] = useState({})
  const [expanded, setExpanded] = useState(null)
  const [lightbox, setLightbox] = useState(null)
  const [stats, setStats] = useState({ pending:0, approved:0, rejected:0, total_users:0, total_valor:0, contatos:0 })

  useEffect(() => {
    if (!loading && (!profile || !profile.is_admin)) navigate('/')
  }, [loading, profile, navigate])

  const load = useCallback(async () => {
    if (tab === 'contatos') return
    const { data } = await supabase
      .from('reclamacoes')
      .select('*, profiles(nome, telefone, cpf, endereco, email), reclamacao_imagens(storage_path)')
      .eq('status', tab)
      .order('created_at', { ascending: false })
    setRecls(data || [])
  }, [tab])

  const loadUsuarios = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*, reclamacoes(id, status)')
      .order('created_at', { ascending: false })
    setUsuarios(data || [])
  }, [])

  const loadContatos = useCallback(async () => {
    const { data } = await supabase.from('contatos_empresa').select('*').order('created_at', { ascending: false })
    setContatos(data || [])
  }, [])

  const loadStats = useCallback(async () => {
    const { data: all } = await supabase.from('reclamacoes').select('status, valor')
    const { count: users } = await supabase.from('profiles').select('*', { count:'exact', head:true })
    const { count: ct } = await supabase.from('contatos_empresa').select('*', { count:'exact', head:true })
    if (all) {
      setStats({
        pending: all.filter(r => r.status === 'pending').length,
        approved: all.filter(r => r.status === 'approved').length,
        rejected: all.filter(r => r.status === 'rejected').length,
        total_users: users || 0,
        total_valor: all.filter(r => r.status === 'approved').reduce((s,r) => s + parseFloat(r.valor||0), 0),
        contatos: ct || 0,
      })
    }
  }, [])

  useEffect(() => {
    if (!profile?.is_admin) return
    if (tab === 'contatos') loadContatos()
    else if (tab === 'usuarios') loadUsuarios()
    else load()
    loadStats()
  }, [load, loadContatos, loadStats, profile, tab])

  async function setStatus(id, status) {
    setBusy(b => ({ ...b, [id]: true }))
    await supabase.from('reclamacoes').update({ status }).eq('id', id)
    await load(); await loadStats()
    setBusy(b => ({ ...b, [id]: false }))
  }

  async function deletarContato(id) {
    await supabase.from('contatos_empresa').delete().eq('id', id)
    await loadContatos(); await loadStats()
  }

  if (loading || !profile?.is_admin) return null

  const tabLabels = { pending:'Pendentes', approved:'Aprovadas', rejected:'Rejeitadas', usuarios:'Usuários', contatos:'Contatos J&T' }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Painel Admin</h1>
          <p className={styles.sub}>Gerencie as reclamações e contatos</p>
        </div>
        <span className={styles.adminBadge}>ADMIN</span>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}><span className={styles.statNum} style={{color:'#F5A623'}}>{stats.pending}</span><span className={styles.statLbl}>Pendentes</span></div>
        <div className={styles.statCard}><span className={styles.statNum} style={{color:'#28a745'}}>{stats.approved}</span><span className={styles.statLbl}>Aprovadas</span></div>
        <div className={styles.statCard}><span className={styles.statNum} style={{color:'#dc3545'}}>{stats.rejected}</span><span className={styles.statLbl}>Rejeitadas</span></div>
        <div className={styles.statCard}><span className={styles.statNum}>{stats.total_users}</span><span className={styles.statLbl}>Usuários</span></div>
        <div className={styles.statCard}><span className={styles.statNum} style={{color:'#C0152A',fontSize:'1.1rem'}}>{fmtBRL(stats.total_valor)}</span><span className={styles.statLbl}>Prejuízo total</span></div>
        <div className={styles.statCard} style={{cursor:'pointer'}} onClick={() => setTab('contatos')}>
          <span className={styles.statNum} style={{color:'#1a6ba0'}}>{stats.contatos}</span>
          <span className={styles.statLbl}>Contatos J&T</span>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {Object.entries(tabLabels).map(([key, label]) => (
          <button key={key} className={`${styles.tab} ${tab===key?styles.tabActive:''}`} onClick={() => setTab(key)}>
            {label}
            {key==='pending' && stats.pending>0 && <span className={styles.tabBadge}>{stats.pending}</span>}
            {key==='contatos' && stats.contatos>0 && <span className={styles.tabBadge} style={{background:'#1a6ba0'}}>{stats.contatos}</span>}
          </button>
        ))}
      </div>

      {/* USUARIOS */}
      {tab === 'usuarios' && (
        usuarios.length === 0
          ? <div className={styles.empty}>Nenhum usuário cadastrado.</div>
          : <div className={styles.list}>
              {usuarios.map(u => {
                const total = u.reclamacoes?.length || 0
                const aprovadas = u.reclamacoes?.filter(r => r.status === 'approved').length || 0
                return (
                  <div key={u.id} className={styles.usuarioCard}>
                    <div className={styles.usuarioTop}>
                      <div className={styles.usuarioAvatar}>{u.nome?.[0]?.toUpperCase() || '?'}</div>
                      <div className={styles.usuarioInfo}>
                        <div className={styles.usuarioNome}>{u.nome} {u.is_admin && <span className={styles.adminTag}>ADMIN</span>}</div>
                        <div className={styles.usuarioMeta}>
                          <span>📧 {u.email || '—'}</span>
                          <span>📞 {u.telefone || '—'}</span>
                        </div>
                        <div className={styles.usuarioMeta}>
                          <span>🪪 CPF: {u.cpf || '—'}</span>
                          <span>📍 {u.endereco || '—'}</span>
                        </div>
                        <div className={styles.usuarioMeta}>
                          <span>📅 Cadastro: {new Date(u.created_at).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>
                      <div className={styles.usuarioStats}>
                        <div className={styles.usuarioStat}>
                          <span className={styles.usuarioStatNum}>{total}</span>
                          <span className={styles.usuarioStatLbl}>reclamações</span>
                        </div>
                        <div className={styles.usuarioStat}>
                          <span className={styles.usuarioStatNum} style={{color:'#28a745'}}>{aprovadas}</span>
                          <span className={styles.usuarioStatLbl}>aprovadas</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
      )}

      {/* CONTATOS */}
      {tab === 'contatos' && (
        contatos.length === 0
          ? <div className={styles.empty}>Nenhum contato recebido ainda.</div>
          : <div className={styles.list}>
              {contatos.map(c => (
                <div key={c.id} className={styles.contatoCard}>
                  <div className={styles.contatoTop}>
                    <div>
                      <div className={styles.contatoNome}>{c.nome}</div>
                      <div className={styles.contatoData}>{new Date(c.created_at).toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
                    </div>
                    <button className={styles.btnReject} onClick={() => deletarContato(c.id)}>✕</button>
                  </div>
                  <a href={`mailto:${c.email}`} className={styles.contatoEmail}>📧 {c.email}</a>
                  <div className={styles.contatoMsg}>{c.mensagem}</div>
                  <a href={`mailto:${c.email}?subject=Re: Contato J&T Lesados`} className={styles.btnResponder}>✉ Responder por e-mail</a>
                </div>
              ))}
            </div>
      )}

      {/* RECLAMAÇÕES */}
      {tab !== 'contatos' && (
        recls.length === 0
          ? <div className={styles.empty}>{tab==='pending'?'✓ Nenhuma reclamação pendente.':'Nenhuma reclamação nesta categoria.'}</div>
          : <div className={styles.list}>
              {recls.map(r => (
                <div key={r.id} className={styles.card}>
                  {/* Cabeçalho */}
                  <div className={styles.cardTop}>
                    <div className={styles.cardInfo}>
                      <div className={styles.cardCodigo}>#{String(r.id).padStart(6,'0')}</div>
                      <h3 className={styles.cardTitle}>{r.titulo}</h3>
                      <div className={styles.cardMeta}>
                        <span>🛒 {r.site}</span>
                        {r.tipo && <span>📦 {r.tipo}</span>}
                        <span className={styles.valor}>{fmtBRL(r.valor)}</span>
                        <span>📅 {new Date(r.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                    <div className={styles.cardActions}>
                      {tab==='pending' && <>
                        <button className={styles.btnApprove} disabled={busy[r.id]} onClick={() => setStatus(r.id,'approved')}>✓ Aprovar</button>
                        <button className={styles.btnReject} disabled={busy[r.id]} onClick={() => setStatus(r.id,'rejected')}>✕ Rejeitar</button>
                      </>}
                      {tab==='approved' && <button className={styles.btnReject} disabled={busy[r.id]} onClick={() => setStatus(r.id,'rejected')}>Remover</button>}
                      {tab==='rejected' && <button className={styles.btnApprove} disabled={busy[r.id]} onClick={() => setStatus(r.id,'approved')}>Reativar</button>}
                    </div>
                  </div>

                  {/* Dados do usuário — sempre visível */}
                  <div className={styles.cardUser}>
                    <span>👤 <strong>{r.profiles?.nome || '—'}</strong></span>
                    <span>📧 {r.profiles?.email || '—'}</span>
                    <span>📞 {r.profiles?.telefone || '—'}</span>
                    <span>🪪 CPF: {r.profiles?.cpf || '—'}</span>
                    <span>📍 {r.profiles?.endereco || '—'}</span>
                  </div>

                  {/* Expandir descrição + imagens */}
                  <button className={styles.expandBtn} onClick={() => setExpanded(expanded===r.id ? null : r.id)}>
                    {expanded===r.id ? '▲ Ocultar detalhes' : '▼ Ver descrição e imagens'}
                  </button>

                  {expanded === r.id && (
                    <div className={styles.expandContent}>
                      {r.rastreio && (
                        <div className={styles.rastreioBox}>
                          📦 Código de rastreio: <strong>{r.rastreio}</strong>
                        </div>
                      )}
                      <p className={styles.cardDesc}>{r.descricao}</p>
                      {r.reclamacao_imagens?.length > 0 && (
                        <div className={styles.imgRow}>
                          {r.reclamacao_imagens.map((img, i) => (
                            <img
                              key={i}
                              src={getPublicUrl(img.storage_path)}
                              alt=""
                              className={styles.imgThumb}
                              onClick={() => setLightbox(getPublicUrl(img.storage_path))}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className={styles.lightbox} onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className={styles.lightboxImg} />
          <button className={styles.lightboxClose} onClick={() => setLightbox(null)}>✕</button>
        </div>
      )}
    </div>
  )
}
