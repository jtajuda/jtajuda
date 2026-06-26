import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import s from './Form.module.css'
import styles from './NovaReclamacaoForm.module.css'

const SITES = ['Shopee','Mercado Livre','Amazon','Shein','AliExpress','Magazine Luiza','Americanas','Outro']
const TIPOS = ['Pacote extraviado','Entregue a terceiros','Pacote danificado','Atraso excessivo','Cobrança indevida','Objeto roubado','Outro']

export default function NovaReclamacaoForm({ onSuccess }) {
  const { profile, session } = useAuth()
  const [form, setForm] = useState({ titulo:'', site:'', tipo:'', valor:'', descricao:'' })
  const [images, setImages] = useState([]) // { file, preview }[]
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  function handleImgs(e) {
    const files = Array.from(e.target.files)
    const remaining = 5 - images.length
    const toAdd = files.slice(0, remaining)
    toAdd.forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => setImages(prev => [...prev, { file, preview: ev.target.result }])
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  function removeImg(i) {
    setImages(prev => prev.filter((_, idx) => idx !== i))
  }

  async function uploadImages(reclamacaoId) {
    const paths = []
    for (const { file } of images) {
      const ext = file.name.split('.').pop()
      const path = `${session.user.id}/${reclamacaoId}/${Date.now()}.${ext}`
      const { error } = await supabase.storage
        .from('reclamacoes-imagens')
        .upload(path, file)
      if (error) throw error
      paths.push(path)
    }
    return paths
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.titulo || !form.site || !form.tipo || !form.valor || !form.descricao) {
      setError('Preencha todos os campos obrigatórios.'); return
    }
    if (parseFloat(form.valor) <= 0) { setError('Informe um valor de prejuízo válido.'); return }

    setLoading(true)
    try {
      // 1. Inserir reclamação
      const { data: recl, error: reclError } = await supabase
        .from('reclamacoes')
        .insert({
          user_id: session.user.id,
          titulo: form.titulo,
          site: form.site,
          tipo: form.tipo,
          valor: parseFloat(form.valor),
          descricao: form.descricao,
          status: 'pending',
        })
        .select()
        .single()
      if (reclError) throw reclError

      // 2. Upload de imagens
      if (images.length > 0) {
        const paths = await uploadImages(recl.id)
        const imgRows = paths.map(p => ({ reclamacao_id: recl.id, storage_path: p }))
        const { error: imgError } = await supabase.from('reclamacao_imagens').insert(imgRows)
        if (imgError) throw imgError
      }

      onSuccess()
    } catch (err) {
      setError(err.message || 'Erro ao enviar reclamação.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className={s.error}>{error}</div>}

      <div className={s.row}>
        <label>Título da reclamação *</label>
        <input value={form.titulo} onChange={e => set('titulo', e.target.value)} placeholder="Ex: Pacote extraviado — R$ 350 perdidos" />
      </div>

      <div className={s.twoCol}>
        <div className={s.row}>
          <label>Site/plataforma da compra *</label>
          <select value={form.site} onChange={e => set('site', e.target.value)}>
            <option value="">— Selecione —</option>
            {SITES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className={s.row}>
          <label>Tipo do problema *</label>
          <select value={form.tipo} onChange={e => set('tipo', e.target.value)}>
            <option value="">— Selecione —</option>
            {TIPOS.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className={s.row}>
        <label>Valor estimado do prejuízo (R$) *</label>
        <input type="number" value={form.valor} onChange={e => set('valor', e.target.value)} placeholder="0,00" min="0" step="0.01" />
      </div>

      <div className={s.row}>
        <label>Descreva o ocorrido *</label>
        <textarea value={form.descricao} onChange={e => set('descricao', e.target.value)} placeholder="O que aconteceu? Tentou resolver com a empresa? Qual foi a resposta?" />
      </div>

      <div className={s.row}>
        <label>Imagens (até 5) — comprovantes, print do rastreio, etc.</label>
        {images.length < 5 && (
          <div className={styles.uploadArea} onClick={() => document.getElementById('img-input').click()}>
            <span style={{ fontSize: '1.5rem' }}>📎</span>
            <p>Clique para adicionar fotos ({images.length}/5)</p>
          </div>
        )}
        <input id="img-input" type="file" accept="image/*" multiple style={{ display:'none' }} onChange={handleImgs} />
        {images.length > 0 && (
          <div className={styles.previewRow}>
            {images.map((img, i) => (
              <div key={i} className={styles.thumbWrap}>
                <img src={img.preview} alt="" className={styles.thumb} />
                <button type="button" className={styles.thumbDel} onClick={() => removeImg(i)}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button type="submit" className={s.submit} disabled={loading}>
        {loading ? 'Enviando...' : 'Enviar para análise'}
      </button>
      <p style={{ fontSize:'0.75rem', color:'#999', textAlign:'center', marginTop:'0.5rem' }}>
        Sua reclamação será revisada e publicada em breve.
      </p>
    </form>
  )
}
