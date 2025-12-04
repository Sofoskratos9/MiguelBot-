import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Content, GenerateContentResponse } from "@google/genai";

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

// Markdown Renderer specifically tailored for chat readability
const MarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;
  
  // Split text by lines to handle formatting
  const lines = text.split('\n');
  
  return (
    <div>
      {lines.map((line, i) => {
        // Handle bold text **text**
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
  <div style={{ display: 'flex', gap: '4px', padding: '8px 12px' }}>
    <div className="dot" style={{ animationDelay: '0s' }}></div>
    <div className="dot" style={{ animationDelay: '0.2s' }}></div>
    <div className="dot" style={{ animationDelay: '0.4s' }}></div>
    <style>{`
      .dot {
        width: 8px;
        height: 8px;
        background: #aaa;
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
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: '10px',
      }}
    >
      <div
        style={{
          maxWidth: '80%',
          padding: '10px 15px',
          borderRadius: '15px',
          borderTopLeftRadius: !isUser ? '0' : '15px',
          borderTopRightRadius: isUser ? '0' : '15px',
          backgroundColor: isUser ? 'var(--user-msg-bg)' : 'var(--bot-msg-bg)',
          color: '#303030',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
          fontSize: '15px',
          lineHeight: '1.4',
        }}
      >
        <MarkdownRenderer text={message.text} />
      </div>
    </div>
  );
};

const HelpModal: React.FC<{ onClose: () => void; onReset: () => void }> = ({ onClose, onReset }) => {
  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '10px',
        maxWidth: '85%',
        maxHeight: '80%',
        overflowY: 'auto',
        boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
      }}>
        <h3 style={{ marginTop: 0, color: 'var(--primary-color)' }}>Guía Rápida MiguelBot</h3>
        <p>¡Bienvenido al diagnóstico EXANI-II!</p>
        <ul style={{ paddingLeft: '20px', fontSize: '14px' }}>
          <li><strong>Interactúa:</strong> Responde a las preguntas de MiguelBot escribiendo en el chat.</li>
          <li><strong>Datos:</strong> Tus datos son confidenciales y solo para personalizar tu reporte.</li>
          <li><strong>Reactivos:</strong> Se presentarán 30 preguntas en bloques de 5.</li>
          <li><strong>Respuestas:</strong> Escribe la letra (A, B, C) correspondiente. Ejemplo: "1-A, 2-C...".</li>
          <li><strong>Resultados:</strong> Al final recibirás un puntaje estimado y consejos.</li>
          <li><strong>Guardado:</strong> Tu progreso se guarda automáticamente. Puedes cerrar y volver después.</li>
        </ul>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
          <button 
            onClick={onReset}
            style={{
              padding: '8px 16px',
              backgroundColor: '#d32f2f',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Borrar Progreso
          </button>
          <button 
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--primary-color)',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Entendido
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Use a ref for the chat object to persist it across renders without causing re-renders
  const chatRef = useRef<any>(null);

  // Initialize Chat and Load History
  useEffect(() => {
    const initChat = async () => {
      const storedMessages = localStorage.getItem(STORAGE_KEY);
      const history: Content[] = [];
      let initialMessages: Message[] = [];

      if (storedMessages) {
        try {
          initialMessages = JSON.parse(storedMessages);
          setMessages(initialMessages);
          
          // Rebuild history for the model
          // Filter out potential system-triggered user messages if we were to add any logic there,
          // but for now we map direct role/text.
          initialMessages.forEach(msg => {
             history.push({
               role: msg.role,
               parts: [{ text: msg.text }]
             });
          });
        } catch (e) {
          console.error("Error parsing stored history", e);
          localStorage.removeItem(STORAGE_KEY);
        }
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      chatRef.current = ai.chats.create({
        model: 'gemini-3-pro-preview',
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
        },
        history: history
      });

      // If no history, trigger the start
      if (initialMessages.length === 0) {
        setIsLoading(true);
        try {
          // IMPORTANT: Must pass object with message property
          const result: GenerateContentResponse = await chatRef.current.sendMessage({ message: 'Hola' });
          // IMPORTANT: Access .text property directly
          const responseText = result.text || "";
          setMessages([{ role: 'model', text: responseText }]);
        } catch (error) {
          console.error("Error starting chat:", error);
          setMessages([{ role: 'model', text: "Hubo un error al iniciar. Por favor recarga la página." }]);
        } finally {
          setIsLoading(false);
        }
      }
    };

    initChat();
  }, []);

  // Save to LocalStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  // Auto-scroll logic
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
      // IMPORTANT: Must pass object with message property
      const result: GenerateContentResponse = await chatRef.current.sendMessage({ message: userText });
      // IMPORTANT: Access .text property directly
      const responseText = result.text || "";
      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (error) {
      console.error("Generation error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "Lo siento, hubo un error de conexión. Intenta enviar tu respuesta de nuevo." }]);
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
    if (confirm('¿Estás seguro de que quieres borrar todo el progreso y empezar de nuevo?')) {
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    }
  };

  return (
    <>
      {/* Header */}
      <div style={{
        backgroundColor: 'var(--primary-color)',
        color: 'white',
        padding: '10px 15px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '40px', height: '40px',
            backgroundColor: 'white', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--primary-color)', fontWeight: 'bold'
          }}>
            MB
          </div>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '16px' }}>MiguelBot</div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>
              {isLoading ? 'Escribiendo...' : 'En línea | EXANI-II 2026'}
            </div>
          </div>
        </div>
        <button 
          onClick={() => setShowHelp(true)}
          style={{
            background: 'none', border: '2px solid rgba(255,255,255,0.5)',
            color: 'white', borderRadius: '50%', width: '28px', height: '28px',
            cursor: 'pointer', fontSize: '14px', fontWeight: 'bold'
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
        padding: '15px',
        display: 'flex',
        flexDirection: 'column',
        backgroundImage: 'linear-gradient(#e5ddd5 2px, transparent 2px), linear-gradient(90deg, #e5ddd5 2px, transparent 2px)',
        backgroundSize: '20px 20px',
        backgroundBlendMode: 'multiply'
      }}>
        {/* Intro Date Stamp Style */}
        <div style={{ textAlign: 'center', marginBottom: '15px', opacity: 0.6, fontSize: '12px' }}>
          {new Date().toLocaleDateString()}
        </div>

        {messages.map((msg, idx) => (
          <MessageBubble key={idx} message={msg} />
        ))}

        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '10px' }}>
             <div style={{
                padding: '10px 15px',
                borderRadius: '15px',
                borderTopLeftRadius: '0',
                backgroundColor: 'var(--bot-msg-bg)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
             }}>
               <TypingIndicator />
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{
        backgroundColor: '#f0f0f0',
        padding: '10px',
        display: 'flex',
        gap: '10px',
        alignItems: 'center'
      }}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe tu respuesta aquí..."
          style={{
            flex: 1,
            padding: '12px 15px',
            borderRadius: '25px',
            border: 'none',
            outline: 'none',
            fontSize: '16px',
            backgroundColor: 'white'
          }}
          disabled={isLoading}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !inputText.trim()}
          style={{
            backgroundColor: 'var(--primary-color)',
            color: 'white',
            border: 'none',
            width: '45px',
            height: '45px',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isLoading ? 0.7 : 1
          }}
        >
          {/* Send Icon SVG */}
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
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