import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Bot, Send } from 'lucide-react';

const lessons = {
  "aberturas": "Claro! Uma abertura popular é a Ruy Lopez, que começa com 1. e4 e5 2. Nf3 Nc6 3. Bb5. Ela controla o centro e prepara o desenvolvimento das peças. Quer saber sobre outra?",
  "meio de jogo": "No meio de jogo, o foco é em tática e estratégia. Procure por garfos, cravadas e espetos. Controlar o centro e manter suas peças seguras é crucial. Qual tática te interessa mais?",
  "finais": "Em finais, cada peão é valioso! Tente criar um peão passado. A atividade do rei também se torna muito importante. Uma regra geral é 'rei no centro' em finais de peões.",
  "default": "Olá! Sou seu professor de xadrez. Como posso ajudar você a melhorar seu jogo hoje? Você pode perguntar sobre 'aberturas', 'meio de jogo' ou 'finais'."
};

const masterMoves = [
    { name: "Gambito da Dama", description: "Uma abertura clássica onde o branco oferece um peão para obter controle do centro." },
    { name: "Defesa Siciliana", description: "A resposta mais popular e agressiva para 1.e4, lutando pelo centro." },
    { name: "Sacrifício de Peça", description: "Entregar uma peça menor por um ataque forte ou vantagem posicional." },
];

const ChessTeacher = () => {
  const [messages, setMessages] = useState([{ sender: 'bot', text: lessons.default }]);
  const [inputValue, setInputValue] = useState('');

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage = { sender: 'user', text: inputValue };
    const lowerCaseInput = inputValue.toLowerCase();
    
    let botResponseText = "Não entendi bem. Você pode perguntar sobre 'aberturas', 'meio de jogo' ou 'finais'.";
    if (lowerCaseInput.includes('abertura')) {
        botResponseText = lessons.aberturas;
    } else if (lowerCaseInput.includes('meio')) {
        botResponseText = lessons['meio de jogo'];
    } else if (lowerCaseInput.includes('final') || lowerCaseInput.includes('finais')) {
        botResponseText = lessons.finais;
    }

    const botMessage = { sender: 'bot', text: botResponseText };

    setMessages([...messages, userMessage, botMessage]);
    setInputValue('');
  };

  return (
    <motion.div 
        className="max-w-4xl mx-auto p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
    >
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
          Aula com o Professor
        </h1>
        <p className="text-lg text-slate-400 mt-2">Aprenda os segredos do xadrez com nosso mestre virtual.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <Card className="bg-slate-800/50 border-slate-700 h-[600px] flex flex-col">
            <CardHeader>
              <CardTitle className="text-cyan-300">Chat com o Professor</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow overflow-y-auto p-4 space-y-4">
              <AnimatePresence>
                {messages.map((msg, index) => (
                  <motion.div
                    key={index}
                    className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    {msg.sender === 'bot' && <Bot className="w-8 h-8 text-cyan-400" />}
                    <div className={`max-w-xs lg:max-w-md p-3 rounded-lg ${msg.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200'}`}>
                      {msg.text}
                    </div>
                    {msg.sender === 'user' && <User className="w-8 h-8 text-slate-300" />}
                  </motion.div>
                ))}
              </AnimatePresence>
            </CardContent>
            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-700 flex gap-2">
              <Input
                type="text"
                placeholder="Pergunte algo ao professor..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="flex-grow"
              />
              <Button type="submit" size="icon" className="bg-cyan-500 hover:bg-cyan-600">
                <Send className="w-5 h-5" />
              </Button>
            </form>
          </Card>
        </div>
        
        <div>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-yellow-400">Aprenda Jogadas de Mestre</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {masterMoves.map((move, index) => (
                <motion.div 
                    key={index} 
                    className="p-3 bg-slate-700/50 rounded-lg"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 * index }}
                >
                  <h3 className="font-bold text-slate-100">{move.name}</h3>
                  <p className="text-sm text-slate-400">{move.description}</p>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
};

export default ChessTeacher;