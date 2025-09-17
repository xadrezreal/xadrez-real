import React from "react";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { supabase } from "../lib/supabaseClient";
import { useToast } from "../components/ui/use-toast";

const AuthContext = createContext(undefined);

export const SupabaseAuthProvider = ({ children }) => {
  const { toast } = useToast();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleAuthError = useCallback(
    (error, customMessage) => {
      console.error(customMessage, error.message);
      let description = "Ocorreu um erro desconhecido. Tente novamente.";

      if (error.message.includes("User already registered")) {
        description = "Este e-mail já está cadastrado. Tente fazer login.";
      } else if (error.message.includes("Unable to validate email address")) {
        description = "O formato do e-mail é inválido.";
      } else if (
        error.message.includes("password should be at least 6 characters")
      ) {
        description = "A senha deve ter no mínimo 6 caracteres.";
      } else if (
        error.message.includes("duplicate key value violates unique constraint")
      ) {
        description =
          "O apelido fornecido já está em uso. Por favor, escolha outro.";
      } else if (error.message) {
        description = error.message;
      }

      toast({
        variant: "destructive",
        title: "Erro de Autenticação",
        description: description,
        duration: 7000,
      });
    },
    [toast]
  );

  const signUp = useCallback(
    async (email, password, metadata) => {
      setLoading(true);
      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/profile`,
          },
        });

      if (signUpError) {
        handleAuthError(signUpError, "Error signing up:");
        setLoading(false);
        return { error: signUpError };
      }

      if (!signUpData.user || !signUpData.session) {
        const error = new Error(
          "O cadastro falhou. O usuário ou a sessão não foram criados. Tente novamente."
        );
        handleAuthError(error, "Error signing up:");
        setLoading(false);
        return { error };
      }

      try {
        const { error: functionError } = await supabase.functions.invoke(
          "create-profile",
          {
            body: JSON.stringify({
              id: signUpData.user.id,
              username: metadata.username,
              email: email,
              phone: metadata.phone,
            }),
            headers: {
              Authorization: `Bearer ${signUpData.session.access_token}`,
            },
          }
        );

        if (functionError) {
          const invocationError = functionError.context?.error || functionError;
          handleAuthError(
            invocationError,
            "Error creating profile via function:"
          );
          setLoading(false);
          return { error: invocationError };
        }

        toast({
          title: "Cadastro realizado com sucesso!",
          description:
            "Enviamos um link de confirmação para o seu e-mail. Por favor, clique no link para ativar sua conta e fazer login.",
          duration: 9000,
        });

        setLoading(false);
        return { error: null };
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        handleAuthError(error, "Unexpected error during profile creation:");
        setLoading(false);
        return { error };
      }
    },
    [handleAuthError, toast]
  );

  const signIn = useCallback(
    async (email, password) => {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        if (error.message.includes("Email not confirmed")) {
          toast({
            variant: "destructive",
            title: "E-mail não confirmado",
            description:
              "Por favor, verifique sua caixa de entrada e clique no link de confirmação antes de fazer login.",
            duration: 9000,
          });
        } else {
          handleAuthError(error, "Error signing in:");
        }
      } else {
        toast({
          title: "Login bem-sucedido!",
          description: "Bem-vindo de volta!",
        });
      }
      setLoading(false);
      return { data, error };
    },
    [handleAuthError, toast]
  );

  const signOut = useCallback(async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      handleAuthError(error, "Error signing out:");
    } else {
      setSession(null);
      toast({
        title: "Logout bem-sucedido",
        description: "Até a próxima!",
      });
    }
    setLoading(false);
    return { error };
  }, [handleAuthError, toast]);

  const resetPasswordForEmail = useCallback(
    async (email) => {
      setLoading(true);
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });
      if (error) {
        handleAuthError(error, "Error sending password reset email:");
      } else {
        toast({
          title: "Link enviado!",
          description:
            "Verifique seu e-mail para o link de redefinição de senha.",
        });
      }
      setLoading(false);
      return { data, error };
    },
    [handleAuthError, toast]
  );

  const updateUserPassword = useCallback(
    async (newPassword) => {
      setLoading(true);
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) {
        handleAuthError(error, "Error updating password:");
      } else {
        toast({
          title: "Senha atualizada!",
          description: "Sua senha foi alterada com sucesso.",
        });
      }
      setLoading(false);
      return { data, error };
    },
    [handleAuthError, toast]
  );

  useEffect(() => {
    setLoading(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      session,
      loading,
      signUp,
      signIn,
      signOut,
      resetPasswordForEmail,
      updateUserPassword,
    }),
    [
      session,
      loading,
      signUp,
      signIn,
      signOut,
      resetPasswordForEmail,
      updateUserPassword,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useSupabaseAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error(
      "useSupabaseAuth must be used within a SupabaseAuthProvider"
    );
  }
  return context;
};
