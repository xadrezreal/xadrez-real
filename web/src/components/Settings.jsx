import React, { useContext } from 'react';
import { BoardThemeContext } from '@/contexts/BoardThemeContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { LayoutDashboard } from 'lucide-react';
import { motion } from 'framer-motion';

const boardThemes = [
    { id: 'classic', name: 'Clássico', light: 'bg-[#D2B48C]', dark: 'bg-[#8B4513]' },
    { id: 'modern', name: 'Moderno', light: 'bg-[#e9e9e9]', dark: 'bg-[#769656]' },
    { id: 'image_style', name: 'Verde', light: 'bg-[#f0d9b5]', dark: 'bg-[#769656]'},
    { id: 'ocean', name: 'Oceano', light: 'bg-[#B0E0E6]', dark: 'bg-[#4682B4]' },
    { id: 'stone', name: 'Pedra', light: 'bg-slate-300', dark: 'bg-slate-600' },
];

const Settings = () => {
    const { boardTheme, setBoardTheme } = useContext(BoardThemeContext);

    const handleThemeChange = (value) => {
        setBoardTheme(value);
        localStorage.setItem('boardTheme', value);
    };

    return (
        <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <Card className="bg-slate-800/50 border-slate-700 text-white">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-cyan-300 text-lg">
                        <LayoutDashboard className="w-5 h-5" />
                        Aparência do Tabuleiro
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <RadioGroup value={boardTheme} onValueChange={handleThemeChange}>
                        {boardThemes.map((theme) => (
                            <div key={theme.id} className="flex items-center justify-between space-x-2">
                                <Label htmlFor={theme.id} className="cursor-pointer flex-grow">{theme.name}</Label>
                                <div className="flex items-center gap-2">
                                     <div className="flex w-10 h-5 rounded overflow-hidden border border-slate-600">
                                        <div className={`w-1/2 h-full ${theme.light}`}></div>
                                        <div className={`w-1/2 h-full ${theme.dark}`}></div>
                                    </div>
                                    <RadioGroupItem value={theme.id} id={theme.id} />
                                </div>
                            </div>
                        ))}
                    </RadioGroup>
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default Settings;