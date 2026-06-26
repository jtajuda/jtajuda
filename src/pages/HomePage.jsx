import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Modal from '../components/Modal'
import NovaReclamacaoForm from '../components/NovaReclamacaoForm'
import LoginForm from '../components/LoginForm'
import CadastroForm from '../components/CadastroForm'
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
  const [modal, setModal] = useState(null) // 'reclamacao' | 'login' | 'cadastro' | null

  const loadData = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('reclamacoes')
      .select('*, profiles(nome, endereco), reclamacao_imagens(storage_path)')
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

  useEffect(() => {
    const channel = supabase
      .channel('reclamacoes-public')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reclamacoes' }, loadData)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [loadData])

  function handleNovaRecl() {
    if (!profile) { setModal('login'); return }
    setModal('reclamacao')
  }

  return (
    <main>
      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.badge}>⚠ Ação Coletiva em Andamento</span>
          <h1 className={styles.h1}>
            Cansado de ser lesado<br />pela <span>J&T Express?</span>
          </h1>
          <p className={styles.sub}>
            Registre sua reclamação e junte-se a outras pessoas que também sofrem o mesmo problema. Unidos somos mais fortes.
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
          <button className={styles.btnHero} onClick={handleNovaRecl}>
            Registrar minha reclamação
          </button>
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

        {loading ? (
          <div className={styles.empty}>Carregando reclamações...</div>
        ) : reclamacoes.length === 0 ? (
          <div className={styles.empty}>
            <span style={{ fontSize:'2.5rem', display:'block', marginBottom:'0.75rem' }}>📭</span>
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

      {/* MODAL RECLAMAÇÃO */}
      <Modal isOpen={modal === 'reclamacao'} onClose={() => setModal(null)} title="Registrar reclamação">
        <NovaReclamacaoForm onSuccess={() => { setModal(null); loadData() }} />
      </Modal>

      {/* MODAL LOGIN — abre quando não está logado */}
      <Modal isOpen={modal === 'login'} onClose={() => setModal(null)} title="Entre para registrar">
        <div style={{ marginBottom:'1rem', padding:'12px', background:'#fff8e1', borderRadius:'8px', fontSize:'0.85rem', color:'#7a5c00' }}>
          Para registrar uma reclamação você precisa criar uma conta ou fazer login.
        </div>
        <LoginForm
          onSuccess={() => setModal('reclamacao')}
          onSwitchToCadastro={() => setModal('cadastro')}
        />
      </Modal>

      {/* MODAL CADASTRO */}
      <Modal isOpen={modal === 'cadastro'} onClose={() => setModal(null)} title="Criar conta">
        <CadastroForm
          onSuccess={() => setModal('reclamacao')}
          onSwitchToLogin={() => setModal('login')}
        />
      </Modal>
    </main>
  )
}
