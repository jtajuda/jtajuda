import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Modal from '../components/Modal'
import NovaReclamacaoForm from '../components/NovaReclamacaoForm'
import LoginForm from '../components/LoginForm'
import CadastroForm from '../components/CadastroForm'
import ReclamacaoDetalhe from '../components/ReclamacaoDetalhe'
import styles from './HomePage.module.css'

function fmtPreview(val) {
  return 'R$ ' + parseFloat(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtBRL(v) {
  return 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}
function initials(n) {
  if (!n) return '?'
  const p = n.trim().split(' ')
  return p.length > 1 ? (p[0][0] + p[p.length-1][0]).toUpperCase() : p[0][0].toUpperCase()
}
function firstName(n) { return n?.trim().split(' ')[0] || 'Anônimo' }
function extractCity(endereco) {
  if (!endereco) return ''
  // Novo formato: "Rua X, 123, Bairro, Cidade/SP, CEP..."
  const match = endereco.match(/([^,]+\/[A-Z]{2})/)
  if (match) return match[1].trim()
  // Formato antigo
  const parts = endereco.split(',')
  if (parts.length >= 3) return parts[parts.length - 2].trim()
  return endereco.split(',').pop().trim()
}
function maskCPF(cpf) {
  if (!cpf) return ''
  const c = cpf.replace(/\D/g,'')
  return c.slice(0,3) + '.***.***.** '
}
function timeAgo(ts) {
  const d = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (d < 60) return 'agora'
  if (d < 3600) return Math.floor(d/60) + 'min atrás'
  if (d < 86400) return Math.floor(d/3600) + 'h atrás'
  return Math.floor(d/86400) + 'd atrás'
}
function getPublicUrl(path) {
  const { data } = supabase.storage.from('reclamacoes-imagens').getPublicUrl(path)
  return data.publicUrl
}

export default function HomePage() {
  const { profile } = useAuth()
  const [reclamacoes, setReclamacoes] = useState([])
  const [stats, setStats] = useState({ total: 0, prejuizo: 0 })
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [detalhe, setDetalhe] = useState(null)
  const [contatoForm, setContatoForm] = useState({ nome:'', email:'', mensagem:'' })
  const [contatoEnviado, setContatoEnviado] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('reclamacoes')
      .select('*, profiles(nome, endereco, cpf), reclamacao_imagens(storage_path)')
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
    const channel = supabase.channel('reclamacoes-public')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reclamacoes' }, loadData)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [loadData])

  function handleNovaRecl() {
    if (!profile) { setModal('login'); return }
    setModal('reclamacao')
  }

  async function enviarContato(e) {
    e.preventDefault()
    const { nome, email, mensagem } = contatoForm
    if (!nome || !email || !mensagem) return
    try {
      await supabase.from('contatos_empresa').insert({ nome, email, mensagem })
    } catch (_) {}
    setContatoEnviado(true)
  }

  return (
    <main>
      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.badge}>⚠ Ação Coletiva em Andamento</span>
          <h1 className={styles.h1}>Cansado de ser lesado<br />pela <span>J&T Express?</span></h1>
          <p className={styles.sub}>Registre sua reclamação e junte-se a outras pessoas que também sofrem o mesmo problema. Unidos somos mais fortes.</p>
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
          <button className={styles.btnHero} onClick={handleNovaRecl}>Registrar minha reclamação</button>
        </div>
      </section>

      {/* RECLAMAÇÕES EM GRADE */}
      <div className={styles.content}>
        <div className={styles.listHeader}>
          <h2 className={styles.listTitle}>Reclamações</h2>
          <button className={styles.btnNova} onClick={handleNovaRecl}>+ Nova reclamação</button>
        </div>

        {loading ? (
          <div className={styles.empty}>Carregando...</div>
        ) : reclamacoes.length === 0 ? (
          <div className={styles.empty}><span style={{fontSize:'2.5rem',display:'block',marginBottom:'0.75rem'}}>📭</span>Nenhuma reclamação aprovada ainda. Seja o primeiro!</div>
        ) : (
          <div className={styles.grid}>
            {reclamacoes.map(r => {
              const nome = firstName(r.profiles?.nome)
              const cidade = extractCity(r.profiles?.endereco || '')
              const imgs = r.reclamacao_imagens || []
              return (
                <div key={r.id} className={styles.card} onClick={() => setDetalhe(r)}>
                  {imgs.length > 0 && (
                    <div className={styles.cardImg}>
                      <img src={getPublicUrl(imgs[0].storage_path)} alt="" />
                      {imgs.length > 1 && <span className={styles.imgCount}>+{imgs.length - 1}</span>}
                    </div>
                  )}
                  <div className={styles.cardBody}>
                    <div className={styles.cardAuthor}>
                      <div className={styles.avatar}>{initials(r.profiles?.nome)}</div>
                      <div>
                        <div className={styles.authorName}>{nome}</div>
                        {cidade && <div className={styles.authorCity}>{cidade}</div>}
                      </div>
                    </div>
                    <h3 className={styles.cardTitle}>{r.titulo}</h3>
                    <div className={styles.cardMeta}>
                      <span>🛒 {r.site}</span>
                      {r.tipo && <span>📦 {r.tipo}</span>}
                    </div>
                    <p className={styles.cardDesc}>{r.descricao}</p>
                    <div className={styles.cardFooter}>
                      <span className={styles.cardValor}>{fmtBRL(r.valor)}</span>
                      <span className={styles.cardTime}>{timeAgo(r.created_at)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ATA DE ASSINATURAS */}
      <div className={styles.ataSection}>
        <div className={styles.ataInner}>
          <h2 className={styles.ataTitle}>📋 Ata de Assinaturas</h2>
          <p className={styles.ataSub}>Todas as pessoas registradas nesta ação coletiva</p>
          <div className={styles.ataList}>
            {reclamacoes.map((r, i) => {
              const cidade = extractCity(r.profiles?.endereco || '')
              const cpfMask = maskCPF(r.profiles?.cpf)
              return (
                <div key={r.id} className={styles.ataRow}>
                  <span className={styles.ataNum}>{String(i+1).padStart(3,'0')}</span>
                  <div className={styles.ataInfo}>
                    <strong>{r.profiles?.nome}</strong>
                    {cidade && <span> · {cidade}</span>}
                    {cpfMask && <span className={styles.ataCpf}> · CPF: {cpfMask}</span>}
                  </div>
                  <button className={styles.ataLink} onClick={() => setDetalhe(r)}>
                    #{String(r.id).padStart(6,'0')} →
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* AVISO GRATUITO */}
      <div className={styles.avisoSection}>
        <div className={styles.avisoInner}>
          <span className={styles.avisoIcon}>🛡️</span>
          <div>
            <strong>Este serviço é 100% gratuito.</strong> Não solicitamos nenhum tipo de pagamento. Nosso objetivo é reunir os lesados e buscar a Defensoria Pública para representar coletivamente todos os consumidores prejudicados pela J&T Express, sem nenhum custo para você.
          </div>
        </div>
      </div>

      {/* OBJETIVOS */}
      <div className={styles.objetivosSection}>
        <div className={styles.objetivosInner}>
          <div className={styles.objetivosBadge}>🎯 Nossa Meta</div>
          <h2 className={styles.objetivosTitle}>500 reclamações para agir</h2>
          <p className={styles.objetivosSub}>
            Com 500 reclamações formalizadas, consultaremos um advogado especialista em direito do consumidor para definir a melhor abordagem jurídica coletiva.
          </p>

          {/* Barra de progresso */}
          <div className={styles.progressBox}>
            <div className={styles.progressTop}>
              <span className={styles.progressAtual}>{stats.total} reclamações</span>
              <span className={styles.progressMeta}>meta: 500</span>
            </div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: Math.min((stats.total / 500) * 100, 100) + '%' }}
              />
            </div>
            <div className={styles.progressPct}>{Math.round((stats.total / 500) * 100)}% da meta atingida</div>
          </div>

          {/* Passos */}
          <div className={styles.passosGrid}>
            <div className={`${styles.passo} ${stats.total >= 1 ? styles.passoAtivo : ''}`}>
              <div className={styles.passoNum}>1</div>
              <div className={styles.passoInfo}>
                <strong>Reunir lesados</strong>
                <span>Coletar 500 reclamações formalizadas com dados e provas</span>
              </div>
            </div>
            <div className={`${styles.passo} ${stats.total >= 500 ? styles.passoAtivo : ''}`}>
              <div className={styles.passoNum}>2</div>
              <div className={styles.passoInfo}>
                <strong>Consulta jurídica</strong>
                <span>Apresentar o dossiê a advogados especializados em direito do consumidor</span>
              </div>
            </div>
            <div className={styles.passo}>
              <div className={styles.passoNum}>3</div>
              <div className={styles.passoInfo}>
                <strong>Ação coletiva</strong>
                <span>Levar o caso ao Procon, órgãos reguladores e imprensa</span>
              </div>
            </div>
            <div className={styles.passo}>
              <div className={styles.passoNum}>4</div>
              <div className={styles.passoInfo}>
                <strong>Ressarcimento</strong>
                <span>Buscar que todos os lesados sejam devidamente indenizados</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QUEM SOMOS / MANIFESTO */}
      <div className={styles.sobreSection}>
        <div className={styles.sobreInner}>
          <h2 className={styles.sobreTitle}>Quem somos e por que estamos aqui</h2>
          <p className={styles.sobreText}>
            Somos consumidores brasileiros que sofreram grandes prejuízos com a J&T Express. Compramos produtos em sites nacionais e internacionais — muitos vindos da China — e enfrentamos atrasos absurdos, itens extraviados, mercadorias entregues a terceiros que nada têm a ver conosco, e toda a burocracia possível para tentar reaver nosso dinheiro, sem sucesso.
          </p>
          <p className={styles.sobreText}>
            Diante de várias tentativas de resolução com a empresa, sem nenhum êxito, decidimos criar esta comunidade para reunir e formalizar esses relatos. O objetivo é que isso chegue às mãos de pessoas certas e influentes — tanto dentro da própria empresa, quanto no poder público — porque as pessoas estão sendo muito lesadas e precisam ser ouvidas.
          </p>
          <p className={styles.sobreText}>
            <strong>O intuito desta página não é difamar a J&T Express.</strong> É mudar esse sistema para que ele funcione melhor, e garantir que todas as pessoas que tiveram grandes prejuízos sejam devidamente ressarcidas. Queremos que os extravios parem, que as entregas a terceiros parem, e que o processo de reembolso seja justo e ágil.
          </p>
          <div className={styles.sobreDestaque}>
            💬 <em>"Compramos com confiança. Queremos receber com a mesma confiança."</em>
          </div>
        </div>
      </div>

      {/* CONTATO EMPRESA */}
      <div className={styles.contatoSection}>
        <div className={styles.contatoInner}>
          <h2 className={styles.contatoTitle}>Você representa a J&T Express?</h2>
          <p className={styles.contatoSub}>Se você é funcionário ou representante da empresa e deseja entrar em contato para propor uma solução, preencha o formulário abaixo.</p>
          {contatoEnviado ? (
            <div className={styles.contatoSuccess}>✓ Mensagem enviada! Entraremos em contato em breve.</div>
          ) : (
            <form className={styles.contatoForm} onSubmit={enviarContato}>
              <div className={styles.contatoRow}>
                <input value={contatoForm.nome} onChange={e => setContatoForm(f=>({...f,nome:e.target.value}))} placeholder="Seu nome e cargo" required />
                <input type="email" value={contatoForm.email} onChange={e => setContatoForm(f=>({...f,email:e.target.value}))} placeholder="E-mail corporativo" required />
              </div>
              <textarea value={contatoForm.mensagem} onChange={e => setContatoForm(f=>({...f,mensagem:e.target.value}))} placeholder="Descreva sua proposta ou mensagem..." required />
              <button type="submit">Enviar mensagem</button>
            </form>
          )}
        </div>
      </div>

      {/* MODAIS */}
      <Modal isOpen={modal === 'reclamacao'} onClose={() => setModal(null)} title="Registrar reclamação">
        <NovaReclamacaoForm onSuccess={() => { setModal(null); loadData() }} />
      </Modal>
      <Modal isOpen={modal === 'login'} onClose={() => setModal(null)} title="Entre para registrar">
        <div style={{marginBottom:'1rem',padding:'12px',background:'#fff8e1',borderRadius:'8px',fontSize:'0.85rem',color:'#7a5c00'}}>
          Para registrar uma reclamação você precisa criar uma conta ou fazer login.
        </div>
        <LoginForm onSuccess={() => setModal('reclamacao')} onSwitchToCadastro={() => setModal('cadastro')} />
      </Modal>
      <Modal isOpen={modal === 'cadastro'} onClose={() => setModal(null)} title="Criar conta">
        <CadastroForm onSuccess={() => setModal('reclamacao')} onSwitchToLogin={() => setModal('login')} />
      </Modal>

      {/* DETALHE RECLAMAÇÃO */}
      {detalhe && (
        <ReclamacaoDetalhe
          reclamacao={detalhe}
          onClose={() => setDetalhe(null)}
          onLoginRequired={() => { setDetalhe(null); setModal('login') }}
        />
      )}
    </main>
  )
}
