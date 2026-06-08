// src/app/admin/modules/Uniformes.js
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Plus, Edit2, Trash2, Image as ImageIcon, Loader2, X, Check } from 'lucide-react'

export default function Uniformes({ setMensajeSistema }) {
  const [uniformes, setUniformes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  
  // Categorías dinámicas
  const [categoriasLocales, setCategoriasLocales] = useState(['Diario', 'Deportivo', 'Gala', 'Accesorios'])
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryText, setNewCategoryText] = useState('')

  const [formData, setFormData] = useState({
    nombre: '', descripcion: '', precio: '', categoria: 'Diario', imagen_url: ''
  })

  useEffect(() => { cargarUniformes() }, [])

  const cargarUniformes = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('uniformes').select('*').order('id', { ascending: false })
    if (data) {
      setUniformes(data)
      // Extraer categorías únicas de la base de datos y combinarlas
      const categoriasBD = [...new Set(data.map(u => u.categoria).filter(Boolean))]
      setCategoriasLocales(prev => [...new Set([...prev, ...categoriasBD])])
    }
    setLoading(false)
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file && file.type.startsWith('image/')) setImageFile(file)
    else alert("Por favor selecciona una imagen válida.")
  }

  const guardarUniforme = async () => {
    if (!formData.nombre || !formData.precio || !formData.categoria) return alert("Nombre, Precio y Categoría son obligatorios")
    setMensajeSistema("Guardando uniforme...")
    let publicUrl = formData.imagen_url

    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop()
      const fileName = `uniforme_${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('documentos').upload(fileName, imageFile)
      if (!uploadError) {
        const { data } = supabase.storage.from('documentos').getPublicUrl(fileName)
        publicUrl = data.publicUrl
      }
    }

    const payload = { ...formData, precio: parseFloat(formData.precio), imagen_url: publicUrl }

    if (editingId) await supabase.from('uniformes').update(payload).eq('id', editingId)
    else await supabase.from('uniformes').insert([payload])

    setMensajeSistema("Uniforme guardado con éxito")
    cerrarModal()
    cargarUniformes()
    setTimeout(() => setMensajeSistema(null), 3000)
  }

  const editarUniforme = (uni) => {
    setEditingId(uni.id)
    setFormData({ nombre: uni.nombre, descripcion: uni.descripcion || '', precio: uni.precio, categoria: uni.categoria, imagen_url: uni.imagen_url || '' })
    setImageFile(null)
    setIsAddingCategory(false)
    setShowModal(true)
  }

  const eliminarUniforme = async (id) => {
    if (confirm("¿Seguro que deseas eliminar este uniforme?")) {
      await supabase.from('uniformes').delete().eq('id', id)
      cargarUniformes()
    }
  }

  const cerrarModal = () => {
    setShowModal(false); setEditingId(null); setImageFile(null); setIsAddingCategory(false); setNewCategoryText('');
    setFormData({ nombre: '', descripcion: '', precio: '', categoria: 'Diario', imagen_url: '' })
  }

  const confirmarNuevaCategoria = () => {
    if (newCategoryText.trim()) {
      const nuevaCat = newCategoryText.trim();
      setCategoriasLocales(prev => [...new Set([...prev, nuevaCat])]);
      setFormData({ ...formData, categoria: nuevaCat });
    }
    setIsAddingCategory(false);
    setNewCategoryText('');
  }

  if (loading) return <div className="text-center p-10"><Loader2 className="animate-spin inline-block mr-2" />Cargando Catálogo...</div>

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#D3D1C7] p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-[#7A1020]">Catálogo de Uniformes</h2>
        <button onClick={() => setShowModal(true)} className="bg-[#7A1020] text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-[#5C0A14] transition">
          <Plus size={18} /> Añadir Uniforme
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {uniformes.map(uni => (
          <div key={uni.id} className="border border-[#D3D1C7] rounded-xl overflow-hidden hover:shadow-md transition">
            <div className="h-48 bg-gray-100 flex items-center justify-center overflow-hidden relative group">
              {uni.imagen_url ? <img src={uni.imagen_url} alt={uni.nombre} className="w-full h-full object-cover" /> : <ImageIcon size={40} className="text-gray-400" />}
            </div>
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg leading-tight">{uni.nombre}</h3>
                <span className="bg-green-100 text-green-800 text-sm font-bold px-2 py-1 rounded">${uni.precio}</span>
              </div>
              <p className="text-sm text-gray-500 mb-2 font-semibold">Categoría: <span className="text-[#7A1020]">{uni.categoria}</span></p>
              <p className="text-sm text-gray-600 line-clamp-2">{uni.descripcion}</p>
              <div className="mt-4 flex gap-2 border-t pt-4">
                <button onClick={() => editarUniforme(uni)} className="flex-1 text-[#7A1020] font-medium flex justify-center items-center gap-1 hover:bg-red-50 p-2 rounded transition"><Edit2 size={16}/> Editar</button>
                <button onClick={() => eliminarUniforme(uni.id)} className="flex-1 text-gray-500 font-medium flex justify-center items-center gap-1 hover:bg-gray-100 p-2 rounded transition"><Trash2 size={16}/> Borrar</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-[#7A1020] mb-4">{editingId ? 'Editar Uniforme' : 'Nuevo Uniforme'}</h3>
            <div className="space-y-4">
              <input type="text" placeholder="Nombre (Ej: Polo Deportivo)" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full border border-[#D3D1C7] rounded p-2 focus:outline-none focus:border-[#7A1020]" />
              
              <div className="flex gap-4">
                <input type="number" placeholder="Precio ($)" value={formData.precio} onChange={e => setFormData({...formData, precio: e.target.value})} className="w-1/2 border border-[#D3D1C7] rounded p-2 focus:outline-none focus:border-[#7A1020]" />
                
                {/* LÓGICA DE CATEGORÍAS DINÁMICAS */}
                <div className="w-1/2">
                  {isAddingCategory ? (
                    <div className="flex gap-1">
                      <input type="text" autoFocus placeholder="Nueva cat..." value={newCategoryText} onChange={e => setNewCategoryText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && confirmarNuevaCategoria()} className="w-full border border-[#7A1020] rounded p-2 focus:outline-none" />
                      <button onClick={confirmarNuevaCategoria} className="bg-[#7A1020] text-white p-2 rounded"><Check size={16}/></button>
                      <button onClick={() => setIsAddingCategory(false)} className="bg-gray-200 text-gray-600 p-2 rounded"><X size={16}/></button>
                    </div>
                  ) : (
                    <select value={formData.categoria} onChange={e => {
                        if (e.target.value === 'NUEVA') setIsAddingCategory(true)
                        else setFormData({...formData, categoria: e.target.value})
                      }} 
                      className="w-full border border-[#D3D1C7] rounded p-2 focus:outline-none focus:border-[#7A1020]"
                    >
                      {categoriasLocales.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      <option value="NUEVA" className="font-bold text-[#7A1020]">+ Añadir Nueva...</option>
                    </select>
                  )}
                </div>
              </div>

              <textarea placeholder="Descripción del uniforme..." value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} className="w-full border border-[#D3D1C7] rounded p-2 h-24 focus:outline-none focus:border-[#7A1020]"></textarea>
              
              <div className="border border-dashed border-[#D3D1C7] rounded p-4 text-center hover:bg-gray-50 transition">
                <label className="cursor-pointer text-[#7A1020] font-bold flex items-center justify-center gap-2">
                  <ImageIcon size={20} />
                  {imageFile ? imageFile.name : formData.imagen_url ? 'Cambiar Imagen Actual' : 'Subir Imagen (Opcional)'}
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={cerrarModal} className="px-4 py-2 border rounded font-medium hover:bg-gray-50">Cancelar</button>
              <button onClick={guardarUniforme} className="px-4 py-2 bg-[#7A1020] text-white rounded font-bold hover:bg-[#5C0A14]">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}