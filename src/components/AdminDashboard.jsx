import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function AdminDashboard({ contestants, setContestants, winnersAnnounced, setWinnersAnnounced, notify, currentUser }) {
  const [formData, setFormData] = useState({ name: '', post: '', image: '', bio: '' })
  const [imageFile, setImageFile] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [users, setUsers] = useState([])
  const [votes, setVotes] = useState([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({ totalVotes: 0, totalContestants: 0, totalVoters: 0 })
  const [editingVoteId, setEditingVoteId] = useState(null)
  const [voteInputValue, setVoteInputValue] = useState('')

  // Calculate statistics
  useEffect(() => {
    const totalVotes = contestants.reduce((sum, c) => sum + (c.votes || 0), 0)
    const totalContestants = contestants.length
    setStats({
      totalVotes,
      totalContestants,
      totalVoters: users.length
    })
  }, [contestants, users])

  // Fetch data when switching tabs
  const handleTabChange = async (tab) => {
    setActiveTab(tab)
    try {
      if (tab === 'voters') {
        const { data } = await supabase.from('users').select('*')
        setUsers(data || [])
      } else if (tab === 'results') {
        const { data } = await supabase.from('votes').select('*')
        setVotes(data || [])
      }
    } catch (error) {
      notify('Error fetching data')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      if (!formData.name || !formData.post) {
        notify('Name and post are required')
        return
      }

      let imageUrl = formData.image

      // If an image file was selected, upload it to Supabase Storage
      if (imageFile) {
        try {
          const fileExt = imageFile.name.split('.').pop()
          const fileName = `${crypto.randomUUID?.() || Date.now()}.${fileExt}`
          const filePath = `${fileName}`

          const { error: uploadError } = await supabase.storage
            .from('contestant-images')
            .upload(filePath, imageFile, {
              cacheControl: '3600',
              upsert: true
            })

          if (uploadError) {
            console.warn('Image upload failed, continuing without image:', uploadError)
            notify('Note: Image upload failed, contestant added without image')
          } else {
            const { data: publicUrlData } = supabase.storage
              .from('contestant-images')
              .getPublicUrl(filePath)

            imageUrl = publicUrlData?.publicUrl || imageUrl
          }
        } catch (error) {
          console.warn('Image upload error:', error)
          notify('Note: Image upload failed, contestant added without image')
        }
      }

      const { error } = await supabase
        .from('contestants')
        .insert([{
          name: formData.name,
          post: formData.post,
          image: imageUrl,
          bio: formData.bio,
          votes: 0
        }])

      if (error) throw error

      notify('Contestant added successfully!')
      setFormData({ name: '', post: '', image: '', bio: '' })
      setImageFile(null)

      // Refresh contestants
      const { data } = await supabase
        .from('contestants')
        .select('*')
        .order('post', { ascending: true })
      setContestants(data || [])
    } catch (error) {
      notify(error.message || 'Error adding contestant')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteContestant = async (id) => {
    if (!window.confirm('Are you sure you want to delete this contestant?')) return
    
    try {
      const { error } = await supabase
        .from('contestants')
        .delete()
        .eq('id', id)

      if (error) throw error

      notify('Contestant removed')
      setContestants(contestants.filter(c => c.id !== id))
    } catch (error) {
      notify(error.message || 'Error deleting contestant')
    }
  }

  const handleAdjustVote = async (id, amount) => {
    try {
      const contestant = contestants.find(c => c.id === id)
      const newVotes = Math.max(0, (contestant?.votes || 0) + amount)

      const { error } = await supabase
        .from('contestants')
        .update({ votes: newVotes })
        .eq('id', id)

      if (error) throw error

      setContestants(contestants.map(c => 
        c.id === id ? { ...c, votes: newVotes } : c
      ))
      notify(`Vote count adjusted (${newVotes} total)`)
    } catch (error) {
      notify(error.message || 'Error adjusting votes')
    }
  }

  const handleSetVotesDirectly = async (id, newVotesValue) => {
    try {
      const newVotes = Math.max(0, parseInt(newVotesValue) || 0)
      const contestant = contestants.find(c => c.id === id)
      
      if (newVotes === (contestant?.votes || 0)) {
        setEditingVoteId(null)
        setVoteInputValue('')
        return
      }

      const { error } = await supabase
        .from('contestants')
        .update({ votes: newVotes })
        .eq('id', id)

      if (error) throw error

      setContestants(contestants.map(c => 
        c.id === id ? { ...c, votes: newVotes } : c
      ))
      notify(`Votes set to ${newVotes}`)
      setEditingVoteId(null)
      setVoteInputValue('')
    } catch (error) {
      notify(error.message || 'Error setting votes')
    }
  }

  const startEditingVotes = (id, currentVotes) => {
    setEditingVoteId(id)
    setVoteInputValue(currentVotes.toString())
  }

  const handleToggleResults = async () => {
    try {
      // Get the first election status record (should be only one)
      const { data: statusData } = await supabase
        .from('election_status')
        .select('id')
        .limit(1)
        .single()

      if (statusData) {
        const { error } = await supabase
          .from('election_status')
          .update({ results_announced: !winnersAnnounced })
          .eq('id', statusData.id)

        if (error) throw error
      }

      setWinnersAnnounced(!winnersAnnounced)
      notify(winnersAnnounced ? 'Results withdrawn' : 'Results announced!')
    } catch (error) {
      notify(error.message || 'Error updating election status')
    }
  }

  const resetAllVotes = async () => {
    if (!window.confirm('Reset ALL votes? This cannot be undone!')) return
    
    try {
      const { error: deleteError } = await supabase.from('votes').delete().neq('id', null)
      if (deleteError) throw deleteError

      const { error: resetError } = await supabase
        .from('contestants')
        .update({ votes: 0 })
        .neq('id', null)

      if (resetError) throw resetError

      const { data } = await supabase.from('contestants').select('*')
      setContestants(data || [])
      notify('All votes reset successfully')
    } catch (error) {
      notify(error.message || 'Error resetting votes')
    }
  }

  const getWinners = () => {
    const positions = [...new Set(contestants.map(c => c.post))]
    return positions.map(post => {
      const winner = contestants
        .filter(c => c.post === post)
        .sort((a, b) => (b.votes || 0) - (a.votes || 0))[0]
      return { post, winner }
    })
  }

  return (
    <div className="space-y-8 text-slate-100 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-xl">
      {/* Header with Statistics */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl text-white shadow-lg">
          <div className="text-blue-100 text-sm font-semibold uppercase mb-1">Total Votes Cast</div>
          <div className="text-4xl font-bold">{stats.totalVotes}</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-2xl text-white shadow-lg">
          <div className="text-purple-100 text-sm font-semibold uppercase mb-1">Contestants</div>
          <div className="text-4xl font-bold">{stats.totalContestants}</div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-2xl text-white shadow-lg">
          <div className="text-green-100 text-sm font-semibold uppercase mb-1">Registered Voters</div>
          <div className="text-4xl font-bold">{stats.totalVoters}</div>
        </div>
        <div className={`bg-gradient-to-br ${winnersAnnounced ? 'from-amber-500 to-amber-600' : 'from-slate-500 to-slate-600'} p-6 rounded-2xl text-white shadow-lg`}>
          <div className="text-amber-100 text-sm font-semibold uppercase mb-1">Election Status</div>
          <div className="text-lg font-bold">{winnersAnnounced ? '🏆 Results Out' : '🗳️ Voting Live'}</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-700">
        <button 
          onClick={() => handleTabChange('overview')}
          className={`pb-4 px-4 font-bold transition-all ${activeTab === 'overview' ? 'text-blue-300 border-b-2 border-blue-400' : 'text-slate-400 hover:text-slate-200'}`}
        >
          Overview
        </button>
        <button 
          onClick={() => handleTabChange('contestants')}
          className={`pb-4 px-4 font-bold transition-all ${activeTab === 'contestants' ? 'text-blue-300 border-b-2 border-blue-400' : 'text-slate-400 hover:text-slate-200'}`}
        >
          Manage Contestants
        </button>
        <button 
          onClick={() => handleTabChange('results')}
          className={`pb-4 px-4 font-bold transition-all ${activeTab === 'results' ? 'text-blue-300 border-b-2 border-blue-400' : 'text-slate-400 hover:text-slate-200'}`}
        >
          Results & Winners
        </button>
        <button 
          onClick={() => handleTabChange('voters')}
          className={`pb-4 px-4 font-bold transition-all ${activeTab === 'voters' ? 'text-blue-300 border-b-2 border-blue-400' : 'text-slate-400 hover:text-slate-200'}`}
        >
          Voters ({users.length})
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={handleToggleResults}
              className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${winnersAnnounced ? 'bg-red-500 text-white shadow-lg shadow-red-100 hover:bg-red-600' : 'bg-green-600 text-white shadow-lg shadow-green-100 hover:bg-green-700'}`}
            >
              <i className={`fas ${winnersAnnounced ? 'fa-lock-open' : 'fa-bullhorn'}`}></i>
              {winnersAnnounced ? 'Withdraw Results' : 'Announce Results'}
            </button>
            <button 
              onClick={resetAllVotes}
              className="px-6 py-3 rounded-xl font-bold bg-amber-500 text-white shadow-lg shadow-amber-100 hover:bg-amber-600 transition-all flex items-center gap-2"
            >
              <i className="fas fa-redo"></i>
              Reset All Votes
            </button>
            <button 
              onClick={() => handleTabChange('contestants')}
              className="px-6 py-3 rounded-xl font-bold bg-blue-500 text-white shadow-lg shadow-blue-100 hover:bg-blue-600 transition-all flex items-center gap-2"
            >
              <i className="fas fa-edit"></i>
              Manual Vote Adjustment
            </button>
          </div>

          {/* Current Winners */}
          <div className="grid md:grid-cols-2 gap-6">
            {getWinners().map(({ post, winner }) => (
              <div key={post} className="bg-slate-800 rounded-2xl shadow-sm border border-slate-700 p-6">
                <h3 className="text-sm font-bold text-blue-300 uppercase mb-3">{post}</h3>
                {winner ? (
                  <div className="flex items-center gap-4">
                    <img src={winner.image} className="w-16 h-16 rounded-full object-cover ring-2 ring-blue-200" alt={winner.name} />
                    <div>
                      <p className="font-bold text-white">{winner.name}</p>
                      <p className="text-2xl font-bold text-blue-300">{winner.votes} votes</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400">No contestants</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contestants Tab */}
      {activeTab === 'contestants' && (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Add Form */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-700 sticky top-8">
              <h2 className="text-xl font-bold mb-6 text-white">Add New Contestant</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Full Name *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="John Doe"
                    className="w-full px-4 py-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Position / Post *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. President"
                    className="w-full px-4 py-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.post}
                    onChange={e => setFormData({...formData, post: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-300">Candidate Photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="w-full text-sm text-slate-200 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                    onChange={e => setImageFile(e.target.files?.[0] || null)}
                  />
                  <p className="text-xs text-slate-500">
                    Upload a clear square image (JPG or PNG). Optional: if left empty, a placeholder will be used.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Short Bio</label>
                  <textarea 
                    placeholder="Brief biography..."
                    className="w-full px-4 py-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none"
                    value={formData.bio}
                    onChange={e => setFormData({...formData, bio: e.target.value})}
                  ></textarea>
                </div>
                <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
                  {loading ? 'Adding...' : '+ Add Contestant'}
                </button>
              </form>
            </div>
          </div>

          {/* Contestants List */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800 rounded-2xl shadow-sm border border-slate-700 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-700 border-b border-slate-600">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-slate-200">Contestant</th>
                    <th className="px-6 py-4 font-semibold text-slate-200">Post</th>
                    <th className="px-6 py-4 font-semibold text-slate-200 text-center">Votes</th>
                    <th className="px-6 py-4 font-semibold text-slate-200 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {contestants.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-slate-400">
                        No contestants added yet
                      </td>
                    </tr>
                  ) : (
                    contestants.map(c => (
                      <tr key={c.id} className="hover:bg-slate-700/40 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img src={c.image || 'https://via.placeholder.com/40'} className="w-10 h-10 rounded-full object-cover" alt={c.name} />
                            <span className="font-medium text-white">{c.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-300 text-sm">{c.post}</td>
                        <td className="px-6 py-4">
                          {editingVoteId === c.id ? (
                            <div className="flex items-center justify-center gap-2">
                              <input 
                                type="number" 
                                min="0"
                                value={voteInputValue}
                                onChange={(e) => setVoteInputValue(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSetVotesDirectly(c.id, voteInputValue)}
                                autoFocus
                                className="w-16 px-2 py-1 rounded bg-slate-900 border border-blue-500 text-blue-200 text-center font-bold focus:outline-none focus:ring-2 focus:ring-blue-400"
                              />
                              <button 
                                onClick={() => handleSetVotesDirectly(c.id, voteInputValue)}
                                className="px-2 py-1 rounded bg-green-600 text-white text-xs font-bold hover:bg-green-700"
                                title="Save"
                              >
                                <i className="fas fa-check"></i>
                              </button>
                              <button 
                                onClick={() => {
                                  setEditingVoteId(null)
                                  setVoteInputValue('')
                                }}
                                className="px-2 py-1 rounded bg-slate-600 text-white text-xs font-bold hover:bg-slate-700"
                                title="Cancel"
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => handleAdjustVote(c.id, -1)}
                                className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center hover:bg-red-200 text-red-600"
                                title="Decrease vote by 1"
                              >
                                <i className="fas fa-minus text-[9px]"></i>
                              </button>
                              <button 
                                onClick={() => startEditingVotes(c.id, c.votes || 0)}
                                className="bg-blue-900/60 text-blue-200 px-3 py-1 rounded-full text-sm font-bold w-14 text-center hover:bg-blue-800 cursor-pointer transition-colors"
                                title="Click to edit votes"
                              >
                                {c.votes || 0}
                              </button>
                              <button 
                                onClick={() => handleAdjustVote(c.id, 1)}
                                className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center hover:bg-green-200 text-green-600"
                                title="Increase vote by 1"
                              >
                                <i className="fas fa-plus text-[9px]"></i>
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleDeleteContestant(c.id)}
                            className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Results Tab */}
      {activeTab === 'results' && (
        <div className="space-y-6">
          {getWinners().map(({ post, winner }) => {
            const others = contestants.filter(c => c.post === post && c.id !== winner?.id).sort((a, b) => (b.votes || 0) - (a.votes || 0))
            return (
              <div key={post} className="bg-slate-800 rounded-2xl shadow-sm border border-slate-700 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-700 to-blue-800 p-6 text-white">
                  <h3 className="text-lg font-bold">{post}</h3>
                </div>
                <div className="p-6">
                  {winner ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-amber-900/40 to-yellow-900/30 border-2 border-amber-600/50">
                        <div className="text-3xl">🥇</div>
                        <img src={winner.image} className="w-12 h-12 rounded-full object-cover" alt={winner.name} />
                        <div className="flex-1">
                          <p className="font-bold text-white">{winner.name}</p>
                          <p className="text-sm text-slate-300">{winner.votes} votes</p>
                        </div>
                        <div className="text-2xl font-bold text-amber-300">{winner.votes}</div>
                      </div>
                      {others.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-slate-400 uppercase">Other Candidates</p>
                          {others.map((c, idx) => (
                            <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800 border border-slate-700">
                              <span className="text-sm font-bold text-slate-400">{idx + 2}</span>
                              <img src={c.image} className="w-8 h-8 rounded-full object-cover grayscale" alt={c.name} />
                              <p className="flex-1 font-medium text-slate-200">{c.name}</p>
                              <span className="font-bold text-slate-300">{c.votes} votes</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-400">No contestants for this position</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Voters Tab */}
      {activeTab === 'voters' && (
        <div className="bg-slate-800 rounded-2xl shadow-sm border border-slate-700 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-700 border-b border-slate-600">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-200">Name</th>
                <th className="px-6 py-4 font-semibold text-slate-200">Email</th>
                <th className="px-6 py-4 font-semibold text-slate-200">Role</th>
                <th className="px-6 py-4 font-semibold text-slate-200 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {users.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-slate-400">
                    No voters registered
                  </td>
                </tr>
              ) : (
                users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-700/40 transition-colors">
                    <td className="px-6 py-4 font-medium">{u.name}</td>
                    <td className="px-6 py-4 text-slate-300 text-sm">{u.email}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${
                          (u.user_role || u.role) === 'admin'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-slate-700 text-slate-200'
                        }`}
                      >
                        {u.user_role || u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-green-300 text-sm font-medium flex items-center gap-1 justify-end">
                        <i className="fas fa-check-circle"></i> Registered
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
