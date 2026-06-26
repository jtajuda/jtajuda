import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Modal from './Modal'
import styles from './ReclamacaoCard.module.css'

function fmtBRL(v) {
  return 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function maskName(n) {
  if (!n) return '?'
  const p = n.trim().split(' ')
  return p.length === 1 ? n : p[0] + ' ' + p.slice(1).map(x => x[0] + '***').join(' ')
}
function initials(n) {
  if (!n) return '?'
  const p = n.trim().split(' ')
  return p.length > 1 ? (p[0][0] + p[p.length-1][0]).toUpperCase() : p[0][0].toUpperCase()
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

export default function ReclamacaoCard({ reclamacao }) {
  const [open, setOpen] = useState(false)
  const [imgUrls, setImgUrls] = useState([])

  const r = reclamacao
  const autor = r.profiles?.nome || 'Anônimo'

  useEffect(() => {
    if (r.reclamacao_imagens?.length) {
      setImgUrls(r.reclamacao_imagens.map(img => getPublicUrl(img.storage_path)))
    }
  }, [r])

  return (
    <>
      <div className={styles.card} onClick={() => setOpen(true)}>
        <div className={styles.top}>
          <div className={styles.title}>{r.titulo}</div>
          <span className={styles.badge}>✓ Aprovada</span>
        </div>
        <div className={styles.meta}>
          <span>🛒 {r.site}</span>
          <span>🏷 {r.tipo}</span>
          <span>🕐 {timeAgo(r.created_at)}</span>
        </div>
        <div className={styles.desc}>{r.descricao}</div>
        {imgUrls.length > 0 && (
          <div className={styles.thumbRow}>
            {imgUrls.slice(0,3).map((url, i) => (
              <img key={i} src={url} alt="" className={styles.thumb} />
            ))}
            {imgUrls.length > 3 && (
              <div className={styles.thumbMore}>+{imgUrls.length - 3}</div>
            )}
          </div>
        )}
        <div className={styles.footer}>
          <span className={styles.author}>
            <div className={styles.avatar}>{initials(autor)}</div>
            {maskName(autor)}
          </span>
          <span className={styles.value}>{fmtBRL(r.valor)}</span>
        </div>
      </div>

      <Modal isOpen={open} onClose={() => setOpen(false)} title={r.titulo}>
        <div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:'1rem' }}>
            <span className={styles.pill + ' ' + styles.pillYellow}>{r.tipo}</span>
            <span className={styles.pill + ' ' + styles.pillBlue}>{r.site}</span>
            <span className={styles.pill + ' ' + styles.pillRed}>{fmtBRL(r.valor)}</span>
          </div>
          {imgUrls.length > 0 && (
            <div className={styles.detailImgs}>
              {imgUrls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noreferrer">
                  <img src={url} alt="" className={styles.detailImg} />
                </a>
              ))}
            </div>
          )}
          <h4 style={{ fontSize:'0.75rem', fontWeight:600, color:'#888', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:4 }}>Descrição</h4>
          <p style={{ fontSize:'0.9rem', color:'#333', lineHeight:1.6, whiteSpace:'pre-wrap' }}>{r.descricao}</p>
          <p style={{ fontSize:'0.75rem', color:'#aaa', borderTop:'0.5px solid #eee', paddingTop:'0.75rem', marginTop:'1rem' }}>
            Registrado por {maskName(autor)} · {new Date(r.created_at).toLocaleDateString('pt-BR')}
          </p>
        </div>
      </Modal>
    </>
  )
}
