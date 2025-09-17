import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { UserContext } from '@/contexts/UserContext';
import { v4 as uuidv4 } from 'uuid';

const PlayWithFriend = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { user } = useContext(UserContext);
    const [timeControl, setTimeControl] = useState('600');
    const [isLoading, setIsLoading] = useState(false);

    const handleCreateGame = async () => {
        if (!user.id) {
            toast({
                title: "Erro",
                description: "Você precisa estar logado para criar uma partida.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        const gameId = `friend_${uuidv4().replace(/-/g, '')}`;
        const timeInSeconds = parseInt(timeControl, 10);

        const { data, error } = await supabase
            .from('games')
            .insert({
                game_id_text: gameId,
                white_player_id: user.id,
                white_player_name: user.name,
                fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
                time_control: timeInSeconds,
                wager: 0,
                white_time: timeInSeconds,
                black_time: timeInSeconds,
                status: 'waiting',
            })
            .select()
            .single();

        setIsLoading(false);

        if (error) {
            toast({
                title: "Erro ao criar partida",
                description: error.message,
                variant: "destructive",
            });
        } else {
            navigate(`/game/${gameId}`);
        }
    };

    return (
        <motion.div
            className="container mx-auto max-w-2xl py-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <Card className="bg-slate-800/50 border-slate-700 text-white">
                <CardHeader>
                    <CardTitle className="text-3xl font-bold text-cyan-400">Jogar com um Amigo</CardTitle>
                    <CardDescription className="text-slate-400">
                        Crie uma partida e compartilhe o link com um amigo para começar a jogar.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label className="text-lg">Controle de Tempo</Label>
                        <RadioGroup
                            defaultValue="600"
                            className="grid grid-cols-2 sm:grid-cols-4 gap-4"
                            onValueChange={setTimeControl}
                        >
                            {[
                                { value: '180', label: '3 min' },
                                { value: '300', label: '5 min' },
                                { value: '600', label: '10 min' },
                                { value: '1800', label: '30 min' },
                            ].map(item => (
                                <div key={item.value}>
                                    <RadioGroupItem value={item.value} id={`time-${item.value}`} className="sr-only" />
                                    <Label
                                        htmlFor={`time-${item.value}`}
                                        className={`flex flex-col items-center justify-center rounded-md border-2 border-slate-600 bg-slate-800 p-4 hover:bg-slate-700 cursor-pointer ${timeControl === item.value ? 'border-cyan-400' : ''}`}
                                    >
                                        <span className="font-bold text-xl">{item.label}</span>
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>
                    <Button
                        onClick={handleCreateGame}
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold py-3 text-lg"
                    >
                        {isLoading ? 'Criando Partida...' : 'Criar Partida'}
                    </Button>
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default PlayWithFriend;