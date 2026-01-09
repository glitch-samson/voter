import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function AuthScreen({ onAuthSuccess, notify }) {
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        })
        
        if (error) throw error
        
        if (data.user) {
          let userData = await supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single()
          
          // If user doesn't exist in users table, create them
          if (!userData.data) {
            await supabase.from('users').insert([{
              id: data.user.id,
              email: data.user.email,
              name: data.user.email.split('@')[0],
              role: 'voter'
            }])
            
            userData = await supabase
              .from('users')
              .select('*')
              .eq('id', data.user.id)
              .single()
          }
          
          onAuthSuccess({ ...data.user, ...userData.data })
          notify('Welcome back!')
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              name: formData.name,
            },
          },
        })
        
        if (error) throw error
        
        if (data.user) {
          const { error: insertError } = await supabase
            .from('users')
            .insert([{
              id: data.user.id,
              email: formData.email,
              name: formData.name,
              role: 'voter'
            }])
          
          if (insertError) throw insertError
          
          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single()
          
          onAuthSuccess({ ...data.user, ...userData })
          notify('Account created successfully!')
        }
      }
    } catch (error) {
      notify(error.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white text-3xl">
            <i className="fas fa-vote-yea"></i>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
          <p className="text-slate-500 mt-2">Secure Institutional Voting System</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input 
                type="text" 
                required
                placeholder="John Doe"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <input 
              type="email" 
              required
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-slate-600 text-xs font-semibold"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
          >
            {loading ? 'Loading...' : (isLogin ? 'Sign In' : 'Register Now')}
          </button>
        </form>

        <p className="text-center mt-6 text-slate-600">
          {isLogin ? "Don't have an account?" : "Already registered?"}
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="ml-2 text-blue-600 font-bold hover:underline"
          >
            {isLogin ? 'Sign Up' : 'Login'}
          </button>
        </p>
        
        <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300">
          <p className="text-xs text-slate-500 text-center">
            <strong>Demo Admin:</strong> Create an account or use Supabase Auth
          </p>
        </div>
      </div>
    </div>
  )
}
