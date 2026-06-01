import Button from "../ui/Button.jsx";

/**
 * Ícones inline para evitar dependência adicional de pacote de ícones.
 */
const GithubIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.92.58.1.79-.25.79-.55v-2.02c-3.2.69-3.87-1.36-3.87-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.3 1.18-3.11-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11.05 11.05 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.58.23 2.75.12 3.04.73.81 1.18 1.85 1.18 3.11 0 4.44-2.7 5.41-5.27 5.69.41.36.78 1.06.78 2.14v3.17c0 .3.21.66.8.55C20.21 21.38 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5Z" />
  </svg>
);

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M21.6 12.23c0-.78-.07-1.53-.2-2.25H12v4.26h5.39a4.62 4.62 0 0 1-2 3.03v2.51h3.23c1.89-1.74 2.98-4.31 2.98-7.55Z"
    />
    <path
      fill="#34A853"
      d="M12 22c2.7 0 4.96-.9 6.62-2.42l-3.23-2.51c-.9.6-2.04.96-3.39.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z"
    />
    <path
      fill="#FBBC05"
      d="M6.41 13.91A5.99 5.99 0 0 1 6.1 12c0-.66.11-1.3.31-1.91V7.5H3.07A10 10 0 0 0 2 12c0 1.61.39 3.14 1.07 4.5l3.34-2.59Z"
    />
    <path
      fill="#EA4335"
      d="M12 5.95c1.47 0 2.78.5 3.82 1.5l2.86-2.86C16.95 2.99 14.69 2 12 2A10 10 0 0 0 3.07 7.5l3.34 2.59C7.2 7.71 9.4 5.95 12 5.95Z"
    />
  </svg>
);

const ICONS = {
  github: <GithubIcon />,
  google: <GoogleIcon />,
};

const LABELS = {
  github: "Continuar com GitHub",
  google: "Continuar com Google",
};

export default function OAuthButton({ provider, loading, onClick, disabled }) {
  return (
    <Button
      variant="social"
      fullWidth
      onClick={onClick}
      loading={loading}
      disabled={disabled}
      leadingIcon={ICONS[provider]}
    >
      {LABELS[provider] || `Continuar com ${provider}`}
    </Button>
  );
}
