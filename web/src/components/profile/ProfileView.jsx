import React, { useState, useContext, useEffect } from "react";
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
import { useToast } from "../ui/use-toast";
import { UserCheck } from "lucide-react";
import { UserContext } from "../../contexts/UserContext";
import { useSupabaseAuth } from "../../contexts/SupabaseAuthContext";
import { supabase } from "../../lib/supabaseClient";

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

const ProfileView = () => {
  const { session, signOut, loading: authLoading } = useSupabaseAuth();
  const { user, setUser } = useContext(UserContext);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (user.isRegistered) {
      setUsername(user.name || "");
      setPhone(user.phone || "");
    }
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .update({ username, phone })
      .eq("id", session.user.id)
      .select()
      .single();

    if (!error && data) {
      setUser((prev) => ({ ...prev, name: data.username, phone: data.phone }));
      toast({
        title: "Perfil Salvo!",
        description: "Suas informações foram atualizadas.",
      });
    } else {
      toast({
        title: "Erro ao salvar",
        description: error?.message,
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  return (
    <motion.div
      className="max-w-md mx-auto"
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
    >
      <Card className="bg-slate-800/50 border-slate-700 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl text-cyan-300">
            <UserCheck className="w-8 h-8" />
            Bem-vindo, {user.name}
          </CardTitle>
          <CardDescription className="text-slate-400 pt-2">
            Gerencie suas informações de perfil aqui.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <motion.div className="space-y-2" variants={itemVariants}>
              <Label htmlFor="email-profile">Email</Label>
              <Input
                id="email-profile"
                type="email"
                value={session?.user?.email || ""}
                disabled
                className="bg-slate-700/50"
              />
            </motion.div>
            <motion.div className="space-y-2" variants={itemVariants}>
              <Label htmlFor="username">Apelido (Nome de Usuário)</Label>
              <Input
                id="username"
                type="text"
                placeholder="Seu nome de jogador"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </motion.div>
            <motion.div className="space-y-2" variants={itemVariants}>
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(00) 00000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </motion.div>
            <motion.div variants={itemVariants} className="pt-4 space-y-2">
              <Button
                type="submit"
                disabled={loading || authLoading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold"
              >
                {loading ? "Salvando..." : "Salvar Alterações"}
              </Button>
              <Button
                onClick={signOut}
                disabled={authLoading}
                variant="destructive"
                className="w-full"
              >
                {authLoading ? "Saindo..." : "Sair"}
              </Button>
            </motion.div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ProfileView;
