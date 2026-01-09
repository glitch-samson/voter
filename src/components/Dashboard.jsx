import { supabase } from '../lib/supabaseClient'

export default function Dashboard({ currentUser, contestants, winnersAnnounced, onNavigate }) {
  const positions = [...new Set(contestants.map(c => c.post))]
  
  // Get user's voted posts from local state (would be fetched from votes table in real app)
  const votedCount = currentUser.votedPosts?.length || 0
  const totalPosts = positions.length
  const progress = totalPosts > 0 ? (votedCount / totalPosts) * 100 : 0
  // role should come from the users table (merged into currentUser in App.jsx)
  const rawRole = (currentUser?.role ?? currentUser?.user_role ?? '').toLowerCase()
  const roleLabel = rawRole === 'admin'
    ? 'Admin'
    : rawRole === 'voter'
      ? 'Voter'
      : rawRole
        ? rawRole
        : 'Unknown'

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {winnersAnnounced && (
        <div className="bg-amber-100 border-2 border-amber-300 p-6 rounded-3xl flex items-center justify-between shadow-lg shadow-amber-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center text-white text-2xl animate-pulse">
              <i className="fas fa-trophy"></i>
            </div>
            <div>
              <h2 className="text-amber-900 font-bold text-xl">The Results are OUT!</h2>
              <p className="text-amber-700">The election winners have been officially announced.</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-slate-900 text-white p-4 sm:p-6 rounded-3xl border border-slate-800 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div>
          <p className="text-slate-300 text-xs sm:text-sm uppercase font-semibold tracking-wider">Welcome back</p>
          <h2 className="text-xl sm:text-2xl font-bold mt-1">{currentUser?.name || currentUser?.email}</h2>
        </div>
        <div className="flex flex-col items-start sm:items-end">
          <span className="text-xs text-slate-400 uppercase tracking-wide mb-1">You are signed in as</span>
          <span className="px-4 py-2 rounded-full bg-slate-800 border border-slate-700 text-sm font-bold uppercase tracking-wide">
            {roleLabel}
          </span>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-4 sm:p-6 rounded-3xl text-white shadow-xl">
          <h3 className="text-blue-100 text-xs sm:text-sm font-medium uppercase tracking-wider mb-1">Voting Progress</h3>
          <div className="text-3xl sm:text-4xl font-bold mb-4">{votedCount} / {totalPosts}</div>
          <div className="w-full bg-blue-400/30 rounded-full h-2 mb-2">
            <div className="bg-white h-2 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
          </div>
          <p className="text-xs sm:text-sm text-blue-100">Positions you've voted for</p>
        </div>
        
        <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-slate-400 text-xs sm:text-sm font-medium uppercase tracking-wider mb-1">Total Candidates</h3>
          <div className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">{contestants.length}</div>
          <div className="flex -space-x-2">
            {contestants.slice(0, 5).map(c => (
              <img key={c.id} src={c.image} className="w-8 h-8 rounded-full border-2 border-white object-cover" alt={c.name} />
            ))}
            {contestants.length > 5 && <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-xs font-bold text-slate-500">+{contestants.length - 5}</div>}
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-slate-400 text-xs sm:text-sm font-medium uppercase tracking-wider mb-1">System Status</h3>
            <div className="flex items-center gap-2 text-green-500 font-bold text-base sm:text-xl">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              Active
            </div>
          </div>
          <button 
            onClick={onNavigate}
            disabled={winnersAnnounced}
            className={`w-full mt-4 py-3 rounded-xl font-bold transition-all ${winnersAnnounced ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
          >
            {winnersAnnounced ? 'Voting Closed' : 'Open Voting Booth'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-900">Current Standings</h3>
          <span className="text-xs font-bold px-3 py-1 bg-slate-100 rounded-full text-slate-500 uppercase">Live Results</span>
        </div>
        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-8">
            {positions.map(post => {
              const leader = [...contestants].filter(c => c.post === post).sort((a,b) => (b.votes || 0) - (a.votes || 0))[0]
              return (
                <div key={post} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50">
                  <div className="relative">
                    <img src={leader?.image} className="w-16 h-16 rounded-2xl object-cover" alt={leader?.name} />
                    <div className="absolute -top-2 -right-2 bg-yellow-400 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-sm">
                      <i className="fas fa-crown text-[10px]"></i>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-blue-600 uppercase">{post}</p>
                    <h4 className="font-bold text-slate-900">{leader?.name}</h4>
                    <p className="text-sm text-slate-500 leading-none">{leader?.votes || 0} votes cast</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
