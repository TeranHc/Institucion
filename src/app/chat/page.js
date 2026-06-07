// src/app/chat/page.js
'use client'
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import ReactMarkdown from 'react-markdown'; 
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'; 
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Mic, MicOff, LogOut, Send, BookOpen, MessageSquare, Loader2, VolumeX, Lock, Unlock } from 'lucide-react';

export default function AsistenteFinalAzul() {
  const router = useRouter()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [userId, setUserId] = useState(null)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  
  const [modelReady, setModelReady] = useState(false)
  const hasGreetedRef = useRef(false)
  const [showGreeting, setShowGreeting] = useState(true)
  const [isCameraFixed, setIsCameraFixed] = useState(true)
  const [thoughtSignature, setThoughtSignature] = useState(null)

  const mountRef = useRef(null)
  const sceneRef = useRef(null)
  const characterRef = useRef(null)
  const faceMeshesRef = useRef([]) 
  const particlesRef = useRef(null)
  const recognitionRef = useRef(null)
  const messagesEndRef = useRef(null)
  const speakingRef = useRef(false);

  const cameraRef = useRef(null)
  const controlsRef = useRef(null)
  const rendererRef = useRef(null) 

  const mixerRef = useRef(null) 
  const actionsRef = useRef({}) 
  const timerRef = useRef(new THREE.Timer())
  const animationFrameRef = useRef(null)

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/')
      } else {
        setUserEmail(session.user.email)
        setUserId(session.user.id)
      }
    }
    getUser()
  }, [router])

  useEffect(() => {
    const timer = setTimeout(() => {
        setShowGreeting(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const baseAction = actionsRef.current['reposo'];
    const thinkingAction = actionsRef.current['pensando'];
    const talkingAction = actionsRef.current['respuesta'];
    const saludarAction = actionsRef.current['saludar'];

    if (saludarAction?.isRunning()) return;

    const apagarTodo = () => {
        [baseAction, thinkingAction, talkingAction].forEach(action => {
            if (action) {
                action.stop();
                action.setEffectiveWeight(0);
            }
        });
    };

    if (isSpeaking && talkingAction) {
        apagarTodo();
        talkingAction.reset().setEffectiveWeight(1).play();
    } 
    else if (isLoading && thinkingAction) {
        apagarTodo();
        thinkingAction.reset().setEffectiveWeight(1).play();
    } 
    else if (baseAction) {
        apagarTodo();
        baseAction.reset().setEffectiveWeight(1).play();
    }
  }, [isLoading, isSpeaking]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.getVoices();
        window.speechSynthesis.cancel();
    }
    return () => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
    };
  }, []);

  const handleLogout = async () => {
    if(typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    try {
        await supabase.auth.signOut();
    } catch (error) {
        console.log(error);
    } finally {
        localStorage.clear();
        router.refresh(); 
        router.push('/');
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  useEffect(() => {
    speakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.lang = 'es-EC'
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        setInput(transcript)
        setIsListening(false)
      }
      recognitionRef.current.onend = () => setIsListening(false)
      recognitionRef.current.onerror = () => setIsListening(false)
    }
  }, [])

  const toggleVoice = () => {
    if (!recognitionRef.current) return alert('Navegador no compatible con dictado por voz')
    if (!isListening && isSpeaking) stopSpeaking();
    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  const getBestVoice = (voices) => {
    const femaleKeywords = ['Sabina', 'Paulina', 'Mónica', 'Monica', 'Helena', 'Laura', 'Google español', 'Google Spanish'];
    const preciseFemale = voices.find(v => femaleKeywords.some(keyword => v.name.includes(keyword)));
    if (preciseFemale) return preciseFemale;
    const anyFemaleSounding = voices.find(v => v.lang.startsWith('es') && !['Jorge', 'Pablo', 'Diego', 'Raul'].some(m => v.name.includes(m)));
    if (anyFemaleSounding) return anyFemaleSounding;
    return voices.find(v => v.lang.startsWith('es'));
  }

  const speakText = (text) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const cleanText = text.replace(/[*#_\-]/g, ''); 
    const chunks = cleanText.match(/[^.?;!]+[.?;!]*|[^.?;!]+/g) || [cleanText];
    let currentChunk = 0;

    const playNextChunk = () => {
      if (currentChunk >= chunks.length) {
          setIsSpeaking(false);
          speakingRef.current = false;
          return;
      }

      const utterance = new SpeechSynthesisUtterance(chunks[currentChunk].trim());
      const voices = window.speechSynthesis.getVoices();
      const selectedVoice = getBestVoice(voices);

      if (selectedVoice) utterance.voice = selectedVoice;
      else if (voices.length > 0) utterance.voice = voices[0]; 

      utterance.rate = 1.0;
      utterance.pitch = 1.05; 
      
      utterance.onstart = () => {
          setIsSpeaking(true);
          speakingRef.current = true;
      };
      utterance.onend = () => {
          currentChunk++;
          setTimeout(playNextChunk, 100); 
      };
      utterance.onerror = (e) => {
          setIsSpeaking(false);
          speakingRef.current = false;
      };
      
      window.speechSynthesis.speak(utterance);
    }

    playNextChunk();
  }

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        speakingRef.current = false;
    }
  }

  useEffect(() => {
    if (modelReady && !hasGreetedRef.current) {
        hasGreetedRef.current = true; 

        setTimeout(() => {
            setIsSpeaking(true);
            speakingRef.current = true;

            setTimeout(() => {
                if (!window.speechSynthesis.speaking) {
                    setIsSpeaking(false);
                    speakingRef.current = false;
                }
            }, 2000);

            speakText("Hola, soy tu asistente virtual.");

            const saludarAction = actionsRef.current['saludar'];
            const reposoAction = actionsRef.current['reposo'];

            if (saludarAction && reposoAction) {
                reposoAction.fadeOut(0.5);
                saludarAction.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(0.5).play();

                const onFinished = (e) => {
                    if (e.action === saludarAction) {
                        mixerRef.current.removeEventListener('finished', onFinished);
                        saludarAction.fadeOut(0.5);
                        reposoAction.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(0.5).play();
                    }
                };
                mixerRef.current.addEventListener('finished', onFinished);
            }
        }, 500);
    }
  }, [modelReady]);

  useEffect(() => {
    if (!controlsRef.current || !cameraRef.current) return;
    const controls = controlsRef.current;
    const camera = cameraRef.current;
    const isMobile = window.innerWidth < 768;

    if (isCameraFixed) {
        controls.enableZoom = false;
        controls.enableRotate = false;
        controls.enablePan = false; 
        if (isMobile) camera.position.set(0, 1.65, 0.85); 
        else camera.position.set(0, 1.65, 1.0);  
        controls.target.set(0, 1.65, 0); 
        controls.update();
    } else {
        controls.enableZoom = true;
        controls.enableRotate = true;
        controls.enablePan = true; 
        if (isMobile) camera.position.set(0, 1.55, 1.1); 
        else camera.position.set(0, 1.65, 1.2); 
        controls.target.set(0, 1.55, 0);
        controls.update();
    }
  }, [isCameraFixed]) 

  useEffect(() => {
    if (!mountRef.current) return

    const scene = new THREE.Scene();
    // Fondo oscuro cálido en lugar del azul profundo — mantiene el drama pero con tono rojizo
    const darkBg = 0x1a0508;
    scene.fog = new THREE.Fog(darkBg, 5, 20); 
    scene.background = new THREE.Color(darkBg);
    sceneRef.current = scene;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000); 
    cameraRef.current = camera; 

    const renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true,
        powerPreference: "high-performance" 
    });
    
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); 
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true; 
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace; 
    renderer.toneMapping = THREE.ACESFilmicToneMapping; 
    renderer.toneMappingExposure = 0.85;
    
    while (mountRef.current.firstChild) mountRef.current.removeChild(mountRef.current.firstChild);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; 
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2; 
    controlsRef.current = controls;

    const isMobile = width < 768;
    controls.enableZoom = false;
    controls.enableRotate = false;
    controls.enablePan = false;
    if (isMobile) camera.position.set(0, 1.65, 0.85);
    else camera.position.set(0, 1.65, 1.0);
    controls.target.set(0, 1.65, 0); 
    controls.update();

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); 
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffeebb, 1.2); 
    mainLight.position.set(2, 3.5, 5); 
    mainLight.castShadow = true;
    scene.add(mainLight);

    const fillLight = new THREE.HemisphereLight(0xffe0d0, 0x3a0510, 1.3);
    fillLight.position.set(0, 5, -2);
    scene.add(fillLight);

    // Rim light dorado en lugar de cian
    const rimLight = new THREE.SpotLight(0xEF9F27, 2.5);
    rimLight.position.set(-5, 5, 2);
    rimLight.lookAt(0, 1, 0);
    scene.add(rimLight);
    
    const floorGeometry = new THREE.CircleGeometry(5, 32);
    // Piso con tono rojizo oscuro
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x3a0510, roughness: 0.3, metalness: 0.5 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 200;
    const positions = new Float32Array(particlesCount * 3);
    for (let i = 0; i < particlesCount * 3; i++) positions[i] = (Math.random() - 0.5) * 15;
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    // Partículas doradas en lugar de cian
    const particlesMaterial = new THREE.PointsMaterial({ color: 0xEF9F27, size: 0.05, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending });
    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);
    particlesRef.current = particles;

    const loader = new GLTFLoader();
    loader.load('/Mary3.glb', (gltf) => {
        const model = gltf.scene;
        faceMeshesRef.current = [];
        model.traverse((child) => {
            if (child.isMesh && child.morphTargetDictionary) {
                if (Object.keys(child.morphTargetDictionary).some(key => key === 'mouthOpen')) {
                    faceMeshesRef.current.push(child); 
                }
            }
        });
        model.scale.set(1, 1, 1); 
        model.position.set(0, 0, 0); 
        const mixer = new THREE.AnimationMixer(model);
        mixerRef.current = mixer;
        const animations = gltf.animations;
        if (animations && animations.length > 0) {
            let reposoClip = THREE.AnimationClip.findByName(animations, 'reposo') || animations[0];
            const pensandoClip = THREE.AnimationClip.findByName(animations, 'pensando');
            const saludarClip = THREE.AnimationClip.findByName(animations, 'saludar');
            const respuestaClip = THREE.AnimationClip.findByName(animations, 'respuesta');

            if (reposoClip) {
                const action = mixer.clipAction(reposoClip);
                action.play();
                actionsRef.current['reposo'] = action;
            }
            if (pensandoClip) {
                const action = mixer.clipAction(pensandoClip);
                action.loop = THREE.LoopRepeat;
                actionsRef.current['pensando'] = action;
            }
            if (saludarClip) {
                const action = mixer.clipAction(saludarClip);
                action.loop = THREE.LoopOnce; 
                action.clampWhenFinished = true; 
                actionsRef.current['saludar'] = action;
            }
            if (respuestaClip) {
                const action = mixer.clipAction(respuestaClip);
                action.loop = THREE.LoopRepeat; 
                action.clampWhenFinished = false;
                actionsRef.current['respuesta'] = action;
            }
        }
        scene.add(model);
        characterRef.current = model;
        setModelReady(true);
      }, undefined, (error) => console.error('Error cargando modelo:', error)
    );

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      timerRef.current.update();
      const delta = timerRef.current.getDelta();
      if (mixerRef.current) mixerRef.current.update(delta);
      controls.update();
      if (particlesRef.current) particlesRef.current.rotation.y += 0.001;

      if (faceMeshesRef.current.length > 0) {
          faceMeshesRef.current.forEach((mesh) => {
              const index = mesh.morphTargetDictionary['mouthOpen'];
              if (index !== undefined) {
                  if (speakingRef.current) {
                      const t = Date.now();
                      let openValue = (Math.sin(t * 0.02) * 0.5) + (Math.sin(t * 0.01) * 0.3) + (Math.random() * 0.2); 
                      openValue = Math.max(0, Math.min(0.8, openValue)); 
                      mesh.morphTargetInfluences[index] = openValue; 
                  } else {
                      const current = mesh.morphTargetInfluences[index];
                      mesh.morphTargetInfluences[index] = THREE.MathUtils.lerp(current, 0, 0.2);
                  }
              }
          });
      }
      renderer.render(scene, camera);
    };
    animate();
    
    const handleResize = () => {
        if(mountRef.current && camera && renderer) {
            const w = mountRef.current.clientWidth;
            const h = mountRef.current.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        }
    }
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameRef.current);
      if(mountRef.current && renderer.domElement) mountRef.current.removeChild(renderer.domElement);
      if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
      renderer.dispose();
    };
  }, []);

  const handleSubmit = async (textOverride = null) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim()) return;
    if (textToSend.length > 500) {
        setMessages(prev => [...prev, { role: 'bot', content: "⚠️ El mensaje es demasiado largo. (máx 500 caracteres)." }]);
        return;
    }

    stopSpeaking();
    const previousInput = input;
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const userMsg = { 
        role: 'user', 
        content: textToSend, 
        time: new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }) 
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textOverride) setInput('');
    setIsLoading(true);
    
    try {
        const chatHistory = messages.slice(-6).map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
        }));

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ 
                message: textToSend, 
                history: chatHistory, 
                userId: userId,
                previousThoughtSignature: thoughtSignature 
            })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Error en la respuesta');

        if (data.thoughtSignature !== undefined) {
            setThoughtSignature(data.thoughtSignature);
        }

        const botMsg = { 
            role: 'bot', 
            content: data.response, 
            source: data.source,
            suggestions: data.suggestions,
            time: new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }) 
        };
        setMessages(prev => [...prev, botMsg]);
        speakText(data.response);

    } catch (error) {
        console.error(error);
        setMessages(prev => [...prev, { role: 'bot', content: "⚠️ Error de conexión." }]);
        if (!textOverride) setInput(previousInput);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-dvh overflow-hidden font-sans text-gray-800">

      {/* HEADER — rojo vino con acento dorado */}
      <header
        className="flex-none backdrop-blur-md shadow-md p-4 flex justify-between items-center z-50 relative"
        style={{
          backgroundColor: '#7A1020',
          borderBottom: '2px solid #EF9F27',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shadow-md"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
          >
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight" style={{ color: '#FFFFFF' }}>
              Casita de Verano
            </h1>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {userEmail || 'Cargando...'}
            </p>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">

        {/* CONTENEDOR 3D */}
        <div
          className="w-full h-[45dvh] md:w-1/2 md:h-auto flex flex-col relative border-b md:border-r md:border-b-0 shrink-0"
          style={{ borderColor: '#D3D1C7' }}
        >
          <div className="flex-1 relative" style={{ background: 'linear-gradient(135deg, #1a0508 0%, #2d0a12 50%, #1a0508 100%)' }}>
            <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-move z-0" />

            {showGreeting && (
              <div className="absolute top-[20%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 animate-[bounce_2s_infinite]">
                <div
                  className="relative px-5 py-3 rounded-2xl shadow-2xl"
                  style={{ backgroundColor: '#FFFFFF', border: '2px solid #FAECE7' }}
                >
                  <p className="text-sm font-bold whitespace-nowrap" style={{ color: '#7A1020' }}>
                    ¡Hola! Estoy lista 👋
                  </p>
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-white"></div>
                </div>
              </div>
            )}

            <div className="absolute top-5 left-5 z-20 text-left pointer-events-none">
              <h2
                className="text-xl font-bold"
                style={{ color: '#FFFFFF', textShadow: '0 0 10px rgba(239,159,39,0.8)' }}
              >
                MARY AI
              </h2>
              <p className="text-xs font-mono" style={{ color: '#FAC775' }}>
                {isLoading ? '⚡ BUSCANDO REGLAS...' : isSpeaking ? '🔊 HABLANDO...' : isListening ? '🎤 ESCUCHANDO...' : '🤖 EN LÍNEA'}
              </p>
            </div>

            <button
              onClick={() => setIsCameraFixed(!isCameraFixed)}
              className="absolute top-5 right-5 z-20 p-2 rounded-full shadow-lg backdrop-blur-sm transition-all duration-300 border"
              style={isCameraFixed
                ? { backgroundColor: 'rgba(122,16,32,0.8)', color: '#FFFFFF', borderColor: '#EF9F27' }
                : { backgroundColor: 'rgba(255,255,255,0.15)', color: '#FAC775', borderColor: 'rgba(255,255,255,0.1)' }
              }
              title={isCameraFixed ? "Desbloquear Cámara" : "Fijar Cámara"}
            >
              {isCameraFixed ? <Lock size={20} /> : <Unlock size={20} />}
            </button>
          </div>

          <div
            className="p-3 md:p-4 flex justify-between items-center z-20"
            style={{ backgroundColor: '#FFFFFF', borderTop: '1px solid #D3D1C7' }}
          >
            <p className="text-[10px] italic leading-tight mr-2" style={{ color: '#888780' }}>
              Sistema de Atención a Padres y Alumnos
            </p>
            <button
              onClick={handleLogout}
              className="flex-none flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full transition text-xs md:text-sm font-medium"
              style={{
                backgroundColor: '#FAECE7',
                color: '#7A1020',
                border: '1px solid #F5C4B3',
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F5C4B3'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FAECE7'}
            >
              <LogOut className="w-3 h-3 md:w-4 md:h-4" /> Salir
            </button>
          </div>
        </div>

        {/* CONTENEDOR CHAT */}
        <div
          className="w-full flex-1 md:w-1/2 flex flex-col relative z-10 shadow-2xl overflow-hidden"
          style={{ backgroundColor: '#FFFFFF' }}
        >
          <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">

            {messages.length === 0 && (
              <div className="text-center py-2 md:py-12 animate-fade-in-up">
                <div
                  className="w-14 h-14 md:w-24 md:h-24 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-6"
                  style={{ backgroundColor: '#FAECE7', boxShadow: '0 8px 24px rgba(122,16,32,0.15)' }}
                >
                  <MessageSquare className="w-6 h-6 md:w-12 md:h-12" style={{ color: '#7A1020' }} />
                </div>
                <h2 className="text-lg md:text-2xl font-bold mb-1 md:mb-3" style={{ color: '#2C2C2A' }}>
                  ¡Hola! Soy tu asistente
                </h2>
                <p className="text-xs md:text-base mb-4 max-w-md mx-auto px-2" style={{ color: '#888780' }}>
                  Estoy aquí para ayudarte con información sobre la escuela.
                </p>
                <div className="grid grid-cols-1 gap-2 md:gap-3 max-w-md mx-auto px-4">
                  {['¿Cuáles son los requisitos de matrícula?', '¿Qué documentos necesito llevar?', '¿Cuál es el horario de atención?'].map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleSubmit(q)}
                      className="p-2 md:p-4 rounded-xl text-center text-xs md:text-sm transition truncate"
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #D3D1C7',
                        color: '#5F5E5A',
                        boxShadow: '0 1px 4px rgba(122,16,32,0.06)',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#7A1020'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(122,16,32,0.12)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#D3D1C7'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(122,16,32,0.06)' }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[85%] md:max-w-md p-3 md:p-4 rounded-2xl shadow-sm"
                  style={msg.role === 'user'
                    ? { backgroundColor: '#7A1020', color: '#FFFFFF', borderRadius: '1rem 1rem 0.25rem 1rem' }
                    : { backgroundColor: '#FFFFFF', color: '#2C2C2A', border: '1px solid #D3D1C7', borderRadius: '1rem 1rem 1rem 0.25rem' }
                  }
                >
                  <div className={`text-sm leading-relaxed break-words overflow-hidden`}>
                    <ReactMarkdown
                      components={{
                        h1: ({node, ...props}) => <h3 className="text-lg font-bold mt-3 mb-2" style={{ color: msg.role === 'user' ? '#FFFFFF' : '#7A1020' }} {...props} />,
                        h2: ({node, ...props}) => <h3 className="text-base font-bold mt-3 mb-2" style={{ color: msg.role === 'user' ? '#FFFFFF' : '#7A1020' }} {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-base font-bold mt-3 mb-2" style={{ color: msg.role === 'user' ? '#FFFFFF' : '#7A1020' }} {...props} />,
                        strong: ({node, ...props}) => <strong className="font-bold" style={{ color: msg.role === 'user' ? '#FFFFFF' : '#5C0A14' }} {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc pl-5 space-y-1 my-2" style={{ color: msg.role === 'user' ? '#FFFFFF' : '#5F5E5A' }} {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal pl-5 space-y-1 my-2" style={{ color: msg.role === 'user' ? '#FFFFFF' : '#5F5E5A' }} {...props} />,
                        li: ({node, ...props}) => <li className="pl-1" {...props} />,
                        p: ({node, ...props}) => <p className="mb-2 last:mb-0 leading-relaxed break-words" {...props} />
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>

                  {msg.source && (
                    <p
                      className="text-xs mt-3 pt-2 opacity-70 italic flex items-center gap-1"
                      style={{ borderTop: '1px solid #F1EFE8' }}
                    >
                      <BookOpen size={10}/> Fuente: {msg.source}
                    </p>
                  )}

                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                      {msg.suggestions.map((sug, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSubmit(sug)}
                          className="text-[11px] px-3 py-1.5 rounded-full transition font-medium"
                          style={{
                            backgroundColor: '#FAECE7',
                            color: '#7A1020',
                            border: '1px solid #F5C4B3',
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F5C4B3'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FAECE7'}
                        >
                          ✨ {sug}
                        </button>
                      ))}
                    </div>
                  )}

                  <p
                    className="text-[10px] mt-2 text-right"
                    style={{ color: msg.role === 'user' ? 'rgba(255,255,255,0.5)' : '#B4B2A9' }}
                  >
                    {msg.time}
                  </p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div
                  className="rounded-2xl p-4 shadow-sm"
                  style={{ backgroundColor: '#FFFFFF', border: '1px solid #D3D1C7', borderRadius: '1rem 1rem 1rem 0.25rem' }}
                >
                  <div className="flex gap-1.5 items-center">
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#7A1020' }} />
                    <span className="text-xs" style={{ color: '#888780' }}>Consultando información...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* INPUT AREA */}
          <div
            className="p-3 md:p-4 pb-6 md:pb-4 flex-none z-20"
            style={{
              backgroundColor: 'rgba(255,255,255,0.97)',
              borderTop: '1px solid #D3D1C7',
              boxShadow: '0 -4px 6px -1px rgba(122,16,32,0.05)',
            }}
          >
            <div className="flex gap-2 md:gap-3">

              {isSpeaking && (
                <button
                  onClick={stopSpeaking}
                  className="p-3 md:p-4 rounded-full shadow-md flex-none transition animate-in fade-in zoom-in"
                  style={{ backgroundColor: '#FAEEDA', color: '#854F0B' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FAC775'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FAEEDA'}
                >
                  <VolumeX className="w-5 h-5" />
                </button>
              )}

              <button
                onClick={toggleVoice}
                className="p-3 md:p-4 rounded-full transition shadow-md flex-none"
                style={isListening
                  ? { backgroundColor: '#7A1020', color: '#FFFFFF' }
                  : { backgroundColor: '#F1EFE8', color: '#5F5E5A' }
                }
                onMouseEnter={e => { if (!isListening) e.currentTarget.style.backgroundColor = '#D3D1C7' }}
                onMouseLeave={e => { if (!isListening) e.currentTarget.style.backgroundColor = '#F1EFE8' }}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Escribe o habla tu consulta..."
                className="flex-1 p-3 md:p-4 rounded-full outline-none text-sm md:text-base"
                style={{
                  backgroundColor: '#F1EFE8',
                  border: '1px solid #D3D1C7',
                  color: '#2C2C2A',
                }}
                onFocus={e => { e.target.style.borderColor = '#7A1020'; e.target.style.boxShadow = '0 0 0 3px rgba(122,16,32,0.1)' }}
                onBlur={e => { e.target.style.borderColor = '#D3D1C7'; e.target.style.boxShadow = 'none' }}
                disabled={isLoading}
              />

              <button
                onClick={() => handleSubmit()}
                disabled={!input.trim() || isLoading}
                className="p-3 md:p-4 rounded-full transition transform active:scale-95 shadow-md flex-none"
                style={{ backgroundColor: !input.trim() || isLoading ? '#D3D1C7' : '#7A1020', color: '#FFFFFF' }}
                onMouseEnter={e => { if (input.trim() && !isLoading) e.currentTarget.style.backgroundColor = '#5C0A14' }}
                onMouseLeave={e => { if (input.trim() && !isLoading) e.currentTarget.style.backgroundColor = '#7A1020' }}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>

            <p className="text-[10px] text-center mt-2" style={{ color: '#B4B2A9' }}>
              Casita de Verano - Guayaquil, Ecuador
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}