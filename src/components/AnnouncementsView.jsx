export default function AnnouncementsView({ contestants, winnersAnnounced }) {
  const positions = [...new Set(contestants.map(c => c.post))]

  if (!winnersAnnounced) {
    return (
      <div className="text-center py-20 animate-in fade-in duration-500">
        <div className="w-20 h-20 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
          <i className="fas fa-hourglass-half"></i>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Results are Pending</h2>
        <p className="text-slate-500">The administration has not yet released the final results.</p>
      </div>
    )
  }

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="text-center space-y-4">
        <div className="inline-block px-4 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold uppercase tracking-widest mb-2">Official Results</div>
        <h2 className="text-4xl font-extrabold text-slate-900">Election Winners</h2>
        <p className="text-slate-500 max-w-2xl mx-auto">Congratulations to all the newly elected officials. Below are the finalized results from the official voting booth.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {positions.map(post => {
          const postContestants = contestants.filter(c => c.post === post).sort((a,b) => (b.votes || 0) - (a.votes || 0))
          const winner = postContestants[0]
          const runnersUp = postContestants.slice(1)

          return (
            <div key={post} className="bg-white rounded-[2rem] border-2 border-slate-100 overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 flex flex-col">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white relative">
                <div className="absolute top-4 right-6 text-6xl opacity-10">
                  <i className="fas fa-award"></i>
                </div>
                <p className="text-blue-100 text-sm font-bold uppercase tracking-widest mb-1">{post}</p>
                <h3 className="text-3xl font-bold">The Winner</h3>
              </div>
              
              <div className="p-8 flex-1 flex flex-col">
                {winner && (
                  <>
                    <div className="flex items-center gap-6 mb-8">
                      <div className="relative">
                        <img src={winner.image} className="w-24 h-24 rounded-3xl object-cover ring-4 ring-amber-400 ring-offset-4" alt={winner.name} />
                        <div className="absolute -top-3 -right-3 bg-amber-400 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                          <i className="fas fa-crown text-sm"></i>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-2xl font-bold text-slate-900">{winner.name}</h4>
                        <div className="flex items-center gap-2 text-blue-600 font-bold mt-1">
                          <span className="text-3xl">{winner.votes || 0}</span>
                          <span className="text-sm uppercase tracking-tighter opacity-70">Total Votes</span>
                        </div>
                      </div>
                    </div>

                    {runnersUp.length > 0 && (
                      <div className="mt-auto border-t pt-6">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Other Contestants</p>
                        <div className="space-y-3">
                          {runnersUp.map(c => (
                            <div key={c.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                              <div className="flex items-center gap-3">
                                <img src={c.image} className="w-8 h-8 rounded-lg object-cover grayscale" alt={c.name} />
                                <span className="text-sm font-medium text-slate-600">{c.name}</span>
                              </div>
                              <span className="text-sm font-bold text-slate-400">{c.votes || 0} votes</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
