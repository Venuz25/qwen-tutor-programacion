import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Play } from 'lucide-react';

const CodeCompiler = () => {
    const [language, setLanguage] = useState('javascript');
    const [code, setCode] = useState('// Escribe tu código aquí...');
    const [output, setOutput] = useState('Presiona "Ejecutar" para ver la salida...');

const LANGUAGE_MAP = {
    javascript: { name: 'javascript', version: '18.15.0' },
    python: { name: 'python', version: '3.10.0' },
    cpp: { name: 'c++', version: '10.2.0' }

};

const runCode = async () => {
    setOutput("Ejecutando...");
    try {
        const response = await fetch("https://emkc.org/api/v2/piston/execute", {
        method: "POST",
        body: JSON.stringify({
            language: LANGUAGE_MAP[language].name,
            version: LANGUAGE_MAP[language].version,
            files: [{ content: code }],
        }),
        });
        const data = await response.json();
        setOutput(data.run.output || "Código ejecutado sin salida.");
    } catch (error) {
        setOutput("Error al conectar con el compilador.");
    }
};

    return (
        <div className="h-full flex flex-col bg-slate-950 border-l border-slate-800">
            <div className="p-3 bg-slate-900 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded text-slate-400">
                        <PanelRightClose size={20} />
                    </button>
                    <select 
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="bg-slate-800 text-xs border border-slate-700 rounded px-2 py-1 outline-none"
                    >
                        <option value="javascript">JavaScript</option>
                        <option value="python">Python</option>
                        <option value="cpp">C++</option>
                    </select>
                    <button 
                        onClick={runCode}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold py-1 px-3 rounded transition-colors"
                    >
                        <Play size={14} /> EJECUTAR
                    </button>
                </div>

                <div className="flex-1">
                <Editor
                    height="100%"
                    theme="vs-dark"
                    language={language}
                    value={code}
                    onChange={(val) => setCode(val)}
                    options={{ fontSize: 14, minimap: { enabled: false } }}
                />
                </div>

                <div className="h-1/3 bg-black p-4 font-mono text-xs border-t border-slate-800">
                <p className="text-slate-500 mb-2">// OUTPUT</p>
                <pre className="text-green-400">{output}</pre>
                </div>
            </div>
        </div>
    );
};

export default CodeCompiler;