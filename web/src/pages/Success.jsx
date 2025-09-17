import React from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "../components/ui/button";
import { CheckCircle, ShoppingBag } from "lucide-react";

const Success = () => {
  return (
    <>
      <Helmet>
        <title>Compra Realizada com Sucesso!</title>
        <meta
          name="description"
          content="Sua compra foi finalizada com sucesso."
        />
      </Helmet>
      <motion.div
        className="flex flex-col items-center justify-center min-h-[60vh] text-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
      >
        <div className="glass-card p-10 rounded-2xl shadow-2xl">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              delay: 0.2,
              type: "spring",
              stiffness: 260,
              damping: 20,
            }}
          >
            <CheckCircle className="h-24 w-24 text-green-400 mx-auto mb-6" />
          </motion.div>
          <h1 className="text-4xl font-bold text-white mb-4">
            Pagamento bem-sucedido!
          </h1>
          <p className="text-lg text-slate-300 mb-8">
            Obrigado pela sua compra. Em breve você receberá um e-mail com os
            detalhes do pedido.
          </p>
          <Link to="/store">
            <Button
              size="lg"
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold"
            >
              <ShoppingBag className="mr-2 h-5 w-5" />
              Continuar Comprando
            </Button>
          </Link>
        </div>
      </motion.div>
    </>
  );
};

export default Success;
