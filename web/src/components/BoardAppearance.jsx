import React, { useContext } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { BoardThemeContext } from "../contexts/BoardThemeContext";
import { Check } from "lucide-react";

const themes = [
  { id: "modern", name: "Moderno", colors: ["bg-green-700", "bg-beige-200"] },
  { id: "classic", name: "Clássico", colors: ["bg-[#8B4513]", "bg-[#D2B48C]"] },
  { id: "ocean", name: "Oceano", colors: ["bg-[#4682B4]", "bg-[#B0E0E6]"] },
  { id: "stone", name: "Pedra", colors: ["bg-slate-600", "bg-slate-300"] },
  { id: "rosa", name: "Rosa", colors: ["bg-pink-500", "bg-pink-200"] },
];

const BoardAppearance = () => {
  const { boardTheme, setBoardTheme } = useContext(BoardThemeContext);

  const handleSetTheme = (themeId) => {
    setBoardTheme(themeId);
    localStorage.setItem("boardTheme", themeId);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className="bg-gray-800/50 border-gray-700/50 text-white">
        <CardHeader className="p-4">
          <CardTitle className="text-amber-100 text-lg">Aparência</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-2 gap-4">
            {themes.map((theme) => (
              <Button
                key={theme.id}
                variant="outline"
                className={`h-20 w-full p-2 border-2 ${
                  boardTheme === theme.id
                    ? "border-cyan-400"
                    : "border-transparent"
                } hover:border-cyan-300/50`}
                onClick={() => handleSetTheme(theme.id)}
              >
                <div className="flex flex-col items-center justify-center w-full h-full">
                  <div className="flex w-10 h-10 mb-2">
                    <div className={`w-1/2 h-full ${theme.colors[0]}`}></div>
                    <div className={`w-1/2 h-full ${theme.colors[1]}`}></div>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm">{theme.name}</span>
                    {boardTheme === theme.id && (
                      <Check className="w-4 h-4 ml-2 text-cyan-400" />
                    )}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default BoardAppearance;
