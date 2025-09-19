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
import { UserCheck, Crown } from "lucide-react";
import { UserContext } from "../../contexts/UserContext";
import { useAuth } from "../../contexts/AuthContext";

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

const ProfileView = () => {
  const {
    user: authUser,
    signOut,
    loading: authLoading,
    updateUser,
    isPremium,
  } = useAuth();
  const { user, setUser } = useContext(UserContext);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (authUser) {
      setName(authUser.name || "");
      setEmail(authUser.email || "");
    }
  }, [authUser]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);

    const updateData = {
      name: name.trim(),
    };

    const { error } = await updateUser(updateData);

    if (!error) {
      setUser((prev) => ({
        ...prev,
        name: name.trim(),
      }));
    }

    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
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
            Bem-vindo, {authUser?.name}
            {isPremium && <Crown className="w-6 h-6 text-yellow-400 ml-2" />}
          </CardTitle>
          <CardDescription className="text-slate-400 pt-2">
            Gerencie suas informações de perfil aqui.
            {isPremium && (
              <span className="block text-yellow-400 font-medium mt-1">
                ✨ Usuário Premium
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <motion.div className="space-y-2" variants={itemVariants}>
              <Label htmlFor="email-profile">Email</Label>
              <Input
                id="email-profile"
                type="email"
                value={email}
                disabled
                className="bg-slate-700/50"
              />
              <p className="text-xs text-slate-400">
                O email não pode ser alterado por segurança
              </p>
            </motion.div>

            <motion.div className="space-y-2" variants={itemVariants}>
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                type="text"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </motion.div>

            <motion.div className="space-y-2" variants={itemVariants}>
              <Label>Status da Conta</Label>
              <div className="flex items-center gap-2 p-2 bg-slate-700/30 rounded-md">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isPremium ? "bg-yellow-400" : "bg-slate-400"
                  }`}
                ></div>
                <span
                  className={isPremium ? "text-yellow-400" : "text-slate-400"}
                >
                  {isPremium ? "Premium" : "Freemium"}
                </span>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="pt-4 space-y-2">
              <Button
                type="submit"
                disabled={loading || authLoading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold"
              >
                {loading ? "Salvando..." : "Salvar Alterações"}
              </Button>

              {!isPremium && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-yellow-400 text-yellow-400 hover:bg-yellow-400/10"
                  onClick={() => {
                    toast({
                      title: "Upgrade para Premium",
                      description:
                        "Funcionalidade de upgrade será implementada em breve!",
                    });
                  }}
                >
                  Fazer Upgrade para Premium
                </Button>
              )}

              <Button
                onClick={handleSignOut}
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
