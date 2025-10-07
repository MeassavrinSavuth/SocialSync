export const useOAuthLogin = (baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://socialsync-j7ih.onrender.com') => {
  const loginWithFacebook = () => {
    window.location.href = `${baseUrl}/auth/facebook/login`;
  };

  const loginWithGoogle = () => {
    window.location.href = `${baseUrl}/auth/google/login`;
  };

  return { loginWithFacebook, loginWithGoogle };
};
