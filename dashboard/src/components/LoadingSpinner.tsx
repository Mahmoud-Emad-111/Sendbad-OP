import { Loader2 } from 'lucide-react';

export default function LoadingSpinner() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] w-full animate-in fade-in duration-700">
            <div className="relative">
                {/* Outer pulsing ring */}
                <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>

                {/* Main Spinner Container */}
                <div className="relative bg-white p-4 rounded-2xl shadow-xl shadow-blue-900/5 border border-slate-100">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                </div>
            </div>

            {/* Text with gradient */}
            <h3 className="mt-6 text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent animate-pulse">
                جاري التحميل...
            </h3>
            <p className="text-slate-400 text-sm mt-2">لحظات ونكون جاهزين 🚀</p>
        </div>
    );
}
