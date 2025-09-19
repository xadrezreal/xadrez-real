import React, { useState, useCallback } from "react";
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
import { UserPlus, Loader2 } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

const SignUpForm = ({ setView }) => {
  const { signUp, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [errors, setErrors] = useState({});

  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!name || name.trim().length < 2) {
      newErrors.name = "O nome deve ter no mínimo 2 caracteres.";
    }

    if (!password || password.length < 6) {
      newErrors.password = "A senha deve ter no mínimo 6 caracteres.";
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Por favor, insira um e-mail válido.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, password, email]);

  const handleSignUp = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const { error } = await signUp(email, password, {
      name: name.trim(),
    });

    if (!error) {
      navigate("/");
    }
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700 text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-2xl text-cyan-300">
          <UserPlus className="w-8 h-8" /> Criar Conta
        </CardTitle>
        <CardDescription className="text-slate-400 pt-2">
          Crie uma conta para acessar todas as funcionalidades.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSignUp} className="space-y-4">
          <motion.div className="space-y-2" variants={itemVariants}>
            <Label htmlFor="name-signup">Nome</Label>
            <Input
              id="name-signup"
              type="text"
              placeholder="Seu nome completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            {errors.name && (
              <p className="text-sm text-red-500 mt-1">{errors.name}</p>
            )}
          </motion.div>
          <motion.div className="space-y-2" variants={itemVariants}>
            <Label htmlFor="email-signup">Email</Label>
            <Input
              id="email-signup"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {errors.email && (
              <p className="text-sm text-red-500 mt-1">{errors.email}</p>
            )}
          </motion.div>
          <motion.div className="space-y-2" variants={itemVariants}>
            <Label htmlFor="password-signup">Senha</Label>
            <Input
              id="password-signup"
              type="password"
              placeholder="Mínimo de 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {errors.password && (
              <p className="text-sm text-red-500 mt-1">{errors.password}</p>
            )}
          </motion.div>
          <motion.div variants={itemVariants} className="pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Criando conta..." : "Confirmar Cadastro"}
            </Button>
          </motion.div>
        </form>
        <div className="mt-4 text-center">
          <Button
            variant="link"
            onClick={() => setView("login")}
            className="text-cyan-400"
          >
            Já tem uma conta? Faça login.
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SignUpForm;
