// src/app/api/admin/guardar-reglamento/route.js
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    // -----------------------------------------------------------------------
    // 🔒 1. CAPA DE SEGURIDAD CRÍTICA
    // -----------------------------------------------------------------------
    
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: "No autorizado: Token faltante" }, { status: 401 })
    }

    // A. Cliente para validar el TOKEN (Anon Key es suficiente aquí)
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: "Sesión inválida o expirada" }, { status: 401 })
    }

    // B. Cliente con PODERES TOTALES (Service Role)
    // Lo inicializamos aquí para usarlo en la verificación del rol y saltar el RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY 
    )

    // C. Verificar rol usando el cliente ADMIN
    const { data: perfil, error: perfilError } = await supabaseAdmin
        .from('perfiles_usuarios')
        .select('rol')
        .eq('id', user.id)
        .single()

    // Log para depuración en tu terminal
    console.log(`Verificando usuario: ${user.id} | Rol en DB: ${perfil?.rol}`);

    if (perfilError || perfil?.rol !== 'admin') {
      console.warn(`Acceso denegado: El usuario ${user.id} tiene rol [${perfil?.rol}]`);
      return NextResponse.json({ 
        error: "Acceso denegado: Se requiere rol de administrador",
        debug_rol: perfil?.rol 
      }, { status: 403 })
    }

    // -----------------------------------------------------------------------
    // ✅ 2. LÓGICA DE NEGOCIO (Solo si es Admin)
    // -----------------------------------------------------------------------

    // NUEVO: Extraemos audiencia y estado desde el frontend
    const { id, titulo, contenido, categoria, audiencia, estado, archivo_url,action } = await req.json()

    if (!contenido) throw new Error("El contenido es obligatorio para generar el vector")

    // Configuración de Gemini
    const apiKey = process.env.GEMINI_API_KEY
    const genAI = new GoogleGenerativeAI(apiKey)

    // NUEVO: Usamos el modelo moderno de embeddings de Google
    const embeddingModel = genAI.getGenerativeModel(
      { model: "gemini-embedding-001" }
    );

    // Convertimos el texto en matemáticas (Vector)
    const resultEmbedding = await embeddingModel.embedContent({
      content: { parts: [{ text: contenido }] },
      taskType: "RETRIEVAL_DOCUMENT",
      outputDimensionality: 768, // Dimensiones exactas requeridas por nuestra BD
    });

    const vector = resultEmbedding.embedding.values;

    let errorSupabase = null

    // Valores por defecto por si acaso envían algo vacío
    const docAudiencia = audiencia || 'general'
    const docEstado = estado || 'activo'

    if (action === 'create') {
      const { error } = await supabaseAdmin.from('base_conocimiento').insert([{
        titulo,
        contenido,
        categoria,
        audiencia: docAudiencia, // NUEVO
        estado: docEstado,       // NUEVO
        archivo_url,
        embedding: vector
      }])
      errorSupabase = error
    } 
    else if (action === 'update') {
      const { error } = await supabaseAdmin.from('base_conocimiento').update({
        titulo,
        contenido,
        categoria,
        audiencia: docAudiencia, // NUEVO
        estado: docEstado,       // NUEVO
        archivo_url,
        embedding: vector,
        fecha_actualizacion: new Date().toISOString()
      }).eq('id', id)
      errorSupabase = error
    }

    if (errorSupabase) throw errorSupabase

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error("Error al procesar reglamento:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}