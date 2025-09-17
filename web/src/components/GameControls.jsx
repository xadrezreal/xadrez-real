import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Flag, HeartHandshake as Handshake, Video } from 'lucide-react';
import Settings from '@/components/Settings';

const GameControls = ({ isRecording, handleRecord, handleResign, handleDrawOffer, gameStatus }) => {
    return (
        <motion.div
            className="bg-slate-800/50 backdrop-blur-md rounded-xl p-4 border border-slate-700/50 space-y-3"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
        >
            <Settings />
            <Button onClick={handleRecord} variant={isRecording ? "destructive" : "secondary"} className="w-full">
                <Video className="w-4 h-4 mr-2" />{isRecording ? 'Parar Gravação' : 'Gravar Jogo'}
            </Button>
            <Button onClick={handleResign} disabled={gameStatus !== 'playing'} variant="destructive" className="w-full">
                <Flag className="w-4 h-4 mr-2" />Desistir
            </Button>
            <Button onClick={handleDrawOffer} disabled={gameStatus !== 'playing'} variant="outline" className="w-full">
                <Handshake className="w-4 h-4 mr-2" />Oferecer Empate
            </Button>
        </motion.div>
    );
};

export default GameControls;