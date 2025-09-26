import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { KeyRound } from "lucide-react";

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

const ForgotPasswordForm = ({ setView }) => {
  const [email, setEmail] = useState("");

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    await resetPasswordForEmail(email);
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700 text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-2xl text-cyan-300">
          <KeyRound className="w-8 h-8" /> Redefinir Senha
        </CardTitle>
        <CardDescription className="text-slate-400 pt-2">
          Digite seu e-mail para receber o link de redefinição.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handlePasswordReset} className="space-y-4">
          <motion.div className="space-y-2" variants={itemVariants}>
            <Label htmlFor="email-forgot">Email</Label>
            <Input
              id="email-forgot"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </motion.div>
          <motion.div variants={itemVariants} className="pt-4">
            <Button
              type="submit"
              // disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold"
            >
              {"Enviar Link"}
            </Button>
          </motion.div>
        </form>
        <div className="mt-4 text-center">
          <Button
            variant="link"
            onClick={() => setView("login")}
            className="text-cyan-400"
          >
            Voltar para o Login
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ForgotPasswordForm;
