import React, { useState, useEffect } from 'react';
import { testConnection } from '../lib/supabase';
import { LogIn, Mail, Lock, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../services/authService';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false); // ✅ NOUVEAU
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState(false); // ✅ NOUVEAU

  const BG_URL =
    (import.meta as any)?.env?.VITE_LOGIN_BG_URL ||
    'https://yumzqyyogwzrmlcpvnky.supabase.co/storage/v1/object/public/static/tmpoofee5sh.png';

  const bgStyle: React.CSSProperties = {
    backgroundImage: `url(${BG_URL})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
    backgroundColor: 'transparent',
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    const errorCode = urlParams.get('error_code');
    const errorDescription = urlParams.get('error_description');
    
    if (error === 'access_denied' && errorCode === 'otp_expired') {
      toast.error('Le lien de confirmation a expiré. Veuillez créer un nouveau compte ou demander un nouveau lien.');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error) {
      toast.error(`Erreur de confirmation: ${errorDescription || error}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    const checkConnection = async () => {
      setIsCheckingConnection(true);
      try {
        const result = await testConnection();
        if (!result.success) {
          setConnectionError(result.error || 'Impossible de se connecter à la base de données');
          toast.error(result.error || 'Erreur de connexion');
        } else {
          setConnectionError(null);
        }
      } catch (error: any) {
        setConnectionError('Erreur lors de la vérification de la connexion');
        toast.error('Erreur de connexion');
      } finally {
        setIsCheckingConnection(false);
      }
    };
    
    checkConnection();
  }, []);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setConnectionError(null);

    try {
      const { error } = await authService.signInWithEmail(email, password);

      if (error) throw error;
      toast.success('Connexion réussie');
    } catch (error: any) {
      console.error('Erreur de connexion:', error);
      const errorMessage = error.message === 'Failed to fetch' 
        ? 'Impossible de se connecter au serveur. Vérifiez votre connexion Internet.'
        : error.message?.includes('Veuillez confirmer votre adresse email')
        ? 'Veuillez confirmer votre adresse email avant de vous connecter. Vérifiez votre boîte de réception et le dossier spam.'
        : error.message || 'Erreur de connexion';
      setConnectionError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    
    if (password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    
    setIsLoading(true);

    try {
      const { error } = await authService.signUp(email, password);

      if (error) throw error;
      setSignUpSuccess(true);
      toast.success('Inscription réussie ! Vérifiez votre email pour confirmer votre compte.');
    } catch (error: any) {
      console.error('Erreur d\'inscription:', error);
      if (error.message.includes('User already registered')) {
        toast.error('Un compte existe déjà avec cette adresse email');
      } else if (error.message.includes('Invalid email')) {
        toast.error('Adresse email invalide');
      } else if (error.message.includes('
