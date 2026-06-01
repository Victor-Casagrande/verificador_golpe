import { useState } from "react";
import TextField from "../ui/TextField.jsx";
import Button from "../ui/Button.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { ApiError } from "../../api/client.js";
import styles from "./LocalLoginForm.module.css";

/**
 * Formulário local de e-mail/senha.
 *
 * `mode` controla se estamos em "Entrar" (login) ou "Cadastrar" (register).
 * O AuthContext faz a chamada certa e já persiste o token.
 */
export default function LocalLoginForm({ mode, onSuccess }) {
  const isRegister = mode === "register";
  const { loginLocal, registerLocal } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isRegister) {
        await registerLocal({ name: name.trim(), email: email.trim(), password });
      } else {
        await loginLocal({ email: email.trim(), password });
      }
      onSuccess?.();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Não foi possível concluir a operação. Tente novamente.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      {isRegister && (
        <TextField
          label="Nome"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          placeholder="Como você quer ser chamado"
          required
          minLength={2}
        />
      )}

      <TextField
        label="E-mail"
        name="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        placeholder="voce@exemplo.com"
        required
      />

      <TextField
        label="Senha"
        name="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete={isRegister ? "new-password" : "current-password"}
        placeholder={isRegister ? "Mínimo 6 caracteres" : "Sua senha"}
        required
        minLength={6}
      />

      {error && (
        <div className={styles.errorBox} role="alert">
          {error}
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        fullWidth
        size="md"
        loading={submitting}
      >
        {isRegister ? "Cadastrar" : "Entrar"}
      </Button>
    </form>
  );
}
