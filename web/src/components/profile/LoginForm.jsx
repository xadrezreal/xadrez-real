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
import { LogIn } from "lucide-react";
import { useSupabaseAuth } from "../../contexts/SupabaseAuthContext";
import { useNavigate } from "react-router-dom";

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

const LoginForm = ({ setView }) => {
  const { signIn, loading } = useSupabaseAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await signIn(email, password);
    if (!error) {
      navigate("/");
    }
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700 text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-2xl text-cyan-300">
          <LogIn className="w-8 h-8" /> Login
        </CardTitle>
        <CardDescription className="text-slate-400 pt-2">
          Acesse sua conta para continuar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          <motion.div className="space-y-2" variants={itemVariants}>
            <Label htmlFor="email-login">Email</Label>
            <Input
              id="email-login"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </motion.div>
          <motion.div className="space-y-2" variants={itemVariants}>
            <Label htmlFor="password-login">Senha</Label>
            <Input
              id="password-login"
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </motion.div>
          <motion.div className="text-right" variants={itemVariants}>
            <Button
              variant="link"
              size="sm"
              onClick={() => setView("forgotPassword")}
              className="text-cyan-400 px-0"
            >
              Esqueceu a senha?
            </Button>
          </motion.div>
          <motion.div variants={itemVariants} className="pt-2">
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold"
            >
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </motion.div>
        </form>
        <div className="mt-4 text-center flex flex-col items-center gap-2">
          <div className="text-slate-400">ou</div>
          <Button
            variant="outline"
            onClick={() => setView("signup")}
            className="text-cyan-400 border-cyan-400 hover:bg-cyan-400/10 hover:text-cyan-300 w-full"
          >
            Crie uma conta agora!
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LoginForm;
