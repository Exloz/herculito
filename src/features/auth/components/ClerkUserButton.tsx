import { UserButton } from '@clerk/react';
import { Ruler } from 'lucide-react';

interface ClerkUserButtonProps {
  onNavigateToProfile?: () => void;
}

export default function ClerkUserButton({ onNavigateToProfile }: ClerkUserButtonProps) {
  return (
    <UserButton
      appearance={{
        elements: {
          avatarBox: 'h-9 w-9 rounded-2xl sm:h-11 sm:w-11',
          avatarImage: 'object-cover object-center',
          userButtonTrigger: 'h-9 w-9 rounded-2xl p-0 leading-none align-middle sm:h-11 sm:w-11'
        }
      }}
    >
      <UserButton.MenuItems>
        {onNavigateToProfile && (
          <UserButton.Action
            label="Mis Medidas"
            labelIcon={<Ruler size={16} />}
            onClick={onNavigateToProfile}
          />
        )}
      </UserButton.MenuItems>
    </UserButton>
  );
}