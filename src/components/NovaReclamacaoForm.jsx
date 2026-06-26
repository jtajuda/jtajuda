import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import s from './Form.module.css'
import styles from './NovaReclamacaoForm.module.css'

const SITES = ['Shopee','Mercado Livre','Amazon','Shein','AliExpress','Magazine Luiza','Americanas','Outro']

function extractCity(endereco) {
  if (!endereco) return ''
  // Tenta pegar a cidade do endereço (formato: "Rua X, bairro, Cidade/UF")
  const parts = endereco.split(',')
  if (parts.length >= 3) {
    return parts[parts.length - 1].trim()
  }
  return endereco.split(',').pop().trim()
}

export default function NovaReclamacaoForm({ onSuccess }) {
  const { profile, session } = useAuth()
  const [form, setForm] = useState({
    titulo: '',
    site: '',
    produto: '',
    valor: '',
    descricao: '',
  })
  const [images, setImages] = useState([]) // { file, preview }[]
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const cidade = extractCity(profile?.endereco || '')

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  function handleImgs(e) {
    const files = Array.from(e.target.files)
    const remaining = 6 - images.length
    const toAdd = files.slice(0, remaining)
    if (files.length > remaining) {
      setError(`Máximo 6 imagens. Adicionando ${toAdd.length}.`)
      setTimeout(() => setError(''), 3000)
    }
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
      const path = `${session.user.id}/${reclamacaoId}/${Date.now()}-${Math.random().toString(36).slice(2,6)}.${ext}`
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
    if (!form.titulo || !form.site || !form.valor || !form.descricao) {
      setError('Preencha todos os campos obrigatórios (*).'); return
    }
    if (parseFloat(form.valor) <= 0) { setError('Informe um valor de prejuízo válido.'); return }

    setLoading(true)
    try {
      const { data: recl, error: reclError } = await supabase
        .from('reclamacoes')
        .insert({
          user_id: session.user.id,
          titulo: form.titulo,
          site: form.site,
          tipo: form.produto || null,
          valor: parseFloat(form.valor),
          descricao: form.descricao,
          status: 'pending',
        })
        .select()
        .single()
      if (reclError) throw reclError

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

      {/* Dados do usuário — somente leitura */}
      <div className={styles.userInfo}>
        <div className={styles.userAvatar}>
          {profile?.nome?.[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <div className={styles.userName}>{profile?.nome}</div>
          <div className={styles.userCity}>{cidade || 'Localização não informada'}</div>
        </div>
      </div>

      <div className={s.row}>
        <label>Título da reclamação *</label>
        <input
          value={form.titulo}
          onChange={e => set('titulo', e.target.value)}
          placeholder="Ex: Pacote extraviado com R$ 350 dentro"
        />
      </div>

      <div className={s.twoCol}>
        <div className={s.row}>
          <label>Plataforma da compra *</label>
          <select value={form.site} onChange={e => set('site', e.target.value)}>
            <option value="">— Selecione —</option>
            {SITES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className={s.row}>
          <label>Valor do prejuízo (R$) *</label>
          <input
            type="number"
            value={form.valor}
            onChange={e => set('valor', e.target.value)}
            placeholder="0,00"
            min="0"
            step="0.01"
          />
        </div>
      </div>

      <div className={s.row}>
        <label>Produto (opcional)</label>
        <input
          value={form.produto}
          onChange={e => set('produto', e.target.value)}
          placeholder="Ex: Tênis Nike, Celular Samsung, etc."
        />
      </div>

      <div className={s.row}>
        <label>Descrição completa da reclamação *</label>
        <textarea
          value={form.descricao}
          onChange={e => set('descricao', e.target.value)}
          placeholder="O que aconteceu? Qual foi o problema? Tentou resolver com a J&T? Qual foi a resposta deles?"
          style={{ minHeight: '100px' }}
        />
      </div>

      <div className={s.row}>
        <label>Fotos — comprovantes, print do rastreio, foto do dano, etc. (até 6)</label>
        {images.length < 6 && (
          <div
            className={styles.uploadArea}
            onClick={() => document.getElementById('img-input-recl').click()}
          >
            <span style={{ fontSize: '1.8rem' }}>📷</span>
            <p>Clique para adicionar fotos <strong>({images.length}/6)</strong></p>
          </div>
        )}
        <input
          id="img-input-recl"
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleImgs}
        />
        {images.length > 0 && (
          <div className={styles.previewRow}>
            {images.map((img, i) => (
              <div key={i} className={styles.thumbWrap}>
                <img src={img.preview} alt="" className={styles.thumb} />
                <button type="button" className={styles.thumbDel} onClick={() => removeImg(i)}>✕</button>
              </div>
            ))}
            {images.length < 6 && (
              <div
                className={styles.addMore}
                onClick={() => document.getElementById('img-input-recl').click()}
              >
                +
              </div>
            )}
          </div>
        )}
      </div>

      <button type="submit" className={s.submit} disabled={loading}>
        {loading ? 'Enviando...' : 'Enviar reclamação para análise'}
      </button>
      <p style={{ fontSize: '0.75rem', color: '#999', textAlign: 'center', marginTop: '0.5rem' }}>
        Sua reclamação será revisada e publicada em breve após aprovação.
      </p>
    </form>
  )
}
