// src/app/admin/page.js
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { BookOpen, MessageSquare, Plus, Edit2, Trash2, Search, LogOut, Menu, X, BarChart3, Clock, Save, AlertTriangle, Loader2, ChevronDown, Filter, Calendar, ChevronLeft, ChevronRight, Users, Activity } from 'lucide-react'

export default function AdminPage() {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [currentView, setCurrentView] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  
  const [reglamentos, setReglamentos] = useState([])
  const [logs, setLogs] = useState([])
  
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10 
  
  const [listaCategorias, setListaCategorias] = useState([])
  const [showModalCategoria, setShowModalCategoria] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false) 
  const [showFilterDropdown, setShowFilterDropdown] = useState(false) 
  const [nuevaCategoriaInput, setNuevaCategoriaInput] = useState('')

  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('Todas') 
  const [logTimeFilter, setLogTimeFilter] = useState('3días') 
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  const [deleteModal, setDeleteModal] = useState({ show: false, type: null, id: null })
  const [editingId, setEditingId] = useState(null)
  
  const [formData, setFormData] = useState({ titulo: '', categoria: '', contenido: '', audiencia: 'general', estado: 'activo' })
  const [mensajeSistema, setMensajeSistema] = useState(null)

  useEffect(() => {
    if (window.innerWidth < 768) setSidebarOpen(false)
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }
      const { data: perfil } = await supabase.from('perfiles_usuarios').select('rol').eq('id', session.user.id).single()
      if (perfil?.rol !== 'admin') { router.push('/chat') } 
      else { setLoading(false); cargarDatos() }
    }
    checkAdmin()
  }, [])

  useEffect(() => {
    setCurrentPage(1);
  }, [logTimeFilter, currentView]);

  const cargarDatos = async () => {
    const { data: regs } = await supabase
        .from('base_conocimiento')
        .select('id, titulo, categoria, audiencia, estado, fecha_actualizacion')
        .order('id', { ascending: false })
    
    if (regs) {
      setReglamentos(regs)
      const categoriasBD = [...new Set(regs.map(r => r.categoria).filter(Boolean))]
      setListaCategorias(categoriasBD)
    }

    const { data: logsData } = await supabase
        .from('logs_consultas')
        .select('*')
        .order('fecha', { ascending: false })
        .range(0, 99) 
    
    if (logsData) setLogs(logsData)
  }

  const highlightText = (text, highlight) => {
    if (!text) return "";
    if (!highlight.trim()) return text;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === highlight.toLowerCase() ? 
          <mark key={i} className="bg-yellow-200 text-black p-0 rounded font-bold">{part}</mark> : 
          part
        )}
      </span>
    );
  };

  const logsFiltrados = logs.filter(log => {
    const fechaLog = new Date(log.fecha);
    const ahora = new Date();
    if (logTimeFilter === 'hora') return ahora - fechaLog <= 3600000;
    if (logTimeFilter === 'hoy') return fechaLog.toDateString() === ahora.toDateString();
    if (logTimeFilter === '3días') return ahora - fechaLog <= 3 * 86400000;
    if (logTimeFilter === 'semana') return ahora - fechaLog <= 7 * 86400000;
    if (logTimeFilter === 'mes') return ahora - fechaLog <= 30 * 86400000;
    if (logTimeFilter === 'custom') {
      const inicio = customStartDate ? new Date(customStartDate) : null;
      const fin = customEndDate ? new Date(customEndDate) : null;
      if (fin) fin.setHours(23, 59, 59);
      if (inicio && fin) return fechaLog >= inicio && fechaLog <= fin;
      if (inicio) return fechaLog >= inicio;
      if (fin) return fechaLog <= fin;
    }
    return true;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLogs = logsFiltrados.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(logsFiltrados.length / itemsPerPage);

  const nextPage = () => { if (currentPage < totalPages) setCurrentPage(currentPage + 1); };
  const prevPage = () => { if (currentPage > 1) setCurrentPage(currentPage - 1); };

  const reglamentosFiltrados = reglamentos.filter(reg => {
    const matchesSearch = searchTerm === '' || 
      reg.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.categoria?.toLowerCase().includes(searchTerm.toLowerCase()) 
    const matchesCategory = filterCategory === 'Todas' || reg.categoria === filterCategory;
    return matchesSearch && matchesCategory;
  })

  const vaciarTodoElCache = async () => {
    const { error } = await supabase.from('logs_consultas').delete().gt('id', 0)
    if (!error) await cargarDatos()
  }

  const handleSaveReglamento = async () => {
    const { data: { session } } = await supabase.auth.getSession() 

    if (!formData.titulo || !formData.categoria || !formData.contenido) return alert('Complete los campos principales')
    setMensajeSistema('Procesando documento...')
    
    try {
      const response = await fetch('/api/admin/guardar-reglamento', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}` 
        },
        body: JSON.stringify({ 
            id: editingId, 
            titulo: formData.titulo, 
            categoria: formData.categoria, 
            contenido: formData.contenido, 
            audiencia: formData.audiencia,
            estado: formData.estado,
            action: editingId ? 'update' : 'create' 
        })
      })

      if (!response.ok) throw new Error('Error al guardar')
      
      setMensajeSistema('Guardado correctamente.'); 
      setFormData({ titulo: '', categoria: '', contenido: '', audiencia: 'general', estado: 'activo' }); 
      setEditingId(null); 
      setCurrentView('lista'); 
      await cargarDatos(); 
      setTimeout(() => setMensajeSistema(null), 5000)

    } catch (error) { 
        alert('Error: ' + error.message); 
        setMensajeSistema(null) 
    }
  }

  const handleEdit = async (reg) => {
    setMensajeSistema('Cargando contenido...');
    const { data, error } = await supabase.from('base_conocimiento').select('contenido').eq('id', reg.id).single();
    if (error || !data) { alert("Error cargando contenido"); setMensajeSistema(null); return; }

    setFormData({ 
      titulo: reg.titulo, 
      categoria: reg.categoria, 
      contenido: data.contenido,
      audiencia: reg.audiencia || 'general',
      estado: reg.estado || 'activo'
    }); 
    setEditingId(reg.id); 
    setCurrentView('nuevo'); 
    setMensajeSistema(null);
    if (window.innerWidth < 768) setSidebarOpen(false)
  }

  const solicitarBorrarLog = (id) => setDeleteModal({ show: true, type: 'single', id })
  const solicitarVaciarHistorial = () => setDeleteModal({ show: true, type: 'all', id: null })
  const solicitarBorrarReglamento = (id) => setDeleteModal({ show: true, type: 'reglamento', id })

  const confirmarBorrado = async () => {
    let error = null
    if (deleteModal.type === 'reglamento') ({ error } = await supabase.from('base_conocimiento').delete().eq('id', deleteModal.id))
    else if (deleteModal.type === 'single') ({ error } = await supabase.from('logs_consultas').delete().eq('id', deleteModal.id))
    else if (deleteModal.type === 'all') await vaciarTodoElCache()
    else if (deleteModal.type === 'all_reglamentos') ({ error } = await supabase.from('base_conocimiento').delete().gt('id', 0))
    
    if (!error) { await cargarDatos(); setDeleteModal({ show: false, type: null, id: null }) } 
    else { alert('Error: ' + error.message) }
  }

  const guardarNuevaCategoria = () => {
    if (!nuevaCategoriaInput.trim()) return
    setListaCategorias(prev => [...new Set([...prev, nuevaCategoriaInput])]); setFormData({ ...formData, categoria: nuevaCategoriaInput }); setShowModalCategoria(false); setNuevaCategoriaInput('')
  }

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/') }

  if (loading) return (
    <div className="flex h-screen items-center justify-center font-sans" style={{ backgroundColor: '#F1EFE8', color: '#7A1020' }}>
      <Loader2 className="animate-spin mr-2"/> Cargando...
    </div>
  )

  return (
    <div className="flex h-screen font-sans relative overflow-hidden text-black" style={{ backgroundColor: '#F1EFE8' }}>
      
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/50 z-40 md:hidden" />
      )}

      {/* Modal de confirmación de borrado */}
      {deleteModal.show && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm text-black">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4" style={{ color: '#7A1020' }} />
            <h3 className="text-xl font-bold">¿Estás seguro?</h3>
            <p className="text-gray-500 text-sm mt-2 mb-6">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal({ show: false, type: null })}
                className="flex-1 py-3 border rounded-xl font-medium hover:bg-gray-50 transition"
                style={{ borderColor: '#D3D1C7' }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarBorrado}
                className="flex-1 py-3 text-white rounded-xl font-bold flex justify-center gap-2 transition"
                style={{ backgroundColor: '#7A1020' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#5C0A14'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#7A1020'}
              >
                <Trash2 size={18}/> Borrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nueva categoría */}
      {showModalCategoria && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 text-black">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-bold mb-4">Nueva Categoría</h3>
            <input
              autoFocus
              type="text"
              value={nuevaCategoriaInput}
              onChange={(e) => setNuevaCategoriaInput(e.target.value)}
              className="w-full p-2 border rounded mb-4 text-black outline-none"
              style={{ borderColor: '#B4B2A9' }}
              onFocus={e => { e.target.style.borderColor = '#7A1020'; e.target.style.boxShadow = '0 0 0 3px rgba(122,16,32,0.12)' }}
              onBlur={e => { e.target.style.borderColor = '#B4B2A9'; e.target.style.boxShadow = 'none' }}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowModalCategoria(false)}
                className="px-4 py-2 rounded font-medium hover:bg-gray-50 transition"
                style={{ color: '#5F5E5A' }}
              >
                Cancelar
              </button>
              <button
                onClick={guardarNuevaCategoria}
                className="px-4 py-2 text-white rounded font-bold transition"
                style={{ backgroundColor: '#7A1020' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#5C0A14'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#7A1020'}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 text-white transition-all duration-300 flex flex-col shadow-xl md:relative ${sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full md:w-20 md:translate-x-0'}`}
        style={{ backgroundColor: '#7A1020' }}
      >
        <div
          className="p-4 flex items-center justify-between h-16"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.15)' }}
        >
          {(sidebarOpen || (typeof window !== 'undefined' && window.innerWidth < 768)) && (
            <h2 className="text-xl font-bold tracking-wide truncate uppercase">Panel C. Verano</h2>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded transition"
            style={{ color: 'rgba(255,255,255,0.8)' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto font-bold">
          {[
            { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
            { id: 'lista', icon: BookOpen, label: 'Documentos' },
            { id: 'nuevo', icon: Plus, label: 'Nuevo Doc.' },
            { id: 'logs', icon: Clock, label: 'Auditoría' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentView(item.id);
                if (item.id === 'nuevo') { setEditingId(null); setFormData({ titulo: '', categoria: '', contenido: '', audiencia: 'general', estado: 'activo' }) }
                if (window.innerWidth < 768) setSidebarOpen(false);
              }}
              className="w-full flex items-center gap-3 p-3 rounded-lg transition"
              style={{
                backgroundColor: currentView === item.id ? 'rgba(255,255,255,0.18)' : 'transparent',
                color: '#FFFFFF',
              }}
              onMouseEnter={e => { if (currentView !== item.id) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)' }}
              onMouseLeave={e => { if (currentView !== item.id) e.currentTarget.style.backgroundColor = 'transparent' }}
            >
              <item.icon className="w-5 h-5 min-w-[20px]" />
              <span className={`${!sidebarOpen && 'md:hidden'} transition-all duration-200 whitespace-nowrap`}>{item.label}</span>
            </button>
          ))}
        </nav>

        <button
          onClick={handleLogout}
          className="p-4 flex items-center gap-3 transition font-bold"
          style={{
            borderTop: '1px solid rgba(255,255,255,0.15)',
            backgroundColor: 'rgba(0,0,0,0.2)',
            color: 'rgba(255,255,255,0.85)',
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.35)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.2)'}
        >
          <LogOut className="w-5 h-5 min-w-[20px]" />
          <span className={`${!sidebarOpen && 'md:hidden'}`}>Salir</span>
        </button>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 overflow-auto flex flex-col w-full relative text-black">

        {/* Topbar */}
        <div
          className="p-4 flex justify-between items-center sticky top-0 z-30 min-h-[64px]"
          style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #D3D1C7', boxShadow: '0 2px 8px rgba(122,16,32,0.06)' }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg transition"
              style={{ color: '#5F5E5A' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F1EFE8'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg md:text-2xl font-bold truncate uppercase" style={{ color: '#7A1020' }}>
              {currentView}
            </h1>
          </div>
          {mensajeSistema && (
            <span
              className="hidden md:block px-3 py-1 rounded text-sm animate-pulse font-bold"
              style={{ backgroundColor: '#E1F5EE', color: '#0F6E56' }}
            >
              {mensajeSistema}
            </span>
          )}
        </div>

        <div className="p-4 md:p-6 max-w-6xl mx-auto w-full">

          {/* Dashboard */}
          {currentView === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div
                className="p-6 rounded-xl transition hover:shadow-md"
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #D3D1C7', boxShadow: '0 2px 8px rgba(122,16,32,0.06)' }}
              >
                <div className="flex items-center justify-between font-bold">
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#888780' }}>Documentos Indexados</p>
                    <p className="text-3xl font-bold mt-2" style={{ color: '#7A1020' }}>{reglamentos.length}</p>
                  </div>
                  <div className="p-3 rounded-full" style={{ backgroundColor: '#FAECE7' }}>
                    <BookOpen className="w-8 h-8" style={{ color: '#7A1020' }} />
                  </div>
                </div>
              </div>
              <div
                className="p-6 rounded-xl transition hover:shadow-md"
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #D3D1C7', boxShadow: '0 2px 8px rgba(122,16,32,0.06)' }}
              >
                <div className="flex items-center justify-between font-bold">
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#888780' }}>Consultas Realizadas</p>
                    <p className="text-3xl font-bold mt-2" style={{ color: '#EF9F27' }}>{logs.length}</p>
                  </div>
                  <div className="p-3 rounded-full" style={{ backgroundColor: '#FAEEDA' }}>
                    <MessageSquare className="w-8 h-8" style={{ color: '#EF9F27' }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Lista de documentos */}
          {currentView === 'lista' && (
            <div
              className="rounded-xl overflow-hidden"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #D3D1C7', boxShadow: '0 2px 8px rgba(122,16,32,0.06)' }}
            >
              <div className="p-4 flex flex-col lg:flex-row gap-4" style={{ borderBottom: '1px solid #D3D1C7', backgroundColor: '#F1EFE8' }}>
                <div className="flex-1 relative">
                  <Search className="w-5 h-5 absolute left-3 top-2.5" style={{ color: '#888780' }} />
                  <input
                    type="text"
                    placeholder="Buscar por título o categoría..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg outline-none transition text-black"
                    style={{ border: '1px solid #B4B2A9' }}
                    onFocus={e => { e.target.style.borderColor = '#7A1020'; e.target.style.boxShadow = '0 0 0 3px rgba(122,16,32,0.12)' }}
                    onBlur={e => { e.target.style.borderColor = '#B4B2A9'; e.target.style.boxShadow = 'none' }}
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                  <div className="relative w-full sm:w-auto text-black font-bold">
                    <button
                      onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                      className="w-full sm:w-64 flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-bold transition"
                      style={{ backgroundColor: '#FFFFFF', border: '1px solid #B4B2A9' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = '#7A1020'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = '#B4B2A9'}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Filter className="w-4 h-4 shrink-0" style={{ color: '#888780' }} />
                        <span className="truncate">{filterCategory === 'Todas' ? 'Todas las Categorías' : filterCategory}</span>
                      </div>
                      <ChevronDown size={16} className={`transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} style={{ color: '#888780' }} />
                    </button>
                    {showFilterDropdown && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowFilterDropdown(false)}></div>
                        <div
                          className="absolute left-0 lg:right-0 z-50 mt-1 w-full sm:w-80 lg:w-72 rounded-lg shadow-xl max-h-64 overflow-y-auto font-bold"
                          style={{ backgroundColor: '#FFFFFF', border: '1px solid #D3D1C7' }}
                        >
                          <button
                            onClick={() => { setFilterCategory('Todas'); setShowFilterDropdown(false); }}
                            className="w-full text-left p-3 text-sm transition-colors"
                            style={{
                              borderBottom: '1px solid #D3D1C7',
                              backgroundColor: filterCategory === 'Todas' ? '#FAECE7' : 'transparent',
                              color: filterCategory === 'Todas' ? '#7A1020' : '#2C2C2A',
                            }}
                          >
                            Todas las Categorías
                          </button>
                          {listaCategorias.map((cat, i) => (
                            <button
                              key={i}
                              onClick={() => { setFilterCategory(cat); setShowFilterDropdown(false); }}
                              className="w-full text-left p-3 text-sm transition-colors leading-tight whitespace-normal"
                              style={{
                                borderBottom: '1px solid #D3D1C7',
                                backgroundColor: filterCategory === cat ? '#FAECE7' : 'transparent',
                                color: filterCategory === cat ? '#7A1020' : '#2C2C2A',
                              }}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="divide-y text-black" style={{ borderColor: '#F1EFE8' }}>
                {reglamentosFiltrados.length === 0 ? (
                  <div className="p-10 text-center flex flex-col items-center gap-2" style={{ color: '#888780' }}>
                    <Search className="w-10 h-10" style={{ color: '#D3D1C7' }} />
                    <p>Sin resultados.</p>
                  </div>
                ) : (
                  reglamentosFiltrados.map(reg => (
                    <div
                      key={reg.id}
                      className="p-4 md:p-5 transition group"
                      style={{ backgroundColor: reg.estado === 'inactivo' ? '#F1EFE8' : 'transparent', opacity: reg.estado === 'inactivo' ? 0.75 : 1 }}
                      onMouseEnter={e => { if (reg.estado !== 'inactivo') e.currentTarget.style.backgroundColor = '#FAECE7' }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = reg.estado === 'inactivo' ? '#F1EFE8' : 'transparent' }}
                    >
                      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                        <div className="flex-1 w-full">
                          <div className="flex flex-wrap items-center gap-2 mb-1 font-bold">
                            <span
                              className="px-2 py-0.5 text-[10px] md:text-xs font-bold rounded-md uppercase"
                              style={{ backgroundColor: '#FAECE7', color: '#7A1020' }}
                            >
                              {highlightText(reg.categoria, searchTerm)}
                            </span>
                            <span
                              className="px-2 py-0.5 text-[10px] md:text-xs font-bold rounded-md uppercase flex items-center gap-1"
                              style={{ backgroundColor: '#FAEEDA', color: '#854F0B' }}
                            >
                              <Users size={12}/> {reg.audiencia}
                            </span>
                            {reg.estado === 'inactivo' && (
                              <span
                                className="px-2 py-0.5 text-[10px] md:text-xs font-bold rounded-md uppercase"
                                style={{ backgroundColor: '#FCEBEB', color: '#A32D2D' }}
                              >
                                Inactivo
                              </span>
                            )}
                            <span className="text-[10px] flex items-center gap-1 ml-auto" style={{ color: '#B4B2A9' }}>
                              <Clock size={10}/> {new Date(reg.fecha_actualizacion).toLocaleDateString()}
                            </span>
                          </div>
                          <h3 className="font-bold text-base md:text-lg leading-tight" style={{ color: '#2C2C2A' }}>
                            {highlightText(reg.titulo, searchTerm)}
                          </h3>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto md:opacity-0 md:group-hover:opacity-100 transition-opacity justify-end pt-3 md:pt-0" style={{ borderTop: '1px solid #F1EFE8' }}>
                          <button
                            onClick={() => handleEdit(reg)}
                            className="flex-1 md:flex-none p-2 rounded-lg border flex justify-center transition"
                            style={{ backgroundColor: '#FAECE7', color: '#7A1020', borderColor: '#F5C4B3' }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F5C4B3'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FAECE7'}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => solicitarBorrarReglamento(reg.id)}
                            className="flex-1 md:flex-none p-2 rounded-lg border flex justify-center transition"
                            style={{ backgroundColor: '#FCEBEB', color: '#A32D2D', borderColor: '#F7C1C1' }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F7C1C1'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FCEBEB'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Nuevo / Editar documento */}
          {currentView === 'nuevo' && (
            <div
              className="rounded-xl p-4 md:p-8 max-w-4xl mx-auto"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #D3D1C7', boxShadow: '0 2px 8px rgba(122,16,32,0.06)' }}
            >
              <div className="space-y-4 md:space-y-6">
                <div>
                  <label className="block text-sm font-bold mb-2" style={{ color: '#5F5E5A' }}>Título del Documento</label>
                  <input
                    type="text"
                    value={formData.titulo}
                    onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                    className="w-full p-3 rounded-lg outline-none font-bold text-black transition"
                    style={{ border: '1px solid #B4B2A9' }}
                    onFocus={e => { e.target.style.borderColor = '#7A1020'; e.target.style.boxShadow = '0 0 0 3px rgba(122,16,32,0.12)' }}
                    onBlur={e => { e.target.style.borderColor = '#B4B2A9'; e.target.style.boxShadow = 'none' }}
                    placeholder="Ej: Requisitos de Matrícula 2024..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Categoría */}
                  <div className="relative">
                    <label className="block text-sm font-bold mb-2" style={{ color: '#5F5E5A' }}>Categoría</label>
                    <button
                      onClick={() => setShowDropdown(!showDropdown)}
                      className="w-full p-3 rounded-lg flex justify-between items-center outline-none font-bold text-black transition"
                      style={{ backgroundColor: '#FFFFFF', border: '1px solid #B4B2A9' }}
                      onFocus={e => { e.target.style.borderColor = '#7A1020'; e.target.style.boxShadow = '0 0 0 3px rgba(122,16,32,0.12)' }}
                      onBlur={e => { e.target.style.borderColor = '#B4B2A9'; e.target.style.boxShadow = 'none' }}
                    >
                      <span className="text-left leading-tight whitespace-normal truncate">{formData.categoria || "Seleccionar"}</span>
                      <ChevronDown size={20} className={`shrink-0 transition-transform ${showDropdown ? 'rotate-180' : ''}`} style={{ color: '#888780' }} />
                    </button>
                    {showDropdown && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)}></div>
                        <div
                          className="absolute left-0 z-50 w-full mt-1 rounded-lg shadow-xl max-h-60 overflow-y-auto font-bold"
                          style={{ backgroundColor: '#FFFFFF', border: '1px solid #D3D1C7' }}
                        >
                          <button
                            onClick={() => { setShowModalCategoria(true); setShowDropdown(false); }}
                            className="w-full text-left p-3 font-bold transition"
                            style={{ color: '#7A1020', borderBottom: '1px solid #D3D1C7' }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FAECE7'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            + Nueva...
                          </button>
                          {listaCategorias.map((cat, i) => (
                            <button
                              key={i}
                              onClick={() => { setFormData({...formData, categoria: cat}); setShowDropdown(false); }}
                              className="w-full text-left p-3 text-black text-sm transition"
                              style={{ borderBottom: '1px solid #F1EFE8' }}
                              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F1EFE8'}
                              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Audiencia */}
                  <div>
                    <label className="block text-sm font-bold mb-2" style={{ color: '#5F5E5A' }}>Dirigido a (Audiencia)</label>
                    <select
                      value={formData.audiencia}
                      onChange={(e) => setFormData({...formData, audiencia: e.target.value})}
                      className="w-full p-3 rounded-lg outline-none font-bold appearance-none text-black transition"
                      style={{ backgroundColor: '#FFFFFF', border: '1px solid #B4B2A9' }}
                      onFocus={e => { e.target.style.borderColor = '#7A1020'; e.target.style.boxShadow = '0 0 0 3px rgba(122,16,32,0.12)' }}
                      onBlur={e => { e.target.style.borderColor = '#B4B2A9'; e.target.style.boxShadow = 'none' }}
                    >
                      <option value="general">General (Todos)</option>
                      <option value="padres">Padres de Familia</option>
                      <option value="estudiantes">Estudiantes</option>
                      <option value="docentes">Docentes / Staff</option>
                    </select>
                  </div>

                  {/* Estado */}
                  <div>
                    <label className="block text-sm font-bold mb-2" style={{ color: '#5F5E5A' }}>Estado del Documento</label>
                    <select
                      value={formData.estado}
                      onChange={(e) => setFormData({...formData, estado: e.target.value})}
                      className="w-full p-3 rounded-lg outline-none font-bold appearance-none transition"
                      style={{
                        backgroundColor: formData.estado === 'activo' ? '#E1F5EE' : '#FCEBEB',
                        border: `1px solid ${formData.estado === 'activo' ? '#9FE1CB' : '#F7C1C1'}`,
                        color: formData.estado === 'activo' ? '#0F6E56' : '#A32D2D',
                      }}
                      onFocus={e => { e.target.style.boxShadow = '0 0 0 3px rgba(122,16,32,0.12)' }}
                      onBlur={e => { e.target.style.boxShadow = 'none' }}
                    >
                      <option value="activo">Activo (Visible para IA)</option>
                      <option value="inactivo">Inactivo (Archivado)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2" style={{ color: '#5F5E5A' }}>Contenido de la Normativa</label>
                  <textarea
                    value={formData.contenido}
                    onChange={(e) => setFormData({...formData, contenido: e.target.value})}
                    rows="12"
                    className="w-full p-3 rounded-lg text-sm outline-none font-bold leading-relaxed text-black transition"
                    style={{ border: '1px solid #B4B2A9' }}
                    onFocus={e => { e.target.style.borderColor = '#7A1020'; e.target.style.boxShadow = '0 0 0 3px rgba(122,16,32,0.12)' }}
                    onBlur={e => { e.target.style.borderColor = '#B4B2A9'; e.target.style.boxShadow = 'none' }}
                    placeholder="Pega aquí el texto completo del reglamento, requisitos o información..."
                  />
                  <p className="text-right text-xs mt-1 font-bold" style={{ color: '#888780' }}>
                    Caracteres: {formData.contenido.length}
                  </p>
                </div>

                <div className="flex flex-col-reverse md:flex-row gap-4 pt-4" style={{ borderTop: '1px solid #D3D1C7' }}>
                  <button
                    onClick={() => setCurrentView('lista')}
                    className="px-6 py-3 rounded-lg text-center font-bold transition"
                    style={{ backgroundColor: '#F1EFE8', color: '#5F5E5A' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#D3D1C7'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#F1EFE8'}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveReglamento}
                    className="flex-1 py-3 rounded-lg font-bold flex justify-center items-center gap-2 text-white transition"
                    style={{ backgroundColor: '#7A1020', boxShadow: '0 4px 12px rgba(122,16,32,0.25)' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#5C0A14'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#7A1020'}
                  >
                    <Save size={20}/> Guardar y Vectorizar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Logs / Auditoría */}
          {currentView === 'logs' && (
            <div className="space-y-4 font-sans text-black">
              <div
                className="p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between"
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #D3D1C7', boxShadow: '0 2px 8px rgba(122,16,32,0.06)' }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Clock size={18} style={{ color: '#888780' }} className="mr-2" />
                  {[
                    { id: 'hora', label: '1h' },
                    { id: 'hoy', label: 'Hoy' },
                    { id: '3días', label: '3 días' },
                    { id: 'semana', label: '1 sem' },
                    { id: 'mes', label: '1 mes' },
                    { id: 'custom', label: 'Personalizado' },
                    { id: 'all', label: 'Todo' }
                  ].map((btn) => (
                    <button
                      key={btn.id}
                      onClick={() => setLogTimeFilter(btn.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold transition"
                      style={{
                        backgroundColor: logTimeFilter === btn.id ? '#7A1020' : '#F1EFE8',
                        color: logTimeFilter === btn.id ? '#FFFFFF' : '#5F5E5A',
                        boxShadow: logTimeFilter === btn.id ? '0 2px 6px rgba(122,16,32,0.3)' : 'none',
                      }}
                      onMouseEnter={e => { if (logTimeFilter !== btn.id) e.currentTarget.style.backgroundColor = '#D3D1C7' }}
                      onMouseLeave={e => { if (logTimeFilter !== btn.id) e.currentTarget.style.backgroundColor = '#F1EFE8' }}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
                {logTimeFilter === 'custom' && (
                  <div className="flex items-center gap-2 font-bold">
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="p-2 rounded-lg text-xs outline-none transition"
                      style={{ border: '1px solid #B4B2A9' }}
                      onFocus={e => { e.target.style.borderColor = '#7A1020' }}
                      onBlur={e => { e.target.style.borderColor = '#B4B2A9' }}
                    />
                    <span style={{ color: '#888780' }}>a</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="p-2 rounded-lg text-xs outline-none transition"
                      style={{ border: '1px solid #B4B2A9' }}
                      onFocus={e => { e.target.style.borderColor = '#7A1020' }}
                      onBlur={e => { e.target.style.borderColor = '#B4B2A9' }}
                    />
                  </div>
                )}
                {logs.length > 0 && (
                  <button
                    onClick={solicitarVaciarHistorial}
                    className="text-xs md:text-sm font-bold flex items-center gap-1 transition"
                    style={{ color: '#A32D2D' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#7A1020'}
                    onMouseLeave={e => e.currentTarget.style.color = '#A32D2D'}
                  >
                    <Trash2 size={14} /> Vaciar Historial
                  </button>
                )}
              </div>

              <div
                className="rounded-xl text-black overflow-hidden"
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #D3D1C7', boxShadow: '0 2px 8px rgba(122,16,32,0.06)' }}
              >
                <div
                  className="p-4 flex justify-between items-center rounded-t-xl font-bold"
                  style={{ borderBottom: '1px solid #D3D1C7', backgroundColor: '#F1EFE8' }}
                >
                  <h3 className="font-bold flex items-center gap-2" style={{ color: '#5F5E5A' }}>
                    <MessageSquare size={18} style={{ color: '#7A1020' }} />
                    Mostrando {currentLogs.length} de {logsFiltrados.length} consultas
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs mr-2" style={{ color: '#888780' }}>
                      Página {currentPage} de {totalPages || 1}
                    </span>
                    <button
                      onClick={prevPage}
                      disabled={currentPage === 1}
                      className="p-1 rounded-lg border transition disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ borderColor: '#D3D1C7' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F1EFE8'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      onClick={nextPage}
                      disabled={currentPage === totalPages || totalPages === 0}
                      className="p-1 rounded-lg border transition disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ borderColor: '#D3D1C7' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F1EFE8'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>

                <div className="divide-y text-black" style={{ borderColor: '#F1EFE8' }}>
                  {currentLogs.length === 0 ? (
                    <div className="p-10 text-center font-medium" style={{ color: '#888780' }}>Sin registros recientes</div>
                  ) : (
                    currentLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-4 md:p-6 transition relative group"
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F1EFE8'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <button
                          onClick={() => solicitarBorrarLog(log.id)}
                          className="absolute top-4 right-4 p-2 md:opacity-0 md:group-hover:opacity-100 transition"
                          style={{ color: '#A32D2D' }}
                        >
                          <Trash2 size={18} />
                        </button>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-[10px] px-2 py-1 rounded-full font-bold uppercase flex items-center gap-1"
                              style={{ backgroundColor: '#FAECE7', color: '#7A1020' }}
                            >
                              <Users size={10}/> Usuario
                            </span>
                            <span className="text-[10px] font-bold flex items-center gap-1" style={{ color: '#B4B2A9' }}>
                              <Calendar size={10}/> {new Date(log.fecha).toLocaleString()}
                            </span>
                          </div>
                          <p className="font-bold text-base" style={{ color: '#2C2C2A' }}>"{log.pregunta}"</p>
                          <div
                            className="p-3 rounded-lg text-sm mt-1 leading-relaxed font-bold max-h-24 overflow-y-auto"
                            style={{ backgroundColor: '#FAEEDA', border: '1px solid #FAC775', color: '#5F5E5A' }}
                          >
                            {log.respuesta_bot}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}