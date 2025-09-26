import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { LockKeyhole } from "lucide-react";

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

const UpdatePassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    const { error } = await updateUserPassword(password);
    if (!error) {
      navigate("/profile");
    }
  };

  return (
    <motion.div
      className="max-w-md mx-auto py-10"
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
    >
      <Card className="bg-slate-800/50 border-slate-700 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl text-cyan-300">
            <LockKeyhole className="w-8 h-8" />
            Atualizar Senha
          </CardTitle>
          <CardDescription className="text-slate-400 pt-2">
            Você está redefinindo sua senha. Digite uma nova senha abaixo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <motion.div className="space-y-2" variants={itemVariants}>
              <Label htmlFor="new-password">Nova Senha</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </motion.div>
            <motion.div variants={itemVariants} className="pt-4">
              <Button
                type="submit"
                // disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold"
              >
                {"Atualizar Senha"}
              </Button>
            </motion.div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default UpdatePassword;
