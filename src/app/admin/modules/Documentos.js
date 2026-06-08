// src/app/admin/modules/Documentos.js

import {
  Search,
  Filter,
  ChevronDown,
  Clock,
  Users,
  FileText,
  Edit2,
  Trash2
} from 'lucide-react'

export default function Documentos(props) {

  const {
    searchTerm,
    setSearchTerm,

    filterCategory,
    setFilterCategory,

    showFilterDropdown,
    setShowFilterDropdown,

    listaCategorias,

    reglamentosFiltrados,

    highlightText,

    handleEdit,

    solicitarBorrarReglamento
  } = props

  return (
        
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
                            {reg.archivo_url && (
                              <span className="px-2 py-0.5 text-[10px] md:text-xs font-bold rounded-md flex items-center gap-1" style={{ backgroundColor: '#E1F5EE', color: '#0F6E56' }}>
                                <FileText size={10}/> Adjuntos
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
  )
}