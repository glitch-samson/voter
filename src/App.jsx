import { useState, useEffect } from 'react'
import { supabase } from './lib/supabaseClient'
import AuthScreen from './components/AuthScreen'
import Dashboard from './components/Dashboard'
import VoterView from './components/VoterView'
import AdminDashboard from './components/AdminDashboard'
import AnnouncementsView from './components/AnnouncementsView'

function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activePage, setActivePage] = useState('dashboard')
  const [adminActiveTab, setAdminActiveTab] = useState('overview')
  const [notification, setNotification] = useState(null)
  const [contestants, setContestants] = useState([])
  const [posts, setPosts] = useState([])
  const [winnersAnnounced, setWinnersAnnounced] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Check if user is logged in
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()
          
          if (userData) {
            setCurrentUser({ ...session.user, ...userData })
          }
        }
      } catch (error) {
        console.error('Auth error:', error)
      } finally {
        setLoading(false)
      }
    }

    checkUser()

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            setCurrentUser({ ...session.user, ...data })
          })
      } else {
        setCurrentUser(null)
      }
    })

    return () => subscription?.unsubscribe()
  }, [])

  // Fetch contestants
  useEffect(() => {
    const fetchContestants = async () => {
      try {
        const { data } = await supabase
          .from('contestants')
          .select('*')
          .order('post_id', { ascending: true })
        
        setContestants(data || [])
      } catch (error) {
        console.error('Error fetching contestants:', error)
      }
    }

    fetchContestants()
  }, [])

  // Fetch posts
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const { data } = await supabase
          .from('posts')
          .select('*')
          .order('name', { ascending: true })
        
        setPosts(data || [])
      } catch (error) {
        console.error('Error fetching posts:', error)
      }
    }

    fetchPosts()
  }, [])

  // Fetch election status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const { data } = await supabase
          .from('election_status')
          .select('*')
          .single()
        
        if (data) {
          setWinnersAnnounced(data.results_announced)
        }
      } catch (error) {
        console.error('Error fetching status:', error)
      }
    }

    fetchStatus()
  }, [])

  const notify = (msg) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3000)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setCurrentUser(null)
    setActivePage('dashboard')
    notify('Logged out successfully')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white text-3xl animate-spin">
            <i className="fas fa-vote-yea"></i>
          </div>
          <p className="text-slate-600 font-semibold">Loading...</p>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return <AuthScreen onAuthSuccess={setCurrentUser} notify={notify} />
  }

  // Dedicated admin experience: admins see a separate full-screen dashboard,
  // not the regular voter dashboard/navigation.
  if ((currentUser?.role || currentUser?.user_role) === 'admin') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        {notification && (
          <div className="fixed top-5 right-5 bg-slate-900 text-white px-6 py-3 rounded-xl shadow-2xl z-50">
            {notification}
          </div>
        )}
        <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-600 flex items-center justify-center text-white text-xl shadow-lg shadow-purple-500/30">
                <i className="fas fa-user-shield"></i>
              </div>
              <div className="hidden sm:block">
                <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">EliteVote</p>
                <p className="text-sm font-semibold text-white">{currentUser.name}</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <p className="text-xs uppercase tracking-wide text-purple-300 font-bold">Super Admin</p>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-100 text-sm font-semibold hover:bg-slate-700 border border-slate-700 flex items-center gap-2"
              >
                <i className="fas fa-sign-out-alt"></i>
                Logout
              </button>
            </div>
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-white text-2xl"
            >
              <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
            </button>
          </div>
          
          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-slate-800 bg-slate-900/50 backdrop-blur">
              <nav className="px-4 py-4 space-y-1 max-w-7xl mx-auto">
                <div className="pb-4 border-b border-slate-700 mb-4">
                  <p className="text-sm font-semibold text-white mb-1">{currentUser.name}</p>
                  <p className="text-xs uppercase tracking-wide text-purple-300 font-bold">Admin</p>
                </div>
                
                <div className="space-y-1">
                  <AdminMobileNavButton 
                    icon="fa-grid-2" 
                    label="Overview" 
                    active={adminActiveTab === 'overview'}
                    onClick={() => { setAdminActiveTab('overview'); setMobileMenuOpen(false) }}
                  />
                  <AdminMobileNavButton 
                    icon="fa-diagram-project" 
                    label="Manage Posts" 
                    active={adminActiveTab === 'posts'}
                    onClick={() => { setAdminActiveTab('posts'); setMobileMenuOpen(false) }}
                  />
                  <AdminMobileNavButton 
                    icon="fa-user-tie" 
                    label="Manage Contestants" 
                    active={adminActiveTab === 'contestants'}
                    onClick={() => { setAdminActiveTab('contestants'); setMobileMenuOpen(false) }}
                  />
                  <AdminMobileNavButton 
                    icon="fa-trophy" 
                    label="Results & Winners" 
                    active={adminActiveTab === 'results'}
                    onClick={() => { setAdminActiveTab('results'); setMobileMenuOpen(false) }}
                  />
                  <AdminMobileNavButton 
                    icon="fa-clock-rotate-left" 
                    label="Vote History" 
                    active={adminActiveTab === 'history'}
                    onClick={() => { setAdminActiveTab('history'); setMobileMenuOpen(false) }}
                  />
                  <AdminMobileNavButton 
                    icon="fa-users" 
                    label="Voters" 
                    active={adminActiveTab === 'voters'}
                    onClick={() => { setAdminActiveTab('voters'); setMobileMenuOpen(false) }}
                  />
                </div>
                
                <div className="pt-4 border-t border-slate-700 mt-4">
                  <button
                    onClick={() => { handleLogout(); setMobileMenuOpen(false) }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-400 hover:bg-slate-800 transition-all"
                  >
                    <i className="fas fa-sign-out-alt w-5 text-center"></i>
                    <span className="flex-1 text-left">Logout</span>
                  </button>
                </div>
              </nav>
            </div>
          )}
        </header>
        <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
          <AdminDashboard 
            contestants={contestants}
            setContestants={setContestants}
            posts={posts}
            setPosts={setPosts}
            winnersAnnounced={winnersAnnounced}
            setWinnersAnnounced={setWinnersAnnounced}
            notify={notify}
            currentUser={currentUser}
            adminActiveTab={adminActiveTab}
            setAdminActiveTab={setAdminActiveTab}
          />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {notification && (
        <div className="fixed top-5 right-5 bg-slate-900 text-white px-6 py-3 rounded-xl shadow-2xl animate-bounce z-50">
          {notification}
        </div>
      )}

      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg shadow-blue-200">
              <i className="fas fa-vote-yea"></i>
            </div>
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900">EliteVote</h1>
          </div>
          
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden text-slate-900 text-2xl"
          >
            <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-slate-50">
            <nav className="px-4 py-4 space-y-1 max-w-7xl mx-auto">
              <MobileNavButton 
                icon="fas fa-chart-pie" 
                label="Dashboard" 
                active={activePage === 'dashboard'}
                onClick={() => { setActivePage('dashboard'); setMobileMenuOpen(false) }}
              />
              {!winnersAnnounced && (
                <MobileNavButton 
                  icon="fas fa-person-booth" 
                  label="Voting Booth" 
                  active={activePage === 'voting'}
                  onClick={() => { setActivePage('voting'); setMobileMenuOpen(false) }}
                />
              )}
              <MobileNavButton 
                icon="fas fa-bullhorn" 
                label="Winners" 
                active={activePage === 'announcements'}
                onClick={() => { setActivePage('announcements'); setMobileMenuOpen(false) }}
              />
              {(currentUser?.role || currentUser?.user_role) === 'admin' && (
                <MobileNavButton 
                  icon="fas fa-user-shield" 
                  label="Admin" 
                  active={activePage === 'admin'}
                  onClick={() => { setActivePage('admin'); setMobileMenuOpen(false) }}
                />
              )}
              <div className="pt-2 border-t border-slate-200 mt-2">
                <button
                  onClick={() => { handleLogout(); setMobileMenuOpen(false) }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-all"
                >
                  <i className="fas fa-sign-out-alt w-5 text-center"></i>
                  <span className="flex-1 text-left">Logout</span>
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 lg:gap-10">
          {/* Sidebar - Desktop only */}
          <aside className="hidden lg:flex flex-col">
            <div className="sticky top-24">
              <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg shadow-blue-200">
                      <i className="fas fa-vote-yea"></i>
                    </div>
                    <div>
                      <h1 className="text-lg font-extrabold text-slate-900">EliteVote</h1>
                      <p className="text-xs text-slate-500">Signed in as {currentUser.name}</p>
                    </div>
                  </div>
                </div>
                <nav className="p-4 space-y-2">
                  <NavButton 
                    icon="fas fa-chart-pie" 
                    label="Dashboard" 
                    page="dashboard"
                    active={activePage === 'dashboard'}
                    onClick={() => setActivePage('dashboard')}
                  />
                  {!winnersAnnounced && (
                    <NavButton 
                      icon="fas fa-person-booth" 
                      label="Voting Booth" 
                      page="voting"
                      active={activePage === 'voting'}
                      onClick={() => setActivePage('voting')}
                    />
                  )}
                  <NavButton 
                    icon="fas fa-bullhorn" 
                    label="Winners" 
                    page="announcements"
                    active={activePage === 'announcements'}
                    onClick={() => setActivePage('announcements')}
                  />
                  {(currentUser?.role || currentUser?.user_role) === 'admin' && (
                    <NavButton 
                      icon="fas fa-user-shield" 
                      label="Admin" 
                      page="admin"
                      active={activePage === 'admin'}
                      accent="purple"
                      onClick={() => setActivePage('admin')}
                    />
                  )}
                </nav>
                <div className="p-4 border-t border-slate-100">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-all"
                  >
                    <i className="fas fa-sign-out-alt"></i> Logout
                  </button>
                </div>
              </div>

              <div className="mt-4 bg-white border border-slate-100 rounded-3xl shadow-sm p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</span>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${winnersAnnounced ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-700'}`}>
                    {winnersAnnounced ? 'Results Announced' : 'Voting Live'}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-2">
                  {winnersAnnounced ? 'Voting is locked. View winners.' : 'Cast your votes in the voting booth.'}
                </p>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main className="min-w-0">
            {activePage === 'dashboard' && (
              <Dashboard 
                currentUser={currentUser} 
                contestants={contestants}
                winnersAnnounced={winnersAnnounced}
                onNavigate={() => setActivePage('voting')}
              />
            )}
            {activePage === 'voting' && (
              <VoterView 
                contestants={contestants}
                posts={posts}
                currentUser={currentUser}
                winnersAnnounced={winnersAnnounced}
                notify={notify}
                onVoteSuccess={() => {
                  // Refresh contestants to update vote counts
                  supabase
                    .from('contestants')
                    .select('*')
                    .order('post_id', { ascending: true })
                    .then(({ data }) => setContestants(data || []))
                }}
              />
            )}
            {activePage === 'announcements' && (
              <AnnouncementsView 
                contestants={contestants}
                winnersAnnounced={winnersAnnounced}
              />
            )}
            {activePage === 'admin' && (currentUser?.role || currentUser?.user_role) === 'admin' && (
          <AdminDashboard 
            contestants={contestants}
            setContestants={setContestants}
            posts={posts}
            setPosts={setPosts}
            winnersAnnounced={winnersAnnounced}
            setWinnersAnnounced={setWinnersAnnounced}
            notify={notify}
            currentUser={currentUser}
          />
            )}
            {activePage === 'admin' && (currentUser?.role || currentUser?.user_role) !== 'admin' && (
              <div className="bg-white rounded-2xl shadow-sm border p-8 text-center">
                <div className="text-5xl mb-4">🚫</div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
                <p className="text-slate-600 mb-6">You do not have admin privileges.</p>
                <button 
                  onClick={() => setActivePage('dashboard')}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
                >
                  Return to Dashboard
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

function NavButton({ icon, label, page, active, onClick, accent = 'blue' }) {
  const base = 'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all'
  const activeCls = accent === 'purple'
    ? 'bg-purple-50 text-purple-700'
    : 'bg-blue-50 text-blue-700'
  const idleCls = 'text-slate-600 hover:bg-slate-50'
  
  return (
    <button onClick={onClick} className={`${base} ${active ? activeCls : idleCls}`}>
      <i className={`${icon} w-5 text-center`}></i>
      <span className="flex-1 text-left">{label}</span>
      {active && <span className={`w-2 h-2 rounded-full ${accent === 'purple' ? 'bg-purple-500' : 'bg-blue-500'}`}></span>}
    </button>
  )
}

function MobileNavButton({ icon, label, active, onClick }) {
  return (
    <button 
      onClick={onClick} 
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
        active 
          ? 'bg-blue-50 text-blue-700' 
          : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      <i className={`${icon} w-5 text-center`}></i>
      <span className="flex-1 text-left">{label}</span>
    </button>
  )
}

function AdminMobileNavButton({ icon, label, active, onClick }) {
  return (
    <button 
      onClick={onClick} 
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
        active 
          ? 'bg-slate-100 text-slate-900' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
      }`}
    >
      <i className={`fas ${icon} w-5 text-center`}></i>
      <span className="flex-1 text-left">{label}</span>
    </button>
  )
}

export default App
