export const ADMIN_EMAIL = 'exloz26@gmail.com';
export const ADMIN_CLERK_USER_ID = 'user_3AC1fVPB8cpo0blGds7MPQHq7Fo';

const normalizeEmail = (value?: string): string => {
  return value?.trim().toLowerCase() ?? '';
};

export const isAdminUser = (input: { email?: string; clerkUserId?: string | null }): boolean => {
  return normalizeEmail(input.email) === ADMIN_EMAIL && input.clerkUserId === ADMIN_CLERK_USER_ID;
};
