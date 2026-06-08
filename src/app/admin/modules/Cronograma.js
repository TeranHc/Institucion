// src/app/admin/modules/Cronograma.js
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Plus, Edit2, Trash2, Calendar, Loader2, ChevronLeft, ChevronRight, X, Check } from 'lucide-react'

export default function Cronograma({ setMensajeSistema }) {
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  
  // Estado para el Calendario Visual
  const [currentDate, setCurrentDate] = useState(new Date())
  
  // Estado para los Tipos de Evento Dinámicos
  const [tiposLocales, setTiposLocales] = useState(['General', 'Examen', 'Reunión', 'Feriado'])
  const [isAddingTipo, setIsAddingTipo] = useState(false)
  const [newTipoText, setNewTipoText] = useState('')

  const [formData, setFormData] = useState({
    titulo: '', fecha_evento: '', descripcion: '', tipo: 'General'
  })

  useEffect(() => { cargarEventos() }, [])

  const cargarEventos = async () => {
    setLoading(true)
    const { data } = await supabase.from('eventos_escolares').select('*').order('fecha_evento', { ascending: true })
    if (data) {
      setEventos(data)
      // Extraer tipos únicos
      const tiposBD = [...new Set(data.map(e => e.tipo).filter(Boolean))]
      setTiposLocales(prev => [...new Set([...prev, ...tiposBD])])
    }
    setLoading(false)
  }

  // --- LÓGICA DEL CALENDARIO VISUAL ---
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay() // 0 = Domingo
  
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))

  const handleDayClick = (day) => {
    // Crear fecha local para las 08:00 AM del día clickeado
    const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day, 8, 0)
    // Ajustar a timezone local para el input datetime-local
    const tzoffset = selectedDate.getTimezoneOffset() * 60000 
    const localISOTime = (new Date(selectedDate - tzoffset)).toISOString().slice(0, 16)
    
    setFormData({ titulo: '', descripcion: '', tipo: 'General', fecha_evento: localISOTime })
    setEditingId(null)
    setIsAddingTipo(false)
    setShowModal(true)
  }

  const editarEvento = (ev) => {
    setEditingId(ev.id)
    const fecha = new Date(ev.fecha_evento).toISOString().slice(0, 16)
    setFormData({ titulo: ev.titulo, descripcion: ev.descripcion || '', tipo: ev.tipo || 'General', fecha_evento: fecha })
    setIsAddingTipo(false)
    setShowModal(true)
  }

  const guardarEvento = async () => {
    if (!formData.titulo || !formData.fecha_evento) return alert("Título y Fecha son obligatorios")
    setMensajeSistema("Guardando evento...")

    if (editingId) await supabase.from('eventos_escolares').update(formData).eq('id', editingId)
    else await supabase.from('eventos_escolares').insert([formData])

    setMensajeSistema("Evento guardado")
    cerrarModal()
    cargarEventos()
    setTimeout(() => setMensajeSistema(null), 3000)
  }

  const eliminarEvento = async (id) => {
    if (confirm("¿Eliminar este evento del calendario?")) {
      await supabase.from('eventos_escolares').delete().eq('id', id)
      cargarEventos()
    }
  }

  const cerrarModal = () => {
    setShowModal(false); setEditingId(null); setIsAddingTipo(false); setNewTipoText('');
  }

  const confirmarNuevoTipo = () => {
    if (newTipoText.trim()) {
      const nuevoTipo = newTipoText.trim()
      setTiposLocales(prev => [...new Set([...prev, nuevoTipo])])
      setFormData({ ...formData, tipo: nuevoTipo })
    }
    setIsAddingTipo(false)
    setNewTipoText('')
  }

  const getColorTipo = (tipo) => {
    const t = tipo?.toLowerCase() || ''
    if (t.includes('examen')) return 'bg-red-100 text-red-800'
    if (t.includes('reunión') || t.includes('reunion')) return 'bg-blue-100 text-blue-800'
    if (t.includes('feriado')) return 'bg-green-100 text-green-800'
    return 'bg-amber-100 text-amber-800' // Color por defecto (General y nuevos)
  }

  if (loading) return <div className="text-center p-10"><Loader2 className="animate-spin inline-block mr-2" />Cargando Cronograma...</div>

  return (
    <div className="flex flex-col xl:flex-row gap-6">
      
      {/* SECCIÓN IZQUIERDA: CALENDARIO VISUAL */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-[#D3D1C7] p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-[#7A1020] flex items-center gap-2">
            <Calendar size={24} /> Calendario Mensual
          </h2>
          <div className="flex items-center gap-4">
            <button onClick={prevMonth} className="p-2 bg-gray-100 rounded hover:bg-gray-200 transition"><ChevronLeft size={20}/></button>
            <span className="font-bold text-lg capitalize w-40 text-center">
              {currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={nextMonth} className="p-2 bg-gray-100 rounded hover:bg-gray-200 transition"><ChevronRight size={20}/></button>
          </div>
        </div>

        {/* Nombres de los días */}
        <div className="grid grid-cols-7 gap-2 mb-2 text-center font-bold text-gray-500 text-sm">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => <div key={d}>{d}</div>)}
        </div>

        {/* Cuadrícula de días */}
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="h-24 bg-gray-50 rounded-lg border border-transparent"></div>
          ))}
          
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dia = i + 1;
            // Buscar eventos para este día
            const eventosDelDia = eventos.filter(ev => {
              const d = new Date(ev.fecha_evento)
              return d.getDate() === dia && d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear()
            })

            const isToday = dia === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear()

            return (
              <div 
                key={dia} 
                onClick={() => handleDayClick(dia)}
                className={`h-24 p-2 rounded-lg border transition cursor-pointer hover:border-[#7A1020] hover:shadow-md flex flex-col ${isToday ? 'bg-red-50 border-red-200' : 'bg-white border-[#D3D1C7]'}`}
              >
                <div className={`text-right font-bold text-sm ${isToday ? 'text-[#7A1020]' : 'text-gray-700'}`}>{dia}</div>
                <div className="flex-1 overflow-y-auto mt-1 space-y-1 scrollbar-hide">
                  {eventosDelDia.map(ev => (
                    <div key={ev.id} className={`text-[10px] leading-tight px-1.5 py-0.5 rounded truncate font-semibold ${getColorTipo(ev.tipo)}`}>
                      {new Date(ev.fecha_evento).toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'})} - {ev.titulo}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* SECCIÓN DERECHA: LISTA DE PRÓXIMOS EVENTOS (Para no perder el control rápido) */}
      <div className="xl:w-1/3 bg-white rounded-xl shadow-sm border border-[#D3D1C7] p-6 flex flex-col h-[calc(100vh-140px)]">
        <h2 className="text-xl font-bold text-[#7A1020] mb-4">Agenda Próxima</h2>
        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
          {eventos.filter(ev => new Date(ev.fecha_evento) >= new Date().setHours(0,0,0,0)).slice(0, 10).map(ev => {
            const fecha = new Date(ev.fecha_evento)
            return (
              <div key={`lista-${ev.id}`} className="flex gap-3 p-3 border border-[#D3D1C7] rounded-lg bg-gray-50 hover:bg-white transition group relative">
                <div className="w-12 h-12 bg-white border border-[#D3D1C7] rounded flex flex-col justify-center items-center text-[#7A1020] flex-shrink-0">
                  <span className="text-[10px] font-bold uppercase leading-none">{fecha.toLocaleString('es', { month: 'short' })}</span>
                  <span className="text-lg font-black leading-none mt-1">{fecha.getDate()}</span>
                </div>
                <div className="flex-1 overflow-hidden">
                  <h4 className="font-bold text-sm truncate">{ev.titulo}</h4>
                  <p className="text-xs text-gray-500 mt-1 flex gap-2">
                     <span className={`px-1.5 rounded-sm font-semibold ${getColorTipo(ev.tipo)}`}>{ev.tipo}</span>
                     {fecha.toLocaleTimeString('es', {hour: '2-digit', minute:'2-digit'})}
                  </p>
                </div>
                {/* Botones de acción rápidos al hacer hover */}
                <div className="absolute right-2 top-2 hidden group-hover:flex gap-1 bg-white/90 p-1 rounded shadow-sm">
                  <button onClick={(e) => { e.stopPropagation(); editarEvento(ev); }} className="p-1 text-[#7A1020] hover:bg-gray-100 rounded"><Edit2 size={14}/></button>
                  <button onClick={(e) => { e.stopPropagation(); eliminarEvento(ev.id); }} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 size={14}/></button>
                </div>
              </div>
            )
          })}
          {eventos.length === 0 && <p className="text-sm text-gray-500 text-center mt-10">Agenda libre.</p>}
        </div>
      </div>

      {/* MODAL DE CREACIÓN / EDICIÓN */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-[#7A1020] mb-4">{editingId ? 'Editar Evento' : 'Nuevo Evento'}</h3>
            <div className="space-y-4">
              <input type="text" placeholder="Título del Evento" value={formData.titulo} onChange={e => setFormData({...formData, titulo: e.target.value})} className="w-full border border-[#D3D1C7] rounded p-2 focus:outline-none focus:border-[#7A1020]" />
              
              <div className="flex gap-4">
                <input type="datetime-local" value={formData.fecha_evento} onChange={e => setFormData({...formData, fecha_evento: e.target.value})} className="w-1/2 border border-[#D3D1C7] rounded p-2 focus:outline-none focus:border-[#7A1020]" />
                
                {/* LÓGICA DE TIPOS DINÁMICOS */}
                <div className="w-1/2">
                  {isAddingTipo ? (
                    <div className="flex gap-1">
                      <input type="text" autoFocus placeholder="Nuevo tipo..." value={newTipoText} onChange={e => setNewTipoText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && confirmarNuevoTipo()} className="w-full border border-[#7A1020] rounded p-2 focus:outline-none text-sm" />
                      <button onClick={confirmarNuevoTipo} className="bg-[#7A1020] text-white p-1.5 rounded"><Check size={16}/></button>
                      <button onClick={() => setIsAddingTipo(false)} className="bg-gray-200 text-gray-600 p-1.5 rounded"><X size={16}/></button>
                    </div>
                  ) : (
                    <select value={formData.tipo} onChange={e => {
                        if (e.target.value === 'NUEVO') setIsAddingTipo(true)
                        else setFormData({...formData, tipo: e.target.value})
                      }} 
                      className="w-full border border-[#D3D1C7] rounded p-2 focus:outline-none focus:border-[#7A1020]"
                    >
                      {tiposLocales.map(tipo => <option key={tipo} value={tipo}>{tipo}</option>)}
                      <option value="NUEVO" className="font-bold text-[#7A1020]">+ Añadir Tipo...</option>
                    </select>
                  )}
                </div>

              </div>
              <textarea placeholder="Descripción detallada (Requisitos, lugar, etc)..." value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} className="w-full border border-[#D3D1C7] rounded p-2 h-24 focus:outline-none focus:border-[#7A1020]"></textarea>
            </div>
            
            <div className="flex justify-between items-center mt-6">
              {editingId ? (
                 <button onClick={() => eliminarEvento(editingId)} className="text-red-500 hover:text-red-700 text-sm font-bold flex items-center gap-1"><Trash2 size={16}/> Eliminar</button>
              ) : <div></div>}
              <div className="flex gap-3">
                <button onClick={cerrarModal} className="px-4 py-2 border rounded font-medium hover:bg-gray-50">Cancelar</button>
                <button onClick={guardarEvento} className="px-4 py-2 bg-[#7A1020] text-white rounded font-bold hover:bg-[#5C0A14]">Guardar Evento</button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}