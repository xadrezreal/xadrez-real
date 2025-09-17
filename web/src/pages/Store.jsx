import React from "react";
import { Helmet } from "react-helmet";
import { motion } from "framer-motion";
import ProductsList from "../components/ProductsList";
import { Store as StoreIcon } from "lucide-react";

const Store = () => {
  return (
    <>
      <Helmet>
        <title>Loja - Xadrez Clássico</title>
        <meta
          name="description"
          content="Explore nossa coleção de produtos exclusivos."
        />
      </Helmet>
      <motion.div
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-12">
          <StoreIcon className="mx-auto h-16 w-16 text-purple-400 drop-shadow-lg mb-4" />
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
            Nossa Loja
          </h1>
          <p className="mt-4 text-lg text-slate-300">
            Encontre produtos exclusivos para aprimorar sua experiência no
            xadrez.
          </p>
        </div>
        <ProductsList />
      </motion.div>
    </>
  );
};

export default Store;
