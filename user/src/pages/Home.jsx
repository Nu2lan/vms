import { Link } from 'react-router-dom';
import { Shield, Camera, Zap } from 'lucide-react';

export default function Home() {
    return (
        <div className="min-h-[calc(100vh-4rem)]">
            {/* Hero */}
            <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 text-white py-12 sm:py-24">
                <div className="max-w-4xl mx-auto text-center px-4">
                    <h1 className="text-3xl sm:text-5xl font-bold mb-4 sm:mb-6 leading-tight">ASAN Vətəndaş Müraciət Sistemi</h1>
                    <p className="text-base sm:text-xl text-blue-100 mb-8 sm:mb-10 max-w-2xl mx-auto">
                        Yaşadığınız ərazidəki infrastruktur problemlərini bildirin. Süni intellektimiz müraciətinizi anında təhlil edir, kateqoriyalaşdırır və prioritetləşdirir.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                        <Link to="/submit" className="bg-white text-blue-700 px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold hover:bg-blue-50 transition shadow-lg text-base sm:text-lg">
                            Müraciət Göndər
                        </Link>
                        <Link to="/my-appeals" className="border-2 border-white/50 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold hover:bg-white/10 transition text-base sm:text-lg">
                            Müraciətlərim
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="py-12 sm:py-20 max-w-5xl mx-auto px-4">
                <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12 text-slate-800">Necə İşləyir</h2>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-8">
                    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
                        <div className="w-14 h-14 bg-blue-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                            <Camera className="w-7 h-7 text-blue-600" />
                        </div>
                        <h3 className="font-bold text-lg mb-2 text-slate-800">Şəkil Yüklə</h3>
                        <p className="text-slate-500 text-sm">Problemin şəklini çəkin — çuxur, sınıq işıq və ya tullantı.</p>
                    </div>
                    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
                        <div className="w-14 h-14 bg-blue-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                            <Zap className="w-7 h-7 text-blue-600" />
                        </div>
                        <h3 className="font-bold text-lg mb-2 text-slate-800">Sİ Təhlili</h3>
                        <p className="text-slate-500 text-sm">Süni intellektimiz problemi anında kateqoriyalaşdırır və prioritet səviyyəsini təyin edir.</p>
                    </div>
                    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
                        <div className="w-14 h-14 bg-blue-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                            <Shield className="w-7 h-7 text-blue-600" />
                        </div>
                        <h3 className="font-bold text-lg mb-2 text-slate-800">Həll Olunur</h3>
                        <p className="text-slate-500 text-sm">Adminlər müraciətinizi Sİ yoxlamaları ilə təsdiqləyir və həll edir.</p>
                    </div>
                </div>
            </section>
        </div>
    );
}
