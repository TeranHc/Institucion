import {
  ChevronDown,
  Upload,
  FileText,
  Image as ImageIcon,
  X,
  Save
} from 'lucide-react'
export default function NuevoDocumento(props) {
  const {
    formData,
    setFormData,
    listaCategorias,
    showDropdown,
    setShowDropdown,
    showModalCategoria,
    setShowModalCategoria,
    nuevaCategoriaInput,
    setNuevaCategoriaInput,
    guardarNuevaCategoria,
    selectedFiles,
    handleFileChange,
    removeSelectedFile,
    archivosEliminados,
    setArchivosEliminados,
    handleSaveReglamento,
    setCurrentView
  } = props

  return (
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
                    rows="8"
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

                {/* GESTIÓN DE ARCHIVOS MÚLTIPLES */}
                <div>
                  <label className="block text-sm font-bold mb-2" style={{ color: '#5F5E5A' }}>Archivos Adjuntos (PDF o Imágenes máx 5MB)</label>
                  
                  {/* Selector y Drag Area */}
                  <div 
                    className="border-2 border-dashed p-6 rounded-lg text-center transition hover:bg-gray-50 cursor-pointer" 
                    style={{ borderColor: '#B4B2A9', backgroundColor: '#FAECE7' }}
                  >
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                      className="hidden" 
                      id="fileInput" 
                    />
                    <label htmlFor="fileInput" className="cursor-pointer flex flex-col items-center justify-center w-full h-full" style={{ color: '#7A1020' }}>
                      <Upload className="mb-2 w-8 h-8" /> 
                      <span className="font-bold text-sm">Click aquí para seleccionar imágenes o PDFs</span>
                      <span className="text-[10px] mt-1 opacity-70">Las imágenes se comprimirán automáticamente a WebP</span>
                    </label>
                  </div>
                  
                  {/* Previsualización de archivos locales listos para subir */}
                  {selectedFiles.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-bold mb-2" style={{ color: '#5F5E5A' }}>Archivos listos para subir:</p>
                      <div className="flex gap-3 flex-wrap">
                        {selectedFiles.map((file, idx) => (
                          <div key={idx} className="relative p-2 rounded-lg border flex flex-col items-center gap-2 shadow-sm w-24 h-24 justify-center" style={{ borderColor: '#F5C4B3', backgroundColor: '#FFFFFF' }}>
                            {file.type.startsWith('image/') ? (
                              <img src={URL.createObjectURL(file)} alt="preview" className="w-10 h-10 object-cover rounded" />
                            ) : (
                              <FileText className="w-10 h-10" style={{ color: '#A32D2D' }}/>
                            )}
                            <div className="text-[10px] truncate w-full text-center font-bold" style={{ color: '#5F5E5A' }}>{file.name}</div>
                            <button 
                              onClick={() => removeSelectedFile(idx)} 
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-700 transition"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Previsualización de archivos existentes en la Base de Datos */}
{formData.archivo_url && (
  <div
    className="mt-4 p-3 rounded-lg border"
    style={{
      borderColor: '#D3D1C7',
      backgroundColor: '#F1EFE8'
    }}
  >
    <p
      className="text-xs font-bold mb-2"
      style={{ color: '#5F5E5A' }}
    >
      Archivos ya guardados en este documento:
    </p>

    <div className="flex gap-3 flex-wrap">
      {formData.archivo_url
        .split(',')
        .filter(Boolean)
        .map((url, idx) => {
          const esPdf = url.toLowerCase().includes('.pdf')

          return (
            <div
              key={idx}
              className="relative p-2 rounded-lg border bg-white shadow-sm"
              style={{
                borderColor: '#D3D1C7',
                width: '120px'
              }}
            >
              {esPdf ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-col items-center gap-2"
                >
                  <FileText
                    size={40}
                    style={{ color: '#A32D2D' }}
                  />
                  <span
                    className="text-[10px] text-center font-bold"
                    style={{ color: '#5F5E5A' }}
                  >
                    PDF
                  </span>
                </a>
              ) : (
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <img
                    src={url}
                    alt={`Adjunto ${idx + 1}`}
                    className="w-full h-20 object-cover rounded"
                  />
                </a>
              )}

              <button
                type="button"
                onClick={() => {
                setArchivosEliminados(prev => [...prev, url])

                const nuevasUrls = formData.archivo_url
                    .split(',')
                    .filter(Boolean)
                    .filter((_, i) => i !== idx)

                setFormData({
                    ...formData,
                    archivo_url: nuevasUrls.join(',')
                })
                }}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-700 transition"
              >
                <X size={12} />
              </button>
            </div>
          )
        })}
    </div>

    <p
      className="text-[10px] mt-2 italic"
      style={{ color: '#888780' }}
    >
      Los archivos eliminados aquí se borrarán al guardar el documento.
    </p>
  </div>
)}
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

  )
}