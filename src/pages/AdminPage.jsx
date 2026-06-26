import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import styles from './AdminPage.module.css'

function fmtBRL(v) {
  return 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}
function maskName(n) {
  if (!n) return '?'
  const p = n.trim().split(' ')
  return p.length === 1 ? n : p[0] + ' ' + p.slice(1).map(x => x[0] + '***').join(' ')
}

export default function AdminPage() {
  const { profile, loading } = useAuth()
  const navigate = useNavigate()
  const [recls, setRecls] = useState([])
  const [tab, setTab] = useState('pending') // pending | approved | rejected
  const [busy, setBusy] = useState({})

  useEffect(() => {
    if (!loading && (!profile || !profile.is_admin)) navigate('/')
  }, [loading, profile, navigate])

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('reclamacoes')
      .select('*, profiles(nome, telefone, cpf), reclamacao_imagens(storage_path)')
      .eq('status', tab)
      .order('created_at', { ascending: false })
    setRecls(data || [])
  }, [tab])

  useEffect(() => { if (profile?.is_admin) load() }, [load, profile])

  async function setStatus(id, status) {
    setBusy(b => ({ ...b, [id]: true }))
    await supabase.from('reclamacoes').update({ status }).eq('id', id)
    await load()
    setBusy(b => ({ ...b, [id]: false }))
  }

  if (loading || !profile?.is_admin) return null

  const tabCounts = { pending: recls.filter(r => r.status === tab).length }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Painel Admin</h1>
          <p className={styles.sub}>Revise e publique as reclamações enviadas</p>
        </div>
        <span className={styles.adminBadge}>ADMIN</span>
      </div>

      <div className={styles.tabs}>
        {['pending','approved','rejected'].map(t => (
          <button key={t} className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`} onClick={() => setTab(t)}>
            {{ pending:'Pendentes', approved:'Aprovadas', rejected:'Rejeitadas' }[t]}
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
                    <span>🏷 {r.tipo}</span>
                    <span className={styles.valor}>{fmtBRL(r.valor)}</span>
                    <span>📅 {new Date(r.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className={styles.cardUser}>
                    Usuário: <strong>{maskName(r.profiles?.nome)}</strong>
                    {' · '}Tel: {r.profiles?.telefone}
                    {' · '}CPF: {r.profiles?.cpf}
                  </div>
                </div>
                {tab === 'pending' && (
                  <div className={styles.cardActions}>
                    <button
                      className={styles.btnApprove}
                      disabled={busy[r.id]}
                      onClick={() => setStatus(r.id, 'approved')}
                    >
                      {busy[r.id] ? '...' : '✓ Aprovar'}
                    </button>
                    <button
                      className={styles.btnReject}
                      disabled={busy[r.id]}
                      onClick={() => setStatus(r.id, 'rejected')}
                    >
                      ✕
                    </button>
                  </div>
                )}
                {tab === 'approved' && (
                  <button
                    className={styles.btnReject}
                    disabled={busy[r.id]}
                    onClick={() => setStatus(r.id, 'rejected')}
                    title="Remover da lista pública"
                  >
                    Remover
                  </button>
                )}
                {tab === 'rejected' && (
                  <button
                    className={styles.btnApprove}
                    disabled={busy[r.id]}
                    onClick={() => setStatus(r.id, 'approved')}
                  >
                    Reativar
                  </button>
                )}
              </div>
              <p className={styles.cardDesc}>{r.descricao}</p>
              {r.reclamacao_imagens?.length > 0 && (
                <div className={styles.imgRow}>
                  {r.reclamacao_imagens.map((img, i) => {
                    const { data } = supabase.storage.from('reclamacoes-imagens').getPublicUrl(img.storage_path)
                    return (
                      <a key={i} href={data.publicUrl} target="_blank" rel="noreferrer">
                        <img src={data.publicUrl} alt="" className={styles.imgThumb} />
                      </a>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
