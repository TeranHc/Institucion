// src/app/admin/page.js
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Dashboard from './modules/Dashboard'
import Documentos from './modules/Documentos'
import NuevoDocumento from './modules/NuevoDocumento'
import Auditoria from './modules/Auditoria'
// --- NUEVOS MÓDULOS ---
import Uniformes from './modules/Uniformes'
import Cronograma from './modules/Cronograma'

import { BookOpen, MessageSquare, Plus, Edit2, Trash2, Search, LogOut, Menu, X, BarChart3, Clock, Save, AlertTriangle, Loader2, ChevronDown, Filter, Calendar, ChevronLeft, ChevronRight, Users, Activity, Upload, FileText, Image as ImageIcon, ShoppingBag } from 'lucide-react'

// --- FUNCION NATIVA DE COMPRESIÓN DE IMÁGENES ---
const compressImage = (file, maxWidth = 1200, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target.result
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        if (width > maxWidth) {
          height = (maxWidth / width) * height
          width = maxWidth
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".webp"), {
              type: 'image/webp',
              lastModified: Date.now(),
            })
            resolve(compressedFile)
          } else resolve(file)
        }, 'image/webp', quality)
      }
      img.onerror = (err) => reject(err)
    }
    reader.onerror = (err) => reject(err)
  })
}

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
  
  const [selectedFiles, setSelectedFiles] = useState([]) 
  const [archivosEliminados, setArchivosEliminados] = useState([])
  const [formData, setFormData] = useState({ 
    titulo: '', categoria: '', contenido: '', audiencia: 'general', estado: 'activo', archivo_url: '' 
  })
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

  useEffect(() => { setCurrentPage(1); }, [logTimeFilter, currentView]);

  const cargarDatos = async () => {
    const { data: regs } = await supabase
        .from('base_conocimiento')
        .select('id, titulo, categoria, audiencia, estado, fecha_actualizacion, archivo_url') 
        .order('id', { ascending: false })
    if (regs) {
      setReglamentos(regs)
      setListaCategorias([...new Set(regs.map(r => r.categoria).filter(Boolean))])
    }
    const { data: logsData } = await supabase.from('logs_consultas').select('*').order('fecha', { ascending: false }).range(0, 99) 
    if (logsData) setLogs(logsData)
  }

  const highlightText = (text, highlight) => {
    if (!text) return "";
    if (!highlight.trim()) return text;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return <span>{parts.map((part, i) => part.toLowerCase() === highlight.toLowerCase() ? <mark key={i} className="bg-yellow-200 text-black p-0 rounded font-bold">{part}</mark> : part)}</span>;
  };

  const logsFiltrados = logs.filter(log => {
    const fechaLog = new Date(log.fecha); const ahora = new Date();
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
    const matchesSearch = searchTerm === '' || reg.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) || reg.categoria?.toLowerCase().includes(searchTerm.toLowerCase()) 
    const matchesCategory = filterCategory === 'Todas' || reg.categoria === filterCategory;
    return matchesSearch && matchesCategory;
  })

  const vaciarTodoElCache = async () => {
    const { error } = await supabase.from('logs_consultas').delete().gt('id', 0)
    if (!error) await cargarDatos()
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    const validFiles = files.filter(file => {
      const isAcceptedType = file.type.startsWith('image/') || file.type === 'application/pdf'
      const isLt5MB = file.size / 1024 / 1024 <= 5
      if (!isAcceptedType) alert(`El archivo ${file.name} no es una imagen ni un PDF válido.`)
      if (!isLt5MB) alert(`El archivo ${file.name} supera los 5MB permitidos.`)
      return isAcceptedType && isLt5MB
    })
    setSelectedFiles(prev => [...prev, ...validFiles])
  }

  const removeSelectedFile = (indexToRemove) => setSelectedFiles(prev => prev.filter((_, idx) => idx !== indexToRemove))

  const uploadFiles = async (files) => {
    const urls = []
    for (const file of files) {
      let fileToUpload = file
      if (file.type.startsWith('image/')) {
        try { fileToUpload = await compressImage(file) } catch (e) { console.error("Error comprimiendo imagen", e) }
      }
      const fileExt = fileToUpload.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const { error } = await supabase.storage.from('documentos').upload(fileName, fileToUpload)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('documentos').getPublicUrl(fileName)
      urls.push(publicUrl)
    }
    return urls
  }

  const handleSaveReglamento = async () => {
    const { data: { session } } = await supabase.auth.getSession() 
    if (!formData.titulo || !formData.categoria || !formData.contenido) return alert('Complete los campos principales')
    try {
      for (const url of archivosEliminados) {
        const nombreArchivo = url.split('/').pop()
        await supabase.storage.from('documentos').remove([nombreArchivo])
      }
      let finalUrlsString = formData.archivo_url || ''
      let urlsExistentes = finalUrlsString ? finalUrlsString.split(',').filter(Boolean) : []

      if (selectedFiles.length > 0) {
        setMensajeSistema('Comprimiendo y subiendo archivos...')
        const newUrls = await uploadFiles(selectedFiles)
        urlsExistentes = [...urlsExistentes, ...newUrls]
        finalUrlsString = urlsExistentes.join(',')
      }

      setMensajeSistema('Procesando documento...')
      const response = await fetch('/api/admin/guardar-reglamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ id: editingId, ...formData, archivo_url: finalUrlsString, action: editingId ? 'update' : 'create' })
      })

      if (!response.ok) throw new Error('Error al guardar')
      
      setMensajeSistema('Guardado correctamente.'); 
      setFormData({ titulo: '', categoria: '', contenido: '', audiencia: 'general', estado: 'activo', archivo_url: '' }); 
      setSelectedFiles([])
      setArchivosEliminados([])
      setEditingId(null); 
      setCurrentView('lista'); 
      await cargarDatos(); 
      setTimeout(() => setMensajeSistema(null), 5000)
    } catch (error) { alert('Error: ' + error.message); setMensajeSistema(null) }
  }

  const handleEdit = async (reg) => {
    setMensajeSistema('Cargando contenido...');
    const { data, error } = await supabase.from('base_conocimiento').select('contenido, archivo_url').eq('id', reg.id).single();
    if (error || !data) { alert("Error cargando contenido"); setMensajeSistema(null); return; }
    setFormData({ titulo: reg.titulo, categoria: reg.categoria, contenido: data.contenido, audiencia: reg.audiencia || 'general', estado: reg.estado || 'activo', archivo_url: data.archivo_url || '' }); 
    setSelectedFiles([])
    setArchivosEliminados([])
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
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/50 z-40 md:hidden" />}

      {/* --- MODAL DE CONFIRMACIÓN DE BORRADO (RECUPERADO) --- */}
      {deleteModal.show && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm text-black">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4" style={{ color: '#7A1020' }} />
            <h3 className="text-xl font-bold">¿Estás seguro?</h3>
            <p className="text-gray-500 text-sm mt-2 mb-6">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal({ show: false, type: null, id: null })}
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

      {/* --- MODAL DE NUEVA CATEGORÍA (RECUPERADO) --- */}
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
      <div className={`fixed inset-y-0 left-0 z-50 text-white transition-all duration-300 flex flex-col shadow-xl md:relative ${sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full md:w-20 md:translate-x-0'}`} style={{ backgroundColor: '#7A1020' }}>
        <div className="p-4 flex items-center justify-between h-16" style={{ borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
          {(sidebarOpen || (typeof window !== 'undefined' && window.innerWidth < 768)) && (
            <h2 className="text-xl font-bold tracking-wide truncate uppercase">Panel C. Verano</h2>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded transition hover:bg-white/10" style={{ color: 'rgba(255,255,255,0.8)' }}>
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto font-bold">
          {[
            { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
            { id: 'lista', icon: BookOpen, label: 'Documentos' },
            { id: 'nuevo', icon: Plus, label: 'Nuevo Doc.' },
            { id: 'uniformes', icon: ShoppingBag, label: 'Uniformes' }, // MÓDULO NUEVO
            { id: 'cronograma', icon: Calendar, label: 'Cronograma' }, // MÓDULO NUEVO
            { id: 'logs', icon: Clock, label: 'Auditoría' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentView(item.id);
                if (item.id === 'nuevo') { setEditingId(null); setSelectedFiles([]); setFormData({ titulo: '', categoria: '', contenido: '', audiencia: 'general', estado: 'activo', archivo_url: '' }) }
                if (window.innerWidth < 768) setSidebarOpen(false);
              }}
              className="w-full flex items-center gap-3 p-3 rounded-lg transition"
              style={{ backgroundColor: currentView === item.id ? 'rgba(255,255,255,0.18)' : 'transparent', color: '#FFFFFF' }}
            >
              <item.icon className="w-5 h-5 min-w-[20px]" />
              <span className={`${!sidebarOpen && 'md:hidden'} transition-all duration-200 whitespace-nowrap`}>{item.label}</span>
            </button>
          ))}
        </nav>

        <button onClick={handleLogout} className="p-4 flex items-center gap-3 transition font-bold hover:bg-black/30" style={{ borderTop: '1px solid rgba(255,255,255,0.15)', backgroundColor: 'rgba(0,0,0,0.2)', color: 'rgba(255,255,255,0.85)' }}>
          <LogOut className="w-5 h-5 min-w-[20px]" />
          <span className={`${!sidebarOpen && 'md:hidden'}`}>Salir</span>
        </button>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 overflow-auto flex flex-col w-full relative text-black">
        <div className="p-4 flex justify-between items-center sticky top-0 z-30 min-h-[64px]" style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #D3D1C7', boxShadow: '0 2px 8px rgba(122,16,32,0.06)' }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 rounded-lg transition hover:bg-gray-100" style={{ color: '#5F5E5A' }}>
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg md:text-2xl font-bold truncate uppercase" style={{ color: '#7A1020' }}>
              {currentView.charAt(0).toUpperCase() + currentView.slice(1)}
            </h1>
          </div>
          {mensajeSistema && (
            <span className="hidden md:block px-3 py-1 rounded text-sm animate-pulse font-bold" style={{ backgroundColor: '#E1F5EE', color: '#0F6E56' }}>
              {mensajeSistema}
            </span>
          )}
        </div>

        <div className="p-4 md:p-6 max-w-6xl mx-auto w-full">
          {currentView === 'dashboard' && <Dashboard reglamentos={reglamentos} logs={logs} />}
          {currentView === 'lista' && <Documentos searchTerm={searchTerm} setSearchTerm={setSearchTerm} filterCategory={filterCategory} setFilterCategory={setFilterCategory} showFilterDropdown={showFilterDropdown} setShowFilterDropdown={setShowFilterDropdown} listaCategorias={listaCategorias} reglamentosFiltrados={reglamentosFiltrados} highlightText={highlightText} handleEdit={handleEdit} solicitarBorrarReglamento={solicitarBorrarReglamento} />}
          {currentView === 'nuevo' && <NuevoDocumento formData={formData} setFormData={setFormData} listaCategorias={listaCategorias} showDropdown={showDropdown} setShowDropdown={setShowDropdown} showModalCategoria={showModalCategoria} setShowModalCategoria={setShowModalCategoria} nuevaCategoriaInput={nuevaCategoriaInput} setNuevaCategoriaInput={setNuevaCategoriaInput} guardarNuevaCategoria={guardarNuevaCategoria} selectedFiles={selectedFiles} handleFileChange={handleFileChange} removeSelectedFile={removeSelectedFile} archivosEliminados={archivosEliminados} setArchivosEliminados={setArchivosEliminados} handleSaveReglamento={handleSaveReglamento} setCurrentView={setCurrentView} />}
          {currentView === 'logs' && <Auditoria logs={logs} currentLogs={currentLogs} currentPage={currentPage} totalPages={totalPages} logTimeFilter={logTimeFilter} setLogTimeFilter={setLogTimeFilter} customStartDate={customStartDate} setCustomStartDate={setCustomStartDate} customEndDate={customEndDate} setCustomEndDate={setCustomEndDate} logsFiltrados={logsFiltrados} prevPage={prevPage} nextPage={nextPage} solicitarVaciarHistorial={solicitarVaciarHistorial} solicitarBorrarLog={solicitarBorrarLog} />}
          
          {/* RENDER DE NUEVOS MÓDULOS */}
          {currentView === 'uniformes' && <Uniformes setMensajeSistema={setMensajeSistema} />}
          {currentView === 'cronograma' && <Cronograma setMensajeSistema={setMensajeSistema} />}
        </div>
      </div>
    </div>
  )
}