import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Modal from '../components/Modal'
import NovaReclamacaoForm from '../components/NovaReclamacaoForm'
import ReclamacaoCard from '../components/ReclamacaoCard'
import styles from './HomePage.module.css'

function fmtPreview(val) {
  if (val >= 1000000) return 'R$ ' + (val / 1000000).toFixed(1) + 'M'
  if (val >= 1000) return 'R$ ' + Math.round(val / 1000) + 'k'
  return 'R$ ' + val.toLocaleString('pt-BR', { minimumFractionDigits: 0 })
}

export default function HomePage() {
  const { profile } = useAuth()
  const [reclamacoes, setReclamacoes] = useState([])
  const [stats, setStats] = useState({ total: 0, prejuizo: 0 })
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showLoginAlert, setShowLoginAlert] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('reclamacoes')
      .select('*, profiles(nome), reclamacao_imagens(storage_path)')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })

    if (data) {
      setReclamacoes(data)
      setStats({
        total: data.length,
        prejuizo: data.reduce((s, r) => s + parseFloat(r.valor || 0), 0),
      })
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Realtime: recarrega quando uma reclamação for aprovada
  useEffect(() => {
    const channel = supabase
      .channel('reclamacoes-public')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reclamacoes' }, loadData)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [loadData])

  function handleNovaRecl() {
    if (!profile) { setShowLoginAlert(true); return }
    setShowLoginAlert(false)
    setShowModal(true)
  }

  return (
    <main>
      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.badge}>⚠ Ação Coletiva em Andamento</span>
          <h1 className={styles.h1}>
            Cansado de ser<br />lesado pela <span>J&T?</span>
          </h1>
          <p className={styles.sub}>
            Registre sua reclamação, junte-se a outros lesados e faça parte do processo coletivo contra a J&T Express.
          </p>
          <div className={styles.statsBar}>
            <div className={styles.statItem}>
              <span className={styles.statNum}>{stats.total}</span>
              <span className={styles.statLbl}>reclamações<br />registradas</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statItem}>
              <span className={styles.statNum}>{fmtPreview(stats.prejuizo)}</span>
              <span className={styles.statLbl}>prejuízo<br />estimado</span>
            </div>
          </div>
        </div>
      </section>

      {/* RECLAMAÇÕES */}
      <div className={styles.content}>
        <div className={styles.listHeader}>
          <h2 className={styles.listTitle}>Reclamações</h2>
          <button className={styles.btnNova} onClick={handleNovaRecl}>
            + Nova reclamação
          </button>
        </div>

        {showLoginAlert && (
          <div className={styles.alert}>
            Você precisa estar logado para registrar uma reclamação.{' '}
            <strong>Crie sua conta ou faça login pelo menu acima.</strong>
          </div>
        )}

        {loading ? (
          <div className={styles.empty}>Carregando reclamações...</div>
        ) : reclamacoes.length === 0 ? (
          <div className={styles.empty}>
            <span style={{ fontSize:'2rem', display:'block', marginBottom:'0.75rem' }}>📭</span>
            Nenhuma reclamação aprovada ainda. Seja o primeiro!
          </div>
        ) : (
          <div className={styles.list}>
            {reclamacoes.map(r => (
              <ReclamacaoCard key={r.id} reclamacao={r} />
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Registrar reclamação">
        <NovaReclamacaoForm onSuccess={() => { setShowModal(false); loadData() }} />
      </Modal>
    </main>
  )
}
