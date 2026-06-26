import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import styles from './ReclamacaoDetalhe.module.css'

function fmtBRL(v) { return 'R$ '+parseFloat(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2}) }
function firstName(n) { return n?.trim().split(' ')[0]||'Anônimo' }
function extractCity(e) { if(!e) return ''; const p=e.split(','); return p.length>=3?p[p.length-1].trim():e.split(',').pop().trim() }
function getPublicUrl(path) { const {data}=supabase.storage.from('reclamacoes-imagens').getPublicUrl(path); return data.publicUrl }
function initials(n) { if(!n) return '?'; const p=n.trim().split(' '); return p.length>1?(p[0][0]+p[p.length-1][0]).toUpperCase():p[0][0].toUpperCase() }

export default function ReclamacaoDetalhe({ reclamacao: r, onClose, onLoginRequired }) {
  const { profile, session } = useAuth()
  const [likes, setLikes] = useState(0)
  const [liked, setLiked] = useState(false)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [sending, setSending] = useState(false)
  const imgUrls = (r.reclamacao_imagens||[]).map(i => getPublicUrl(i.storage_path))
  const [imgIdx, setImgIdx] = useState(0)
  const codigo = '#' + String(r.id).padStart(6,'0')

  useEffect(() => {
    loadLikes()
    loadComments()
  }, [r.id])

  async function loadLikes() {
    const { count } = await supabase.from('curtidas').select('*', {count:'exact',head:true}).eq('reclamacao_id', r.id)
    setLikes(count || 0)
    if (session) {
      const { data } = await supabase.from('curtidas').select('id').eq('reclamacao_id', r.id).eq('user_id', session.user.id).maybeSingle()
      setLiked(!!data)
    }
  }

  async function loadComments() {
    const { data } = await supabase.from('comentarios')
      .select('*, profiles(nome)')
      .eq('reclamacao_id', r.id)
      .order('created_at', { ascending: true })
    setComments(data || [])
  }

  async function toggleLike() {
    if (!session) { onClose(); onLoginRequired(); return }
    if (liked) {
      await supabase.from('curtidas').delete().eq('reclamacao_id', r.id).eq('user_id', session.user.id)
      setLikes(l => l-1); setLiked(false)
    } else {
      await supabase.from('curtidas').insert({ reclamacao_id: r.id, user_id: session.user.id })
      setLikes(l => l+1); setLiked(true)
    }
  }

  async function enviarComentario(e) {
    e.preventDefault()
    if (!session) { onClose(); onLoginRequired(); return }
    if (!newComment.trim()) return
    setSending(true)
    await supabase.from('comentarios').insert({ reclamacao_id: r.id, user_id: session.user.id, texto: newComment.trim() })
    setNewComment('')
    await loadComments()
    setSending(false)
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <button className={styles.close} onClick={onClose}>✕</button>

        {/* Código */}
        <div className={styles.codigo}>{codigo}</div>

        {/* Autor */}
        <div className={styles.autor}>
          <div className={styles.avatar}>{initials(r.profiles?.nome)}</div>
          <div>
            <div className={styles.autorNome}>{firstName(r.profiles?.nome)}</div>
            <div className={styles.autorCidade}>{extractCity(r.profiles?.endereco||'')}</div>
          </div>
        </div>

        {/* Título e badges */}
        <h2 className={styles.titulo}>{r.titulo}</h2>
        <div className={styles.badges}>
          <span className={styles.badge + ' ' + styles.badgeBlue}>🛒 {r.site}</span>
          {r.tipo && <span className={styles.badge + ' ' + styles.badgeYellow}>📦 {r.tipo}</span>}
          <span className={styles.badge + ' ' + styles.badgeRed}>{fmtBRL(r.valor)}</span>
        </div>

        {/* Imagens */}
        {imgUrls.length > 0 && (
          <div className={styles.gallery}>
            <img src={imgUrls[imgIdx]} alt="" className={styles.galleryMain} />
            {imgUrls.length > 1 && (
              <div className={styles.galleryThumbs}>
                {imgUrls.map((url, i) => (
                  <img key={i} src={url} alt="" className={`${styles.thumb} ${imgIdx===i?styles.thumbActive:''}`} onClick={() => setImgIdx(i)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Descrição */}
        <div className={styles.section}>
          <h4 className={styles.sectionLabel}>Descrição</h4>
          <p className={styles.descricao}>{r.descricao}</p>
        </div>

        {/* Curtir */}
        <div className={styles.actions}>
          <button className={`${styles.likeBtn} ${liked ? styles.likeBtnActive : ''}`} onClick={toggleLike}>
            {liked ? '❤️' : '🤍'} {likes} {likes === 1 ? 'pessoa apoia' : 'pessoas apoiam'}
          </button>
          <span className={styles.dataRecl}>{new Date(r.created_at).toLocaleDateString('pt-BR', {day:'2-digit',month:'long',year:'numeric'})}</span>
        </div>

        {/* Comentários */}
        <div className={styles.section}>
          <h4 className={styles.sectionLabel}>Comentários ({comments.length})</h4>
          <div className={styles.commentList}>
            {comments.length === 0 && <p className={styles.noComments}>Seja o primeiro a comentar.</p>}
            {comments.map(c => (
              <div key={c.id} className={styles.comment}>
                <div className={styles.commentAvatar}>{initials(c.profiles?.nome)}</div>
                <div>
                  <div className={styles.commentAuthor}>{firstName(c.profiles?.nome)}</div>
                  <div className={styles.commentText}>{c.texto}</div>
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={enviarComentario} className={styles.commentForm}>
            <input
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder={session ? 'Escreva um comentário...' : 'Faça login para comentar'}
              disabled={!session}
            />
            <button type="submit" disabled={sending || !session}>
              {sending ? '...' : 'Enviar'}
            </button>
          </form>
          {!session && (
            <p className={styles.loginHint}>
              <button onClick={() => { onClose(); onLoginRequired() }}>Faça login</button> para curtir e comentar.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
