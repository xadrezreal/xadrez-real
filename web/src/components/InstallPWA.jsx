import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Download } from "lucide-react";
import { useToast } from "./ui/use-toast";

const InstallPWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsAppInstalled(true);
      toast({
        title: "Aplicativo Instalado!",
        description: "O Xadrez Clássico foi adicionado à sua tela inicial.",
        variant: "success",
      });
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsAppInstalled(true);
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [toast]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      toast({
        title: "Já Instalado ou Indisponível",
        description:
          "O aplicativo já pode estar instalado ou seu navegador não suporta esta funcionalidade.",
      });
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  if (isAppInstalled || !deferredPrompt) {
    return null;
  }

  return (
    <Button
      onClick={handleInstallClick}
      size="lg"
      variant="outline"
      className="w-full sm:w-auto h-24 text-lg"
    >
      <Download className="w-6 h-6 mr-3" /> Baixar App
    </Button>
  );
};

export default InstallPWA;
