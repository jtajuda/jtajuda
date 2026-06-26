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
  const [tab, setTab] = useState('pending')
  const [busy, setBusy] = useState({})
  const [expanded, setExpanded] = useState(null)
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total_users: 0, total_valor: 0 })

  useEffect(() => {
    if (!loading && (!profile || !profile.is_admin)) navigate('/')
  }, [loading, profile, navigate])

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('reclamacoes')
      .select('*, profiles(nome, telefone, cpf, endereco, email), reclamacao_imagens(storage_path)')
      .eq('status', tab)
      .order('created_at', { ascending: false })
    setRecls(data || [])
  }, [tab])

  const loadStats = useCallback(async () => {
    const { data: all } = await supabase.from('reclamacoes').select('status, valor')
    const { count: users } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
    if (all) {
      setStats({
        pending: all.filter(r => r.status === 'pending').length,
        approved: all.filter(r => r.status === 'approved').length,
        rejected: all.filter(r => r.status === 'rejected').length,
        total_users: users || 0,
        total_valor: all.filter(r => r.status === 'approved').reduce((s, r) => s + parseFloat(r.valor || 0), 0),
      })
    }
  }, [])

  useEffect(() => {
    if (profile?.is_admin) { load(); loadStats() }
  }, [load, loadStats, profile])

  async function setStatus(id, status) {
    setBusy(b => ({ ...b, [id]: true }))
    await supabase.from('reclamacoes').update({ status }).eq('id', id)
    await load(); await loadStats()
    setBusy(b => ({ ...b, [id]: false }))
  }

  if (loading || !profile?.is_admin) return null

  const tabLabels = { pending: 'Pendentes', approved: 'Aprovadas', rejected: 'Rejeitadas' }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Painel Admin</h1>
          <p className={styles.sub}>Gerencie as reclamações enviadas</p>
        </div>
        <span className={styles.adminBadge}>ADMIN</span>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statNum} style={{ color:'#F5A623' }}>{stats.pending}</span>
          <span className={styles.statLbl}>Pendentes</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum} style={{ color:'#28a745' }}>{stats.approved}</span>
          <span className={styles.statLbl}>Aprovadas</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum} style={{ color:'#C0152A' }}>{stats.rejected}</span>
          <span className={styles.statLbl}>Rejeitadas</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum}>{stats.total_users}</span>
          <span className={styles.statLbl}>Usuários</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum} style={{ color:'#C0152A', fontSize:'1.3rem' }}>
            {stats.total_valor >= 1000 ? 'R$ ' + Math.round(stats.total_valor/1000) + 'k' : 'R$ ' + Math.round(stats.total_valor)}
          </span>
          <span className={styles.statLbl}>Prejuízo total</span>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {Object.entries(tabLabels).map(([key, label]) => (
          <button key={key} className={`${styles.tab} ${tab === key ? styles.tabActive : ''}`} onClick={() => setTab(key)}>
            {label}
            {key === 'pending' && stats.pending > 0 && <span className={styles.tabBadge}>{stats.pending}</span>}
          </button>
        ))}
      </div>

      {recls.length === 0 ? (
        <div className={styles.empty}>
          {tab === 'pending' ? '✓ Nenhuma reclamação pendente.' : 'Nenhuma reclamação nesta categoria.'}
        </div>
      ) : (
        <div className={styles.list}>
          {recls.map(r => (
            <div key={r.id} className={styles.card}>
              <div className={styles.cardTop}>
                <div className={styles.cardInfo}>
                  <h3 className={styles.cardTitle}>{r.titulo}</h3>
                  <div className={styles.cardMeta}>
                    <span>🛒 {r.site}</span>
                    {r.tipo && <span>📦 {r.tipo}</span>}
                    <span className={styles.valor}>{fmtBRL(r.valor)}</span>
                    <span>📅 {new Date(r.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className={styles.cardUser}>
                    <span>👤 <strong>{r.profiles?.nome}</strong></span>
                    <span>📞 {r.profiles?.telefone}</span>
                    <span>📧 {r.profiles?.email || '—'}</span>
                    <span>📍 {r.profiles?.endereco}</span>
                  </div>
                </div>
                <div className={styles.cardActions}>
                  {tab === 'pending' && (<>
                    <button className={styles.btnApprove} disabled={busy[r.id]} onClick={() => setStatus(r.id, 'approved')}>✓ Aprovar</button>
                    <button className={styles.btnReject} disabled={busy[r.id]} onClick={() => setStatus(r.id, 'rejected')}>✕</button>
                  </>)}
                  {tab === 'approved' && <button className={styles.btnReject} disabled={busy[r.id]} onClick={() => setStatus(r.id, 'rejected')}>Remover</button>}
                  {tab === 'rejected' && <button className={styles.btnApprove} disabled={busy[r.id]} onClick={() => setStatus(r.id, 'approved')}>Reativar</button>}
                </div>
              </div>

              <button className={styles.expandBtn} onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
                {expanded === r.id ? '▲ Ocultar detalhes' : '▼ Ver descrição e fotos'}
              </button>

              {expanded === r.id && (
                <div className={styles.expandContent}>
                  <p className={styles.cardDesc}>{r.descricao}</p>
                  {r.reclamacao_imagens?.length > 0 && (
                    <div className={styles.imgRow}>
                      {r.reclamacao_imagens.map((img, i) => (
                        <a key={i} href={getPublicUrl(img.storage_path)} target="_blank" rel="noreferrer">
                          <img src={getPublicUrl(img.storage_path)} alt="" className={styles.imgThumb} />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
