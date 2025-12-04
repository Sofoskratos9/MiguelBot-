import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// --- System Instruction for MiguelBot ---
const SYSTEM_INSTRUCTION = `
Actúa como "MiguelBot", el asistente inteligente de Miguel Neftalí (filósofo y docente de bachillerato incorporado a la UAA), especializado en preparación para el EXANI-II 2026 de ingreso a licenciaturas en la Universidad Autónoma de Aguascalientes.

Tu misión: Guiar al usuario a través de un MINI-DIAGNÓSTICO GRATUITO de 30 reactivos clave del EXANI-II (los más predictivos: 10 de comprensión lectora, 10 de pensamiento analítico-matemático, 10 de redacción indirecta). Hazlo interactivo, paso a paso, para que sea fácil y sin estrés.

FLUJOS EXACTOS (sigue este orden estricto, sin saltar ni agregar extras):

1. **SALUDO E INTRO**: Saluda cálidamente y explica: "¡Hola! Soy MiguelBot, creado por Miguel Neftalí para regalarte un diagnóstico gratis del EXANI-II UAA 2026. Tomará 10-15 min. Al final, te doy tu puntaje estimado, semáforo de riesgo, consejos pedagógicos personalizados y cómo subir 100-200 puntos. ¿Listo? Empecemos con tus datos básicos (confidenciales y solo para personalizar)."

2. **RECOLECCIÓN DE DATOS PERSONALES** (pregunta una por una, confirma antes de avanzar):
   - Pregunta 1: "¿Cuál es el nombre completo del aspirante?"
   - Pregunta 2: "¿En qué preparatoria estudia actualmente?"
   - Pregunta 3: "¿Cuál es la carrera que más quiere en la UAA (ej: Medicina, Psicología)?"
   - Pregunta 4: "¿Qué material ya tiene para prepararse? (ej: curso AS Capacitación, Wizi, Unitips, solo guía CENEVAL gratis, o nada)."
   - Una vez completos: "¡Genial, [nombre]! Ahora pasamos al cuestionario de 30 reactivos. Te los muestro en bloques de 5 para que no te agobies. Responde con la letra (A, B o C) y presiona Enter. Al final, proceso todo."

3. **PRESENTACIÓN DEL CUESTIONARIO** (genera 30 reactivos ORIGINALES y realistas de EXANI-II 2026, nivel UAA medio-alto):
   - Balance: 10 comprensión lectora (textos 300-400 palabras sobre filosofía/ética IA/ciencia/sociales, con preguntas de inferencia/análisis).
   - 10 pensamiento analítico-matemático (problemas lógicos, secuencias, probabilidades básicas, sin cálculo avanzado).
   - 10 redacción indirecta (identificar errores gramaticales, estructura argumentativa, cohesión).
   - Muéstralos numerados, con 3 opciones (A, B, C). Pide respuestas en bloques: "Responde 1-5: [reactivos]. Escribe: 1-A, 2-B, etc."
   - Valida: Si respuesta inválida, pide corrección. Recopila todas en memoria.

4. **AL FINAL DEL CUESTIONARIO** (cuando tenga las 30 respuestas + datos):
   - Procesa: Calcula aciertos/fallos por módulo (% exacto), puntaje global estimado (escala CENEVAL: 700-1300, basado en tablas reales 2025).
   - Genera output en FORMATO LISTO PARA COPIAR-PASAR POR WHATSAPP (en español, tono cálido/profesional, estilo Miguel Neftalí):
     - **Título**: "¡Tu Mini-Diagnóstico EXANI-II UAA 2026, [nombre]!"
     - **1. Calificación Global**: "[X/30 aciertos = Y%]. Puntaje estimado real: [ej: 950-1,050 puntos]."
     - **2. Semáforo Rápido**: Verde/Amarillo/Rojo por módulo (explica: Verde=seguro para carreras medias; Rojo=riesgo en Medicina).
     - **3. 3 Debilidades Principales**: Con ejemplo de reactivo fallado + explicación breve.
     - **4. Consejos Pedagógicos Personalizados** (3-5 tips accionables, basados en filosofía/neuroaprendizaje/ética IA, adaptados a su material y carrera):
       - Ej: "Para comprensión lectora: Usa 'desarme filosófico' – lee como Sócrates: pregunta '¿qué implica esto?' antes de opciones. Dedica 20 min/día con textos éticos de IA de tu guía CENEVAL."
       - Incluye neuro: "Técnica anti-ansiedad: Respiración 4-7-8 antes de simulacros para activar corteza prefrontal."
       - Ético IA: "Usa ChatGPT para parafrasear reactivos, pero siempre verifica con tu criterio – ¡ética tecnológica para pensadores críticos!"
     - **5. Recomendación Urgente**: "Con tu perfil, [nombre] puede subir 150+ puntos en 4 semanas si integra método personalizado."
     - **6. CTA FUERTE A CONTRATACIÓN**: "¡No esperes! Mi Mentoría EXANI-UAA 1:1 (4 sesiones online, $1,600 lanzamiento diciembre-enero) transforma esto en estrategia ganadora: integra tu [material] con pensamiento crítico y manejo de ansiedad. Cupos limitados (solo 10 este mes). Responde 'QUIERO MENTORÍA' para agendar llamada GRATIS de 10 min con Miguel. WhatsApp: [TU NÚMERO]. ¡Asegura [carrera] en UAA 2026 – tu futuro empieza hoy!"

Mantén todo confidencial, motivador y sin ventas agresivas hasta el CTA final. Si el usuario abandona, ofrece reanudar. Responde solo como MiguelBot, en español de Aguascalientes (cercano, sin jerga).`;

// --- Constants ---
const STORAGE_KEY = 'miguelbot_chat_session';

// --- Components ---

interface Message {
  role: 'user' | 'model';
  text: string;
}

// Local interface to replace the imported Content type which might fail at runtime
interface LocalContent {
  role: string;
  parts: { text: string }[];
}

// Markdown Renderer specifically tailored for chat readability
const MarkdownRenderer: React.FC<{ text: string; isUser: boolean }> = ({ text, isUser }) => {
  if (!text) return null;
  
  // Split text by lines to handle formatting
  const lines = text.split('\n');
  
  return (
    <div style={{ wordBreak: 'break-word' }}>
      {lines.map((line, i) => {
        // Handle headings roughly
        if (line.startsWith('### ')) {
            return <h3 key={i} style={{ margin: '8px 0 4px', fontSize: '1.1em', fontWeight: 600 }}>{line.replace('### ', '')}</h3>
        }
        if (line.startsWith('**') && line.endsWith('**') && line.length > 40) {
            // Treat long bold lines almost like headers
             return <div key={i} style={{ margin: '8px 0 4px', fontWeight: 700 }}>{line.slice(2, -2)}</div>
        }

        // Handle bold text **text** within lines
        const parts = line.split(/(\*\*.*?\*\*)/g);
        
        return (
          <div key={i} style={{ minHeight: line.trim() === '' ? '0.5em' : 'auto', marginBottom: '4px' }}>
            {parts.map((part, j) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={j}>{part.slice(2, -2)}</strong>;
              }
              return <span key={j}>{part}</span>;
            })}
          </div>
        );
      })}
    </div>
  );
};

const TypingIndicator = () => (
  <div style={{ display: 'flex', gap: '4px', padding: '8px 12px', alignItems: 'center', height: '100%' }}>
    <div className="dot" style={{ animationDelay: '0s' }}></div>
    <div className="dot" style={{ animationDelay: '0.2s' }}></div>
    <div className="dot" style={{ animationDelay: '0.4s' }}></div>
    <style>{`
      .dot {
        width: 6px;
        height: 6px;
        background: #9ca3af;
        border-radius: 50%;
        animation: bounce 1.4s infinite ease-in-out both;
      }
      @keyframes bounce {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1); }
      }
    `}</style>
  </div>
);

const MessageBubble: React.FC<{ message: Message }> = ({ message }) => {
  const isUser = message.role === 'user';
  return (
    <div
      className="message-enter"
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: '12px',
        padding: '0 8px'
      }}
    >
      <div
        style={{
          maxWidth: '85%',
          padding: '12px 16px',
          borderRadius: '18px',
          borderTopRightRadius: isUser ? '4px' : '18px',
          borderTopLeftRadius: !isUser ? '4px' : '18px',
          backgroundColor: isUser ? 'var(--user-msg-bg)' : 'var(--bot-msg-bg)',
          color: isUser ? 'var(--user-msg-text)' : 'var(--bot-msg-text)',
          boxShadow: 'var(--shadow-sm)',
          fontSize: '15px',
          lineHeight: '1.5',
          position: 'relative',
        }}
      >
        <MarkdownRenderer text={message.text} isUser={isUser} />
        {/* Tiny timestamp simulation if needed, can add later */}
      </div>
    </div>
  );
};

const HelpModal: React.FC<{ onClose: () => void; onReset: () => void }> = ({ onClose, onReset }) => {
  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(2px)',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '16px',
        maxWidth: '85%',
        maxHeight: '80%',
        overflowY: 'auto',
        boxShadow: 'var(--shadow-md)',
        width: '400px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
             <h3 style={{ margin: 0, color: 'var(--primary-color)', fontSize: '20px' }}>Guía MiguelBot</h3>
             <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#6b7280' }}>&times;</button>
        </div>
        
        <p style={{ color: '#4b5563', marginBottom: '16px' }}>¡Bienvenido al diagnóstico EXANI-II!</p>
        <ul style={{ paddingLeft: '20px', fontSize: '14px', color: '#374151', lineHeight: '1.6' }}>
          <li style={{ marginBottom: '8px' }}><strong>Interactúa:</strong> Responde a las preguntas de MiguelBot escribiendo en el chat.</li>
          <li style={{ marginBottom: '8px' }}><strong>Datos:</strong> Tus datos son confidenciales.</li>
          <li style={{ marginBottom: '8px' }}><strong>Reactivos:</strong> Se presentarán 30 preguntas en bloques.</li>
          <li style={{ marginBottom: '8px' }}><strong>Respuestas:</strong> Escribe la letra (A, B, C). Ejemplo: "1-A, 2-C...".</li>
          <li style={{ marginBottom: '8px' }}><strong>Guardado:</strong> Tu progreso se guarda automáticamente.</li>
        </ul>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '24px' }}>
          <button 
            onClick={onClose}
            style={{
              padding: '12px',
              backgroundColor: 'var(--primary-color)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '14px'
            }}
          >
            Continuar Diagnóstico
          </button>
           <button 
            onClick={onReset}
            style={{
              padding: '12px',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '14px'
            }}
          >
            Reiniciar Todo
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

const App = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<any>(null);

  useEffect(() => {
    const initChat = async () => {
      if (!process.env.API_KEY) {
        setErrorMsg("API_KEY no encontrada. Configura la variable de entorno.");
        return;
      }

      const storedMessages = localStorage.getItem(STORAGE_KEY);
      const history: LocalContent[] = [];
      let initialMessages: Message[] = [];

      if (storedMessages) {
        try {
          initialMessages = JSON.parse(storedMessages);
          setMessages(initialMessages);
          initialMessages.forEach(msg => {
             if (msg.role && msg.text && msg.text.trim() !== "") {
                history.push({
                  role: msg.role,
                  parts: [{ text: msg.text }]
                });
             }
          });
        } catch (e) {
          console.error("Error parsing stored history", e);
          localStorage.removeItem(STORAGE_KEY);
        }
      }

      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        chatRef.current = ai.chats.create({
          model: 'gemini-3-pro-preview',
          config: { systemInstruction: SYSTEM_INSTRUCTION },
          history: history
        });

        if (initialMessages.length === 0) {
          setIsLoading(true);
          try {
            const result: GenerateContentResponse = await chatRef.current.sendMessage({ message: 'Hola' });
            setMessages([{ role: 'model', text: result.text || "" }]);
          } catch (error) {
            console.error("Error starting chat:", error);
            setMessages([{ role: 'model', text: "Hubo un error al iniciar. Por favor revisa tu conexión." }]);
          } finally {
            setIsLoading(false);
          }
        }
      } catch (err) {
        console.error("Initialization error:", err);
        setErrorMsg("Error al inicializar MiguelBot.");
      }
    };

    initChat();
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!inputText.trim() || !chatRef.current || isLoading) return;

    const userText = inputText;
    setInputText('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsLoading(true);

    try {
      const result: GenerateContentResponse = await chatRef.current.sendMessage({ message: userText });
      setMessages(prev => [...prev, { role: 'model', text: result.text || "" }]);
    } catch (error) {
      console.error("Generation error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "Lo siento, hubo un error de conexión. Intenta de nuevo." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const resetChat = () => {
    if (confirm('¿Borrar todo el progreso y empezar de nuevo?')) {
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    }
  };

  if (errorMsg) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: '20px', flexDirection: 'column', textAlign: 'center', color: '#374151' }}>
        <h2 style={{ color: '#dc2626' }}>Error de Configuración</h2>
        <p>{errorMsg}</p>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div style={{
        background: 'var(--primary-gradient)',
        color: 'white',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: 'var(--shadow-md)',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px', height: '42px',
            backgroundColor: 'rgba(255,255,255,0.2)', 
            backdropFilter: 'blur(5px)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 'bold', border: '2px solid rgba(255,255,255,0.3)'
          }}>
            <span style={{ fontSize: '18px' }}>🤖</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontWeight: '600', fontSize: '17px', letterSpacing: '0.3px' }}>MiguelBot</div>
            <div style={{ fontSize: '12px', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ 
                  display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', 
                  backgroundColor: isLoading ? '#fbbf24' : '#34d399',
                  boxShadow: '0 0 5px rgba(0,0,0,0.2)'
              }}></span>
              {isLoading ? 'Escribiendo...' : 'En línea'}
            </div>
          </div>
        </div>
        <button 
          onClick={() => setShowHelp(true)}
          style={{
            background: 'rgba(255,255,255,0.15)', border: 'none',
            color: 'white', borderRadius: '50%', width: '32px', height: '32px',
            cursor: 'pointer', fontSize: '16px', fontWeight: 'bold',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.2s'
          }}
          title="Ayuda"
        >
          ?
        </button>
      </div>

      {/* Messages Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px 12px',
        display: 'flex',
        flexDirection: 'column',
        backgroundImage: 'linear-gradient(rgba(239, 231, 221, 0.9), rgba(239, 231, 221, 0.9)), url("https://www.transparenttextures.com/patterns/subtle-white-feathers.png")',
        backgroundSize: 'auto',
      }}>
        <div style={{ 
          alignSelf: 'center', 
          marginBottom: '20px', 
          backgroundColor: 'rgba(255,255,255,0.6)', 
          padding: '4px 12px', 
          borderRadius: '12px',
          fontSize: '11px',
          color: '#6b7280',
          fontWeight: 500,
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}>
          DIAGNÓSTICO EXANI-II 2026
        </div>

        {messages.map((msg, idx) => (
          <MessageBubble key={idx} message={msg} />
        ))}

        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '12px', paddingLeft: '8px' }}>
             <div style={{
                padding: '12px 18px',
                borderRadius: '18px',
                borderTopLeftRadius: '4px',
                backgroundColor: 'var(--bot-msg-bg)',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                alignItems: 'center',
                height: '24px'
             }}>
               <TypingIndicator />
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{
        backgroundColor: '#f0f2f5',
        padding: '12px 16px',
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        borderTop: '1px solid #e5e7eb'
      }}>
        <div style={{
            flex: 1,
            backgroundColor: 'white',
            borderRadius: '24px',
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            border: '1px solid #e5e7eb'
        }}>
            <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu respuesta aquí..."
            style={{
                flex: 1,
                padding: '10px 12px',
                border: 'none',
                outline: 'none',
                fontSize: '16px',
                backgroundColor: 'transparent',
                fontFamily: 'inherit'
            }}
            disabled={isLoading}
            />
        </div>
        <button
          onClick={handleSend}
          disabled={isLoading || !inputText.trim()}
          style={{
            background: inputText.trim() ? 'var(--primary-color)' : '#9ca3af',
            color: 'white',
            border: 'none',
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            cursor: inputText.trim() ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s, transform 0.1s',
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
          }}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
          </svg>
        </button>
      </div>

      {showHelp && (
        <HelpModal onClose={() => setShowHelp(false)} onReset={resetChat} />
      )}
    </>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);