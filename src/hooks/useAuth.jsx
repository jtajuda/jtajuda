import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
    setLoading(false)
  }

  async function cadastrar({ nome, cpf, endereco, telefone, email, senha }) {
    const telLimpo = telefone.replace(/\D/g, '')
    const cpfLimpo = cpf.replace(/\D/g, '')

    // Verificar duplicatas antes de criar
    const { data: telExiste } = await supabase
      .from('profiles')
      .select('id')
      .eq('telefone', telLimpo)
      .maybeSingle()
    if (telExiste) throw new Error('Este telefone já está cadastrado.')

    const { data: cpfExiste } = await supabase
      .from('profiles')
      .select('id')
      .eq('cpf', cpfLimpo)
      .maybeSingle()
    if (cpfExiste) throw new Error('Este CPF já está cadastrado.')

    // Criar usuário com e-mail real
    const { data, error } = await supabase.auth.signUp({ email, password: senha })
    if (error) throw error

    // Inserir perfil
    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      nome,
      cpf: cpfLimpo,
      endereco,
      telefone: telLimpo,
    })
    if (profileError) throw profileError

    return data
  }

  async function login({ email, senha }) {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) throw error
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, cadastrar, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
