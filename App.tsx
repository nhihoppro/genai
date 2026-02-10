
import React, { useState, useCallback, useEffect } from 'react';
import { analyzeProduct, generateBannerImage, getAISuggestions } from './services/geminiService';
import { ProductAnalysis, GeneratedBanner, AppStep } from './types';
import StepIndicator from './components/StepIndicator';

const LoaderIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={`animate-spin ${className} text-white`} viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
  const [productImage, setProductImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ProductAnalysis | null>(null);
  const [banners, setBanners] = useState<GeneratedBanner[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageCount, setImageCount] = useState(2);
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "9:16" | "16:9">("1:1");
  const [extraPrompt, setExtraPrompt] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const item = Array.from(e.clipboardData?.items || []).find(x => x.type.includes('image'));
    if (item) {
      const reader = new FileReader();
      reader.onload = (event) => setProductImage(event.target?.result as string);
      reader.readAsDataURL(item.getAsFile()!);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const onAnalyze = async () => {
    if (!productImage) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const res = await analyzeProduct(productImage);
      setAnalysis(res);
      setStep(AppStep.RESULT);
      
      setIsSuggesting(true);
      const suggestions = await getAISuggestions(res);
      setAiSuggestions(suggestions);
      setIsSuggesting(false);
    } catch (e: any) {
      setError(e.message || "Không thể phân tích ảnh.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const onGenerate = async () => {
    if (!productImage || !analysis) return;
    setIsGenerating(true);
    setError(null);
    setBanners([]);
    
    const count = Math.min(Math.max(1, imageCount), 10);
    
    try {
      for (let i = 0; i < count; i++) {
        const base = analysis.suggestedPrompts[i % analysis.suggestedPrompts.length];
        const url = await generateBannerImage(productImage, base, extraPrompt, analysis.thematicKeywords, aspectRatio);
        setBanners(prev => [...prev, { id: Math.random().toString(), url, prompt: base }]);
      }
    } catch (e: any) {
      setError(e.message || "Lỗi khi tạo banner.");
    } finally {
      setIsGenerating(false);
    }
  };

  const reset = () => {
    setProductImage(null);
    setAnalysis(null);
    setBanners([]);
    setStep(AppStep.UPLOAD);
    setError(null);
    setExtraPrompt("");
    setAiSuggestions([]);
  };

  const copyToPrompt = (text: string) => {
    setExtraPrompt(prev => prev ? `${prev}, ${text}` : text);
  };

  return (
    <div className="min-h-screen bg-[#fcfcfd] text-gray-900 pb-20">
      <header className="max-w-7xl mx-auto px-4 py-10 text-center">
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-gray-900">
          PRO <span className="text-orange-600 underline decoration-orange-200">BANNER</span> GEN
        </h1>
        <p className="mt-4 text-gray-500 font-medium">Biến sản phẩm đơn giản thành banner bùng nổ với AI</p>
      </header>

      <div className="max-w-6xl mx-auto px-4">
        <StepIndicator currentStep={step} />

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-center justify-between shadow-sm">
            <p className="font-semibold">{error}</p>
            <button onClick={() => setError(null)} className="text-xl">&times;</button>
          </div>
        )}

        {step === AppStep.UPLOAD ? (
          <div className="flex flex-col items-center">
            <div 
              className={`w-full max-w-2xl aspect-square md:aspect-video rounded-[2.5rem] border-4 border-dashed transition-all flex flex-col items-center justify-center p-6 text-center cursor-pointer bg-white group ${
                productImage ? 'border-orange-400 shadow-xl' : 'border-gray-200 hover:border-orange-300'
              }`}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              {productImage ? (
                <img src={productImage} alt="Preview" className="max-h-full rounded-2xl object-contain" />
              ) : (
                <div className="space-y-4">
                  <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                    <svg className="w-10 h-10 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-700">Tải ảnh sản phẩm</h3>
                  <p className="text-gray-400 text-sm">Nhấn để chọn ảnh, kéo thả hoặc <b>Ctrl+V</b> để dán</p>
                </div>
              )}
              <input id="file-upload" type="file" className="hidden" accept="image/*" onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  const r = new FileReader();
                  r.onload = (ev) => setProductImage(ev.target?.result as string);
                  r.readAsDataURL(f);
                }
              }} />
            </div>

            {productImage && (
              <div className="mt-10 flex gap-4">
                <button onClick={reset} className="px-8 py-4 font-bold text-gray-500 hover:text-gray-900 transition-colors">Làm lại</button>
                <button 
                  onClick={onAnalyze} 
                  disabled={isAnalyzing}
                  className="px-12 py-4 bg-orange-600 text-white rounded-full font-black text-lg shadow-2xl hover:bg-orange-700 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center gap-3 disabled:opacity-50"
                >
                  {isAnalyzing ? <><LoaderIcon /> ĐANG PHÂN TÍCH...</> : 'BẮT ĐẦU NGAY'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4 bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col gap-6">
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-50 border border-gray-100">
                   <img src={productImage!} alt="Original" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">{analysis?.productName}</h3>
                  <div className="mt-4 space-y-3">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Bảng mã màu sản phẩm</span>
                    <div className="grid grid-cols-2 gap-2">
                      {analysis?.colors.map(c => (
                        <div key={c} className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100">
                          <div className="w-6 h-6 rounded-md shadow-sm border border-white" style={{ backgroundColor: c }} />
                          <span className="text-[10px] font-mono font-bold text-gray-500">{c.toUpperCase()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-orange-50/50 p-6 rounded-[2rem] border border-orange-100/50">
                    <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest block mb-2">Style AI Nhận diện</span>
                    <h4 className="text-xl font-bold text-gray-800 mb-2">{analysis?.style}</h4>
                    <p className="text-gray-500 text-sm leading-relaxed">{analysis?.packagingDetails}</p>
                  </div>
                  <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Mood & Elements</span>
                    <div className="mt-3 flex flex-wrap gap-2">
                       {analysis?.thematicKeywords.split(',').map(kw => (
                         <span key={kw} className="px-3 py-1 bg-white border border-gray-100 rounded-full text-[10px] font-bold text-gray-500 uppercase">#{kw.trim()}</span>
                       ))}
                    </div>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-orange-100">
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="w-full">
                        <label className="text-sm font-black text-gray-700 uppercase block mb-3">Số lượng banner</label>
                        <div className="flex items-center gap-3">
                          <input 
                            type="number" 
                            min="1" 
                            max="10" 
                            value={imageCount}
                            onChange={(e) => setImageCount(parseInt(e.target.value) || 1)}
                            className="w-full md:w-24 p-3 bg-gray-50 border border-gray-100 rounded-xl font-black text-center text-orange-600 focus:ring-2 focus:ring-orange-500 outline-none"
                          />
                          <span className="hidden md:inline text-gray-400 font-medium text-xs">Banner (Max 10)</span>
                        </div>
                      </div>

                      <div className="w-full">
                        <label className="text-sm font-black text-gray-700 uppercase block mb-3">Tỉ lệ khung hình</label>
                        <div className="flex gap-2">
                          {[
                            { id: "1:1", label: "Vuông", dim: "1:1" },
                            { id: "9:16", label: "Dọc", dim: "9:16" },
                            { id: "16:9", label: "Ngang", dim: "16:9" }
                          ].map(ratio => (
                            <button 
                              key={ratio.id}
                              onClick={() => setAspectRatio(ratio.id as any)}
                              className={`flex-1 py-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${
                                aspectRatio === ratio.id 
                                ? 'border-orange-600 bg-orange-50 text-orange-600' 
                                : 'border-gray-50 text-gray-400 hover:border-gray-200'
                              }`}
                            >
                              <span className="text-[10px] font-black">{ratio.label}</span>
                              <span className="text-[9px] font-medium opacity-60">{ratio.dim}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-black text-gray-700 uppercase">Yêu cầu thêm của bạn</label>
                        {isSuggesting && <LoaderIcon className="h-4 w-4 text-orange-600" />}
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {aiSuggestions.map((suggestion, idx) => (
                          <button 
                            key={idx}
                            onClick={() => copyToPrompt(suggestion)}
                            className="px-3 py-1.5 bg-orange-50 text-orange-600 text-[10px] font-bold rounded-full border border-orange-100 hover:bg-orange-600 hover:text-white transition-all uppercase tracking-tight"
                          >
                            + {suggestion}
                          </button>
                        ))}
                      </div>

                      <textarea 
                        value={extraPrompt}
                        onChange={(e) => setExtraPrompt(e.target.value)}
                        placeholder="Mô tả bối cảnh hoặc hiệu ứng bạn muốn... (Ví dụ: Cháy nổ, rừng rậm, nước chảy...)"
                        className="w-full h-24 p-4 rounded-2xl bg-gray-50 border border-gray-50 focus:ring-2 focus:ring-orange-500 outline-none transition-all resize-none text-sm font-medium"
                      />
                    </div>

                    <div className="flex gap-4">
                      <button 
                        onClick={onGenerate}
                        disabled={isGenerating}
                        className="flex-1 py-5 bg-gray-900 text-white rounded-2xl font-black shadow-lg hover:bg-orange-600 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                      >
                        {isGenerating ? <><LoaderIcon /> ĐANG TẠO {banners.length + 1}/{imageCount}...</> : 'BẮT ĐẦU TẠO THIẾT KẾ'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-8">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-black tracking-tight text-gray-900">KẾT QUẢ THIẾT KẾ</h2>
                <div className="h-px flex-1 bg-gray-100"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {banners.map((banner, i) => (
                  <div key={banner.id} className="group bg-white p-4 rounded-[3rem] shadow-sm hover:shadow-2xl transition-all duration-500 border border-gray-50 flex flex-col gap-6">
                    <div className={`relative rounded-[2.5rem] overflow-hidden shadow-inner ${aspectRatio === '9:16' ? 'aspect-[9/16]' : aspectRatio === '16:9' ? 'aspect-[16/9]' : 'aspect-square'}`}>
                      <img src={banner.url} alt="Banner" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-8">
                        <a 
                          href={banner.url} 
                          download={`banner-${i+1}.png`}
                          className="w-full py-4 bg-white text-gray-900 rounded-2xl font-black text-center shadow-xl hover:bg-orange-600 hover:text-white transition-all"
                        >
                          TẢI XUỐNG HD
                        </a>
                      </div>
                    </div>
                    <div className="px-4 pb-2">
                       <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest">Concept #{i+1} ({aspectRatio})</span>
                       <p className="text-sm font-bold text-gray-400 mt-1 italic line-clamp-2">"{banner.prompt}"</p>
                    </div>
                  </div>
                ))}
                
                {isGenerating && banners.length < imageCount && (
                  <div className={`bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center ${aspectRatio === '9:16' ? 'aspect-[9/16]' : aspectRatio === '16:9' ? 'aspect-[16/9]' : 'aspect-square'}`}>
                    <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
                    <p className="text-gray-400 font-bold mt-4 uppercase tracking-widest text-[10px]">Đang vẽ banner tiếp theo...</p>
                  </div>
                )}
              </div>

              {(banners.length > 0 || !isGenerating) && (
                 <div className="flex justify-center pt-10">
                    <button onClick={reset} className="px-8 py-3 bg-white border border-gray-200 rounded-full text-gray-400 font-bold text-sm hover:border-orange-500 hover:text-orange-500 transition-all">
                      CHỌN SẢN PHẨM KHÁC
                    </button>
                 </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
