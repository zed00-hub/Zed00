import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ZGLogo, GoogleLogo, LoadingIcon, ArrowRightIcon } from './Icons';

const LoginPage: React.FC = () => {
  const { loginWithGoogle, isLoading } = useAuth();
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    try {
      setError('');
      await loginWithGoogle();
    } catch (err) {
      setError('فشل تسجيل الدخول عبر Google');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/50 dark:from-dark-bg dark:via-slate-900 dark:to-slate-800 p-4 font-sans" dir="rtl">
      <div className="w-full max-w-md bg-white/80 dark:bg-dark-surface/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-gray-200/50 dark:border-dark-border/50">
        
        {/* Header */}
        <div className="bg-gradient-to-br from-medical-600 via-medical-700 to-medical-800 dark:from-medical-900 dark:via-medical-800 dark:to-medical-900 p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          <div className="absolute top-0 left-0 w-full h-full opacity-5 bg-[url('https://www.transparenttextures.com/patterns/medical-icons.png')]"></div>
          <div className="flex justify-center mb-6 relative z-10">
            <div className="scale-150 transform shadow-2xl rounded-lg bg-black/90 p-1">
              <ZGLogo />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white relative z-10 drop-shadow-lg">مساعد الطالب الشبه طبي</h1>
          <p className="text-medical-100/90 mt-3 text-sm relative z-10 font-medium">رفيقك الذكي في مسيرتك الدراسية</p>
        </div>

        {/* Action Container */}
        <div className="p-10 pb-12 bg-white/50 dark:bg-transparent">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3">
              مرحباً بك
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              قم بتسجيل الدخول للمتابعة إلى التطبيق
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50/80 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm rounded-xl text-center border border-red-200 dark:border-red-800/50 backdrop-blur-sm animate-pulse">
              {error}
            </div>
          )}

          {/* Google Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full relative group overflow-hidden bg-white dark:bg-gray-800/80 hover:bg-gray-50 dark:hover:bg-gray-700/80 border-2 border-gray-200 dark:border-gray-700 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-medical-500/0 via-medical-500/0 to-medical-500/0 group-hover:from-medical-500/5 group-hover:via-medical-500/10 group-hover:to-medical-500/5 transition-all duration-300"></div>
            <div className="flex items-center p-4 relative z-10">
              <div className="shrink-0 flex items-center justify-center w-12 h-12 bg-white dark:bg-gray-700 rounded-xl shadow-md border border-gray-100 dark:border-gray-600 group-hover:shadow-lg transition-shadow">
                {isLoading ? <LoadingIcon /> : <GoogleLogo />}
              </div>
              <div className="flex-1 text-center font-semibold text-gray-700 dark:text-gray-200 text-base">
                 {isLoading ? 'جاري الاتصال...' : 'المتابعة باستخدام Google'}
              </div>
              <div className="w-12 flex justify-center text-gray-400 dark:text-gray-500 group-hover:text-medical-600 dark:group-hover:text-medical-400 group-hover:translate-x-[-6px] transition-all duration-300">
                <ArrowRightIcon />
              </div>
            </div>
          </button>

          <div className="mt-10 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              بالنقر على المتابعة، أنت توافق على شروط الاستخدام وسياسة الخصوصية.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;