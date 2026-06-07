// src/app/api/chat/route.js
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const maxDuration = 60; 
export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    // -----------------------------------------------------------------------
    // 1. SEGURIDAD: Validar sesión real del usuario
    // -----------------------------------------------------------------------
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) return NextResponse.json({ error: "No token" }, { status: 401 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: "Sesión inválida" }, { status: 401 })
    
    const verifiedUserId = user.id

    // -----------------------------------------------------------------------
    // 2. CONFIGURACIÓN Y GENERACIÓN DE EMBEDDING
    // -----------------------------------------------------------------------
    const apiKey = process.env.GEMINI_API_KEY || ""
    const body = await req.json()
    const { message, history, previousThoughtSignature } = body

    if (!message) return NextResponse.json({ response: "Pregunta vacía" })

    const genAI = new GoogleGenerativeAI(apiKey)

    // NUEVO: Usamos el modelo moderno (el mismo que en el panel admin)
    const embeddingModel = genAI.getGenerativeModel(
      { model: "gemini-embedding-001" }
    );

    const embeddingResult = await embeddingModel.embedContent({
      content: { parts: [{ text: message }] },
      taskType: "RETRIEVAL_QUERY",
      outputDimensionality: 768, 
    });

    const vectorUsuario = embeddingResult.embedding.values;

    // --- OBTENER CATEGORÍAS REALES DE LA BD PARA EL PROMPT ---
    const { data: categoriasData } = await supabase
      .from('base_conocimiento')
      .select('categoria')
      .eq('estado', 'activo'); // NUEVO: Solo traemos categorías de documentos activos
    
    const listaCategorias = [...new Set(categoriasData?.map(c => c.categoria))].filter(Boolean).join(', ');

    // -----------------------------------------------------------------------
    // 3. BÚSQUEDA EN CACHÉ (LOGS ANTERIORES)
    // -----------------------------------------------------------------------
    const { data: cacheHit } = await supabase.rpc('buscar_similares', {
        query_embedding: vectorUsuario,
        match_threshold: 0.96, 
        match_count: 1
    });

    if (cacheHit && cacheHit.length > 0) {
        const respuestaPrevia = cacheHit[0].respuesta_bot;
        
        const esRespuestaVacia = 
            respuestaPrevia.includes("no dispongo de información") || 
            respuestaPrevia.includes("no tengo información") ||
            respuestaPrevia.includes("no puedo proporcionar detalles");

        if (!esRespuestaVacia) {
            return NextResponse.json({ 
                response: respuestaPrevia,
                suggestions: [
                    "¿Puedes darme más detalles?", 
                    "¿Qué otros temas conoces?", 
                    "Gracias"
                ],
                source: "Respuesta rápida (Historial)"
            });
        }
    }

    // -----------------------------------------------------------------------
    // 4. BÚSQUEDA EN BASE DE CONOCIMIENTO (REGLAMENTOS)
    // -----------------------------------------------------------------------
    const { data: documentos } = await supabase
      .rpc('match_documents', {
        query_embedding: vectorUsuario, 
        match_threshold: 0.50, 
        match_count: 5 
      })

    const hayInformacion = documentos && documentos.length > 0;
    
    let contexto = "";
    let sourceLabel = "Conocimiento General";

    if (hayInformacion) {
      // NUEVO: Le inyectamos al bot la "audiencia" para que sepa para quién es la regla
      contexto = documentos.map(doc => 
        `-- FUENTE: ${doc.titulo} (Categoría: ${doc.categoria} | Dirigido a: ${doc.audiencia}) --\n${doc.contenido}\n`
      ).join('\n\n');
      sourceLabel = "Documento Oficial";
    }

    // -----------------------------------------------------------------------
    // 5. GENERACIÓN CON GEMINI
    // -----------------------------------------------------------------------
    const model = genAI.getGenerativeModel({ 
        model: "gemini-3.1-flash-lite",
        generationConfig: { responseMimeType: "application/json" } 
    })
    
    const historialTexto = history ? history.map(h => `${h.role}: ${h.parts[0].text}`).join('\n') : "";

    // NUEVO: Prompt ajustado para la identidad de Casita de Verano
    const prompt = `
      Eres el asistente virtual oficial llamada Christina, amable y experto de la escuela "Casita de Verano".
      
      TEMAS Y DOCUMENTOS DISPONIBLES EN TU BASE DE DATOS:
      ${listaCategorias || "Información institucional general"}

      TU OBJETIVO:
      Proporcionar una respuesta COMPLETA, DETALLADA y EMPÁTICA basándote EXCLUSIVAMENTE en el contexto recuperado.
      Dirígete al usuario de forma cordial, recordando que tu audiencia principal son padres de familia y estudiantes.

      INSTRUCCIÓN DE IDENTIDAD:
      SOLO si el usuario te pregunta específicamente sobre tus funciones o qué información tienes, menciona que eres el asistente de "Casita de Verano" y conoces sobre: (${listaCategorias}).
      ESTADO DE DATOS: ${hayInformacion ? "✅ INFORMACIÓN ENCONTRADA" : "❌ NO HAY INFORMACIÓN EN LA BASE DE DATOS"}
      
      CONTEXTO RECUPERADO (Toda tu respuesta debe salir de aquí):
      ${contexto}
      
      HISTORIAL DE CHAT: ${historialTexto}
      PREGUNTA DEL USUARIO: "${message}"

      INSTRUCCIONES DE RESPUESTA (IMPORTANTE):
      1. **ESTRUCTURA**: Usa formato Markdown. Usa títulos (### Título) para separar secciones y negritas (**texto**) para resaltar conceptos clave.
      2. **DETALLE**: Si el texto recuperado habla de procesos, requisitos o fechas, DESGLÓSALOS en una lista con viñetas (- elemento) para que sea muy fácil de leer para un padre de familia.
      3. **AUDIENCIA**: Presta atención a la etiqueta "Dirigido a" del contexto. Si una regla es solo para docentes, acláraselo al usuario si aplica.
      4. **SI NO HAY DATOS**: Di amablemente que no tienes esa información específica en tus registros actuales y sugiere contactar directamente a la secretaría de la escuela. No inventes respuestas.

      INSTRUCCIONES PARA SUGERENCIAS:
      1. Sugiere 3 preguntas cortas que profundicen en el tema encontrado (ej: "¿Cuáles son los requisitos de matrícula?", "¿Tienen horarios extendidos?").
      2. Solo sugiere preguntas que sepas que puedes responder con el contexto que tienes.

      FORMATO JSON OBLIGATORIO:
      {
        "respuesta": "Aquí va tu respuesta detallada, amable y en Markdown...",
        "sugerencias": ["Pregunta Profunda 1", "Pregunta Profunda 2", "Pregunta Profunda 3"]
      }
    `;

    const requestConfig = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
    };

    if (previousThoughtSignature) {
        requestConfig.thoughtSignature = previousThoughtSignature; 
    } 
    
    const result = await model.generateContent(requestConfig);
    const jsonResponse = JSON.parse(result.response.text());
    
    const newThoughtSignature = result.response.thoughtSignature || null;
    
    // -----------------------------------------------------------------------
    // 6. GUARDADO DE LOGS (PARA FUTURA CACHÉ)
    // -----------------------------------------------------------------------
    if (verifiedUserId) {
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        
        await supabaseAdmin.from('logs_consultas').insert([{
            usuario_id: verifiedUserId,
            pregunta: message,
            respuesta_bot: jsonResponse.respuesta, 
            embedding: vectorUsuario,
            firma_pensamiento: newThoughtSignature 
        }]);
    }

    return NextResponse.json({ 
      response: jsonResponse.respuesta,
      suggestions: jsonResponse.sugerencias,
      source: sourceLabel,
      thoughtSignature: newThoughtSignature
    });

  } catch (error) {
    console.error("Error API:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}