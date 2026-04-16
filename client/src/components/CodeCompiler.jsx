import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Play, PanelRightClose } from 'lucide-react';

const LANGUAGE_MAP = {
    python: { name: 'Python', defaultCode: 'print("Hola desde Python")' },
    javascript: { name: 'JavaScript', defaultCode: 'console.log("Hola desde JS")' },
    cpp: { name: 'C++', defaultCode: '#include <iostream>\nint main() {\n    std::cout << "Hola C++";\n    return 0;\n}' },
    java: { name: 'Java', defaultCode: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hola Java");\n    }\n}' },
    php: { name: 'PHP', defaultCode: '<?php echo "Hola PHP"; ?>' },
    c: { name: 'c', defaultCode: '#include <stdio.h>\nint main() {\n    printf("Hola C");\n    return 0;\n}' },
};

const CodeCompiler = ({ onClose }) => {
    const [language, setLanguage] = useState('javascript');
    const [code, setCode] = useState('// Escribe tu código aquí...');
    const [output, setOutput] = useState('Presiona "Ejecutar" para ver la salida...');
    const [isLoading, setIsLoading] = useState(false);

    const runCode = async () => {
        setIsLoading(true);
        setOutput("Ejecutando...");
        try {
            const response = await fetch("http://localhost:5000/api/execute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    language: language,
                    content: code, 
                }),
            });

            if (!response.ok) throw new Error("Error en la respuesta del servidor");

            const data = await response.json();
            setOutput(data.run.output || "Código ejecutado (sin salida de consola).");

        } catch (error) {
            setOutput("Error: No se pudo conectar con el servidor.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-950 border-l border-slate-800">
            {/* CABECERA: Solo para botones y select */}
            <div className="p-3 bg-slate-900 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded text-slate-400">
                        <PanelRightClose size={20} />
                    </button>
                    <select 
                        value={language}
                        onChange={(e) => {
                            const newLang = e.target.value;
                            setLanguage(newLang);
                            setCode(LANGUAGE_MAP[newLang].defaultCode);
                        }}
                        className="bg-slate-800 text-slate-300 text-xs font-mono py-1 px-2 rounded"
                    >
                        {Object.keys(LANGUAGE_MAP).map(lang => (
                            <option key={lang} value={lang}>{LANGUAGE_MAP[lang].name}</option>
                        ))}
                    </select>
                </div>

                <button 
                    type='button'
                    onClick={runCode}
                    disabled={isLoading} 
                    className={`flex items-center gap-2 text-white text-xs font-bold py-1 px-3 rounded transition-colors ${
                        isLoading 
                        ? 'bg-gray-500 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-500'
                    }`}
                    >
                    {!isLoading && <Play size={14} />} 
                    
                    {isLoading ? 'EJECUTANDO...' : 'EJECUTAR'}
                </button>
            </div>

            {/* CUERPO: El editor ahora está fuera de la cabecera y usa flex-1 para crecer */}
            <div className="flex-1 overflow-hidden">
                <Editor
                    height="100%"
                    theme="vs-dark"
                    language={language}
                    value={code}
                    onChange={(val) => setCode(val)}
                    options={{ 
                        fontSize: 14, 
                        minimap: { enabled: false },
                        automaticLayout: true
                    }}
                />
            </div>

            {/* CONSOLA: En la parte inferior */}
            <div className="h-1/3 bg-black p-4 font-mono text-xs border-t border-slate-800 overflow-y-auto">
                <p className="text-slate-500 mb-2">// OUTPUT</p>
                <pre className="text-green-400 whitespace-pre-wrap">{output}</pre>
            </div>
        </div>
    );
};

export default CodeCompiler;