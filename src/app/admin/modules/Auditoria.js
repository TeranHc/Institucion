import {
  Clock,
  Trash2,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Users,
  Calendar
} from 'lucide-react'
export default function Auditoria(props) {
  const {
    logs,
    currentLogs,
    currentPage,
    totalPages,
    logTimeFilter,
    setLogTimeFilter,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    logsFiltrados,
    prevPage,
    nextPage,
    solicitarVaciarHistorial,
    solicitarBorrarLog
  } = props

  return (

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

  )
}