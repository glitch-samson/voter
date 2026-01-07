import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function VoterView({ contestants, currentUser, winnersAnnounced, notify, onVoteSuccess }) {
  const [votedPosts, setVotedPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserVotes = async () => {
      try {
        const { data } = await supabase
          .from('votes')
          .select('post')
          .eq('user_id', currentUser.id)
        
        setVotedPosts(data?.map(v => v.post) || [])
      } catch (error) {
        console.error('Error fetching votes:', error)
      } finally {
        setLoading(false)
      }
    }

    if (currentUser?.id) {
      fetchUserVotes()
    }
  }, [currentUser?.id])

  const positions = [...new Set(contestants.map(c => c.post))]
  
  if (winnersAnnounced) {
    return (
      <div className="text-center py-20 animate-in zoom-in duration-500">
        <div className="w-24 h-24 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
          <i className="fas fa-lock"></i>
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-4">Voting is Closed</h2>
        <p className="text-slate-500 max-w-md mx-auto mb-8 text-lg">
          The election has ended and winners have been announced. Please visit the winners page to see the results.
        </p>
        <button 
          onClick={() => window.location.reload()} 
          className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-200"
        >
          Return to Dashboard
        </button>
      </div>
    )
  }

  if (loading) {
    return <div className="text-center py-20">Loading votes...</div>
  }

  const handleVote = async (candidateId, post) => {
    try {
      // Insert vote
      const { error } = await supabase
        .from('votes')
        .insert([{
          user_id: currentUser.id,
          contestant_id: candidateId,
          post: post
        }])
      
      if (error) throw error

      // Update contestant votes
      const { data: contestant } = await supabase
        .from('contestants')
        .select('votes')
        .eq('id', candidateId)
        .single()

      await supabase
        .from('contestants')
        .update({ votes: (contestant?.votes || 0) + 1 })
        .eq('id', candidateId)

      setVotedPosts([...votedPosts, post])
      notify('Vote cast successfully!')
      onVoteSuccess()
    } catch (error) {
      notify(error.message || 'Error casting vote')
    }
  }

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="bg-blue-50 border border-blue-100 p-6 rounded-3xl flex flex-col md:flex-row items-center gap-6">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl shrink-0 shadow-lg">
          <i className="fas fa-person-booth"></i>
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Official Voting Booth</h2>
          <p className="text-slate-600">Cast your vote for each category. Remember, you can only vote once per position. Your choices are final once submitted.</p>
        </div>
      </div>

      {positions.length === 0 && (
        <div className="text-center py-20">
          <i className="fas fa-users-slash text-5xl text-slate-300 mb-4"></i>
          <h3 className="text-xl text-slate-500">No candidates have been uploaded yet.</h3>
        </div>
      )}
      
      {positions.map(post => (
        <section key={post} className="animate-in fade-in duration-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <span className="w-2 h-8 bg-blue-600 rounded-full"></span>
              {post}
            </h2>
            {votedPosts.includes(post) && (
              <span className="text-green-600 font-medium flex items-center gap-1">
                <i className="fas fa-check-circle"></i> Voted
              </span>
            )}
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contestants.filter(c => c.post === post).map(candidate => (
              <div key={candidate.id} className="bg-white rounded-2xl shadow-sm border hover:shadow-md transition-all group overflow-hidden">
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={candidate.image || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=400'} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    alt={candidate.name}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <div className="absolute bottom-4 left-4 text-white">
                    <h3 className="text-lg font-bold">{candidate.name}</h3>
                    <p className="text-sm opacity-90">{candidate.post}</p>
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-slate-600 text-sm mb-6 line-clamp-2 h-10">
                    {candidate.bio || "No biography provided for this official candidate."}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Current Votes</span>
                      <span className="text-xl font-bold text-slate-900">{candidate.votes || 0}</span>
                    </div>
                    <button 
                      disabled={votedPosts.includes(post)}
                      onClick={() => handleVote(candidate.id, post)}
                      className={`px-6 py-2 rounded-xl font-bold transition-all ${
                        votedPosts.includes(post) 
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200'
                      }`}
                    >
                      {votedPosts.includes(post) ? 'Cast' : 'Vote'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
