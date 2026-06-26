import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Modal from './Modal'
import styles from './ReclamacaoCard.module.css'

function fmtBRL(v) {
  return 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function initials(n) {
  if (!n) return '?'
  const p = n.trim().split(' ')
  return p.length > 1 ? (p[0][0] + p[p.length-1][0]).toUpperCase() : p[0][0].toUpperCase()
}
function firstName(n) {
  if (!n) return 'Anônimo'
  return n.trim().split(' ')[0]
}
function extractCity(endereco) {
  if (!endereco) return ''
  const parts = endereco.split(',')
  if (parts.length >= 3) return parts[parts.length - 1].trim()
  return endereco.split(',').pop().trim()
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
  const nome = firstName(r.profiles?.nome)
  const cidade = extractCity(r.profiles?.endereco || '')

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
          <span className={styles.value}>{fmtBRL(r.valor)}</span>
        </div>

        <div className={styles.meta}>
          <span>🛒 {r.site}</span>
          {r.tipo && <span>📦 {r.tipo}</span>}
          <span>🕐 {timeAgo(r.created_at)}</span>
        </div>

        <div className={styles.desc}>{r.descricao}</div>

        {imgUrls.length > 0 && (
          <div className={styles.thumbRow}>
            {imgUrls.slice(0, 4).map((url, i) => (
              <img key={i} src={url} alt="" className={styles.thumb} />
            ))}
            {imgUrls.length > 4 && (
              <div className={styles.thumbMore}>+{imgUrls.length - 4}</div>
            )}
          </div>
        )}

        <div className={styles.footer}>
          <span className={styles.author}>
            <div className={styles.avatar}>{initials(r.profiles?.nome)}</div>
            <span>
              <strong>{nome}</strong>
              {cidade && <span className={styles.city}> · {cidade}</span>}
            </span>
          </span>
          <span className={styles.readMore}>Ver detalhes →</span>
        </div>
      </div>

      {/* MODAL DETALHE */}
      <Modal isOpen={open} onClose={() => setOpen(false)} title={r.titulo}>
        <div>
          {/* Pills */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:'1rem' }}>
            <span className={styles.pill + ' ' + styles.pillBlue}>🛒 {r.site}</span>
            {r.tipo && <span className={styles.pill + ' ' + styles.pillYellow}>📦 {r.tipo}</span>}
            <span className={styles.pill + ' ' + styles.pillRed}>{fmtBRL(r.valor)}</span>
          </div>

          {/* Imagens */}
          {imgUrls.length > 0 && (
            <div className={styles.detailImgs}>
              {imgUrls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noreferrer">
                  <img src={url} alt="" className={styles.detailImg} />
                </a>
              ))}
            </div>
          )}

          {/* Descrição */}
          <h4 className={styles.sectionLabel}>Descrição</h4>
          <p style={{ fontSize:'0.92rem', color:'#333', lineHeight:1.7, whiteSpace:'pre-wrap' }}>{r.descricao}</p>

          {/* Rodapé */}
          <div className={styles.detailFooter}>
            <div className={styles.detailAuthor}>
              <div className={styles.avatarLg}>{initials(r.profiles?.nome)}</div>
              <div>
                <div style={{ fontWeight:600, fontSize:'0.88rem' }}>{nome}</div>
                {cidade && <div style={{ fontSize:'0.78rem', color:'#888' }}>{cidade}</div>}
              </div>
            </div>
            <div style={{ fontSize:'0.75rem', color:'#aaa' }}>
              {new Date(r.created_at).toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' })}
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}
