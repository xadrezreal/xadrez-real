import React, { useState, useRef, useEffect, useContext } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Send } from "lucide-react";
import { UserContext } from "../contexts/UserContext";

const Chat = ({ messages, onSendMessage, gameId }) => {
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);
  const { user } = useContext(UserContext);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newMessage.trim() && gameId) {
      onSendMessage(newMessage);
      setNewMessage("");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="w-full h-full flex flex-col"
    >
      <Card className="bg-gray-800/50 border-gray-700/50 text-white flex flex-col h-full">
        <CardHeader className="p-4">
          <CardTitle className="text-amber-100 text-lg">
            Bate-papo da Partida
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 flex flex-col flex-grow h-0">
          <div className="flex-grow h-full overflow-y-auto pr-2 mb-4 border-b border-gray-700">
            {messages.map((msg, index) => (
              <motion.div
                key={index}
                className={`mb-2 text-sm flex flex-col ${
                  msg.sender_id === user.id ? "items-end" : "items-start"
                }`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div
                  className={`p-2 rounded-lg max-w-xs ${
                    msg.sender_id === user.id ? "bg-cyan-600" : "bg-slate-600"
                  }`}
                >
                  <span className="font-bold text-xs text-amber-200 block">
                    {msg.sender_name}
                  </span>
                  <span className="text-gray-200 break-words">
                    {msg.message}
                  </span>
                </div>
              </motion.div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={handleSubmit} className="flex space-x-2 mt-auto">
            <Input
              type="text"
              placeholder="Digite sua mensagem..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="bg-gray-900/50 border-gray-600 text-white"
            />
            <Button type="submit" size="icon" variant="secondary">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default Chat;
