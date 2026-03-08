import { SignInButton, SignUpButton } from '@clerk/react';

export default function ClerkAuthOptions() {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <SignInButton mode="modal">
        <button type="button" className="btn-secondary w-full text-sm">
          Iniciar con Clerk
        </button>
      </SignInButton>
      <SignUpButton mode="modal">
        <button type="button" className="btn-ghost w-full text-sm">
          Crear cuenta
        </button>
      </SignUpButton>
    </div>
  );
}
