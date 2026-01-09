import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function VoterView({ contestants, posts, currentUser, winnersAnnounced, notify, onVoteSuccess }) {
  const [votedPosts, setVotedPosts] = useState([]) // Store post names (strings) that user has voted for
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserVotes = async () => {
      try {
        // Fetch all votes for this user - the votes table stores 'post' as TEXT (post name)
        const { data, error } = await supabase
          .from('votes')
          .select('post')
          .eq('user_id', currentUser.id)
        
        if (error) throw error
        
        // Get unique post names that user has already voted for
        const votedPostNames = [...new Set((data || []).map(v => v.post).filter(Boolean))]
        setVotedPosts(votedPostNames)
      } catch (error) {
        console.error('Error fetching votes:', error)
        notify('Error loading your voting history')
      } finally {
        setLoading(false)
      }
    }

    if (currentUser?.id) {
      fetchUserVotes()
    }
  }, [currentUser?.id])

  const positions = posts || []
  
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

  const handleVote = async (candidateId, postId) => {
    try {
      // Find the post name from the posts array
      const post = posts.find(p => p.id === postId)
      if (!post) {
        notify('Error: Post not found')
        return
      }

      // Check if user has already voted for this position
      if (votedPosts.includes(post.name)) {
        notify('You have already voted for this position')
        return
      }

      // Insert vote record - the UNIQUE constraint on (user_id, post) will prevent duplicates
      const { error: voteError } = await supabase
        .from('votes')
        .insert([{
          user_id: currentUser.id,
          contestant_id: candidateId,
          post: post.name // Store the post name as TEXT
        }])
      
      if (voteError) {
        // Check if it's a duplicate vote error
        if (voteError.code === '23505' || voteError.message.includes('duplicate')) {
          notify('You have already voted for this position')
          // Refresh voted posts to update UI
          const { data } = await supabase
            .from('votes')
            .select('post')
            .eq('user_id', currentUser.id)
          const votedPostNames = [...new Set((data || []).map(v => v.post).filter(Boolean))]
          setVotedPosts(votedPostNames)
          return
        }
        throw voteError
      }

      // Update contestant vote count
      const { data: contestant } = await supabase
        .from('contestants')
        .select('votes')
        .eq('id', candidateId)
        .single()

      if (contestant) {
        await supabase
          .from('contestants')
          .update({ votes: (contestant.votes || 0) + 1 })
          .eq('id', candidateId)
      }

      // Update local state to reflect the vote
      setVotedPosts([...votedPosts, post.name])
      notify('Vote cast successfully!')
      onVoteSuccess()
    } catch (error) {
      console.error('Vote error:', error)
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
      
      {positions.map(post => {
        const hasVoted = votedPosts.includes(post.name)
        return (
          <section key={post.id} className="animate-in fade-in duration-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                <span className="w-2 h-8 bg-blue-600 rounded-full"></span>
                {post.name}
              </h2>
              {hasVoted && (
                <span className="text-green-600 font-medium flex items-center gap-1">
                  <i className="fas fa-check-circle"></i> Voted
                </span>
              )}
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {contestants.filter(c => c.post_id === post.id).map(candidate => (
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
                      <p className="text-sm opacity-90">{post.name}</p>
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
                        disabled={hasVoted}
                        onClick={() => handleVote(candidate.id, post.id)}
                        className={`px-6 py-2 rounded-xl font-bold transition-all ${
                          hasVoted
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                          : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200'
                        }`}
                      >
                        {hasVoted ? (
                          <span className="flex items-center gap-2">
                            <i className="fas fa-check"></i> Voted
                          </span>
                        ) : (
                          'Vote'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
