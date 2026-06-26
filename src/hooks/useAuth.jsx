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

  // Supabase Auth usa e-mail; usamos telefone como "e-mail" fictício
  // formato: telefone@jt-lesados.app
  function phoneToEmail(tel) {
    return `u${tel.replace(/\D/g, '')}@jtajuda.com`
  }

  async function cadastrar({ nome, cpf, endereco, telefone, senha }) {
    const email = phoneToEmail(telefone)
    const { data, error } = await supabase.auth.signUp({ email, password: senha })
    if (error) throw error

    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      nome,
      cpf,
      endereco,
      telefone: telefone.replace(/\D/g, ''),
    })
    if (profileError) throw profileError
    return data
  }

  async function login({ telefone, senha }) {
    const email = phoneToEmail(telefone)
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
