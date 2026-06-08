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

    // Cliente normal del usuario
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: "Sesión inválida" }, { status: 401 })
    
    const verifiedUserId = user.id

    // NUEVO: Inicializamos el cliente ADMIN (Se salta el RLS de "Solo admins leen logs")
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // -----------------------------------------------------------------------
    // 2. CONFIGURACIÓN Y GENERACIÓN DE EMBEDDING
    // -----------------------------------------------------------------------
    const apiKey = process.env.GEMINI_API_KEY || ""
    const body = await req.json()
    const { message, history, previousThoughtSignature } = body

    if (!message) return NextResponse.json({ response: "Pregunta vacía" })

    const genAI = new GoogleGenerativeAI(apiKey)
    const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

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
      .eq('estado', 'activo'); 
    
    const listaCategorias = [...new Set(categoriasData?.map(c => c.categoria))].filter(Boolean).join(', ');

    // -----------------------------------------------------------------------
    // 3. BÚSQUEDA EN CACHÉ (LOGS ANTERIORES) - AHORA CON SUPABASE ADMIN
    // -----------------------------------------------------------------------
    // Al usar supabaseAdmin, garantizamos que el sistema pueda leer el historial 
    // sin ser bloqueado por las políticas RLS del usuario.
    const { data: cacheHit } = await supabaseAdmin.rpc('buscar_similares', {
        query_embedding: vectorUsuario,
        match_threshold: 0.96, 
        match_count: 1
    });

    if (cacheHit && cacheHit.length > 0) {
        const respuestaPrevia = cacheHit[0].respuesta_bot;
        
        let parsedRespuesta;
        try {
            parsedRespuesta = JSON.parse(respuestaPrevia);
        } catch (e) {
            parsedRespuesta = { respuesta: respuestaPrevia };
        }

        const textoRespuesta = parsedRespuesta.respuesta || respuestaPrevia;

        const esRespuestaVacia = 
            textoRespuesta.includes("no dispongo de información") || 
            textoRespuesta.includes("no tengo información") ||
            textoRespuesta.includes("no puedo proporcionar detalles");

        if (!esRespuestaVacia) {
            return NextResponse.json({ 
                response: textoRespuesta,
                suggestions: parsedRespuesta.sugerencias || ["¿Puedes darme más detalles?", "¿Qué otros temas conoces?", "Gracias"],
                imagen_url: parsedRespuesta.imagen_url || null,
                archivo_url: parsedRespuesta.archivo_url || null,
                source: "Respuesta rápida (Historial)"
            });
        }
    }

    // -----------------------------------------------------------------------
    // 4. BÚSQUEDA EN BASE DE CONOCIMIENTO (REGLAMENTOS + UNIFORMES Y EVENTOS)
    // -----------------------------------------------------------------------
    const { data: documentos } = await supabase.rpc('match_documents', {
        query_embedding: vectorUsuario, 
        match_threshold: 0.50, 
        match_count: 5 
    });

    const { data: eventosProximos } = await supabase.from('eventos_proximos').select('*').limit(10);
    const { data: catalogoUniformes } = await supabase.from('uniformes').select('*');

    const hayInformacionReglamentos = documentos && documentos.length > 0;
    
    let contexto = "";
    let sourceLabel = "Conocimiento General";

    if (hayInformacionReglamentos) {
      contexto = documentos.map(doc => 
        `-- FUENTE REGLAMENTO: ${doc.titulo} (Categoría: ${doc.categoria} | Dirigido a: ${doc.audiencia}) --\n${doc.contenido}\nLINK ARCHIVO ADJUNTO: ${doc.archivo_url || 'null'}\n`
      ).join('\n\n');
      sourceLabel = "Documento Oficial";
    }

    if (eventosProximos && eventosProximos.length > 0) {
      contexto += `\n\n==================================================\n`;
      contexto += `FUENTE: CRONOGRAMA ESCOLAR (CALENDARIO DE EVENTOS PRÓXIMOS):\n`;
      eventosProximos.forEach(ev => {
        const fechaFormateada = new Date(ev.fecha_evento).toLocaleDateString('es-ES', { 
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
        });
        contexto += `- Evento: ${ev.titulo} | Fecha: ${fechaFormateada} | Tipo: ${ev.tipo} | Descripción: ${ev.descripcion || 'Sin descripción'}\n`;
      });
      contexto += `==================================================\n`;
      if (sourceLabel === "Conocimiento General") sourceLabel = "Cronograma Escolar";
    }

    if (catalogoUniformes && catalogoUniformes.length > 0) {
      contexto += `\n\n==================================================\n`;
      contexto += `FUENTE: CATÁLOGO DE UNIFORMES DE LA INSTITUCIÓN:\n`;
      catalogoUniformes.forEach(uni => {
        contexto += `- Uniforme: ${uni.nombre} | Categoría: ${uni.categoria} | Precio: $${uni.precio} | Descripción: ${uni.descripcion || 'Sin descripción'} | LINK IMAGEN: ${uni.imagen_url || 'null'}\n`;
      });
      contexto += `==================================================\n`;
      if (sourceLabel === "Conocimiento General" || sourceLabel === "Cronograma Escolar") sourceLabel = "Información Escolar";
    }

    // -----------------------------------------------------------------------
    // 5. GENERACIÓN CON GEMINI
    // -----------------------------------------------------------------------
    const model = genAI.getGenerativeModel({ 
        model: "gemini-3.1-flash-lite",
        generationConfig: { responseMimeType: "application/json" } 
    });
    
    const historialTexto = history ? history.map(h => `${h.role}: ${h.parts[0].text}`).join('\n') : "";

    const prompt = `
      Eres el asistente virtual oficial llamada Christina, amable y experta de la escuela "Casita de Verano".
      
      TEMAS Y MÓDULOS DISPONIBLES EN TU BASE DE DATOS:
      Reglamentos Activos (${listaCategorias || "Información general"}), Catálogo Completo de Uniformes y el Cronograma de Eventos Escolares.

      TU OBJETIVO:
      Proporcionar una respuesta COMPLETA, DETALLES PRECISOS y EMPÁTICA basándote EXCLUSIVAMENTE en el contexto recuperado. 
      Dirígete al usuario de forma cordial. Tu audiencia principal son padres de familia y estudiantes.

      INSTRUCCIÓN DE IDENTIDAD Y CAPACIDADES:
      SOLO si el usuario te pregunta explícitamente sobre tus funciones o qué datos manejas, menciona que eres el asistente de "Casita de Verano" y que puedes resolver dudas sobre: reglamentos institucionales (${listaCategorias || "Varios"}), precios y categorías de Uniformes, y las fechas de nuestro Cronograma Escolar.

      CÓMO ACTUAR ANTE PREGUNTAS DE UNIFORMES:
      Si te preguntan sobre uniformes, usa los precios, nombres y descripciones que aparecen en el catálogo provisto.

      CÓMO ACTUAR ANTE PREGUNTAS DEL CRONOGRAMA / EVENTOS:
      Si te consultan por eventos (reuniones, exámenes, feriados), revisa las fechas listadas. Ofréceles la información de manera ordenada cronológicamente si aplica.

      ESTADO DE DATOS (REGLAMENTOS): ${hayInformacionReglamentos ? "✅ INFORMACIÓN ENCONTRADA" : "❌ NO HAY INFORMACIÓN EN LA BASE DE DATOS"}
      
      CONTEXTO RECUPERADO (Toda tu respuesta obligatoriamente debe salir de aquí):
      ${contexto}
      
      HISTORIAL DE CHAT:
      ${historialTexto}

      PREGUNTA DEL USUARIO: "${message}"

      INSTRUCCIONES DE RESPUESTA (CRÍTICAS):
      1. **ESTRUCTURA**: Usa formato Markdown estructurado. Usa subtítulos (### Título) para separar temas y negritas (**texto**) para recalcar datos críticos como precios o fechas exactas.
      2. **DETALLE**: Desglosa la información compleja usando listas ordenadas o viñetas (- elemento) para que sea digerible para un padre de familia ocupado.
      3. **SI NO HAY DATOS**: Si la pregunta no se puede responder con el contexto proporcionado (es decir, no aparece ni en reglamentos, ni en uniformes, ni en eventos), responde amablemente que no posees registros exactos sobre ese tema en tu sistema actual y recomiéndales contactar de forma directa a la secretaría del plantel. Jamás inventes precios, fechas ni normativas.

      FORMATO JSON OBLIGATORIO DE SALIDA:
      {
        "respuesta": "Aquí va tu respuesta detallada, amable y estructurada en Markdown...",
        "sugerencias": ["Pregunta Sugerida 1", "Pregunta Sugerida 2", "Pregunta Sugerida 3"],
        "imagen_url": "Si el usuario pregunta por un uniforme y el contexto incluye un LINK IMAGEN válido (que no sea 'null'), pon ese link aquí. Si no hay, pon null",
        "archivo_url": "Si la respuesta está basada en un reglamento que incluye un LINK ARCHIVO ADJUNTO válido (que no sea 'null'), pon ese link aquí. Si no hay, pon null"
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
        await supabaseAdmin.from('logs_consultas').insert([{
            usuario_id: verifiedUserId,
            pregunta: message,
            respuesta_bot: JSON.stringify(jsonResponse), 
            embedding: vectorUsuario,
            firma_pensamiento: newThoughtSignature 
        }]);
    }

    return NextResponse.json({ 
      response: jsonResponse.respuesta,
      suggestions: jsonResponse.sugerencias,
      imagen_url: jsonResponse.imagen_url,
      archivo_url: jsonResponse.archivo_url,
      source: sourceLabel,
      thoughtSignature: newThoughtSignature
    });

  } catch (error) {
    console.error("Error API Chat:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}