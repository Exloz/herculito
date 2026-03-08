import { UserButton } from '@clerk/react';

export default function ClerkUserButton() {
  return (
    <UserButton
      appearance={{
        elements: {
          avatarBox: 'h-9 w-9 rounded-2xl sm:h-11 sm:w-11',
          avatarImage: 'object-cover object-center',
          userButtonTrigger: 'h-9 w-9 rounded-2xl p-0 leading-none align-middle sm:h-11 sm:w-11'
        }
      }}
    />
  );
}
