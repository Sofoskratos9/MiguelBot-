import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

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

const MarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
  // Simple renderer to handle bolding and newlines for the "WhatsApp" feel
  const processText = (input: string) => {
    // 1. Handle double asterisks for bolding: **text** -> <b>text</b>
    let processed = input.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    // 2. Handle single asterisks for bolding (sometimes models use this): *text* -> <b>text</b>
    // Be careful not to replace list items
    processed = processed.replace(/(\s|^)\*(?!\s)(.*?)\*(?=\s|$)/g, '$1<b>$2</b>');
    
    // 3. Handle newlines
    return processed.split('\n').map((line, i) => (
      <React.Fragment key={i}>
        <span dangerouslySetInnerHTML={{ __html: line }} />
        <br />
      </React.Fragment>
    ));
  };

  return <div style={{ lineHeight: '1.5' }}>{processText(text)}</div>;
};

const App = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false); // State for Help Modal
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasStarted = useRef(false);

  // Initialize AI client
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Use a ref to store the chat session so it persists across renders
  const chatSessionRef = useRef<any>(null);

  const startChat = async () => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    setIsLoading(true);

    try {
      // Check for saved session in localStorage
      const savedData = localStorage.getItem(STORAGE_KEY);
      
      let history = [];
      let initialMessages: Message[] = [];

      if (savedData) {
        // RESUME SESSION
        initialMessages = JSON.parse(savedData);
        // Transform UI messages back to API history format
        // Note: The hidden trigger message isn't in UI state, but usually the model needs context.
        // However, if we just feed the previous Q&A turns, Gemini is smart enough to continue.
        history = initialMessages.map(msg => ({
          role: msg.role,
          parts: [{ text: msg.text }]
        }));
        
        // Update UI immediately with saved messages
        setMessages(initialMessages);
        
        // Initialize chat with history
        chatSessionRef.current = ai.chats.create({
          model: 'gemini-3-pro-preview',
          config: { systemInstruction: SYSTEM_INSTRUCTION },
          history: history
        });
        
        setIsLoading(false); // Important: Stop loading if just restoring session

      } else {
        // NEW SESSION
        chatSessionRef.current = ai.chats.create({
          model: 'gemini-3-pro-preview',
          config: { systemInstruction: SYSTEM_INSTRUCTION },
        });

        // Send invisible trigger message
        const response = await chatSessionRef.current.sendMessage({
          message: "Hola MiguelBot, estoy listo para iniciar el diagnóstico."
        });
        
        initialMessages = [{ role: 'model', text: response.text }];
        setMessages(initialMessages);
        setIsLoading(false);
      }

    } catch (error) {
      console.error("Error starting chat:", error);
      setMessages([{ role: 'model', text: "Lo siento, hubo un error al conectar con MiguelBot. Por favor recarga la página." }]);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    startChat();
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  // Smooth scroll to bottom whenever messages change or loading state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading || !chatSessionRef.current) return;

    const userText = inputValue;
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsLoading(true);

    try {
      const response = await chatSessionRef.current.sendMessage({
        message: userText
      });
      setMessages(prev => [...prev, { role: 'model', text: response.text }]);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => [...prev, { role: 'model', text: "Hubo un error de conexión. Intenta enviar tu respuesta nuevamente." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    if (confirm("¿Estás seguro de que quieres borrar todo tu progreso y empezar de nuevo?")) {
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#005c99',
        color: 'white',
        padding: '15px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between', 
        gap: '10px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px'
          }}>
            👨‍🏫
          </div>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '18px' }}>MiguelBot</div>
            <div style={{ 
              fontSize: '12px', 
              opacity: 0.9, 
              minHeight: '1.2em', 
              transition: 'all 0.3s ease',
              fontStyle: isLoading ? 'italic' : 'normal',
              fontWeight: isLoading ? 'bold' : 'normal'
            }}>
              {isLoading ? 'Escribiendo...' : 'En línea - Diagnóstico EXANI-II 2026'}
            </div>
          </div>
        </div>
        
        {/* Help Button */}
        <button 
          onClick={() => setShowHelp(true)}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.5)',
            color: 'white',
            borderRadius: '50%',
            width: '30px',
            height: '30px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Ayuda y Guía Rápida"
        >
          ?
        </button>
      </div>

      {/* Messages Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
        backgroundImage: 'linear-gradient(#e5ddd5 2px, transparent 2px), linear-gradient(90deg, #e5ddd5 2px, transparent 2px)',
        backgroundSize: '20px 20px',
        backgroundBlendMode: 'multiply'
      }}>
        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              backgroundColor: msg.role === 'user' ? '#dcf8c6' : '#ffffff',
              color: '#303030',
              padding: '12px 16px',
              borderRadius: msg.role === 'user' ? '12px 0 12px 12px' : '0 12px 12px 12px',
              maxWidth: '85%',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              position: 'relative'
            }}
          >
            <MarkdownRenderer text={msg.text} />
            <div style={{
              fontSize: '10px',
              color: '#999',
              textAlign: 'right',
              marginTop: '5px'
            }}>
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}

        {isLoading && (
          <div style={{
            alignSelf: 'flex-start',
            backgroundColor: '#ffffff',
            padding: '12px 16px',
            borderRadius: '0 12px 12px 12px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            <div className="dot" style={{width: 8, height: 8, background: '#999', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both'}} />
            <div className="dot" style={{width: 8, height: 8, background: '#999', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.16s'}} />
            <div className="dot" style={{width: 8, height: 8, background: '#999', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.32s'}} />
            <style>{`
              @keyframes bounce {
                0%, 80%, 100% { transform: scale(0); }
                40% { transform: scale(1); }
              }
            `}</style>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{
        padding: '10px',
        backgroundColor: '#f0f0f0',
        display: 'flex',
        gap: '10px',
        alignItems: 'center'
      }}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe tu respuesta..."
          style={{
            flex: 1,
            padding: '12px 20px',
            borderRadius: '24px',
            border: 'none',
            fontSize: '16px',
            outline: 'none',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
          }}
          disabled={isLoading}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !inputValue.trim()}
          style={{
            width: '45px',
            height: '45px',
            borderRadius: '50%',
            backgroundColor: '#005c99',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
            opacity: (isLoading || !inputValue.trim()) ? 0.6 : 1
          }}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
          </svg>
        </button>
      </div>

      {/* Help Modal Overlay */}
      {showHelp && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
        onClick={() => setShowHelp(false)}
        >
          <div style={{
            backgroundColor: 'white',
            padding: '25px',
            borderRadius: '15px',
            maxWidth: '100%',
            width: '400px',
            boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
            maxHeight: '80%',
            overflowY: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0, color: '#005c99', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
              Guía Rápida 🎓
            </h2>
            <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#444' }}>
              <p><strong>¿Qué es esto?</strong><br/>
              Un simulacro rápido e inteligente para medir tu nivel real rumbo al EXANI-II 2026.</p>
              
              <p><strong>¿Cómo funciona?</strong></p>
              <ol style={{ paddingLeft: '20px' }}>
                <li><strong>Datos:</strong> MiguelBot te pedirá info básica para personalizar tus consejos.</li>
                <li><strong>El Examen:</strong> Recibirás 30 preguntas (Comprensión, Mate y Redacción) en bloques de 5.</li>
                <li><strong>Respuestas:</strong> Solo escribe la letra y número (ej: "1-A, 2-C") o solo las letras en orden.</li>
                <li><strong>Resultados:</strong> Al finalizar, obtendrás tu puntaje estimado y un plan de acción.</li>
              </ol>
              
              <p><strong>Tips:</strong></p>
              <ul style={{ paddingLeft: '20px' }}>
                <li>Sé honesto, no busques las respuestas.</li>
                <li>Tarda aprox. 10-15 minutos.</li>
                <li>Si te equivocas al escribir, MiguelBot te avisará.</li>
              </ul>
              <p style={{fontStyle: 'italic', fontSize: '12px', color: '#666'}}>
                Tu progreso se guarda automáticamente en este dispositivo.
              </p>
            </div>
            
            <button 
              onClick={() => setShowHelp(false)}
              style={{
                width: '100%',
                padding: '12px',
                marginTop: '15px',
                backgroundColor: '#005c99',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              ¡Entendido, volver al chat!
            </button>

            <button 
              onClick={handleReset}
              style={{
                width: '100%',
                padding: '10px',
                marginTop: '10px',
                backgroundColor: 'transparent',
                color: '#d32f2f',
                border: '1px solid #d32f2f',
                borderRadius: '8px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              ⚠️ Borrar progreso y Reiniciar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);