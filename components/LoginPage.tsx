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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg p-4 font-sans" dir="rtl">
      <div className="w-full max-w-md bg-white dark:bg-dark-surface rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-dark-border">
        
        {/* Header */}
        <div className="bg-medical-600 dark:bg-medical-900 p-10 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/medical-icons.png')]"></div>
          <div className="flex justify-center mb-6 relative z-10">
            <div className="scale-150 transform shadow-lg rounded-md bg-black">
              <ZGLogo />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white relative z-10">مساعد الطالب الشبه طبي</h1>
          <p className="text-medical-100 mt-2 text-sm relative z-10">رفيقك الذكي في مسيرتك الدراسية</p>
        </div>

        {/* Action Container */}
        <div className="p-8 pb-12">
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
              مرحباً بك
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              قم بتسجيل الدخول للمتابعة إلى التطبيق
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center border border-red-100">
              {error}
            </div>
          )}

          {/* Google Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full relative group overflow-hidden bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 p-1 rounded-xl transition-all shadow-sm hover:shadow-md"
          >
            <div className="flex items-center p-3">
              <div className="shrink-0 flex items-center justify-center w-10 h-10 bg-white rounded-lg shadow-sm border border-gray-100">
                {isLoading ? <LoadingIcon /> : <GoogleLogo />}
              </div>
              <div className="flex-1 text-center font-semibold text-gray-700 dark:text-gray-200">
                 {isLoading ? 'جاري الاتصال...' : 'المتابعة باستخدام Google'}
              </div>
              <div className="w-10 flex justify-center text-gray-400 group-hover:text-medical-600 group-hover:translate-x-[-4px] transition-all">
                <ArrowRightIcon />
              </div>
            </div>
          </button>

          <div className="mt-8 text-center">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              بالنقر على المتابعة، أنت توافق على شروط الاستخدام وسياسة الخصوصية.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;