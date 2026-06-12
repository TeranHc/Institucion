// src/app/admin/modules/Cronograma.js
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Plus, Edit2, Trash2, Calendar, Loader2, ChevronLeft, ChevronRight, X, Check, Filter, CalendarPlus, AlertTriangle, Info } from 'lucide-react'

export default function Cronograma({ setMensajeSistema }) {
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const [filtroTipo, setFiltroTipo] = useState('Todos')
  const [vistaAgenda, setVistaAgenda] = useState('Proximos')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [tiposLocales, setTiposLocales] = useState(['General', 'Examen', 'Reunión', 'Feriado'])
  const [isAddingTipo, setIsAddingTipo] = useState(false)
  const [newTipoText, setNewTipoText] = useState('')

  // Estado para alertas y confirmaciones personalizadas
  const [dialog, setDialog] = useState({ isOpen: false, type: 'alert', message: '', onConfirm: null })

  const [formData, setFormData] = useState({
    titulo: '', fecha_evento: '', descripcion: '', tipo: 'General'
  })

  useEffect(() => { cargarEventos() }, [])

  const cargarEventos = async () => {
    setLoading(true)
    const { data } = await supabase.from('eventos_escolares').select('*').order('fecha_evento', { ascending: true })
    if (data) {
      setEventos(data)
      const tiposBD = [...new Set(data.map(e => e.tipo).filter(Boolean))]
      setTiposLocales(prev => [...new Set([...prev, ...tiposBD])])
    }
    setLoading(false)
  }

  // --- CONTROL DE DIÁLOGOS (Alertas y Confirmaciones) ---
  const showDialog = (type, message, onConfirm = null) => setDialog({ isOpen: true, type, message, onConfirm })
  const closeDialog = () => setDialog({ isOpen: false, type: 'alert', message: '', onConfirm: null })

  // --- LÓGICA DEL CALENDARIO VISUAL ---
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))

  const handleDayClick = (day) => {
    const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day, 8, 0)
    
    // Bloquear creación en días pasados
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    if (selectedDate < hoy) {
      return showDialog('alert', 'No puedes crear eventos nuevos en fechas que ya pasaron.')
    }

    const tzoffset = selectedDate.getTimezoneOffset() * 60000
    const localISOTime = (new Date(selectedDate - tzoffset)).toISOString().slice(0, 16)
    setFormData({ titulo: '', descripcion: '', tipo: 'General', fecha_evento: localISOTime })
    setEditingId(null)
    setIsAddingTipo(false)
    setShowModal(true)
  }

  const editarEvento = (ev) => {
    setEditingId(ev.id)
    const d = new Date(ev.fecha_evento)
    const tzoffset = d.getTimezoneOffset() * 60000
    const fecha = (new Date(d - tzoffset)).toISOString().slice(0, 16)
    setFormData({ titulo: ev.titulo, descripcion: ev.descripcion || '', tipo: ev.tipo || 'General', fecha_evento: fecha })
    setIsAddingTipo(false)
    setShowModal(true)
  }

  const guardarEvento = async () => {
    if (!formData.titulo || !formData.fecha_evento) return showDialog('alert', 'El título y la fecha son obligatorios.')
    setMensajeSistema('Guardando evento...')
    if (editingId) await supabase.from('eventos_escolares').update(formData).eq('id', editingId)
    else await supabase.from('eventos_escolares').insert([formData])
    setMensajeSistema('Evento guardado exitosamente')
    cerrarModal()
    cargarEventos()
    setTimeout(() => setMensajeSistema(null), 3000)
  }

  const requestEliminarEvento = (id) => {
    showDialog('confirm', '¿Estás seguro de eliminar este evento del calendario? Esta acción no se puede deshacer.', async () => {
      await supabase.from('eventos_escolares').delete().eq('id', id)
      cargarEventos()
      cerrarModal()
      setMensajeSistema('Evento eliminado')
      setTimeout(() => setMensajeSistema(null), 3000)
    })
  }

  const cerrarModal = () => {
    setShowModal(false); setEditingId(null); setIsAddingTipo(false); setNewTipoText('')
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

  // Colores por tipo — usados en chips del calendario y badges de agenda
  const chipStyle = (tipo) => {
    const t = (tipo || '').toLowerCase()
    if (t.includes('examen'))          return { chip: 'border-l-2 border-red-500 bg-red-50 text-red-800',     badge: 'bg-red-50 text-red-700 border border-red-200' }
    if (t.includes('reuni'))           return { chip: 'border-l-2 border-blue-500 bg-blue-50 text-blue-800',  badge: 'bg-blue-50 text-blue-700 border border-blue-200' }
    if (t.includes('feriado'))         return { chip: 'border-l-2 border-green-500 bg-green-50 text-green-800', badge: 'bg-green-50 text-green-700 border border-green-200' }
    return                             { chip: 'border-l-2 border-amber-500 bg-amber-50 text-amber-800',  badge: 'bg-amber-50 text-amber-700 border border-amber-200' }
  }

  const eventosFiltrados = eventos.filter(ev => filtroTipo === 'Todos' || ev.tipo === filtroTipo)

  const agendaEventos = eventosFiltrados.filter(ev => {
    const hoy = new Date().setHours(0, 0, 0, 0)
    const fechaEv = new Date(ev.fecha_evento).getTime()
    return vistaAgenda === 'Proximos' ? fechaEv >= hoy : fechaEv < hoy
  }).sort((a, b) =>
    vistaAgenda === 'Proximos'
      ? new Date(a.fecha_evento) - new Date(b.fecha_evento)
      : new Date(b.fecha_evento) - new Date(a.fecha_evento)
  )

  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const mesesShort = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

  // Bloqueo de evento pasado
  const isPastEvent = editingId && new Date(formData.fecha_evento).getTime() < new Date().setHours(0,0,0,0)

  if (loading) return (
    <div className="flex justify-center items-center h-64 text-[#7A1020] font-medium gap-2">
      <Loader2 className="animate-spin" size={20} /> Cargando cronograma...
    </div>
  )

  return (
    <div className="flex flex-col xl:flex-row h-full gap-0 bg-[#F5F4F0] rounded-xl overflow-hidden border border-[#D3D1C7] w-full">

      {/* ── AGENDA LATERAL ── */}
      <div className="w-full xl:w-72 flex-shrink-0 bg-white border-b xl:border-b-0 xl:border-r border-[#D3D1C7] flex flex-col h-auto xl:h-[calc(100vh-140px)] max-h-[400px] xl:max-h-full">

        {/* Header agenda */}
        <div className="px-4 pt-4 pb-3 border-b border-[#D3D1C7]">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Agenda</p>
          <div className="flex bg-[#F5F4F0] p-0.5 rounded-lg gap-0.5">
            {['Proximos', 'Pasados'].map(v => (
              <button
                key={v}
                onClick={() => setVistaAgenda(v)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  vistaAgenda === v
                    ? 'bg-white text-[#7A1020] shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {v === 'Proximos' ? 'Próximos' : 'Pasados'}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de eventos */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {agendaEventos.length === 0 ? (
            <div className="text-center mt-8 text-gray-300 flex flex-col items-center gap-2">
              <Calendar size={28} className="opacity-30" />
              <p className="text-xs">No hay eventos.</p>
            </div>
          ) : agendaEventos.map(ev => {
            const d = new Date(ev.fecha_evento)
            const { badge } = chipStyle(ev.tipo)
            return (
              <div
                key={`agenda-${ev.id}`}
                onClick={() => editarEvento(ev)}
                className="flex gap-3 px-3 py-2.5 rounded-xl border border-[#E8E6DC] bg-white hover:border-[#7A1020]/30 transition-all group relative cursor-pointer"
              >
                {/* Fecha box */}
                <div className="w-10 h-10 rounded-lg bg-[#F8F0F2] flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-[9px] font-bold text-[#7A1020] uppercase tracking-wider leading-none">{mesesShort[d.getMonth()]}</span>
                  <span className="text-lg font-bold text-[#7A1020] leading-none mt-0.5">{d.getDate()}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 pr-6">
                  <p className="text-sm font-semibold text-gray-800 truncate">{ev.titulo}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${badge}`}>{ev.tipo}</span>
                    <span className="text-[10px] text-gray-400">{d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                {/* Acciones al hover */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex flex-col gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); editarEvento(ev) }}
                    className="w-6 h-6 flex items-center justify-center rounded-md bg-[#F8F0F2] text-[#7A1020] hover:bg-[#7A1020] hover:text-white transition"
                  >
                    <Edit2 size={11} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); requestEliminarEvento(ev.id) }}
                    className="w-6 h-6 flex items-center justify-center rounded-md bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── CALENDARIO PRINCIPAL ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">

        {/* Header calendario */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-5 py-3.5 border-b border-[#D3D1C7] bg-white">

          {/* Título */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Calendar size={18} className="text-[#7A1020]" />
            <h2 className="text-base font-bold text-[#7A1020] tracking-tight">Calendario institucional</h2>
          </div>

          {/* Navegación mes */}
          <div className="flex items-center border border-[#D3D1C7] rounded-lg overflow-hidden w-full md:w-auto justify-center">
            <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-[#F5F4F0] transition">
              <ChevronLeft size={16} />
            </button>
            <span className="px-4 h-8 flex items-center text-xs font-bold text-[#7A1020] uppercase tracking-wider border-x border-[#D3D1C7] min-w-[148px] justify-center">
              {meses[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-[#F5F4F0] transition">
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Controles derechos */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            {/* Filtro */}
            <div className="flex flex-1 md:flex-none items-center gap-2 px-3 h-8 bg-[#F5F4F0] border border-[#D3D1C7] rounded-lg">
              <Filter size={13} className="text-gray-400 flex-shrink-0" />
              <select
                value={filtroTipo}
                onChange={e => setFiltroTipo(e.target.value)}
                className="bg-transparent text-xs font-semibold text-gray-700 w-full focus:outline-none cursor-pointer"
              >
                <option value="Todos">Todos</option>
                {tiposLocales.map(t => <option key={`f-${t}`} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Botón nuevo */}
            <button
              onClick={() => {
                setFormData({ titulo: '', descripcion: '', tipo: 'General', fecha_evento: '' })
                setEditingId(null)
                setIsAddingTipo(false)
                setShowModal(true)
              }}
              className="flex items-center justify-center gap-1.5 px-3 h-8 bg-[#7A1020] text-white text-xs font-semibold rounded-lg hover:bg-[#5C0A14] transition whitespace-nowrap"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">Nuevo evento</span>
            </button>
          </div>
        </div>

        {/* Grilla del calendario */}
        <div className="flex-1 overflow-auto p-3 md:p-4">

          {/* Etiquetas de días */}
          <div className="grid grid-cols-7 gap-1 md:gap-1.5 mb-1.5">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest py-1">{d}</div>
            ))}
          </div>

          {/* Celdas */}
          <div className="grid grid-cols-7 gap-1 md:gap-1.5">
            {/* Celdas vacías iniciales */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`e-${i}`} className="min-h-[90px] md:min-h-[110px] rounded-lg border border-dashed border-gray-100 bg-gray-50/40" />
            ))}

            {/* Días del mes */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dia = i + 1
              const fechaCuadro = new Date(currentDate.getFullYear(), currentDate.getMonth(), dia, 23, 59, 59)
              const isPastDay = fechaCuadro < new Date()
              const isToday = (
                dia === new Date().getDate() &&
                currentDate.getMonth() === new Date().getMonth() &&
                currentDate.getFullYear() === new Date().getFullYear()
              )
              
              const eventosDelDia = eventosFiltrados.filter(ev => {
                const d = new Date(ev.fecha_evento)
                return d.getDate() === dia && d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear()
              })
              
              const visibles = eventosDelDia.slice(0, 3)
              const extra = eventosDelDia.length - 3

              return (
                <div
                  key={dia}
                  onClick={() => handleDayClick(dia)}
                  className={`min-h-[90px] md:min-h-[110px] p-1.5 rounded-lg border flex flex-col group transition-all duration-150 overflow-hidden
                    ${isPastDay 
                      ? 'bg-gray-50/50 cursor-not-allowed hover:bg-gray-100 border-[#E8E6DC]' 
                      : 'cursor-pointer hover:border-[#7A1020]/40 hover:shadow-sm'}
                    ${isToday ? 'border-[#7A1020] bg-[#FDF5F6]' : (isPastDay ? '' : 'border-[#E8E6DC] bg-white')}
                  `}
                >
                  {/* Número del día */}
                  <div className="flex justify-end mb-1">
                    <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition
                      ${isToday
                        ? 'bg-[#7A1020] text-white'
                        : isPastDay ? 'text-gray-400' : 'text-gray-400 group-hover:text-[#7A1020]'
                      }`}
                    >
                      {dia}
                    </span>
                  </div>

                  {/* Chips de eventos */}
                  <div className="flex-1 flex flex-col gap-0.5 overflow-hidden">
                    {visibles.map(ev => {
                      const { chip } = chipStyle(ev.tipo)
                      return (
                        <div
                          key={ev.id}
                          onClick={(e) => { e.stopPropagation(); editarEvento(ev) }}
                          className={`text-[9px] md:text-[10px] font-semibold px-1.5 py-0.5 rounded-r-md truncate cursor-pointer hover:opacity-80 ${chip} ${isPastDay ? 'opacity-60 grayscale-[50%]' : ''}`}
                          title={ev.titulo}
                        >
                          {ev.titulo}
                        </div>
                      )
                    })}
                    {extra > 0 && (
                      <div className="text-[9px] md:text-[10px] text-gray-400 pl-1">+{extra} más</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── MODAL FORMULARIO DE EVENTOS ── */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) cerrarModal() }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden my-auto">

            {/* Top del modal */}
            <div className="flex items-center justify-between px-5 md:px-6 py-4 border-b border-[#E8E6DC]">
              <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                {editingId ? <Edit2 size={17} className="text-[#7A1020]" /> : <CalendarPlus size={17} className="text-[#7A1020]" />}
                {editingId ? 'Detalle del Evento' : 'Nuevo Evento'}
              </h3>
              <button
                onClick={cerrarModal}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#F5F4F0] text-gray-400 hover:text-gray-600 hover:bg-[#E8E6DC] transition"
              >
                <X size={15} />
              </button>
            </div>

            {/* Cuerpo del modal */}
            <div className="px-5 md:px-6 py-5 flex flex-col gap-4">

              {/* AVISO DE EVENTO PASADO */}
              {isPastEvent && (
                <div className="bg-amber-50 text-amber-800 border border-amber-200 p-3 rounded-lg text-xs font-bold flex items-start gap-2">
                  <Info size={16} className="flex-shrink-0 mt-0.5" />
                  <p>Este evento ya culminó. Está en modo de solo lectura, pero puedes eliminarlo o cambiar su fecha para reprogramarlo.</p>
                </div>
              )}

              {/* Título */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Título del evento</label>
                <input
                  type="text"
                  disabled={isPastEvent}
                  placeholder="Ej: Examen quimestral matemáticas"
                  value={formData.titulo}
                  onChange={e => setFormData({ ...formData, titulo: e.target.value })}
                  className={`h-10 px-3 border border-[#D3D1C7] rounded-lg text-sm transition focus:outline-none focus:border-[#7A1020] focus:ring-2 focus:ring-[#7A1020]/10 
                    ${isPastEvent ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'text-gray-800 bg-white placeholder:text-gray-300'}`}
                />
              </div>

              {/* Fecha y Tipo en fila */}
              <div className="flex flex-col md:flex-row gap-3 md:gap-4">
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fecha y hora</label>
                  {/* LA FECHA SIEMPRE ES EDITABLE PARA REPROGRAMAR */}
                  <input
                    type="datetime-local"
                    value={formData.fecha_evento}
                    onChange={e => setFormData({ ...formData, fecha_evento: e.target.value })}
                    className="h-10 px-3 border border-[#7A1020]/40 rounded-lg text-sm text-[#7A1020] font-bold bg-white focus:outline-none focus:border-[#7A1020] focus:ring-2 focus:ring-[#7A1020]/10 transition w-full"
                  />
                </div>

                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tipo de evento</label>
                  {isAddingTipo ? (
                    <div className="flex gap-1 h-10">
                      <input
                        type="text"
                        autoFocus
                        placeholder="Nuevo tipo..."
                        value={newTipoText}
                        onChange={e => setNewTipoText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && confirmarNuevoTipo()}
                        className="flex-1 w-full min-w-0 px-2 border-2 border-[#7A1020] rounded-lg text-sm focus:outline-none"
                      />
                      <button onClick={confirmarNuevoTipo} className="w-9 flex items-center justify-center bg-[#7A1020] text-white rounded-lg hover:bg-[#5C0A14] transition flex-shrink-0">
                        <Check size={15} />
                      </button>
                      <button onClick={() => setIsAddingTipo(false)} className="w-9 flex items-center justify-center bg-[#F5F4F0] text-gray-500 rounded-lg hover:bg-[#E8E6DC] transition flex-shrink-0">
                        <X size={15} />
                      </button>
                    </div>
                  ) : (
                    <select
                      value={formData.tipo}
                      disabled={isPastEvent}
                      onChange={e => {
                        if (e.target.value === '__new__') setIsAddingTipo(true)
                        else setFormData({ ...formData, tipo: e.target.value })
                      }}
                      className={`h-10 px-3 border border-[#D3D1C7] rounded-lg text-sm w-full transition focus:outline-none focus:border-[#7A1020] focus:ring-2 focus:ring-[#7A1020]/10 
                        ${isPastEvent ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'text-gray-800 bg-white'}`}
                    >
                      {tiposLocales.map(t => <option key={t} value={t}>{t}</option>)}
                      <option value="__new__">+ Añadir tipo...</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Descripción */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Descripción / notas</label>
                <textarea
                  disabled={isPastEvent}
                  placeholder="Requisitos, temario, indicaciones especiales..."
                  value={formData.descripcion}
                  onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                  className={`px-3 py-2.5 h-24 border border-[#D3D1C7] rounded-lg text-sm transition resize-none focus:outline-none focus:border-[#7A1020] focus:ring-2 focus:ring-[#7A1020]/10 
                    ${isPastEvent ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'text-gray-800 bg-white placeholder:text-gray-300'}`}
                />
              </div>
            </div>

            {/* Footer del modal responsivo */}
            <div className="flex flex-col md:flex-row items-center justify-between px-5 md:px-6 pb-5 gap-3 w-full">
              {editingId ? (
                <button
                  onClick={() => requestEliminarEvento(editingId)}
                  className="w-full md:w-auto flex items-center justify-center gap-1.5 bg-red-600 text-white hover:bg-red-700 px-4 py-2.5 rounded-lg text-sm font-bold transition shadow-sm order-3 md:order-1"
                >
                  <Trash2 size={16} /> Eliminar Evento
                </button>
              ) : <div className="hidden md:block order-1" />}

              <div className="flex flex-col-reverse md:flex-row gap-2 w-full md:w-auto order-1 md:order-2">
                <button
                  onClick={cerrarModal}
                  className="w-full md:w-auto px-5 py-2.5 border border-[#D3D1C7] text-gray-600 text-sm font-semibold rounded-lg hover:bg-[#F5F4F0] transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarEvento}
                  className="w-full md:w-auto px-5 py-2.5 bg-[#7A1020] text-white text-sm font-bold rounded-lg hover:bg-[#5C0A14] transition active:scale-95"
                >
                  {isPastEvent ? 'Reprogramar Fecha' : 'Guardar evento'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── MODAL GENÉRICO DE ALERTAS Y CONFIRMACIONES ── */}
      {dialog.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in zoom-in-95">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col items-center text-center">
            
            {dialog.type === 'alert' ? (
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
                <AlertTriangle size={24} />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
                <AlertTriangle size={24} />
              </div>
            )}
            
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {dialog.type === 'alert' ? 'Aviso Importante' : 'Confirmar Acción'}
            </h3>
            
            <p className="text-sm text-gray-500 mb-6 font-medium leading-relaxed">
              {dialog.message}
            </p>
            
            <div className="flex gap-3 w-full">
              {dialog.type === 'confirm' && (
                <button 
                  onClick={closeDialog} 
                  className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
              )}
              <button 
                onClick={() => {
                  if (dialog.onConfirm) dialog.onConfirm();
                  closeDialog();
                }} 
                className={`flex-1 py-2.5 rounded-lg text-white font-bold transition shadow-sm ${dialog.type === 'confirm' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#7A1020] hover:bg-[#5C0A14]'}`}
              >
                {dialog.type === 'confirm' ? 'Sí, eliminar' : 'Entendido'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}