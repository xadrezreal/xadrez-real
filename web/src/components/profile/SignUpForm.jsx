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
import { useSupabaseAuth } from "../../contexts/SupabaseAuthContext";
import { useToast } from "../ui/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

const SignUpForm = ({ setView }) => {
  const { signUp, loading: authLoading } = useSupabaseAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!username || username.trim().length < 4) {
      newErrors.username = "O apelido deve ter no mínimo 4 caracteres.";
    } else if (/\s/.test(username.trim())) {
      newErrors.username = "O apelido não pode conter espaços.";
    }

    if (!password || password.length < 6) {
      newErrors.password = "A senha deve ter no mínimo 6 caracteres.";
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Por favor, insira um e-mail válido.";
    }

    if (!phone || !/^\(?\d{2}\)?[\s-]?\d{4,5}-?\d{4}$/.test(phone)) {
      newErrors.phone =
        "Insira um número de telefone válido (ex: 11 98765-4321).";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [username, password, email, phone]);

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast({
        title: "Erro de Validação",
        description: "Por favor, corrija os erros no formulário.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: usernameCheck, error: usernameError } =
        await supabase.functions.invoke("check-username", {
          body: JSON.stringify({ username: username.trim() }),
        });

      if (usernameError) throw usernameError;

      if (usernameCheck.exists) {
        setErrors((prev) => ({
          ...prev,
          username: "Este apelido já está em uso. Por favor, escolha outro.",
        }));
        toast({
          title: "Apelido Indisponível",
          description: "Este apelido já foi escolhido por outro jogador.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const { error: signUpError } = await signUp(email, password, {
        username: username.trim(),
        phone,
      });

      if (!signUpError) {
        setView("login");
        navigate("/profile", { state: { needsConfirmation: true } });
      }
    } catch (error) {
      console.error("Falha no processo de cadastro:", error);
      toast({
        title: "Erro Inesperado",
        description:
          "Não foi possível completar o cadastro. Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const totalLoading = authLoading || isLoading;

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
            <Label htmlFor="username-signup">Apelido (Nome de Usuário)</Label>
            <Input
              id="username-signup"
              type="text"
              placeholder="Seu nome de jogador"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            {errors.username && (
              <p className="text-sm text-red-500 mt-1">{errors.username}</p>
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
          <motion.div className="space-y-2" variants={itemVariants}>
            <Label htmlFor="phone-signup">Telefone</Label>
            <Input
              id="phone-signup"
              type="tel"
              placeholder="(11) 98765-4321"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            {errors.phone && (
              <p className="text-sm text-red-500 mt-1">{errors.phone}</p>
            )}
          </motion.div>
          <motion.div variants={itemVariants} className="pt-4">
            <Button
              type="submit"
              disabled={totalLoading}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold flex items-center justify-center gap-2"
            >
              {totalLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {totalLoading ? "Verificando..." : "Confirmar Cadastro"}
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
