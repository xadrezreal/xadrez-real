import React, { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

const MoveHistory = ({ moves }) => {
  const movesEndRef = useRef(null);

  const scrollToBottom = () => {
    movesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [moves]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card className="bg-gray-800/50 border-gray-700/50 text-white">
        <CardHeader className="p-4">
          <CardTitle className="text-amber-100 text-lg">Histórico</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="h-48 overflow-y-auto pr-2">
            <ol className="list-decimal list-inside text-gray-300 font-mono text-sm space-y-1">
              {moves.map((move, index) => (
                <motion.li
                  key={index}
                  className={`p-1 rounded ${
                    index % 2 === 0 ? "bg-white/5" : ""
                  }`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {move.san}
                </motion.li>
              ))}
            </ol>
            <div ref={movesEndRef} />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default MoveHistory;
