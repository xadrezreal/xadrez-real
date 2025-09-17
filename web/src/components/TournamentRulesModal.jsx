import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ShieldCheck, X } from 'lucide-react';

const TournamentRulesModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <motion.div
                    className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-xl max-w-2xl w-full"
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                >
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-cyan-400 flex items-center gap-2">
                            <ShieldCheck />
                            Regras do Torneio
                        </h2>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                    <div className="space-y-3 text-slate-300 max-h-[60vh] overflow-y-auto pr-2">
                        <p><strong>Formato:</strong> Todos os torneios são no formato de eliminação simples (mata-mata).</p>
                        <p><strong>Chaveamento:</strong> Os jogadores são sorteados aleatoriamente no chaveamento inicial. Se o número de jogadores não for uma potência de 2 (4, 8, 16, etc.), alguns jogadores aleatórios avançarão automaticamente para a segunda rodada (bye).</p>
                        <p><strong>Partidas:</strong> O tempo de cada partida é definido pelo criador do torneio. Se uma partida empatar, o jogador com a maior pontuação de perfil avança. Se a pontuação for igual, uma nova partida relâmpago (3 min) será jogada.</p>
                        <p><strong>W.O.:</strong> Se um jogador não aparecer para a partida em até 5 minutos após a liberação do confronto, ele será desclassificado (Walkover).</p>
                        <p><strong>Premiação:</strong> Para torneios pagos, a premiação total é a soma de todas as taxas de inscrição. A distribuição é feita conforme definido na criação do torneio e os valores são creditados automaticamente na carteira dos vencedores ao final do evento.</p>
                        <p><strong>Desconexão:</strong> Perder a conexão com a partida é considerado desistência. Certifique-se de ter uma conexão estável.</p>
                        <p><strong>Fair Play:</strong> É estritamente proibido o uso de qualquer software de assistência ou trapaça. Contas suspeitas serão banidas e os prêmios confiscados. Jogue limpo!</p>
                    </div>
                    <div className="mt-6 flex justify-end">
                        <Button onClick={onClose} className="bg-cyan-500 hover:bg-cyan-600">Entendi</Button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default TournamentRulesModal;