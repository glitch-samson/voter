import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function AdminDashboard({ contestants, setContestants, posts, setPosts, winnersAnnounced, setWinnersAnnounced, notify, currentUser }) {
  const [formData, setFormData] = useState({ name: '', post: '', image: '', bio: '' })
  const [imageFile, setImageFile] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [users, setUsers] = useState([])
  const [votes, setVotes] = useState([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({ totalVotes: 0, totalContestants: 0, totalVoters: 0 })
  const [editingVoteId, setEditingVoteId] = useState(null)
  const [voteInputValue, setVoteInputValue] = useState('')
  const [postFormData, setPostFormData] = useState({ name: '', description: '' })
  const [voteFilterPostId, setVoteFilterPostId] = useState('all')
  const [voteFilterContestantId, setVoteFilterContestantId] = useState('all')

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

  // Real-time subscription for contestants (vote updates)
  useEffect(() => {
    const channel = supabase
      .channel('contestants-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'contestants'
        },
        async (payload) => {
          // Refresh contestants when any change occurs
          const { data } = await supabase
            .from('contestants')
            .select('*')
            .order('post_id', { ascending: true })
          
          if (data) {
            setContestants(data)
            // Show notification for vote updates (only if vote count changed)
            if (payload.eventType === 'UPDATE' && payload.new.votes !== payload.old?.votes) {
              const contestant = data.find(c => c.id === payload.new.id)
              if (contestant) {
                // Only notify if it's a user vote (not admin adjustment)
                // Admin adjustments will show their own notification
                const voteDiff = payload.new.votes - (payload.old?.votes || 0)
                if (voteDiff === 1) {
                  notify(`New vote: ${contestant.name} now has ${contestant.votes} votes`)
                }
              }
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Real-time subscription for votes (new votes being cast)
  useEffect(() => {
    const channel = supabase
      .channel('votes-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT', // Only listen to new votes
          schema: 'public',
          table: 'votes'
        },
        async () => {
          // Refresh votes list if on results tab (with enriched data)
          if (activeTab === 'results') {
            const { data: votesData } = await supabase
              .from('votes')
              .select('*')
              .order('created_at', { ascending: false })

            if (votesData && votesData.length > 0) {
              const userIds = [...new Set(votesData.map(v => v.user_id))]
              const contestantIds = [...new Set(votesData.map(v => v.contestant_id))]

              const { data: usersData } = await supabase
                .from('users')
                .select('id, name, email')
                .in('id', userIds)

              const { data: contestantsData } = await supabase
                .from('contestants')
                .select('id, name, image, post_id')
                .in('id', contestantIds)

              const enrichedVotes = votesData.map(vote => ({
                ...vote,
                user: usersData?.find(u => u.id === vote.user_id),
                contestant: contestantsData?.find(c => c.id === vote.contestant_id)
              }))

              setVotes(enrichedVotes)
            }
          }
          
          // Refresh contestants to get updated vote counts
          const { data } = await supabase
            .from('contestants')
            .select('*')
            .order('post_id', { ascending: true })
          
          if (data) {
            setContestants(data)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeTab])

  // Fetch data when switching tabs
  const handleTabChange = async (tab) => {
    setActiveTab(tab)
    try {
      if (tab === 'voters') {
        const { data } = await supabase.from('users').select('*')
        setUsers(data || [])
      } else if (tab === 'results') {
        // Fetch votes with user and contestant information
        const { data: votesData, error: votesError } = await supabase
          .from('votes')
          .select('*')
          .order('created_at', { ascending: false })
        
        if (votesError) throw votesError

        // Fetch related user and contestant data
        if (votesData && votesData.length > 0) {
          const userIds = [...new Set(votesData.map(v => v.user_id))]
          const contestantIds = [...new Set(votesData.map(v => v.contestant_id))]

          const { data: usersData } = await supabase
            .from('users')
            .select('id, name, email')
            .in('id', userIds)

          const { data: contestantsData } = await supabase
            .from('contestants')
            .select('id, name, image, post_id')
            .in('id', contestantIds)

          // Combine the data
          const enrichedVotes = votesData.map(vote => ({
            ...vote,
            user: usersData?.find(u => u.id === vote.user_id),
            contestant: contestantsData?.find(c => c.id === vote.contestant_id)
          }))

          setVotes(enrichedVotes)
        } else {
          setVotes([])
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
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

      let imageUrl = ''

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

            imageUrl = publicUrlData?.publicUrl || ''
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
          post_id: formData.post,
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
        .order('post_id', { ascending: true })
      setContestants(data || [])
    } catch (error) {
      notify(error.message || 'Error adding contestant')
    } finally {
      setLoading(false)
    }
  }

  const handleAddPost = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!postFormData.name) {
        notify('Post name is required')
        return
      }

      const { error } = await supabase
        .from('posts')
        .insert([{
          name: postFormData.name,
          description: postFormData.description
        }])

      if (error) throw error

      notify('Post created successfully!')
      setPostFormData({ name: '', description: '' })

      // Refresh posts
      const { data } = await supabase.from('posts').select('*').order('name')
      setPosts(data || [])
    } catch (error) {
      notify(error.message || 'Error creating post')
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePost = async (id) => {
    if (!window.confirm('Delete this post? All contestants in this post will also be deleted!')) return

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id)

      if (error) throw error

      notify('Post deleted')
      setPosts(posts.filter(p => p.id !== id))
      setContestants(contestants.filter(c => c.post_id !== id))
    } catch (error) {
      notify(error.message || 'Error deleting post')
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
    return posts.map(post => {
      const postContestants = contestants.filter(c => c.post_id === post.id)
      const winner = postContestants.sort((a, b) => (b.votes || 0) - (a.votes || 0))[0]
      return { post, winner, postContestants }
    })
  }

  return (
    <div className="grid lg:grid-cols-[260px,1fr] gap-6 lg:gap-8 text-slate-100">
      {/* Sidebar Navigation */}
      <aside className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 lg:p-5 flex flex-col gap-6 shadow-xl shadow-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl shadow-lg shadow-blue-500/40">
            <i className="fas fa-shield-alt"></i>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500 font-semibold">Admin</p>
            <h2 className="text-sm font-semibold text-slate-100">Election Control Center</h2>
          </div>
        </div>

        <div className="space-y-1 text-xs text-slate-400">
          <p>Signed in as</p>
          <p className="text-sm font-semibold text-slate-100 truncate">{currentUser?.name || currentUser?.email}</p>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-500/10 text-[11px] font-semibold text-purple-300 border border-purple-500/30 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
            Super Admin
          </span>
        </div>

        <nav className="flex flex-col gap-1 pt-3 border-t border-slate-800 mt-2">
          {[
            { id: 'overview', label: 'Overview', icon: 'fa-grid-2' },
            { id: 'posts', label: 'Manage Posts', icon: 'fa-diagram-project', badge: posts.length },
            { id: 'contestants', label: 'Manage Contestants', icon: 'fa-user-tie' },
            { id: 'results', label: 'Results & Winners', icon: 'fa-trophy' },
            { id: 'history', label: 'Vote History', icon: 'fa-clock-rotate-left' },
            { id: 'voters', label: 'Voters', icon: 'fa-users', badge: users.length },
          ].map(item => {
            const active = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={`group w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  active
                    ? 'bg-slate-100 text-slate-900 shadow-sm shadow-slate-900/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] ${
                      active ? 'bg-slate-900 text-slate-100' : 'bg-slate-800 text-slate-300 group-hover:bg-slate-700'
                    }`}
                  >
                    <i className={`fas ${item.icon}`}></i>
                  </span>
                  <span className="truncate">{item.label}</span>
                </span>
                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      active ? 'bg-slate-900 text-slate-100' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="mt-auto space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-900 rounded-xl p-3 border border-slate-800">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">Total votes</p>
              <p className="mt-1 text-lg font-semibold text-slate-100">{stats.totalVotes}</p>
            </div>
            <div className="bg-slate-900 rounded-xl p-3 border border-slate-800">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">Contestants</p>
              <p className="mt-1 text-lg font-semibold text-slate-100">{stats.totalContestants}</p>
            </div>
          </div>
          <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-500">Election Status</p>
              <p className="mt-1 text-xs font-semibold text-slate-100">
                {winnersAnnounced ? 'Results Announced' : 'Voting Live'}
              </p>
            </div>
            <span
              className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[12px] ${
                winnersAnnounced ? 'bg-amber-400/20 text-amber-300' : 'bg-emerald-400/20 text-emerald-300'
              }`}
            >
              <i className={`fas ${winnersAnnounced ? 'fa-trophy' : 'fa-signal'}`}></i>
            </span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="space-y-8 bg-slate-900 p-4 lg:p-6 rounded-2xl border border-slate-800 shadow-xl">
        {/* Header with Statistics */}
        <div className="grid md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-5 rounded-2xl text-white shadow-lg">
            <div className="text-blue-100 text-xs font-semibold uppercase mb-1 tracking-wide">Total Votes Cast</div>
            <div className="text-3xl font-bold">{stats.totalVotes}</div>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-5 rounded-2xl text-white shadow-lg">
            <div className="text-purple-100 text-xs font-semibold uppercase mb-1 tracking-wide">Contestants</div>
            <div className="text-3xl font-bold">{stats.totalContestants}</div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 p-5 rounded-2xl text-white shadow-lg">
            <div className="text-green-100 text-xs font-semibold uppercase mb-1 tracking-wide">Registered Voters</div>
            <div className="text-3xl font-bold">{stats.totalVoters}</div>
          </div>
          <div
            className={`bg-gradient-to-br ${
              winnersAnnounced ? 'from-amber-500 to-amber-600' : 'from-slate-500 to-slate-600'
            } p-5 rounded-2xl text-white shadow-lg flex flex-col justify-between`}
          >
            <div>
              <div className="text-amber-100 text-xs font-semibold uppercase mb-1 tracking-wide">Election Status</div>
              <div className="text-sm font-bold">
                {winnersAnnounced ? '🏆 Results Out' : '🗳️ Voting Live'}
              </div>
            </div>
            <button
              onClick={handleToggleResults}
              className="mt-3 inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/15 text-[11px] font-semibold hover:bg-slate-900/25 transition-colors"
            >
              <i className={`fas ${winnersAnnounced ? 'fa-lock-open' : 'fa-bullhorn'} text-xs`}></i>
              {winnersAnnounced ? 'Withdraw Results' : 'Announce Results'}
            </button>
          </div>
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
              <div key={post.id} className="bg-slate-800 rounded-2xl shadow-sm border border-slate-700 p-6">
                <h3 className="text-sm font-bold text-blue-300 uppercase mb-3">{post.name}</h3>
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
                  <select 
                    required
                    className="w-full px-4 py-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.post}
                    onChange={e => setFormData({...formData, post: e.target.value})}
                  >
                    <option value="">Select a post...</option>
                    {posts.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  {posts.length === 0 && (
                    <p className="text-xs text-amber-400 mt-1">⚠️ Create a post first in the "Manage Posts" tab</p>
                  )}
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
                            <img src={c.image || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=40&h=40&fit=crop'} className="w-10 h-10 rounded-full object-cover" alt={c.name} />
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
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-4">🏆 Election Winners</h2>
            {getWinners().map(({ post, winner, postContestants }) => {
              const others = postContestants.filter(c => c.id !== winner?.id).sort((a, b) => (b.votes || 0) - (a.votes || 0))
              return (
                <div key={post.id} className="bg-slate-800 rounded-2xl shadow-sm border border-slate-700 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-700 to-blue-800 p-6 text-white">
                    <h3 className="text-lg font-bold">{post.name}</h3>
                    {post.description && <p className="text-sm text-blue-100 mt-1">{post.description}</p>}
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
        </div>
      )}

      {/* Vote History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">📊 Vote History</h2>
              <p className="text-slate-400 text-sm">See who voted for each candidate, filtered by position and contestant.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Filter by Position</label>
                <select
                  value={voteFilterPostId}
                  onChange={(e) => {
                    setVoteFilterPostId(e.target.value)
                    setVoteFilterContestantId('all')
                  }}
                  className="bg-slate-900 border border-slate-700 text-slate-100 text-sm rounded-lg px-3 py-2"
                >
                  <option value="all">All Positions</option>
                  {posts.map(post => (
                    <option key={post.id} value={post.id}>{post.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Filter by Candidate</label>
                <select
                  value={voteFilterContestantId}
                  onChange={(e) => setVoteFilterContestantId(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-slate-100 text-sm rounded-lg px-3 py-2"
                >
                  <option value="all">All Candidates</option>
                  {contestants
                    .filter(c => voteFilterPostId === 'all' || c.post_id === voteFilterPostId)
                    .map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-2xl shadow-sm border border-slate-700 overflow-hidden">
            {votes.length === 0 ? (
              <div className="p-8 text-center">
                <i className="fas fa-vote-yea text-5xl text-slate-600 mb-4"></i>
                <p className="text-slate-400">No votes have been cast yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-700 border-b border-slate-600">
                    <tr>
                      <th className="px-6 py-4 font-semibold text-slate-200">Voter</th>
                      <th className="px-6 py-4 font-semibold text-slate-200">Email</th>
                      <th className="px-6 py-4 font-semibold text-slate-200">Position</th>
                      <th className="px-6 py-4 font-semibold text-slate-200">Voted For</th>
                      <th className="px-6 py-4 font-semibold text-slate-200 text-right">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {votes
                      .filter(vote => {
                        const matchesPost = voteFilterPostId === 'all'
                          ? true
                          : vote.contestant?.post_id === voteFilterPostId
                        const matchesContestant = voteFilterContestantId === 'all'
                          ? true
                          : vote.contestant_id === voteFilterContestantId
                        return matchesPost && matchesContestant
                      })
                      .map((vote) => {
                        const post = posts.find(p => p.id === vote.contestant?.post_id)
                        return (
                          <tr key={vote.id} className="hover:bg-slate-700/40 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                  {vote.user?.name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <span className="font-medium text-white">{vote.user?.name || 'Unknown'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-slate-300 text-sm">{vote.user?.email || 'N/A'}</td>
                            <td className="px-6 py-4">
                              <span className="px-3 py-1 rounded-lg text-xs font-bold bg-blue-900/40 text-blue-200">
                                {post?.name || vote.post || 'N/A'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {vote.contestant?.image && (
                                  <img 
                                    src={vote.contestant.image} 
                                    className="w-8 h-8 rounded-full object-cover" 
                                    alt={vote.contestant.name}
                                  />
                                )}
                                <span className="font-medium text-white">{vote.contestant?.name || 'Unknown Candidate'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right text-slate-400 text-sm">
                              {vote.created_at ? new Date(vote.created_at).toLocaleString() : 'N/A'}
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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

      {/* Manage Posts Tab */}
      {activeTab === 'posts' && (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Add Post Form */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-700 sticky top-8">
              <h2 className="text-xl font-bold mb-6 text-white">Create New Post</h2>
              <form onSubmit={handleAddPost} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Post Name *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. President"
                    className="w-full px-4 py-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={postFormData.name}
                    onChange={e => setPostFormData({...postFormData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                  <textarea 
                    placeholder="Brief description of this position..."
                    className="w-full px-4 py-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none"
                    value={postFormData.description}
                    onChange={e => setPostFormData({...postFormData, description: e.target.value})}
                  ></textarea>
                </div>
                <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
                  {loading ? 'Creating...' : '+ Create Post'}
                </button>
              </form>
            </div>
          </div>

          {/* Posts List */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800 rounded-2xl shadow-sm border border-slate-700 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-700 border-b border-slate-600">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-slate-200">Post Name</th>
                    <th className="px-6 py-4 font-semibold text-slate-200">Contestants</th>
                    <th className="px-6 py-4 font-semibold text-slate-200 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {posts.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="px-6 py-8 text-center text-slate-400">
                        No posts created yet
                      </td>
                    </tr>
                  ) : (
                    posts.map(p => {
                      const postContestantCount = contestants.filter(c => c.post_id === p.id).length
                      return (
                        <tr key={p.id} className="hover:bg-slate-700/40 transition-colors">
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-medium text-white">{p.name}</p>
                              <p className="text-xs text-slate-400">{p.description}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-300 text-sm">
                            <span className="bg-blue-900/40 text-blue-200 px-3 py-1 rounded-full font-semibold">
                              {postContestantCount} candidate{postContestantCount !== 1 ? 's' : ''}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => handleDeletePost(p.id)}
                              className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  )
}

