import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { LoadingIcon, CloseIcon } from './Icons';

const ReloadPrompt: React.FC = () => {
    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('SW Registered: ' + r);
        },
        onRegisterError(error) {
            console.log('SW registration error', error);
        },
    });

    const close = () => {
        setOfflineReady(false);
        setNeedRefresh(false);
    };

    if (!offlineReady && !needRefresh) return null;

    return (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-4 bg-white dark:bg-dark-surface border border-gray-200 dark:border-gray-700 p-4 rounded-xl shadow-2xl animate-in slide-in-from-bottom-5 duration-500 max-w-sm">
            <div className="flex-1">
                <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm mb-1">
                    {offlineReady ? 'التطبيق جاهز للعمل دون اتصال' : 'تحديث جديد متوفر'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    {offlineReady
                        ? 'يمكنك استخدام التطبيق الآن بدون إنترنت.'
                        : 'نسخة جديدة متاحة، اضغط للتحديث.'}
                </p>
            </div>
            {needRefresh && (
                <button
                    onClick={() => updateServiceWorker(true)}
                    className="bg-medical-600 hover:bg-medical-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
                >
                    تحديث
                </button>
            )}
            <button
                onClick={close}
                className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
                <CloseIcon />
            </button>
        </div>
    );
};

export default ReloadPrompt;
