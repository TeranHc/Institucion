// src/app/admin/modules/Dashboard.js

import { BookOpen, MessageSquare } from 'lucide-react'

export default function Dashboard({
  reglamentos,
  logs
}) {
  return (                
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
          
  )
}